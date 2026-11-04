'use strict';

// Chromium CDP capture for manually operated browsers. No Playwright dependency.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {performance} = require('node:perf_hooks');

const _topics = ['lifecycle', 'interaction', 'dom', 'network', 'console', 'performance', 'error'];
const _observer = String.raw`(() => {
  if (globalThis.__mWebAnalyzeInstalled) return;
  Object.defineProperty(globalThis, '__mWebAnalyzeInstalled', {value: true});
  const notify = (kind, detail) => {
    try { globalThis.__mWebAnalyzeNotify(JSON.stringify({kind, detail, time: performance.now()})); }
    catch (_) { /* The page may be detaching. */ }
  };
  const shape = node => {
    if (!node || node.nodeType !== 1) return null;
    const parent = node.parentElement;
    let index = 1;
    if (parent) for (let other = node.previousElementSibling; other; other = other.previousElementSibling)
      if (other.localName === node.localName) index++;
    return {tag: node.localName, nth: index, role: node.getAttribute('role') || undefined,
      type: node.localName === 'input' ? node.type : undefined};
  };
  const pointer = event => ({target: shape(event.target), x: Math.round(event.clientX),
    y: Math.round(event.clientY), button: event.button, buttons: event.buttons,
    modifiers: [event.ctrlKey, event.altKey, event.shiftKey, event.metaKey]});
  const keyCategory = event => {
    if (['Enter','Tab','Escape','Backspace','Delete','ArrowUp','ArrowDown',
      'ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key)) return event.key;
    return event.key && event.key.length === 1 ? 'character' : 'other';
  };
  document.addEventListener('pointerdown', e => notify('pointerdown', pointer(e)), true);
  document.addEventListener('pointerup', e => notify('pointerup', pointer(e)), true);
  document.addEventListener('click', e => notify('click', pointer(e)), true);
  document.addEventListener('dblclick', e => notify('dblclick', pointer(e)), true);
  document.addEventListener('submit', e => notify('submit', {target: shape(e.target)}), true);
  document.addEventListener('focusin', e => notify('focus', {target: shape(e.target)}), true);
  document.addEventListener('keydown', e => notify('keydown', {target: shape(e.target),
    keyCategory: keyCategory(e), modifiers: [e.ctrlKey,e.altKey,e.shiftKey,e.metaKey]}), true);
  document.addEventListener('input', e => notify('input', {target: shape(e.target),
    inputType: e.inputType || null, valueLength: e.target && typeof e.target.value === 'string'
      ? e.target.value.length : null}), true);
  document.addEventListener('change', e => notify('change', {target: shape(e.target)}), true);
  let lastScroll = 0;
  document.addEventListener('scroll', e => {
    const now = performance.now(); if (now - lastScroll < 80) return; lastScroll = now;
    notify('scroll', {target: shape(e.target), x: window.scrollX, y: window.scrollY});
  }, true);
  let lastWheel = 0;
  document.addEventListener('wheel', e => {
    const now = performance.now(); if (now - lastWheel < 40) return; lastWheel = now;
    notify('wheel', {target: shape(e.target), dx: e.deltaX, dy: e.deltaY});
  }, {capture: true, passive: true});
  document.addEventListener('visibilitychange', () => notify('visibility', {state: document.visibilityState}));
  window.addEventListener('hashchange', () => notify('hashchange', {}));
  window.addEventListener('popstate', () => notify('popstate', {}));
  window.addEventListener('error', e => notify('page-error', {type: e.type,
    source: e.filename || null, line: e.lineno || null, column: e.colno || null}));
  window.addEventListener('unhandledrejection', () => notify('unhandled-rejection', {}));
  const arm = () => {
    if (!document.documentElement) { setTimeout(arm, 20); return; }
    const observer = new MutationObserver(records => {
      const counts = {added: 0, removed: 0, attributes: 0, text: 0};
      const sample = [];
      for (const r of records) {
        if (r.type === 'childList') {
          counts.added += r.addedNodes.length; counts.removed += r.removedNodes.length;
        } else if (r.type === 'attributes') counts.attributes++;
        else if (r.type === 'characterData') counts.text++;
        if (sample.length < 12) sample.push({type: r.type,
          target: shape(r.target.nodeType === 1 ? r.target : r.target.parentElement),
          attribute: r.attributeName || undefined});
      }
      notify('mutation', {counts, records: records.length, sample});
    });
    observer.observe(document.documentElement, {subtree: true, childList: true,
      attributes: true, characterData: true});
  };
  // Separate sensitive chronology from the deliberately lossy diagnostics.
  // Node identity is stable within this document; CDP executionContextId
  // and the document's timeOrigin disambiguate independent documents.
  const nodeIds = new WeakMap();
  const observedRoots = new WeakSet();
  const history =
  {
    batches:0,
    records:0,
    roots:0,
    closedRootsIntercepted:0,
    notificationsFailed:0,
    serializedTruncated:0,
    observerFailures:0,
    attachShadowHook:'unavailable',
    installedAt:performance.now(),
    documentAtInstall:!!document.documentElement
  };
  let nextNodeId = 0;
  const id = node =>
  {
    if (!node) return null;
    if (!nodeIds.has(node)) nodeIds.set(node, ++nextNodeId);
    return nodeIds.get(node);
  };
  const clip = value =>
  {
    if (typeof value !== 'string') return {value:null, length:null, truncated:false};
    const limit = 256 * 1024;
    if (value.length > limit)
    {
      history.serializedTruncated++;
      return {value:value.slice(0, limit), length:value.length, truncated:true};
    }
    return {value, length:value.length, truncated:false};
  };
  const nodeInfo = node =>
  {
    if (!node) return null;
    let html = null;
    let text = null;
    try
    {
      if (node.nodeType === Node.ELEMENT_NODE) html = clip(node.outerHTML);
      else if (node.nodeType === Node.TEXT_NODE ||
        node.nodeType === Node.COMMENT_NODE)
        text = clip(node.nodeValue);
      else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE)
        html = clip(node.innerHTML || null);
    }
    catch (_) { history.observerFailures++; }
    return {
      id:id(node),
      nodeType:node.nodeType,
      name:node.nodeName,
      parentId:id(node.parentNode),
      html,
      text
    };
  };
  const emitHistory = (type, detail) =>
  {
    const payload =
    {
      kind:'dom-history',
      time:performance.now(),
      detail:{
        type,
        documentURL:location.href,
        timeOrigin:performance.timeOrigin,
        ...detail
      }
    };
    try
    {
      globalThis.__mWebAnalyzeNotify(JSON.stringify(payload));
      return true;
    }
    catch (_)
    {
      history.notificationsFailed++;
      return false;
    }
  };
  let historyObserver;
  const observeRoot = (root, reason) =>
  {
    if (!root || observedRoots.has(root)) return;
    try
    {
      historyObserver.observe(root, {
        subtree:true,
        childList:true,
        attributes:true,
        attributeOldValue:true,
        characterData:true,
        characterDataOldValue:true
      });
      observedRoots.add(root);
      history.roots++;
      emitHistory('root-observed', {
        root:nodeInfo(root),
        reason,
        host:nodeInfo(root.host || null),
        mode:root.mode || null
      });
    }
    catch (_)
    {
      history.observerFailures++;
      emitHistory('observation-error', {operation:'observe-root', reason});
    }
  };
  const scanOpenRoots = node =>
  {
    if (!node) return;
    const visit = current =>
    {
      if (current.nodeType === Node.ELEMENT_NODE && current.shadowRoot)
      {
        observeRoot(current.shadowRoot, 'discovered-open-shadow');
        visit(current.shadowRoot);
      }
      for (let child = current.firstChild; child; child = child.nextSibling)
        visit(child);
    };
    visit(node);
  };
  historyObserver = new MutationObserver(records =>
  {
    const changes = [];
    for (const record of records)
    {
      const change =
      {
        order:++history.records,
        type:record.type,
        target:nodeInfo(record.target)
      };
      if (record.type === 'childList')
      {
        change.added = Array.from(record.addedNodes, nodeInfo);
        change.removed = Array.from(record.removedNodes, nodeInfo);
        change.previousSiblingId = id(record.previousSibling);
        change.nextSiblingId = id(record.nextSibling);
        for (const node of record.addedNodes) scanOpenRoots(node);
      }
      else if (record.type === 'attributes')
      {
        change.name = record.attributeName;
        change.namespace = record.attributeNamespace;
        change.previous = clip(record.oldValue);
        change.current = clip(record.target.getAttributeNS(
          record.attributeNamespace, record.attributeName));
      }
      else if (record.type === 'characterData')
      {
        change.previous = clip(record.oldValue);
        change.current = clip(record.target.nodeValue);
      }
      changes.push(change);
    }
    history.batches++;
    emitHistory('mutation-batch', {
      batch:history.batches,
      records:changes,
      recordsObserved:history.records,
      truncatedValues:history.serializedTruncated
    });
  });
  observeRoot(document, 'document-start-or-late-attach');
  scanOpenRoots(document);
  try
  {
    const original = Element.prototype.attachShadow;
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype, 'attachShadow');
    if (typeof original !== 'function' || !descriptor ||
      !descriptor.configurable)
      throw Error('attachShadow cannot be wrapped');
    Object.defineProperty(Element.prototype, 'attachShadow', {
      ...descriptor,
      value:function(options)
      {
        const root = Reflect.apply(original, this, [options]);
        observeRoot(root, 'attachShadow');
        if (options?.mode === 'closed') history.closedRootsIntercepted++;
        emitHistory('shadow-attached', {
          host:nodeInfo(this),
          root:nodeInfo(root),
          mode:options?.mode || null
        });
        return root;
      }
    });
    history.attachShadowHook = 'installed';
  }
  catch (_)
  {
    history.attachShadowHook = 'unavailable';
    history.observerFailures++;
    emitHistory('observation-error', {operation:'attach-shadow-hook'});
  }
  Object.defineProperty(globalThis, '__mWebAnalyzeDomHistoryReport', {
    configurable:true,
    value:() => ({
      ...history,
      hookStillInstalled:Element.prototype.attachShadow !== undefined &&
        Element.prototype.attachShadow !== null &&
        Element.prototype.attachShadow !== undefined &&
        history.attachShadowHook === 'installed',
      currentNodeIdentities:nextNodeId,
      currentDocumentURL:location.href,
      timeOrigin:performance.timeOrigin
    })
  });
  emitHistory('observer-installed', {
    observerStatus:history.attachShadowHook,
    documentAtInstall:history.documentAtInstall,
    documentNode:nodeInfo(document)
  });
  arm();
  try {
    const supported = PerformanceObserver.supportedEntryTypes || [];
    for (const kind of ['navigation','resource','paint','largest-contentful-paint','longtask','layout-shift']) {
      if (!supported.includes(kind)) continue;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) notify('performance', {
          entryType: entry.entryType, name: entry.name, startTime: entry.startTime,
          duration: entry.duration, transferSize: entry.transferSize || 0});
      }).observe({type: kind, buffered: true});
    }
  } catch (_) { notify('instrumentation-warning', {feature: 'performance'}); }
  notify('instrumented', {readyState: document.readyState});
})()`;

