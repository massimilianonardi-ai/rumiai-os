'use strict';

// Direct port of the ChatGPT macOS exporter from CDP attachment onward.
// The direct Node entrypoint launches Chromium, navigates to the supplied URL,
// and reuses the same CDP snapshot discovery and forensic export pipeline.
// No SQLite catalog or Playwright dependency is required.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {spawn} = require('node:child_process');

const _internalContentTypes = new Set(['thoughts', 'reasoning_recap']);

function _failure(code, message, cause)
{
  const error = new Error(`chatgpt-export.${code}: ${message}`, cause ? {cause} : undefined);
  error.code = `chatgpt-export.${code}`;
  return error;
}

function _sha256(buffer)
{
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function _safeFilename(value, maxLen = 160)
{
  value = String(value).replaceAll('/', '-').replaceAll(':', '-');
  value = value.replace(/[\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  if (!value) value = 'Untitled';
  return value.slice(0, maxLen).replace(/[. ]+$/, '');
}

function _localDate(timestamp)
{
  let value = Number(timestamp);
  if (timestamp == null || !Number.isFinite(value)) value = Date.now() / 1000;
  if (value > 10000000000) value /= 1000;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.valueOf())) return _localDate(null);
  const components =
  [
    date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ];
  return components.join('-');
}

function _uniqueDirectory(root, name)
{
  fs.mkdirSync(root, {recursive: true, mode: 0o700});
  let candidate = path.join(root, name);
  let number = 2;
  while (fs.existsSync(candidate)) candidate = path.join(root, `${name} (${number++})`);
  fs.mkdirSync(candidate, {mode: 0o700});
  return candidate;
}

function _textualFragments(content)
{
  const fragments = [];
  const nonText = [];
  if (Array.isArray(content.parts))
  {
    content.parts.forEach
    (
      (part, index) =>
      {
        if (typeof part === 'string') fragments.push(part);
        else nonText.push({part_index: index, part});
      }
    );
  }
  if (!fragments.length)
  {
    for (const key of ['text', 'code'])
    {
      if (typeof content[key] === 'string')
      {
        fragments.push(content[key]);
        break;
      }
    }
  }
  return {fragments, nonText};
}

function _classifyMessage(message)
{
  const role = message.author?.role;
  const channel = message.channel;
  const recipient = message.recipient;
  const contentType = message.content?.content_type;
  if (role === 'tool') return [false, 'tool_traffic'];
  if (role !== 'user' && role !== 'assistant') return [false, `internal_role:${role ?? 'None'}`];
  if (_internalContentTypes.has(contentType)) return [false, 'internal_reasoning'];
  if (role === 'assistant')
  {
    if (channel === 'analysis') return [false, 'assistant_analysis'];
    if (recipient != null && recipient !== '' && recipient !== 'all')
      return [false, 'assistant_tool_invocation'];
  }
  return [true, 'visible_candidate'];
}

// ZIP DEFLATE writer (Node core only), preserving the Python archive's file list.
const _crcTable = Array.from
(
  {length: 256},
  (_, i) =>
  {
    let c = i;
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    return c >>> 0;
  }
);

function _crc32(buffer)
{
  let crc = 0xffffffff;
  for (const byte of buffer) crc = _crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function _zipFiles(zipPath, files)
{
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files)
  {
    const name = Buffer.from(path.basename(file), 'utf8');
    const raw = fs.readFileSync(file);
    const compressed = zlib.deflateRawSync(raw, {level: 9});
    const crc = _crc32(raw);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(8, 8);      // deflated
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(raw.length, 22);
    header.writeUInt16LE(name.length, 26);
    chunks.push(header, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(0x0314, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE((0o100600 << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + compressed.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...chunks, ...central, end]), {flag: 'wx', mode: 0o600});
}

function _projectLinearConversation(linear)
{
  const mapping = { 'linear-root': {parent: null, message: null} };
  for (let index = 0; index < linear.length; index++)
  {
    const node = linear[index];
    const hidden = node.message?.is_visually_hidden_from_conversation === true ||
      node.message?.metadata?.is_visually_hidden_from_conversation === true;
    const id = `linear-${index + 1}`;
    mapping[id] =
    {
      parent: index ? `linear-${index}` : 'linear-root',
      message: hidden ? null : (node.message || null)
    };
  }
  return mapping;
}

/** Convert an already-captured JSON snapshot into the original forensic export. */
function exportChatgptSnapshot(rawJson, selected = {}, outputRoot = process.cwd())
{
  const rawBytes = Buffer.from(rawJson, 'utf8');
  const data = JSON.parse(rawJson);
  // A web share can expose a linear conversation rather than an Electron
  // mapping graph. Preserve the actual decoded source in RAW, and build only
  // a temporary active-branch projection for the existing Python converter.
  const linear = Array.isArray(data.linear_conversation) ? data.linear_conversation : null;
  if (linear && (!linear.length || !linear.every(node => node && typeof node === 'object')))
    throw _failure('linear-conversation-invalid', 'linear conversation contains invalid nodes');
  const mapping = linear ? _projectLinearConversation(linear) : (data.mapping || {});
  const current = linear ? (linear.length ? `linear-${linear.length}` : 'linear-root') :
    data.current_node;
  if (!linear && (!current || !Object.keys(mapping).length))
    throw _failure('snapshot-shape-invalid', 'snapshot has no mapping/current_node');
  const nodeIds = [];
  const seen = new Set();
  for (let nodeId = current; nodeId; nodeId = mapping[nodeId]?.parent)
  {
    if (seen.has(nodeId)) throw _failure('mapping-cycle', `cycle detected at node ${nodeId}`);
    seen.add(nodeId);
    nodeIds.push(nodeId);
    if (!Object.hasOwn(mapping, nodeId))
      throw _failure('mapping-parent-missing', `node ${nodeId} missing in mapping`);
  }
  nodeIds.reverse();

  const title = data.title || selected.display_title || data.conversation_id || 'Untitled';
  const started = data.create_time ?? selected.source_created_at;
  const folder = `${_localDate(started)} ${_safeFilename(title)}`;
  const outdir = _uniqueDirectory(path.resolve(outputRoot), folder);
  const files = Object.fromEntries
  (
    [
      'conversation.raw.json.gz', 'TRANSCRIPT.md', 'VISIBLE_MESSAGES.jsonl',
      'NON_TEXT_PARTS.json', 'AUDIT.json', 'README.md', 'SHA256SUMS'
    ].map(name => [name, path.join(outdir, name)])
  );

  fs.writeFileSync
  (
    files['conversation.raw.json.gz'], zlib.gzipSync(rawBytes, {level: 9, mtime: 0}),
    {flag: 'wx', mode: 0o600}
  );
  const visible = [];
  const auditRows = [];
  const nonTextParts = [];
  const counts = {};
  const count = label => { counts[label] = (counts[label] || 0) + 1; };

  nodeIds.forEach
  (
    (nodeId, ordinal) =>
    {
      const node = mapping[nodeId];
      const message = node.message;
      if (!message)
      {
        count('no_message');
        auditRows.push({ordinal, node_id: nodeId, classification: 'no_message', included: false});
        return;
      }
      const role = message.author?.role ?? null;
      const channel = message.channel ?? null;
      const recipient = message.recipient ?? null;
      const content = message.content || {};
      const contentType = content.content_type ?? null;
      let [include, classification] = _classifyMessage(message);
      const {fragments, nonText} = _textualFragments(content);
      const text = fragments.join('');
      if (include && role === 'assistant' && !text && !nonText.length)
      {
        include = false;
        classification = 'empty_assistant_node';
      }
      count(classification);
      auditRows.push
      (
        {
          ordinal, node_id: nodeId, message_id: message.id ?? null,
          role, channel, recipient, content_type: contentType, classification,
          included: include, text_length: [...text].length, non_text_parts: nonText.length
        }
      );
      if (!include) return;
      visible.push
      (
        {
          ordinal, node_id: nodeId, parent: node.parent ?? null,
          message_id: message.id ?? null, role, channel, recipient,
          content_type: contentType, create_time: message.create_time ?? null,
          text, message
        }
      );
      for (const entry of nonText)
      {
        nonTextParts.push
        (
          {
            ordinal, node_id: nodeId, message_id: message.id ?? null,
            role, content_type: contentType, ...entry
          }
        );
      }
    }
  );

  fs.writeFileSync
  (
    files['VISIBLE_MESSAGES.jsonl'], visible.map(item => JSON.stringify(item) + '\n').join(''),
    {flag: 'wx', mode: 0o600}
  );
  let transcript = `# ${title}\n\nConversation ID: \`${data.conversation_id || ''}\`\n\n` +
    '<!-- Derived from a captured ChatGPT conversation snapshot. -->\n' +
    '<!-- Text strings are not stripped, rewritten or normalized. -->\n' +
    '<!-- Non-text multimodal parts are preserved in VISIBLE_MESSAGES.jsonl ' +
    'and NON_TEXT_PARTS.json. -->\n\n';
  for (const item of visible)
  {
    const heading = item.role === 'user' ? 'USER' :
      item.channel === 'commentary' ? 'ASSISTANT — commentary' : 'ASSISTANT';
    transcript += `## ${heading}\n\n${item.text || '[contenuto non testuale; vedi VISIBLE_MESSAGES.jsonl]'}\n\n`;
  }
  fs.writeFileSync(files['TRANSCRIPT.md'], transcript, {flag: 'wx', mode: 0o600});
  fs.writeFileSync
  (
    files['NON_TEXT_PARTS.json'], JSON.stringify(nonTextParts, null, 2),
    {flag: 'wx', mode: 0o600}
  );
  const audit =
  {
    source:
    {
      kind: linear ? 'ChatGPT shared-page linear conversation captured via CDP' :
        'ChatGPT renderer conversation snapshot captured via CDP',
      projection: linear ? 'derived active-branch mapping; source RAW remains linear' : null,
      raw_uncompressed_bytes: rawBytes.length, raw_sha256: _sha256(rawBytes)
    },
    conversation:
    {
      title, conversation_id: data.conversation_id ?? null,
      create_time: data.create_time ?? null, update_time: data.update_time ?? null,
      current_node: current ?? null, mapping_nodes: Object.keys(mapping).length,
      active_branch_nodes: nodeIds.length,
      nodes_outside_active_branch: Object.keys(mapping).length - nodeIds.length
    },
    transcript:
    {
      visible_messages: visible.length,
      visible_user_messages: visible.filter(item => item.role === 'user').length,
      visible_assistant_messages: visible.filter(item => item.role === 'assistant').length,
      non_text_parts: nonTextParts.length, classification_counts: counts
    },
    nodes: auditRows
  };
  fs.writeFileSync
  (
    files['AUDIT.json'], JSON.stringify(audit, null, 2),
    {flag: 'wx', mode: 0o600}
  );
  const readme = `# ChatGPT conversation export\n\nTitle: \`${title}\`\n\n` +
    `Conversation ID: \`${data.conversation_id}\`\n\n## Files\n\n` +
    '- `conversation.raw.json.gz`: captured source data, compressed.\n' +
    '- `TRANSCRIPT.md`: human-readable textual conversation.\n' +
    '- `VISIBLE_MESSAGES.jsonl`: all messages classified as user-visible, including their full message objects.\n' +
    '- `NON_TEXT_PARTS.json`: non-string multimodal parts extracted from visible messages.\n' +
    '- `AUDIT.json`: classification of every node in the snapshot.\n' +
    '- `SHA256SUMS`: integrity hashes.\n\n## Snapshot\n\n' +
    `- RAW uncompressed bytes: ${rawBytes.length}\n` +
    `- RAW SHA-256: \`${_sha256(rawBytes)}\`\n` +
    `- Mapping nodes: ${Object.keys(mapping).length}\n` +
    `- Active-branch nodes: ${nodeIds.length}\n` +
    `- Nodes outside active branch: ${Object.keys(mapping).length - nodeIds.length}\n` +
    `- Visible messages: ${visible.length}\n` +
    `- Non-text visible parts: ${nonTextParts.length}\n\n` +
    (linear ?
      '\nSource is a shared-page linear_conversation; the mapping used for this\n' +
      'transcript is an in-memory projection. RAW keeps the captured linear\n' +
      'data, not an invented original mapping or inactive branches.\n\n' : '\n') +
    '`TRANSCRIPT.md` excludes tool traffic and internal reasoning. Captured\n' +
    'source data remains in `conversation.raw.json.gz`.\n';
  fs.writeFileSync(files['README.md'], readme, {flag: 'wx', mode: 0o600});
  const hashedFiles =
  [
    'conversation.raw.json.gz', 'TRANSCRIPT.md', 'VISIBLE_MESSAGES.jsonl',
    'NON_TEXT_PARTS.json', 'AUDIT.json', 'README.md'
  ];
  const sums = [`${_sha256(rawBytes)}  conversation.raw.json (uncompressed captured snapshot)`];
  for (const name of hashedFiles) sums.push(`${_sha256(fs.readFileSync(files[name]))}  ${name}`);
  fs.writeFileSync(files['SHA256SUMS'], sums.join('\n') + '\n', {flag: 'wx', mode: 0o600});
  const zipPath = outdir + '.zip';
  _zipFiles(zipPath, [...hashedFiles, 'SHA256SUMS'].map(name => files[name]));
  const result =
  {
    outdir, zip: zipPath, title, conversation_id: data.conversation_id,
    raw_bytes: rawBytes.length, raw_sha256: _sha256(rawBytes),
    mapping_nodes: Object.keys(mapping).length, active_nodes: nodeIds.length,
    visible_messages: visible.length, non_text_parts: nonTextParts.length
  };
  return result;
}

function _requestJson(host, port)
{
  const request = new Promise
  (
    (resolve, reject) =>
    {
      const req = http.get
      (
        {hostname: host, port, path: '/json/list', timeout: 3000},
        response =>
        {
          if (response.statusCode !== 200)
          {
            response.resume();
            reject(_failure('targets-http-failed', `CDP /json/list returned ${response.statusCode}`));
            return;
          }
          let data = '';
          response.setEncoding('utf8');
          response.on('data', chunk => { data += chunk; });
          response.on
          (
            'end',
            () =>
            {
              try { resolve(JSON.parse(data)); }
              catch (error) { reject(_failure('targets-json-invalid', 'invalid /json/list response', error)); }
            }
          );
        }
      );
      req.on('timeout', () => req.destroy(_failure('targets-http-timeout', 'CDP discovery timed out')));
      req.on('error', error => reject(_failure('targets-connect-failed', `${host}:${port}`, error)));
    }
  );
  return request;
}

class _Cdp
{
  constructor(url)
  {
    this.url = url;
    this.pending = new Map();
    this.events = [];
    this.waiters = [];
    this.nextId = 0;
    this.closed = false;
  }

  async connect()
  {
    if (typeof WebSocket !== 'function')
      throw _failure('websocket-unavailable', 'native WebSocket requires Node.js 22+');
    await new Promise
    (
      (resolve, reject) =>
      {
        const socket = new WebSocket(this.url);
        this.socket = socket;
        let opened = false;
        socket.addEventListener('open', () => { opened = true; resolve(); }, {once: true});
        socket.addEventListener('message', event => this._message(event.data));
        socket.addEventListener
        (
          'error',
          event =>
          {
            if (!opened) reject(_failure('websocket-connect-failed', this.url, event.error));
          }
        );
        socket.addEventListener('close', () => this._close());
      }
    );
  }

  _close()
  {
    this.closed = true;
    for (const request of this.pending.values())
    {
      clearTimeout(request.timer);
      request.reject(_failure('websocket-disconnected', 'renderer WebSocket closed'));
    }
    this.pending.clear();
    for (const waiter of this.waiters)
    {
      clearTimeout(waiter.timer);
      waiter.reject(_failure('websocket-disconnected', 'renderer WebSocket closed'));
    }
    this.waiters.length = 0;
  }

  _message(data)
  {
    let message;
    try { message = JSON.parse(String(data)); }
    catch { return; }
    if (Object.hasOwn(message, 'id'))
    {
      const request = this.pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(message.id);
      if (message.error)
        request.reject(_failure('cdp-command-failed', `${request.method}: ${JSON.stringify(message.error)}`));
      else request.resolve(message.result || {});
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter)
    {
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    }
    else this.events.push(message);
  }

  call(method, params = {}, timeoutMs = 20000)
  {
    if (this.closed || this.socket?.readyState !== WebSocket.OPEN)
      return Promise.reject(_failure('websocket-not-ready', `cannot call ${method}`));
    const id = ++this.nextId;
    const pending = new Promise
    (
      (resolve, reject) =>
      {
        const timer = setTimeout
        (
          () =>
          {
            this.pending.delete(id);
            reject(_failure('cdp-command-timeout', `${method} timed out`));
          },
          timeoutMs
        );
        this.pending.set(id, {resolve, reject, timer, method});
        this.socket.send(JSON.stringify({id, method, params}));
      }
    );
    return pending;
  }

  nextEvent(timeoutMs = 0)
  {
    if (this.events.length) return Promise.resolve(this.events.shift());
    if (this.closed) return Promise.reject(_failure('websocket-disconnected', 'CDP disconnected'));
    const pending = new Promise
    (
      (resolve, reject) =>
      {
        const waiter = {resolve, reject, timer: null};
        if (timeoutMs > 0)
        {
          waiter.timer = setTimeout
          (
            () =>
            {
              const index = this.waiters.indexOf(waiter);
              if (index >= 0) this.waiters.splice(index, 1);
              reject(_failure('snapshot-timeout', 'no matching snapshot before timeout'));
            },
            timeoutMs
          );
        }
        this.waiters.push(waiter);
      }
    );
    return pending;
  }

  close()
  {
    if (!this.closed) this.socket.close();
    this._close();
  }
}

function _splitTopLevelParams(params)
{
  const pieces = [];
  let depth = 0;
  let current = '';
  for (const ch of params)
  {
    if ('{[('.includes(ch)) depth++;
    else if ('}])'.includes(ch)) depth--;
    if (ch === ',' && depth === 0)
    {
      pieces.push(current.trim());
      current = '';
    }
    else current += ch;
  }
  pieces.push(current.trim());
  return pieces;
}

function _lineColumn(source, offset)
{
  const before = source.slice(0, offset);
  const line = (before.match(/\n/g) || []).length;
  const last = before.lastIndexOf('\n');
  return {line, column: last < 0 ? offset : offset - last - 1};
}

async function _discoverSnapshotFunction(cdp, notify)
{
  await cdp.call('Runtime.enable');
  await cdp.call('Debugger.enable');
  await cdp.call('Runtime.evaluate', {expression: '1', returnByValue: true});
  const scripts = new Map();
  // Equivalent of draining the queued scriptParsed stream in the Python CDP.
  while (cdp.events.length)
  {
    const event = cdp.events.shift();
    if (event.method === 'Debugger.scriptParsed')
      scripts.set(event.params.scriptId, event.params.url || '');
  }
  // The original exporter inspected app:// bundles only. A Chromium page may
  // load the same applicator from an HTTPS script, so include web script URLs.
  const candidates = [...scripts].filter
  (
    ([, url]) => /^(?:app|https?|file):/.test(url) && url.includes('.js')
  );
  const priority = url => url.includes('app-initial') ? 0 : url.includes('conversation') ? 1 : 2;
  candidates.sort((a, b) => priority(a[1]) - priority(b[1]));
  notify('debug', 'script-candidates', {count: candidates.length});
  for (const [scriptId, url] of candidates)
  {
    let source;
    try { source = (await cdp.call('Debugger.getScriptSource', {scriptId}, 60000)).scriptSource || ''; }
    catch { continue; }
    let marker = source.indexOf('mergeActiveBranch');
    while (marker >= 0)
    {
      const windowStart = Math.max(0, marker - 500);
      const window = source.slice(windowStart, marker + 250);
      const pattern = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\((.*?)\)\{/gs;
      const matches = [...window.matchAll(pattern)].reverse();
      for (const match of matches)
      {
        if (!match[2].includes('mergeActiveBranch')) continue;
        const pieces = _splitTopLevelParams(match[2]);
        if (pieces.length < 2 || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(pieces[1])) continue;
        const bodyOffset = windowStart + match.index + match[0].length;
        const position = _lineColumn(source, bodyOffset);
        const hook =
        {
          function_name: match[1], conversation_arg: pieces[1],
          script_id: scriptId, url, ...position
        };
        return hook;
      }
      marker = source.indexOf('mergeActiveBranch', marker + 1);
    }
  }
  throw _failure('snapshot-hook-not-found', 'no snapshot applicator matched mergeActiveBranch in page JavaScript');
}

async function _captureSnapshot(cdp, selected, hook, notify, timeoutMs)
{
  const breakpoint = await cdp.call
  (
    'Debugger.setBreakpointByUrl',
    {url: hook.url, lineNumber: hook.line, columnNumber: hook.column}
  );
  notify
  (
    'info', 'breakpoint-armed',
    {id: breakpoint.breakpointId, url: hook.url, line: hook.line + 1}
  );
  await cdp.call('Page.enable');
  if (selected.thread_id)
  {
    const route = `/work/conversation/${selected.thread_id}`;
    const target = 'app://-/index.html?initialRoute=' + encodeURIComponent(route);
    try
    {
      await cdp.call('Page.navigate', {url: target});
      notify('info', 'conversation-navigation', {conversationId: selected.thread_id});
    }
    catch (error)
    {
      notify('warn', 'navigation-failed-open-manually', {message: error.message});
    }
  }
  else
  {
    // Host/port-only mode: retrigger the current renderer snapshot on reload.
    // If the app changes to another route, opening a chat manually also works.
    try
    {
      await cdp.call('Page.reload');
      notify('info', 'current-renderer-reloaded', {});
    }
    catch (error)
    {
      notify('warn', 'reload-failed-open-manually', {message: error.message});
    }
  }
  const start = Date.now();
  try
  {
    for (;;)
    {
      const remaining = timeoutMs > 0 ? Math.max(1, timeoutMs - (Date.now() - start)) : 0;
      if (timeoutMs > 0 && Date.now() - start >= timeoutMs)
        throw _failure('snapshot-timeout', 'snapshot not captured');
      const event = await cdp.nextEvent(remaining);
      if (event.method !== 'Debugger.paused') continue;
      let raw = null;
      let captured = null;
      try
      {
        for (const frame of event.params?.callFrames || [])
        {
          try
          {
            const probe = await cdp.call
            (
              'Debugger.evaluateOnCallFrame',
              {
                callFrameId: frame.callFrameId,
                expression: `${hook.conversation_arg} && ${hook.conversation_arg}.conversation_id`,
                returnByValue: true, silent: true
              }
            );
            const cid = probe.result?.value;
            if (!cid || (selected.thread_id && cid !== selected.thread_id)) continue;
            const result = await cdp.call
            (
              'Debugger.evaluateOnCallFrame',
              {
                callFrameId: frame.callFrameId,
                expression: `JSON.stringify(${hook.conversation_arg})`,
                returnByValue: true, silent: true
              },
              60000
            );
            raw = result.result?.value;
            if (typeof raw !== 'string')
              throw _failure('snapshot-serialize-failed', 'JSON.stringify did not return a string');
            captured = cid;
            break;
          }
          catch (error)
          {
            if (error.code === 'chatgpt-export.snapshot-serialize-failed') throw error;
            notify('debug', 'frame-probe-skipped', {message: error.message});
          }
        }
      }
      finally
      {
        // Even a failed snapshot evaluation must not leave the app frozen.
        await cdp.call('Debugger.resume');
      }
      if (typeof raw === 'string')
      {
        notify('info', 'snapshot-captured', {conversationId: captured, bytes: Buffer.byteLength(raw)});
        return raw;
      }
    }
  }
  finally
  {
    if (breakpoint.breakpointId)
      await cdp.call('Debugger.removeBreakpoint', {breakpointId: breakpoint.breakpointId}).catch(() => {});
  }
}

// Browser-side evidence is gathered from the already rendered public share.
// Only page loader values or React Router inline stream chunks are inspected:
// never infer a conversation from visible DOM fragments.
const _shareEvidenceExpression = String.raw`(() =>
{
  const sources =
  [
    ['remix-loader', globalThis.__remixContext?.state?.loaderData],
    ['router-loader', globalThis.__reactRouterContext?.state?.loaderData],
    ['next-loader', globalThis.__NEXT_DATA__?.props?.pageProps?.serverResponse?.data]
  ];
  const availableSources = sources.filter(([, value]) => value != null).map(([name]) => name);
  // Return only a recognized conversation, never unrelated loader/session state.
  const locate = root =>
  {
    const seen = new WeakSet();
    const stack = [[root, 0]];
    let visited = 0;
    while (stack.length && ++visited < 20000)
    {
      const [node, depth] = stack.pop();
      if (!node || typeof node !== 'object' || seen.has(node) || depth > 40) continue;
      seen.add(node);
      if (!Array.isArray(node) &&
          ((node.mapping && node.current_node) || Array.isArray(node.linear_conversation)))
        return node;
      for (const child of Object.values(node))
      {
        if (child && typeof child === 'object') stack.push([child, depth + 1]);
      }
    }
    return null;
  };
  const roots = sources.map(([name, value]) => [name, locate(value)]);
  const chunks = [];
  const marker = 'window.__reactRouterContext.streamController.enqueue(';
  for (const script of document.querySelectorAll('script'))
  {
    const text = script.textContent || '';
    let start = 0;
    while (chunks.length < 128)
    {
      const position = text.indexOf(marker, start);
      if (position < 0) break;
      let index = position + marker.length;
      while (/\s/.test(text[index] || '')) index++;
      if (text[index] !== '"')
      {
        start = index + 1;
        continue;
      }
      const literalStart = index++;
      while (index < text.length)
      {
        if (text[index] === '\\') index += 2;
        else if (text[index++] === '"') break;
      }
      try
      {
        const chunk = JSON.parse(text.slice(literalStart, index));
        if (typeof chunk === 'string' && chunk.startsWith('[')) chunks.push(chunk);
      }
      catch
      {
        // Another enqueue may contain unrelated or incomplete JavaScript.
      }
      start = index;
    }
  }
  return JSON.stringify({roots, availableSources, chunks, title: document.title || null});
})()`;

function _reviveReactRouterGraph(flat)
{
  if (!Array.isArray(flat) || flat.length < 1 || flat.length > 200000)
    throw _failure('share-stream-invalid', 'invalid React Router stream graph length');
  const cache = new Map();
  function revive(index, depth = 0)
  {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0)
      return index;
    if (index >= flat.length || depth > 200)
      throw _failure('share-stream-invalid', 'invalid graph reference or excessive depth');
    if (cache.has(index)) return cache.get(index);
    const value = flat[index];
    if (!value || typeof value !== 'object') return value;
    const output = Array.isArray(value) ? [] : {};
    cache.set(index, output);
    if (Array.isArray(value))
    {
      for (const item of value) output.push(revive(item, depth + 1));
    }
    else
    {
      for (const [keyRef, valueRef] of Object.entries(value))
      {
        if (!/^_\d+$/.test(keyRef))
          throw _failure('share-stream-invalid', 'unexpected encoded object key');
        const key = revive(Number(keyRef.slice(1)), depth + 1);
        if (typeof key !== 'string' || Object.hasOwn(output, key))
          throw _failure('share-stream-invalid', 'invalid or repeated graph key');
        Object.defineProperty(output, key,
          {value: revive(valueRef, depth + 1), enumerable: true, writable: true, configurable: true});
      }
    }
    return output;
  }
  return revive(0);
}

function _findSharedConversation(value)
{
  const seen = new WeakSet();
  let examined = 0;
  function visit(node, depth)
  {
    if (!node || typeof node !== 'object' || seen.has(node) || depth > 45) return null;
    if (++examined > 250000)
      throw _failure('share-data-too-large', 'excessive shared conversation graph traversal');
    seen.add(node);
    if (!Array.isArray(node))
    {
      if (node.mapping && node.current_node) return {kind: 'mapping', data: node};
      if (Array.isArray(node.linear_conversation)) return {kind: 'linear', data: node};
      // Prefer routing payloads and explicitly named conversation nodes.
      for (const key of ['serverResponse', 'data', 'conversation', 'shared_conversation',
        'loaderData', 'state', 'routes'])
      {
        if (Object.hasOwn(node, key))
        {
          const found = visit(node[key], depth + 1);
          if (found) return found;
        }
      }
      for (const [key, child] of Object.entries(node))
      {
        if (['serverResponse', 'data', 'conversation', 'shared_conversation',
          'loaderData', 'state', 'routes'].includes(key)) continue;
        const found = visit(child, depth + 1);
        if (found) return found;
      }
    }
    else
    {
      if (node.length > 10000 && depth > 4) return null;
      for (const child of node)
      {
        const found = visit(child, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  return visit(value, 0);
}

async function _captureShareSnapshot(cdp, notify, timeoutMs = 12000)
{
  const deadline = Date.now() + timeoutMs;
  let last = {loaderSources: [], streamChunks: 0};
  while (Date.now() < deadline)
  {
    const response = await cdp.call('Runtime.evaluate',
      {expression: _shareEvidenceExpression, returnByValue: true}, 30000);
    if (response.exceptionDetails)
      throw _failure('share-evaluate-failed', 'share loader evaluation raised an exception');
    const value = response.result?.value;
    if (typeof value !== 'string')
      throw _failure('share-evaluate-failed', 'share loader result is not a JSON string');
    const evidence = JSON.parse(value);
    last =
    {
      loaderSources: evidence.availableSources,
      streamChunks: evidence.chunks.length
    };
    for (const [source, root] of evidence.roots)
    {
      const found = _findSharedConversation(root);
      if (found)
      {
        notify('info', 'share-snapshot-captured', {source, kind: found.kind});
        return {raw: JSON.stringify(found.data), title: evidence.title, kind: found.kind};
      }
    }
    for (const chunk of evidence.chunks)
    {
      let decoded;
      try { decoded = _reviveReactRouterGraph(JSON.parse(chunk)); }
      catch (error)
      {
        // Another stream chunk may carry a recognized conversation payload.
        notify('debug', 'share-stream-chunk-unrecognized', {code: error.code || 'invalid-json'});
        continue;
      }
      const found = _findSharedConversation(decoded);
      if (found)
      {
        notify('info', 'share-snapshot-captured', {source: 'react-router-stream', kind: found.kind});
        return {raw: JSON.stringify(found.data), title: evidence.title, kind: found.kind};
      }
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw _failure('share-snapshot-not-found',
    `no mapping/current_node or linear_conversation in share loader; ` +
    `loaderSources=${last.loaderSources.join(',') || 'none'}; streamChunks=${last.streamChunks}`);
}

async function _awaitDocumentReady(cdp, timeoutMs)
{
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline)
  {
    try
    {
      const result = await cdp.call
      (
        'Runtime.evaluate',
        {expression: '({href: location.href, state: document.readyState})', returnByValue: true},
        Math.min(4000, Math.max(1000, deadline - Date.now()))
      );
      const document = result.result?.value;
      if (document?.state === 'complete' && document.href !== 'about:blank') return;
    }
    catch
    {
      // A navigation can briefly replace the JavaScript execution context.
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw _failure('navigation-timeout', 'Chromium document did not finish loading');
}

/** Connect to an already-running renderer over direct CDP TCP. */
async function chatgptExport(host, port, options = {})
{
  if (typeof host !== 'string' || !host.trim())
    throw _failure('host-invalid', 'host must be a non-empty hostname or IP address');
  if (!Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535)
    throw _failure('port-invalid', 'port must be an integer between 1 and 65535');
  const selected =
  {
    thread_id: options.conversationId || null,
    display_title: options.title || null,
    source_created_at: options.createdAt ?? null
  };
  const notify = typeof options.onEvent === 'function' ? options.onEvent :
    (level, type, data) =>
    {
      if (level === 'info' || level === 'warn')
        process.stderr.write(`chatgpt-export ${level} ${type} ${JSON.stringify(data)}\n`);
    };
  const targets = await _requestJson(host, Number(port));
  if (!Array.isArray(targets)) throw _failure('targets-shape-invalid', '/json/list did not return an array');
  const candidates = targets.filter
  (
    target =>
    {
      const isIndex = target.url === 'app://-/index.html';
      const isAppPage = target.url?.startsWith('app://-/index.html');
      const isOverlay = target.url?.includes('avatar-overlay');
      return target.type === 'page' && (isIndex || (isAppPage && !isOverlay));
    }
  );
  // A freshly launched Chromium normally has exactly one about:blank page.
  // Do not select an unrelated tab on an already-running CDP endpoint.
  const renderer = options.url ?
    targets.find(target => target.type === 'page' && target.url === 'about:blank') :
    candidates[0];
  if (!renderer?.webSocketDebuggerUrl)
    throw _failure('renderer-not-found', options.url ?
      'new Chromium page not found on CDP endpoint' :
      'ChatGPT Electron main renderer not found on CDP endpoint');
  // A forwarded CDP endpoint often advertises localhost. Rewrite only the host/port,
  // preserving the provider-returned WebSocket path and target identifier.
  const socketUrl = new URL(renderer.webSocketDebuggerUrl);
  socketUrl.hostname = host;
  socketUrl.port = String(port);
  const cdp = new _Cdp(socketUrl.href);
  await cdp.connect();
  try
  {
    notify('info', 'renderer-attached', {url: renderer.url});
    if (options.url)
    {
      await cdp.call('Page.enable');
      const navigation = await cdp.call('Page.navigate', {url: options.url}, 30000);
      if (navigation.errorText)
        throw _failure('navigation-failed', `Page.navigate: ${navigation.errorText}`);
      notify('info', 'page-navigation', {origin: new URL(options.url).origin});
      await _awaitDocumentReady(cdp, options.navigationTimeoutMs || 30000);
    }
    if (options.url && new URL(options.url).pathname.startsWith('/share/'))
    {
      const shared = await _captureShareSnapshot(cdp, notify,
        options.shareTimeoutMs ?? 12000);
      const result = exportChatgptSnapshot(shared.raw,
        {...selected, display_title: shared.title}, options.outputDir || process.cwd());
      notify('info', 'export-created',
        {directory: result.outdir, zip: result.zip, visibleMessages: result.visible_messages,
          sourceKind: shared.kind});
      return result;
    }
    const hook = await _discoverSnapshotFunction(cdp, notify);
    notify
    (
      'info', 'snapshot-hook-found',
      {functionName: hook.function_name, url: hook.url, line: hook.line + 1}
    );
    const raw = await _captureSnapshot(cdp, selected, hook, notify, options.timeoutMs || 0);
    const result = exportChatgptSnapshot(raw, selected, options.outputDir || process.cwd());
    notify
    (
      'info', 'export-created',
      {directory: result.outdir, zip: result.zip, visibleMessages: result.visible_messages}
    );
    return result;
  }
  finally
  {
    cdp.close();
  }
}

function _requireWebUrl(value)
{
  let url;
  try { url = new URL(value); }
  catch { throw _failure('url-invalid', 'expected an absolute HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(url.protocol))
    throw _failure('url-scheme-unsupported', 'only HTTP(S) URLs can be navigated');
  return url.href;
}

async function _stopChromium(browser)
{
  if (!browser) return;
  const child = browser.child;
  if (child.exitCode === null && child.signalCode === null)
  {
    try
    {
      if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    }
    catch { child.kill('SIGTERM'); }
    await new Promise
    (
      resolve =>
      {
        const timer = setTimeout(resolve, 2000);
        child.once('close', () => { clearTimeout(timer); resolve(); });
      }
    );
    if (child.exitCode === null && child.signalCode === null)
    {
      try
      {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      }
      catch { child.kill('SIGKILL'); }
      await browser.exited;
    }
  }
  // Only our mkdtemp-owned profile is removed, never a pre-existing browser profile.
  fs.rmSync(browser.profileDir, {recursive: true, force: true});
}

async function _launchChromium(outputDir, options, notify)
{
  const profileDir = fs.mkdtempSync(path.join(outputDir, '.chatgpt-export-chromium-'));
  const binary = options.chromium || 'chromium';
  const args =
  [
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ];
  const headless = options.headless ??
    (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY);
  if (headless) args.push('--headless=new');
  args.push('about:blank');
  const child = spawn
  (
    binary, args,
    {stdio: ['ignore', 'ignore', 'pipe'], detached: process.platform !== 'win32'}
  );
  let stderr = '';
  child.stderr.on('data', bytes => { stderr = (stderr + bytes.toString()).slice(-4096); });
  const exited = new Promise(resolve => child.once('close', resolve));
  // Read the actual ephemeral port selected by Chromium, not a guessed fixed port.
  const browser = {child, exited, profileDir};
  let startupError = null;
  child.once('error', error => { startupError = error; });
  try
  {
    const deadline = Date.now() + (options.startupTimeoutMs || 20000);
    while (Date.now() < deadline)
    {
      if (startupError)
        throw _failure('chromium-launch-failed', `cannot execute ${binary}`, startupError);
      if (child.exitCode !== null || child.signalCode !== null)
        throw _failure('chromium-exited', stderr || `Chromium exited during startup: ${child.exitCode}`);
      const portFile = path.join(profileDir, 'DevToolsActivePort');
      if (fs.existsSync(portFile))
      {
        const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
        if (Number.isInteger(port) && port > 0 && port <= 65535)
        {
          try
          {
            const targets = await _requestJson('127.0.0.1', port);
            if (Array.isArray(targets) && targets.some(target => target.type === 'page'))
            {
              notify('info', 'chromium-cdp-ready', {port, headless});
              return {...browser, port};
            }
          }
          catch
          {
            // The endpoint is not necessarily listening the instant the file appears.
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw _failure('chromium-startup-timeout', `no CDP TCP endpoint from ${binary}; ${stderr}`);
  }
  catch (error)
  {
    await _stopChromium(browser);
    throw error;
  }
}

/** Start Chromium, navigate a URL, then run the original CDP snapshot exporter. */
async function exportChatgptUrl(url, analysisDir, options = {})
{
  const targetUrl = _requireWebUrl(url);
  if (typeof analysisDir !== 'string' || !analysisDir.trim())
    throw _failure('analysis-dir-invalid', 'analysis directory must be a pathname');
  const outputDir = path.resolve(analysisDir);
  fs.mkdirSync(outputDir, {recursive: true, mode: 0o700});
  const notify = typeof options.onEvent === 'function' ? options.onEvent :
    (level, type, data) =>
    {
      if (level === 'info' || level === 'warn')
        process.stderr.write(`chatgpt-export ${level} ${type} ${JSON.stringify(data)}\n`);
    };
  const browser = await _launchChromium(outputDir, options, notify);
  const signal = () =>
  {
    // Terminate the owned browser; the outstanding CDP work will fail and
    // release its resources through the same finally path.
    try
    {
      if (process.platform !== 'win32') process.kill(-browser.child.pid, 'SIGTERM');
      else browser.child.kill('SIGTERM');
    }
    catch { browser.child.kill('SIGTERM'); }
  };
  process.on('SIGINT', signal);
  process.on('SIGTERM', signal);
  try
  {
    return await chatgptExport('127.0.0.1', browser.port,
      {...options, url: targetUrl, outputDir, onEvent: notify});
  }
  finally
  {
    process.off('SIGINT', signal);
    process.off('SIGTERM', signal);
    await _stopChromium(browser);
  }
}

module.exports = {chatgptExport, exportChatgptSnapshot, exportChatgptUrl};

if (require.main === module)
{
  const [url, analysisDir, ...extra] = process.argv.slice(2);
  if (!url || !analysisDir || extra.length)
  {
    process.stderr.write('Usage: node <path-to-lib> <url> <analisys-dir>\n');
    process.exitCode = 2;
  }
  else
  {
    exportChatgptUrl(url, analysisDir)
      .then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
      .catch
      (
        error =>
        {
          process.stderr.write(`${error.code || 'chatgpt-export.unexpected'}: ${error.message}\n`);
          process.exitCode = 1;
        }
      );
  }
}
