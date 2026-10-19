'use strict';

// Direct port of the ChatGPT macOS exporter from CDP attachment onward.
// This library never launches ChatGPT and never reads the local SQLite catalog.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

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

/** Convert an already-captured JSON snapshot into the original forensic export. */
function exportChatgptSnapshot(rawJson, selected = {}, outputRoot = process.cwd())
{
  const rawBytes = Buffer.from(rawJson, 'utf8');
  const data = JSON.parse(rawJson);
  const mapping = data.mapping || {};
  const current = data.current_node;
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
      kind: 'ChatGPT renderer conversation snapshot captured via CDP',
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
    '- `conversation.raw.json.gz`: complete captured conversation snapshot, compressed.\n' +
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
    '`TRANSCRIPT.md` excludes tool traffic and internal reasoning. The complete\n' +
    'captured snapshot remains preserved in `conversation.raw.json.gz`.\n';
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
  const candidates = [...scripts].filter(([, url]) => url.startsWith('app://') && url.includes('.js'));
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
  throw _failure('snapshot-hook-not-found', 'no snapshot applicator matched mergeActiveBranch in app JavaScript');
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

/** Connect to an already-running ChatGPT Electron renderer over direct CDP TCP. */
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
  const renderer = candidates[0];
  if (!renderer?.webSocketDebuggerUrl)
    throw _failure('renderer-not-found', 'ChatGPT Electron main renderer not found on CDP endpoint');
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

module.exports = {chatgptExport, exportChatgptSnapshot};

if (require.main === module)
{
  const [host, port, conversationId, outputDir] = process.argv.slice(2);
  if (!host || !port)
  {
    process.stderr.write('Usage: nodejs chatgpt-export.lib.js <host> <port> [conversation-id] [output-dir]\n');
    process.exitCode = 2;
  }
  else
  {
    chatgptExport(host, port, {conversationId, outputDir})
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