function _safeUrl(value) {
  if (typeof value !== 'string') return undefined;
  try {
    const u = new URL(value);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol)) return u.protocol + '[redacted]';
    return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
  } catch (_) { return '[non-url]'; }
}

function _failure(code, message, cause) {
  const error = new Error(`web-analyze.${code}: ${message}`, cause ? {cause} : undefined);
  error.code = `web-analyze.${code}`;
  return error;
}

function _recording(outputDir) {
  // Existing analysis directories are valid, but existing evidence is never overwritten.
  fs.mkdirSync(outputDir, {recursive: true, mode: 0o700});
  for (const name of [..._topics.map(topic => `${topic}.jsonl`), 'summary.json',
    'resources.jsonl', 'scripts.jsonl', 'network-details.jsonl',
    'cdp-wire.jsonl', 'dom-mutations.jsonl', 'cdp-capabilities.json', 'cdp-protocol.json',
    'resources', 'scripts']) {
    if (fs.existsSync(path.join(outputDir, name)))
      throw _failure('existing-evidence', `analysis directory already contains ${name}`);
  }
  const begin = performance.now();
  const streams = Object.create(null);
  const counts = Object.fromEntries(_topics.map(topic => [topic, 0]));
  const dropped = Object.fromEntries(_topics.map(topic => [topic, 0]));
  for (const topic of _topics) {
    const filename = path.join(outputDir, `${topic}.jsonl`);
    const fd = fs.openSync(filename, 'wx', 0o600);
    streams[topic] = fs.createWriteStream(filename, {fd, autoClose: true, highWaterMark: 1 << 20});
  }
  let sequence = 0;
  let finalized = false;
  function write(topic, type, data = {}) {
    if (finalized) return;
    const stream = streams[topic];
    if (!stream) return;
    // A bounded sink explicitly reports drops instead of silently claiming lossless capture.
    if (stream.writableLength > (8 << 20)) { dropped[topic]++; return; }
    const record = {sequence: ++sequence, timestamp: new Date().toISOString(),
      elapsedMs: Math.round((performance.now() - begin) * 1000) / 1000,
      topic, type, ...data};
    stream.write(JSON.stringify(record) + '\n');
    counts[topic]++;
  }
  async function finish(extra = {}) {
    if (finalized) return;
    write('lifecycle', 'capture.stopping');
    finalized = true;
    await Promise.all(Object.values(streams).map(stream => new Promise((resolve, reject) => {
      stream.end(error => error ? reject(error) : resolve());
    })));
    const summary = {totalEvents: sequence, counts, dropped, durationMs: performance.now() - begin,
      finishedAt: new Date().toISOString(), ...extra};
    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n',
      {flag: 'wx', mode: 0o600});
    return summary;
  }
  return {write, finish, counts, dropped};
}

function _wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }


/** Raw CDP responses and compiled scripts; outputs are deliberately sensitive. */
class _ResourceArchive {
  constructor(directory, logger) {
    this.directory = directory;
    this.logger = logger;
    this.open = new Map();
    this.scripts = new Set();
    this.pending = new Set();
    this.reads = new Map();
    this.networkConfig = [];
    this.streamSupported = null;
    this.streams = new Map();
    this.streamBytes = 0;
    this.statsPartialNote = null;
    this.lastNetworkEvent = performance.now();
    this.finalized = false;
    this.stats = {requests: 0, saved: 0, bytes: 0, failed: 0, redirects: 0,
      scriptsObserved: 0, scriptsSaved: 0, scriptsFailed: 0,
      partialStreams:0};
    fs.mkdirSync(path.join(directory, 'resources'), {mode: 0o700});
    fs.mkdirSync(path.join(directory, 'scripts'), {mode: 0o700});
    this.domFd = fs.openSync(path.join(directory, 'dom-mutations.jsonl'), 'wx', 0o600);
    this.domStatus = {events:0, batches:0, records:0, bytes:0,
      truncatedValues:0, notificationFailures:0, errors:[]};
    this.wireFd = fs.openSync(path.join(directory, 'cdp-wire.jsonl'), 'wx', 0o600);
    this.wireStatus = {packets:0, inbound:0, outbound:0, bytes:0, errors:[]};
    this.detailsFd = fs.openSync(path.join(directory, 'network-details.jsonl'), 'wx', 0o600);
    this.responsesFd = fs.openSync(path.join(directory, 'resources.jsonl'), 'wx', 0o600);
    this.scriptsFd = fs.openSync(path.join(directory, 'scripts.jsonl'), 'wx', 0o600);
  }
  _key(session, id) { return session + ':' + id; }
  domHistory(session, targetId, executionContextId, event)
  {
    if (this.finalized) return;
    const row =
    {
      sequence:this.domStatus.events + 1,
      recordedAt:new Date().toISOString(),
      session,
      targetId,
      executionContextId,
      pageTime:event.time,
      detail:event.detail
    };
    const line = JSON.stringify(row) + '\n';
    try
    {
      const expected = Buffer.byteLength(line);
      const written = fs.writeSync(this.domFd, line);
      if (expected !== written)
        throw _failure('dom-history-short-write',
          'DOM event write was shorter than serialized event');
      this.domStatus.events++;
      this.domStatus.bytes += expected;
      if (event.detail?.type === 'mutation-batch')
      {
        this.domStatus.batches++;
        this.domStatus.records += event.detail.records?.length || 0;
        this.domStatus.truncatedValues = Math.max(
          this.domStatus.truncatedValues,
          event.detail.truncatedValues || 0);
      }
      if (event.detail?.type === 'observer-installed' &&
          event.detail.documentAtInstall)
        this.domStatus.lateDocumentInstall = (this.domStatus.lateDocumentInstall || 0) + 1;
    }
    catch (error)
    {
      this.domStatus.errors.push({
        sequence:row.sequence,
        code:error.code || 'dom-history-write-failed'
      });
      this.logger.write('error', 'dom.history-write-failed', {
        code:error.code || 'dom-history-write-failed',
        sequence:row.sequence
      });
    }
  }
  wire(direction, raw)
  {
    if (this.finalized) return;
    const sequence = this.wireStatus.packets + 1;
    const row = JSON.stringify({
      sequence,
      timestamp:new Date().toISOString(),
      direction,
      raw
    }) + '\n';
    try
    {
      const expectedBytes = Buffer.byteLength(row);
      const writtenBytes = fs.writeSync(this.wireFd, row);
      if (writtenBytes !== expectedBytes)
        throw _failure('wire-short-write',
          'CDP packet ledger wrote ' + writtenBytes + '/' + expectedBytes + ' bytes');
      this.wireStatus.packets = sequence;
      this.wireStatus.bytes += Buffer.byteLength(raw);
      if (direction === 'inbound') this.wireStatus.inbound++;
      else if (direction === 'outbound') this.wireStatus.outbound++;
    }
    catch (error)
    {
      this.wireStatus.errors.push({
        sequence,
        code:error.code || 'write-failed',
        direction
      });
      // Never represent an incomplete recording as a lossless capture.
      this.logger.write('error', 'cdp.wire-write-failed', {
        code:error.code || 'write-failed',
        sequence
      });
    }
  }
  details(session, method, event)
  {
    this._record(this.detailsFd, {session, method,
      recordedAt:new Date().toISOString(), event});
  }
  _record(fd, row) {
    if (!this.finalized) fs.writeSync(fd, JSON.stringify(row) + '\n');
  }
  _track(promise) {
    this.pending.add(promise);
    void promise.finally(() => this.pending.delete(promise)).catch(() => {});
  }
  _file(directory, data, extension) {
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    const file = directory + '/' + sha256 + extension;
    try { fs.writeFileSync(path.join(this.directory, file), data, {flag: 'wx', mode: 0o600}); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    return {file, sha256, bytes: data.length};
  }
  _extension(mime, type) {
    mime = String(mime || '').toLowerCase();
    if (/javascript|ecmascript/.test(mime) || type === 'Script') return '.js';
    if (/css/.test(mime) || type === 'Stylesheet') return '.css';
    if (/html/.test(mime) || type === 'Document') return '.html';
    if (/json/.test(mime)) return '.json';
    if (/svg/.test(mime)) return '.svg';
    if (/png/.test(mime)) return '.png';
    if (/jpeg/.test(mime)) return '.jpg';
    if (/webp/.test(mime)) return '.webp';
    if (/woff2/.test(mime)) return '.woff2';
    if (/woff/.test(mime)) return '.woff';
    if (/wasm/.test(mime)) return '.wasm';
    if (/text\/plain/.test(mime)) return '.txt';
    return '.bin';
  }
  _streamAppend(stream, bytes, buffered = false)
  {
    stream.observedBytes += bytes.length;
    if (stream.truncated || stream.storedBytes + bytes.length > 16 * 1024 * 1024 ||
        this.streamBytes + bytes.length > 64 * 1024 * 1024)
    {
      stream.truncated = true;
      return;
    }
    stream.storedBytes += bytes.length;
    this.streamBytes += bytes.length;
    if (buffered) stream.buffered = bytes;
    else stream.chunks.push(bytes);
  }
  _streamRelease(stream)
  {
    if (!stream) return;
    this.streamBytes = Math.max(0, this.streamBytes - stream.storedBytes);
    stream.storedBytes = 0;
  }
  _streamPayload(stream)
  {
    if (!stream || stream.status !== 'active' ||
        stream.truncated || stream.missingDataEvents)
      return null;
    return Buffer.concat([stream.buffered || Buffer.alloc(0), ...stream.chunks]);
  }
  _streamSummary(item)
  {
    const stream = item?.stream;
    if (!stream) return null;
    return {
      status:stream.status,
      errorCode:stream.errorCode || null,
      observedBytes:stream.observedBytes,
      storedBytes:stream.storedBytes,
      chunkCount:stream.chunkCount,
      missingDataEvents:stream.missingDataEvents,
      truncated:stream.truncated
    };
  }
  _partialStream(item)
  {
    const stream = item.stream;
    if (!stream || !stream.storedBytes) return null;
    const payload = Buffer.concat
    (
      [stream.buffered || Buffer.alloc(0), ...stream.chunks]
    );
    const artifact = this._file('resources', payload, '.partial');
    this.stats.partialStreams++;
    return {
      ...artifact,
      status:'partial',
      source:'Network.streamResourceContent',
      streamStatus:stream.status,
      truncated:stream.truncated,
      observedBytes:stream.observedBytes,
      chunkCount:stream.chunkCount
    };
  }
  _streamStart(session, item, send)
  {
    if (this.streamSupported === false ||
        !(item.resourceType === 'EventSource' ||
          String(item.mimeType || '').toLowerCase().startsWith('text/event-stream')))
      return;
    if (item.stream) return;
    const key = this._key(session, item.requestId);
    const stream =
    {
      status:'arming',
      buffered:null,
      chunks:[],
      storedBytes:0,
      observedBytes:0,
      chunkCount:0,
      missingDataEvents:0,
      truncated:false
    };
    item.stream = stream;
    this.streams.set(key, stream);
    const task = (async () =>
    {
      try
      {
        const result = await send('Network.streamResourceContent',
          {requestId:item.requestId}, session, 7000);
        if (typeof result.bufferedData !== 'string')
          throw _failure('stream-buffer-unavailable',
            'Chromium did not return buffered stream content');
        const bytes = Buffer.from(result.bufferedData, 'base64');
        this._streamAppend(stream, bytes, true);
        stream.status = 'active';
      }
      catch (error)
      {
        stream.status = 'unavailable';
        stream.errorCode = error.code || 'cdp-stream-unavailable';
        this.logger.write('network', 'resource.stream-unavailable', {
          requestId:item.requestId, code:stream.errorCode
        });
      }
    })();
    stream.ready = task;
    this._track(task);
  }
  streamData(session, event)
  {
    const key = this._key(session, event.requestId);
    const stream = this.streams.get(key);
    if (!stream) return;
    if (typeof event.data === 'string')
    {
      this._streamAppend(stream, Buffer.from(event.data, 'base64'));
      stream.chunkCount++;
    }
    else if (stream.status === 'active' && event.dataLength > 0)
      stream.missingDataEvents++;
  }
  request(session, event, send)
  {
    this.lastNetworkEvent = performance.now();
    const key = this._key(session, event.requestId);
    const previous = this.open.get(key);
    if (previous && event.redirectResponse)
    {
      this.stats.redirects++;
      this._record(this.responsesFd, {
        ...previous,
        status:'redirect-no-body',
        httpStatus:event.redirectResponse.status,
        redirectToUrl:event.request?.url || null,
        redirectResponse:event.redirectResponse,
        stream:undefined,
        streamCapture:this._streamSummary(previous)
      });
      this._streamRelease(previous.stream);
      this.streams.delete(key);
    }
    this.stats.requests++;
    const item =
    {
      session,
      requestId:event.requestId,
      ordinal:this.stats.requests,
      redirectStep:previous && event.redirectResponse ?
        (previous.redirectStep || 0) + 1 : 0,
      redirectedFrom:previous && event.redirectResponse ? previous.url : null,
      url:event.request?.url || null,
      method:event.request?.method,
      loaderId:event.loaderId || null,
      resourceType:event.type || null,
      frameId:event.frameId || null,
      initiatorType:event.initiator?.type || null,
      requestTimestamp:event.timestamp
    };
    this.open.set(key, item);
    this._streamStart(session, item, send);
    if (event.request?.hasPostData)
    {
      this._track((async () =>
      {
        try
        {
          const result = await send('Network.getRequestPostData',
            {requestId:event.requestId}, session, 7000);
          this.details(session, 'Network.getRequestPostData', {
            requestId:event.requestId, status:'saved',
            postData:result.postData, base64Encoded:result.base64Encoded
          });
        }
        catch (error)
        {
          this.details(session, 'Network.getRequestPostData', {
            requestId:event.requestId, status:'unavailable',
            errorCode:error.code || 'cdp-post-data-unavailable'
          });
        }
      })());
    }
  }
  response(session, event, send)
  {
    this.lastNetworkEvent = performance.now();
    const item = this.open.get(this._key(session, event.requestId));
    if (!item) return;
    Object.assign(item, {
      url:event.response?.url || item.url,
      mimeType:event.response?.mimeType || null,
      httpStatus:event.response?.status,
      fromDiskCache:!!event.response?.fromDiskCache,
      fromServiceWorker:!!event.response?.fromServiceWorker,
      fromPrefetchCache:!!event.response?.fromPrefetchCache,
      protocol:event.response?.protocol || null,
      responseTimestamp:event.timestamp
    });
    if (String(item.mimeType || '').toLowerCase().startsWith('text/event-stream'))
      this._streamStart(session, item, send);
  }
  cacheHit(session, event)
  {
    const item = this.open.get(this._key(session, event.requestId));
    if (item) item.requestServedFromCache = true;
  }
  async _body(item, session, send)
  {
    let primaryError;
    try
    {
      const result = await send('Network.getResponseBody',
        {requestId:item.requestId}, session, 10000);
      if (typeof result.body !== 'string')
        throw _failure('response-body-missing', 'Network.getResponseBody returned no body');
      return {
        data:result.base64Encoded ?
          Buffer.from(result.body, 'base64') : Buffer.from(result.body, 'utf8'),
        source:'Network.getResponseBody',
        base64Encoded:!!result.base64Encoded
      };
    }
    catch (error) { primaryError = error; }
    if (item.stream?.ready) await item.stream.ready;
    const streamed = this._streamPayload(item.stream);
    if (streamed)
      return {data:streamed, source:'Network.streamResourceContent',
        base64Encoded:true, streamed:true};
    if (item.frameId && item.url &&
        !['XHR','Fetch','EventSource','WebSocket'].includes(item.resourceType))
    {
      try
      {
        const result = await send('Page.getResourceContent',
          {frameId:item.frameId, url:item.url}, session, 8000);
        if (typeof result.content !== 'string')
          throw _failure('page-resource-missing',
            'Page.getResourceContent did not return content');
        return {
          data:result.base64Encoded ?
            Buffer.from(result.content, 'base64') :
            Buffer.from(result.content, 'utf8'),
          source:'Page.getResourceContent',
          base64Encoded:!!result.base64Encoded
        };
      }
      catch (error)
      {
        item.fallbackErrorCode = error.code || 'cdp-page-resource-unavailable';
      }
    }
    throw primaryError;
  }
  finished(session, event, send)
  {
    this.lastNetworkEvent = performance.now();
    const key = this._key(session, event.requestId);
    const item = this.open.get(key);
    this.open.delete(key);
    this.streams.delete(key);
    if (!item)
    {
      this._record(this.responsesFd, {
        session, requestId:event.requestId, status:'finished-without-metadata'
      });
      return;
    }
    this.reads.set(key, item);
    this._track((async () =>
    {
      try
      {
        const result = await this._body(item, session, send);
        if (this.finalized) return;
        const artifact = this._file('resources', result.data,
          this._extension(item.mimeType, item.resourceType));
        this.stats.saved++;
        this.stats.bytes += result.data.length;
        this._record(this.responsesFd, {
          ...item,
          stream:undefined,
          streamCapture:this._streamSummary(item),
          status:'saved',
          source:result.source,
          base64Encoded:result.base64Encoded,
          ...artifact,
          encodedDataLength:event.encodedDataLength,
          encodedBodyLength:event.encodedBodyLength,
          streamObservedBytes:item.stream?.observedBytes || 0
        });
      }
      catch (error)
      {
        if (this.finalized) return;
        this.stats.failed++;
        this._record(this.responsesFd, {
          ...item,
          stream:undefined,
          streamCapture:this._streamSummary(item),
          status:'body-unavailable',
          errorCode:error.code || 'cdp-body-unavailable',
          fallbackErrorCode:item.fallbackErrorCode || null,
          partialBody:this._partialStream(item)
        });
        this.logger.write('network', 'resource.body-unavailable', {
          requestId:event.requestId, code:error.code || 'cdp-body-unavailable'
        });
      }
      finally
      {
        this.reads.delete(key);
        this._streamRelease(item.stream);
      }
    })());
  }
  failed(session, event)
  {
    this.lastNetworkEvent = performance.now();
    const key = this._key(session, event.requestId);
    const item = this.open.get(key);
    this.open.delete(key);
    this.streams.delete(key);
    this.stats.failed++;
    this._track((async () =>
    {
      if (item?.stream?.ready) await item.stream.ready;
      if (this.finalized) return;
      this._record(this.responsesFd, {
        ...item,
        stream:undefined,
        session,
        requestId:event.requestId,
        status:'request-failed',
        streamCapture:this._streamSummary(item),
        errorText:event.errorText || null,
        canceled:!!event.canceled,
        blockedReason:event.blockedReason || null,
        partialBody:this._partialStream(item || {})
      });
      this._streamRelease(item?.stream);
    })());
  }
  script(session, event, send) {
    if (!event.scriptId) return;
    const key = this._key(session, event.scriptId);
    if (this.scripts.has(key)) return;
    this.scripts.add(key);
    this.stats.scriptsObserved++;
    const info = {session, scriptId: event.scriptId, url: event.url || null,
      executionContextId: event.executionContextId, startLine: event.startLine,
      startColumn: event.startColumn, sourceMapURL: event.sourceMapURL || null};
    this._track((async () => {
      try {
        const result = await send('Debugger.getScriptSource', {scriptId: event.scriptId}, session, 5000);
        if (this.finalized) return;
        if (typeof result.scriptSource !== 'string') throw Error('missing scriptSource');
        const artifact = this._file('scripts', Buffer.from(result.scriptSource, 'utf8'), '.js');
        this.stats.scriptsSaved++;
        this._record(this.scriptsFd, {...info, status: 'saved', ...artifact});
      } catch (error) {
        if (this.finalized) return;
        this.stats.scriptsFailed++;
        this._record(this.scriptsFd, {...info, status: 'source-unavailable',
          errorCode: error.code || 'cdp-script-unavailable'});
      }
    })());
  }
  async drain(timeoutMs = 6000, quietMs = 750) {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      if (!this.open.size && !this.pending.size &&
          performance.now() - this.lastNetworkEvent >= quietMs) break;
      await _wait(75);
    }
    const complete = !this.open.size && !this.pending.size &&
      performance.now() - this.lastNetworkEvent >= quietMs;
    this.logger.write('lifecycle', 'capture.network-drained',
      {complete, openRequests: this.open.size, pendingReads: this.pending.size});
    return complete;
  }
  async finish() {
    await Promise.race([Promise.allSettled([...this.pending]), _wait(1000)]);
    for (const item of this.reads.values())
    {
      this._record(this.responsesFd, {
        ...item,
        stream:undefined,
        status:'body-read-pending-at-shutdown',
        streamCapture:this._streamSummary(item),
        partialBody:this._partialStream(item)
      });
      this._streamRelease(item.stream);
    }
    for (const item of this.open.values())
    {
      this._record(this.responsesFd, {
        ...item,
        stream:undefined,
        status:'unfinished-at-shutdown',
        streamCapture:this._streamSummary(item),
        partialBody:this._partialStream(item)
      });
      this._streamRelease(item.stream);
    }
    const status = {...this.stats, unfinished: this.open.size,
      pendingBodies:this.reads.size, pendingReads: this.pending.size,
      networkConfiguration:this.networkConfig,
      domHistory:{...this.domStatus,
        status:this.domStatus.errors.length ? 'partial' : 'saved'},
      wireCapture:{...this.wireStatus, status:this.wireStatus.errors.length ? 'partial' : 'saved'}};
    if (status.pendingReads)
      this.logger.write('network', 'resource.pending-reads-at-shutdown',
        {count: status.pendingReads});
    this.finalized = true;
    fs.closeSync(this.responsesFd);
    fs.closeSync(this.scriptsFd);
    fs.closeSync(this.detailsFd);
    fs.closeSync(this.wireFd);
    fs.closeSync(this.domFd);
    return status;
  }
}

async function _captureCdpCapabilities(cdp, port, directory, logger)
{
  const manifest = {
    capturedAt:new Date().toISOString(),
    source:'active-local-chromium',
    browser:{status:'unavailable'},
    protocol:{status:'unavailable'}
  };
  try
  {
    const version = await cdp.send('Browser.getVersion', {}, undefined, 8000);
    manifest.browser = {status:'saved', ...version};
  }
  catch (error)
  {
    manifest.browser = {status:'unavailable', errorCode:error.code || 'cdp-unavailable'};
    logger.write('error', 'cdp.browser-version-unavailable', {
      code:error.code || 'cdp-unavailable'
    });
  }
  try
  {
    const response = await fetch('http://127.0.0.1:' + port + '/json/protocol', {
      signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const source = await response.text();
    const protocol = JSON.parse(source);
    if (!Array.isArray(protocol.domains))
      throw Error('protocol schema does not contain domains');
    const bytes = Buffer.from(source, 'utf8');
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(path.join(directory, 'cdp-protocol.json'), bytes,
      {flag:'wx',mode:0o600});
    manifest.protocol = {
      status:'saved',
      file:'cdp-protocol.json',
      sha256,
      bytes:bytes.length,
      version:protocol.version || null,
      domains:protocol.domains.map(domain => ({
        name:domain.domain,
        experimental:!!domain.experimental,
        commands:(domain.commands || []).map(command => command.name),
        events:(domain.events || []).map(event => event.name)
      }))
    };
  }
  catch (error)
  {
    manifest.protocol = {status:'unavailable', errorCode:error.code || 'protocol-unavailable'};
    logger.write('error', 'cdp.protocol-schema-unavailable', {
      code:error.code || 'protocol-unavailable'
    });
  }
  manifest.status = manifest.browser.status === 'saved' &&
    manifest.protocol.status === 'saved' ? 'saved' : 'partial';
  fs.writeFileSync(path.join(directory, 'cdp-capabilities.json'),
    JSON.stringify(manifest, null, 2) + '\n', {flag:'wx',mode:0o600});
  return manifest;
}

class _Cdp {
  constructor(url, logger, onDisconnect, archive) {
    this.archive = archive;
    this.url = url;
    this.logger = logger;
    this.onDisconnect = onDisconnect;
    this.pending = new Map();
    this.next = 0;
    this.sessions = new Map();
    this.targetSessions = new Map();
    this.styleHeaders = new Map();
    this.knownTargets = new Map();
    this.executionContexts = new Map();
    this.targetIssues = [];
    this.protocolDomains = null;
    this.closed = false;
  }
  _upsertTarget(info, source)
  {
    if (!info?.targetId) return;
    const previous = this.knownTargets.get(info.targetId) || {};
    const next =
    {
      ...previous,
      ...info,
      firstSeenAt:previous.firstSeenAt || new Date().toISOString(),
      lastSeenAt:new Date().toISOString(),
      lastSource:source
    };
    this.knownTargets.set(info.targetId, next);
  }
  _targetIssue(targetId, operation, error)
  {
    const issue =
    {
      at:new Date().toISOString(),
      targetId,
      operation,
      errorCode:error.code || 'cdp-unavailable'
    };
    this.targetIssues.push(issue);
    const identity =
    {
      'Target.getTargets':'target.discovery-unavailable',
      'Target.setAutoAttach':'target.nested-attach-unavailable',
      'Network.enable':'target.worker-network-unavailable',
      'Performance.enable':'target.performance-unavailable',
      'target.instrumentation':'target.instrumentation-failed'
    }[operation] || 'target.capability-unavailable';
    const detail =
    {
      targetId,
      operation,
      code:issue.errorCode
    };
    this.logger.write('error', identity, detail);
  }
  async targetGraph()
  {
    let discovery = {status:'saved'};
    try
    {
      const result = await this.send('Target.getTargets', {}, undefined, 10000);
      for (const info of result.targetInfos || [])
      {
        this._upsertTarget(info, 'Target.getTargets');
      }
      discovery.count = (result.targetInfos || []).length;
    }
    catch (error)
    {
      discovery = {status:'unavailable', errorCode:error.code || 'cdp-unavailable'};
      this._targetIssue(null, 'Target.getTargets', error);
    }
    const targets = [];
    for (const item of this.knownTargets.values())
    {
      const session = this.targetSessions.get(item.targetId);
      const live = session && this.sessions.get(session);
      const details =
      {
        ...item,
        attached:!!live,
        sessionId:live ? session : null,
        parentTargetId:live?.parentTargetId || null,
        ready:!!live?.ready,
        domains:live?.domains || {},
        attachmentStatus:live ? 'attached' :
          item.destroyedAt ? 'destroyed' : 'not-attached'
      };
      targets.push(details);
    }
    const graph =
    {
      observedAt:new Date().toISOString(),
      discovery,
      targets,
      contexts:[...this.executionContexts.values()],
      issues:[...this.targetIssues]
    };
    return graph;
  }
  async connect() {
    if (typeof WebSocket !== 'function') throw _failure('websocket-unavailable', 'Node.js native WebSocket is required (Node 22+)');
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      let done = false;
      socket.addEventListener('open', () => { done = true; resolve(); }, {once: true});
      socket.addEventListener('error', e => { if (!done) { done = true; reject(_failure('tcp-connect-failed', 'cannot connect to Chromium CDP', e.error)); } });
      socket.addEventListener('message', event => this._message(event.data));
      socket.addEventListener('close', () => {
        this.closed = true;
        for (const p of this.pending.values()) {clearTimeout(p.timer); p.reject(_failure('tcp-disconnected', 'CDP WebSocket closed'));}
        this.pending.clear();
        this.onDisconnect();
      });
    });
  }
  send(method, params = {}, sessionId, timeoutMs = 12000) {
    if (this.closed || !this.socket || this.socket.readyState !== WebSocket.OPEN)
      return Promise.reject(_failure('tcp-not-connected', `cannot send ${method}: CDP socket closed`));
    const id = ++this.next;
    const packet = {id, method, params};
    if (sessionId) packet.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(_failure('cdp-timeout', `${method} did not respond`));
      }, timeoutMs);
      this.pending.set(id, {resolve, reject, timer});
      try
      {
        const raw = JSON.stringify(packet);
        this.socket.send(raw);
        this.archive.wire('outbound', raw);
      }
      catch (error)
      {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(_failure('tcp-send-failed', method, error));
      }
    });
  }
  _message(data) {
    const raw = String(data);
    this.archive.wire('inbound', raw);
    let message;
    try { message = JSON.parse(raw); }
    catch (_) { this.logger.write('error', 'cdp.invalid-json'); return; }
    if (typeof message.id === 'number') {
      const p = this.pending.get(message.id);
      if (!p) return;
      clearTimeout(p.timer); this.pending.delete(message.id);
      if (message.error) p.reject(_failure('cdp-command-failed', `${message.error.message} (${message.error.code})`));
      else p.resolve(message.result || {});
      return;
    }
    const {method, params = {}, sessionId} = message;
    if (method === 'Target.attachedToTarget')
    {
      const sid = params.sessionId;
      const target = params.targetInfo || {};
      const parentTargetId = this.sessions.get(sessionId)?.targetId || null;
      this._upsertTarget(target, 'Target.attachedToTarget');
      const attachment =
      {
        targetId:target.targetId,
        type:target.type,
        url:target.url,
        parentTargetId,
        attachedAt:new Date().toISOString(),
        domains:{}
      };
      this.sessions.set(sid, attachment);
      this.targetSessions.set(target.targetId, sid);
      const detail =
      {
        targetId:target.targetId,
        targetType:target.type,
        parentTargetId
      };
      this.logger.write('lifecycle', 'target.attached', detail);
      void this._setup(sid, target.type);
      return;
    }
    if (method === 'Target.detachedFromTarget')
    {
      const info = this.sessions.get(params.sessionId);
      if (info)
      {
        this.targetSessions.delete(info.targetId);
        const changed =
        {
          targetId:info.targetId,
          detachedAt:new Date().toISOString()
        };
        this._upsertTarget(changed, 'Target.detachedFromTarget');
      }
      this.sessions.delete(params.sessionId);
      this.logger.write('lifecycle', 'target.detached', {targetId:info?.targetId});
      return;
    }
    if (method === 'Target.targetCreated' ||
      method === 'Target.targetInfoChanged' ||
      method === 'Target.targetDestroyed')
    {
      const target = params.targetInfo || {};
      const targetId = target.targetId || params.targetId;
      const changed =
      {
        ...target,
        targetId
      };
      if (method === 'Target.targetDestroyed')
      {
        changed.destroyedAt = new Date().toISOString();
      }
      this._upsertTarget(changed, method);
      const detail =
      {
        targetId,
        targetType:target.type,
        url:_safeUrl(target.url)
      };
      this.logger.write('lifecycle', method, detail);
      return;
    }
    if (method === 'Runtime.executionContextCreated' && sessionId)
    {
      const context = params.context || {};
      const detail =
      {
        contextId:context.id,
        uniqueId:context.uniqueId,
        targetId:this.sessions.get(sessionId)?.targetId,
        sessionId,
        name:context.name,
        origin:context.origin,
        auxData:context.auxData || null,
        createdAt:new Date().toISOString()
      };
      this.executionContexts.set(sessionId + ':' + context.id, detail);
    }
    if (method === 'Runtime.executionContextDestroyed' && sessionId)
    {
      const key = sessionId + ':' + params.executionContextId;
      const context = this.executionContexts.get(key);
      if (context) context.destroyedAt = new Date().toISOString();
    }
    if (method === 'Runtime.executionContextsCleared' && sessionId)
    {
      for (const context of this.executionContexts.values())
      {
        if (context.sessionId === sessionId && !context.destroyedAt)
        {
          context.destroyedAt = new Date().toISOString();
        }
      }
    }
    if (!method) return;
    if (method === 'CSS.styleSheetAdded' && params.header?.styleSheetId)
      this.styleHeaders.set(sessionId + ':' + params.header.styleSheetId,
        {...params.header, targetId:this.sessions.get(sessionId)?.targetId});
    if (method === 'CSS.styleSheetRemoved' && params.styleSheetId)
      this.styleHeaders.delete(sessionId + ':' + params.styleSheetId);
    this._event(method, params, sessionId);
  }
  _supportsNetworkMethod(method)
  {
    if (!this.protocolDomains) return null;
    const domain = this.protocolDomains.find(item => item.name === 'Network');
    return !!domain?.commands?.includes(method);
  }
  async _enableNetwork(sid, target)
  {
    const size =
    {
      maxTotalBufferSize:64 * 1024 * 1024,
      maxResourceBufferSize:32 * 1024 * 1024,
      maxPostDataSize:1024 * 1024
    };
    const record =
    {
      targetId:target?.targetId || null,
      enabled:'unavailable',
      durable:'unsupported',
      buffers:size
    };
    try
    {
      await this.send('Network.enable', size, sid, 10000);
      record.enabled = 'buffered';
    }
    catch (error)
    {
      record.bufferErrorCode = error.code || 'cdp-buffer-unavailable';
      this._targetIssue(target?.targetId, 'Network.enable.buffers', error);
      await this.send('Network.enable', {}, sid, 10000);
      record.enabled = 'default';
    }
    if (target) target.domains['Network.enable'] = record.enabled;
    const supported = this._supportsNetworkMethod('configureDurableMessages');
    if (supported !== false)
    {
      try
      {
        await this.send('Network.configureDurableMessages', {
          maxTotalBufferSize:size.maxTotalBufferSize,
          maxResourceBufferSize:size.maxResourceBufferSize
        }, sid, 8000);
        record.durable = 'enabled';
      }
      catch (error)
      {
        record.durable = 'unavailable';
        record.durableErrorCode = error.code || 'cdp-durable-unavailable';
        this._targetIssue(target?.targetId, 'Network.configureDurableMessages', error);
      }
    }
    if (target) target.networkConfiguration = record;
    this.archive.networkConfig.push(record);
  }
  async _setup(sid, type)
  {
    const target = this.sessions.get(sid);
    const targetId = target?.targetId;
    const page = type === 'page' || type === 'iframe' ||
      type === 'background_page';
    const worker = ['worker', 'shared_worker', 'service_worker'].includes(type);
    try
    {
      if (!page && !worker)
      {
        if (target) target.skippedReason = 'not-a-page-or-worker-target';
        this.logger.write('lifecycle', 'target.instrumentation-not-applicable',
          {targetId, targetType:type});
        return;
      }

      // Auto-attach is scoped to this target. Repeating it on each attached
      // parent discovers child workers and out-of-process iframe targets.
      const options =
      {
        autoAttach:true,
        waitForDebuggerOnStart:true,
        flatten:true
      };
      try
      {
        await this.send('Target.setAutoAttach', options, sid, 8000);
        if (target) target.recursiveAttach = 'enabled';
      }
      catch (error)
      {
        if (target) target.recursiveAttach = 'unavailable';
        this._targetIssue(targetId, 'Target.setAutoAttach', error);
      }

      const required = page ?
        ['Runtime.enable', 'Page.enable', 'Network.enable',
          'Debugger.enable', 'Log.enable'] :
        ['Runtime.enable', 'Debugger.enable'];
      for (const method of required)
      {
        if (method === 'Network.enable')
          await this._enableNetwork(sid, target);
        else
        {
          await this.send(method, {}, sid);
          if (target) target.domains[method] = 'enabled';
        }
      }

      if (worker)
      {
        try { await this._enableNetwork(sid, target); }
        catch (error)
        {
          if (target) target.domains['Network.enable'] = 'unavailable';
          this._targetIssue(targetId, 'Network.enable', error);
        }
      }

      if (page)
      {
        await this.send('Runtime.addBinding', {name:'__mWebAnalyzeNotify'}, sid);
        await this.send('Page.addScriptToEvaluateOnNewDocument',
          {source:_observer}, sid);
        // Attach to a page that existed before observation as well.
        await this.send('Runtime.evaluate', {expression:_observer}, sid);
        try
        {
          await this.send('Performance.enable', {}, sid);
        }
        catch (error)
        {
          this._targetIssue(targetId, 'Performance.enable', error);
        }
      }
      if (this.sessions.has(sid)) this.sessions.get(sid).ready = true;
      this.logger.write('lifecycle', 'target.instrumented',
        {targetType:type, targetId});
    }
    catch (error)
    {
      this._targetIssue(targetId, 'target.instrumentation', error);
    }
    finally
    {
      // A paused target must resume even when a domain cannot be enabled.
      try
      {
        await this.send('Runtime.runIfWaitingForDebugger', {}, sid, 3000);
      }
      catch (_) { /* Target may already have detached. */ }
    }
  }
  _event(method, p, sid) {
    if ([
      'Network.requestWillBeSent',
      'Network.requestWillBeSentExtraInfo',
      'Network.responseReceived',
      'Network.responseReceivedExtraInfo',
      'Network.webSocketCreated',
      'Network.webSocketWillSendHandshakeRequest',
      'Network.webSocketHandshakeResponseReceived',
      'Network.webSocketFrameReceived',
      'Network.webSocketFrameSent',
      'Network.eventSourceMessageReceived',
      'Network.webTransportCreated',
      'Network.webTransportConnectionEstablished'
    ].includes(method))
      this.archive.details(sid, method, p);
    const base = {targetId: this.sessions.get(sid)?.targetId};
    const log = (topic, type, extra = {}) => this.logger.write(topic, type, {...base, ...extra});
    switch (method) {
      case 'Runtime.bindingCalled': {
        if (p.name !== '__mWebAnalyzeNotify') return;
        try {
          const v = JSON.parse(p.payload);
          if (v.kind === 'dom-history')
          {
            this.archive.domHistory(sid, base.targetId, p.executionContextId, v);
            return;
          }
          const topic = v.kind === 'mutation' ? 'dom' : v.kind === 'performance' ? 'performance'
            : v.kind === 'page-error' || v.kind === 'unhandled-rejection' ? 'error' : 'interaction';
          const detail = v.detail || {};
          if (detail.source) detail.source = _safeUrl(detail.source);
          if (detail.name && /^(?:https?|wss?):/.test(detail.name)) detail.name = _safeUrl(detail.name);
          log(topic, `dom.${v.kind}`, {executionContextId: p.executionContextId, pageTime: v.time, ...detail});
        } catch (_) { log('error', 'observer.invalid-event'); }
        return;
      }
      case 'Page.navigatedWithinDocument': log('lifecycle', 'page.same-document-navigation', {frameId: p.frameId, url: _safeUrl(p.url)}); return;
      case 'Page.javascriptDialogOpening': log('interaction', 'page.dialog-opened', {dialogType: p.type, hasBrowserHandler: p.hasBrowserHandler}); return;
      case 'Page.windowOpen': log('lifecycle', 'page.window-open', {url: _safeUrl(p.url), disposition: p.windowOpenDisposition}); return;
      case 'Page.frameNavigated': log('lifecycle', 'page.frame-navigated', {frameId: p.frame?.id,
        parentId: p.frame?.parentId, url: _safeUrl(p.frame?.url)}); return;
      case 'Page.frameStartedLoading': case 'Page.frameStoppedLoading': case 'Page.domContentEventFired':
      case 'Page.loadEventFired': case 'Page.frameDetached':
        log('lifecycle', method, {frameId: p.frameId}); return;
      case 'Network.requestWillBeSent': this.archive.request(sid, p, this.send.bind(this)); log('network', 'request', {requestId: p.requestId,
        loaderId: p.loaderId, frameId: p.frameId, url: _safeUrl(p.request?.url),
        httpMethod: p.request?.method, resourceType: p.type, hasPostData: !!p.request?.hasPostData,
        initiatorType: p.initiator?.type, redirectStatus: p.redirectResponse?.status}); return;
      case 'Network.dataReceived': this.archive.streamData(sid, p); return;
      case 'Network.requestServedFromCache': this.archive.cacheHit(sid, p); return;
      case 'Network.responseReceived': this.archive.response(sid, p, this.send.bind(this)); log('network', 'response', {requestId: p.requestId,
        resourceType: p.type, url: _safeUrl(p.response?.url), status: p.response?.status,
        mimeType: p.response?.mimeType, fromDiskCache: p.response?.fromDiskCache,
        fromServiceWorker: p.response?.fromServiceWorker, protocol: p.response?.protocol}); return;
      case 'Network.loadingFinished': this.archive.finished(sid, p, this.send.bind(this)); log('network', 'finished', {requestId: p.requestId,
        encodedDataLength: p.encodedDataLength}); return;
      case 'Network.loadingFailed': this.archive.failed(sid, p); log('network', 'failed', {requestId: p.requestId,
        errorText: p.errorText, canceled: p.canceled, blockedReason: p.blockedReason}); return;
      case 'Debugger.scriptParsed': this.archive.script(sid, p, this.send.bind(this)); return;
      case 'Network.webSocketCreated': log('network', 'websocket.created', {requestId: p.requestId,
        url: _safeUrl(p.url)}); return;
      case 'Network.webSocketClosed': log('network', 'websocket.closed', {requestId: p.requestId}); return;
      case 'Network.webSocketFrameReceived': case 'Network.webSocketFrameSent':
        log('network', method, {requestId: p.requestId, opcode: p.response?.opcode,
          payloadBytes: Buffer.byteLength(p.response?.payloadData || '')}); return;
      case 'Network.eventSourceMessageReceived':
        log('network', 'eventsource.message', {requestId: p.requestId, eventName: p.eventName,
          dataBytes: Buffer.byteLength(p.data || '')}); return;
      case 'Runtime.consoleAPICalled': log('console', 'console.called', {level: p.type,
        arguments: p.args?.map(a => ({type: a.type, subtype: a.subtype})),
        source: _safeUrl(p.stackTrace?.callFrames?.[0]?.url),
        line: p.stackTrace?.callFrames?.[0]?.lineNumber}); return;
      case 'Runtime.exceptionThrown': log('error', 'runtime.exception', {
        exceptionId: p.exceptionDetails?.exceptionId,
        source: _safeUrl(p.exceptionDetails?.url),
        line: p.exceptionDetails?.lineNumber, column: p.exceptionDetails?.columnNumber,
        exceptionType: p.exceptionDetails?.exception?.type}); return;
      case 'Log.entryAdded': log('console', 'log.entry', {source: p.entry?.source,
        level: p.entry?.level, url: _safeUrl(p.entry?.url), line: p.entry?.lineNumber}); return;
      case 'Inspector.targetCrashed': log('error', 'target.crashed'); return;
      default: return;
    }
  }
}

/**
 * Start a fresh manual Chromium capture. The caller owns the returned lifecycle.
 * @returns {Promise<{stop: Function, closed: Promise, outputDir: string, profileDir: string, pid: number, sendPage: Function, sendTarget: Function, targets: Function, targetGraph: Function, styleSheets: Function, networkActivity: Function}>}
 */
async function startWebAnalyze({url, outputDir, profileDir, headless = false,
  chromium = 'chromium', timeoutMs = 20000} = {}) {
  let parsed;
  try { parsed = new URL(url); }
  catch (_) { throw _failure('invalid-url', 'url must be an absolute HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw _failure('invalid-scheme', 'url must use HTTP or HTTPS');
  if (typeof outputDir !== 'string' || !outputDir.trim())
    throw _failure('invalid-output', 'an outputDir is required');
  if (typeof chromium !== 'string' || !chromium.trim())
    throw _failure('invalid-chromium', 'chromium executable name is required');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000)
    throw _failure('invalid-timeout', 'timeoutMs must be at least 1000');
  const dest = path.resolve(outputDir);
  const log = _recording(dest);
  const archive = new _ResourceArchive(dest, log);
  const profile = path.resolve(profileDir || path.join(dest, 'profile'));
  const portFile = path.join(profile, 'DevToolsActivePort');
  let child;
  let cdp;
  let stopping;
  let ended = false;
  let resolveClosed;
  const closed = new Promise(resolve => {resolveClosed = resolve;});
  let closeRequested = false;
  async function stop(reason = 'caller-stop') {
    if (stopping) return stopping;
    stopping = (async () => {
      log.write('lifecycle', 'browser.stop-requested', {reason});
      let networkDrained = null;
      if (cdp && !cdp.closed && reason !== 'browser-exited' && reason !== 'tcp-disconnected')
        networkDrained = await archive.drain();
      if (cdp && !cdp.closed) {
        try { await cdp.send('Browser.close', {}, undefined, 2000); }
        catch (_) { /* Chromium may close its connection before replying. */ }
        try { cdp.socket?.close(); } catch (_) {}
      }
      if (child && child.exitCode === null && child.signalCode === null) {
        try { child.kill('SIGTERM'); } catch (_) {}
        await Promise.race([new Promise(resolve => child.once('exit', resolve)), _wait(1500)]);
        if (child.exitCode === null && child.signalCode === null) {
          try { child.kill('SIGKILL'); } catch (_) {}
        }
      }
      if (!ended) {
        ended = true;
        const resourceCapture = await archive.finish();
        resourceCapture.networkDrained = networkDrained;
        resourceCapture.stopReason = reason;
        const summary = await log.finish({resourceCapture});
        resolveClosed(summary);
      }
      return closed;
    })();
    return stopping;
  }
  try {
    fs.mkdirSync(profile, {recursive: true, mode: 0o700});
    if (fs.existsSync(portFile)) throw _failure('profile-in-use', 'profile contains an existing CDP port file');
    const args = [`--user-data-dir=${profile}`, '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
      '--new-window', 'about:blank'];
    if (headless) args.unshift('--headless=new');
    log.write('lifecycle', 'browser.launching', {executable: chromium,
      headless, profileDir: profile, url: _safeUrl(url)});
    child = spawn(chromium, args, {stdio: ['ignore','ignore','pipe']});
    child.stderr?.on('data', chunk => log.write('lifecycle', 'browser.stderr', {bytes: chunk.length}));
    let spawnError;
    child.on('error', error => {spawnError = error;});
    child.on('exit', (code, signal) => {
      log.write('lifecycle', 'browser.exited', {code, signal});
      if (!closeRequested) {closeRequested = true; void stop('browser-exited');}
    });
    const portDeadline = performance.now() + timeoutMs;
    let port;
    let endpoint;
    // Chromium may create DevToolsActivePort before both lines are durable.
    // Treat a partial file as initialization in progress, not a malformed
    // browser endpoint, until the normal startup deadline expires.
    while (performance.now() < portDeadline)
    {
      if (spawnError)
        throw _failure('chromium-launch-failed',
          'cannot launch Chromium from effective PATH', spawnError);
      if (child.exitCode !== null || child.signalCode !== null)
        throw _failure('chromium-exited-early',
          'Chromium quit before publishing TCP endpoint');
      if (fs.existsSync(portFile))
      {
        const [portText, pathText] = fs.readFileSync(portFile, 'utf8')
          .trim().split(/\r?\n/);
        const number = Number(portText);
        if (Number.isInteger(number) && number >= 1 && number <= 65535 &&
            /^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(pathText || ''))
        {
          port = number;
          endpoint = pathText;
          break;
        }
      }
      await _wait(75);
    }
    if (!endpoint)
      throw _failure('tcp-port-timeout',
        'Chromium did not publish a complete DevToolsActivePort');
    // Bind the debugger to loopback only. No all-interface remote debugger.
    cdp = new _Cdp(`ws://127.0.0.1:${port}${endpoint}`, log,
      () => { if (!closeRequested) {closeRequested = true; void stop('tcp-disconnected');} }, archive);
    await cdp.connect();
    const capabilities = await _captureCdpCapabilities(cdp, port, dest, log);
    if (capabilities.protocol.status === 'saved')
      cdp.protocolDomains = capabilities.protocol.domains;
    archive.streamSupported = cdp._supportsNetworkMethod('streamResourceContent');
    await cdp.send('Target.setDiscoverTargets', {discover: true});
    await cdp.send('Target.setAutoAttach', {autoAttach: true,
      waitForDebuggerOnStart: true, flatten: true});
    // Inventory targets already present before first navigation as well.
    await cdp.targetGraph();
    const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank'});
    const targetDeadline = performance.now() + timeoutMs;
    while (!cdp.targetSessions.has(targetId) && performance.now() < targetDeadline)
      await _wait(30);
    const sid = cdp.targetSessions.get(targetId);
    if (!sid) throw _failure('target-attach-timeout', 'Chromium page was not attached');
    // Target instrumentation has a separate startup budget: process launch
    // and debugger-port publication must not silently consume it.
    const instrumentationDeadline = performance.now() + timeoutMs;
    while (!cdp.sessions.get(sid)?.ready &&
        performance.now() < instrumentationDeadline)
      await _wait(30);
    if (!cdp.sessions.get(sid)?.ready)
      throw _failure('target-instrumentation-timeout', 'page observer not ready');
    // A slow navigation must never be treated as capture startup failure.
    // Keep collecting CDP events while the browser loads in the background.
    let navigationSettled = false;
    const navigation = cdp.send('Page.navigate', {url: parsed.href}, sid, 120000)
      .then(result => {
        navigationSettled = true;
        if (result.errorText) log.write('error', 'page.initial-navigation-failed',
          {errorText: result.errorText, url: _safeUrl(url)});
        else log.write('lifecycle', 'page.initial-navigation-accepted',
          {targetId, url: _safeUrl(url)});
      })
      .catch(error => {
        navigationSettled = true;
        log.write('error', 'page.initial-navigation-command-failed',
          {code: error.code || 'unknown', url: _safeUrl(url)});
      });
    // Fast local navigations still settle before startup returns. Slow or
    // blocked pages do not hold the CLI or cause Chromium to be shut down.
    await Promise.race([navigation, _wait(1000)]);
    log.write('lifecycle', 'capture.ready', {targetId, url: _safeUrl(url), port,
      pid: child.pid, navigationPending: !navigationSettled});
    return {stop, closed, outputDir: dest, profileDir: profile, pid: child.pid,
      sendPage: (method, params = {}, methodTimeoutMs = 12000) =>
        cdp.send(method, params, sid, methodTimeoutMs),
      sendTarget: (targetId, method, params = {}, methodTimeoutMs = 12000) => {
        const targetSession = cdp.targetSessions.get(targetId);
        return targetSession ? cdp.send(method, params, targetSession, methodTimeoutMs) :
          Promise.reject(_failure('target-not-attached',
            'CDP target ' + targetId + ' is not attached'));
      },
      targets: () => [...cdp.sessions.entries()].map(([targetSession, info]) =>
        {return {...info, main:targetSession === sid};}),
      targetGraph: () => cdp.targetGraph(),
      styleSheets: () => [...cdp.styleHeaders.values()],
      networkActivity: () => ({
        inFlightRequests: archive.open.size,
        pendingReads: archive.pending.size,
        quietForMs: Math.max(0, Math.round(performance.now() - archive.lastNetworkEvent))
      })};
  } catch (error) {
    log.write('error', 'capture.start-failed', {code: error.code || 'unknown', message: error.message});
    await stop('startup-failed');
    throw error;
  }
}

async function _runCli(args) {
  if (args.length !== 2 || args.some(value => !value)) {
    process.stderr.write('Usage: nodejs <path-to-lib> <url> <analisys-dir>\n');
    return 2;
  }

  let session;
  try {
    session = await startWebAnalyze({url: args[0], outputDir: args[1]});
    process.stdout.write(`Chromium opened; analysis: ${session.outputDir}\n` +
      'Close the Chromium window or press Ctrl+C to finish.\n');

    const onInterrupt = () => { void session.stop('sigint'); };
    const onTerminate = () => { void session.stop('sigterm'); };
    process.once('SIGINT', onInterrupt);
    process.once('SIGTERM', onTerminate);
    try {
      const summary = await session.closed;
      process.stdout.write(`Analysis finished: ${summary.totalEvents} events in ${session.outputDir}\n`);
    } finally {
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onTerminate);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`web-analyze: ${error.message}\n`);
    if (session) {
      try { await session.stop('cli-failed'); }
      catch (stopError) { process.stderr.write(`web-analyze: ${stopError.message}\n`); }
    }
    return 1;
  }
}

module.exports = {startWebAnalyze};

if (require.main === module) {
  _runCli(process.argv.slice(2)).then(status => {
    process.exitCode = status;
  }, error => {
    process.stderr.write(`web-analyze: ${error.message}\n`);
    process.exitCode = 1;
  });
}

