'use strict';

// Chromium CDP capture for manually operated browsers. No Playwright dependency.
const fs = require('node:fs');
const path = require('node:path');
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
  fs.mkdirSync(outputDir, {recursive: false, mode: 0o700});
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
  async function finish() {
    if (finalized) return;
    write('lifecycle', 'capture.stopping');
    finalized = true;
    await Promise.all(Object.values(streams).map(stream => new Promise((resolve, reject) => {
      stream.end(error => error ? reject(error) : resolve());
    })));
    const summary = {totalEvents: sequence, counts, dropped, durationMs: performance.now() - begin,
      finishedAt: new Date().toISOString()};
    fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n',
      {flag: 'wx', mode: 0o600});
    return summary;
  }
  return {write, finish, counts, dropped};
}

function _wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

class _Cdp {
  constructor(url, logger, onDisconnect) {
    this.url = url;
    this.logger = logger;
    this.onDisconnect = onDisconnect;
    this.pending = new Map();
    this.next = 0;
    this.sessions = new Map();
    this.targetSessions = new Map();
    this.closed = false;
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
      try { this.socket.send(JSON.stringify(packet)); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(_failure('tcp-send-failed', method, error)); }
    });
  }
  _message(data) {
    let message;
    try { message = JSON.parse(String(data)); }
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
    if (method === 'Target.attachedToTarget') {
      const sid = params.sessionId;
      const target = params.targetInfo || {};
      this.sessions.set(sid, {targetId: target.targetId, type: target.type});
      this.targetSessions.set(target.targetId, sid);
      this.logger.write('lifecycle', 'target.attached', {targetId: target.targetId, targetType: target.type});
      void this._setup(sid, target.type);
      return;
    }
    if (method === 'Target.detachedFromTarget') {
      const info = this.sessions.get(params.sessionId);
      if (info) this.targetSessions.delete(info.targetId);
      this.sessions.delete(params.sessionId);
      this.logger.write('lifecycle', 'target.detached', {targetId: info?.targetId});
      return;
    }
    if (method === 'Target.targetCreated' || method === 'Target.targetDestroyed') {
      const target = params.targetInfo || {};
      this.logger.write('lifecycle', method, {targetId: target.targetId || params.targetId,
        targetType: target.type, url: _safeUrl(target.url)});
      return;
    }
    if (!method) return;
    this._event(method, params, sessionId);
  }
  async _setup(sid, type) {
    try {
      const page = type === 'page' || type === 'iframe' || type === 'background_page';
      const required = page ? ['Runtime.enable', 'Page.enable', 'Network.enable', 'Log.enable'] : ['Runtime.enable', 'Network.enable'];
      for (const method of required) await this.send(method, {}, sid);
      if (page) {
        await this.send('Runtime.addBinding', {name: '__mWebAnalyzeNotify'}, sid);
        await this.send('Page.addScriptToEvaluateOnNewDocument', {source: _observer}, sid);
        // Attach to a page that existed before observation as well.
        await this.send('Runtime.evaluate', {expression: _observer}, sid);
        try { await this.send('Performance.enable', {}, sid); }
        catch (error) { this.logger.write('error', 'instrumentation.performance-unavailable', {targetType: type}); }
      }
      if (this.sessions.has(sid)) this.sessions.get(sid).ready = true;
      this.logger.write('lifecycle', 'target.instrumented', {targetType: type, targetId: this.sessions.get(sid)?.targetId});
    } catch (error) {
      this.logger.write('error', 'target.instrumentation-failed', {targetType: type,
        targetId: this.sessions.get(sid)?.targetId, code: error.code});
    } finally {
      // A paused target must always resume even when instrumentation fails.
      try { await this.send('Runtime.runIfWaitingForDebugger', {}, sid, 3000); }
      catch (_) { /* Target may already have detached. */ }
    }
  }
  _event(method, p, sid) {
    const base = {targetId: this.sessions.get(sid)?.targetId};
    const log = (topic, type, extra = {}) => this.logger.write(topic, type, {...base, ...extra});
    switch (method) {
      case 'Runtime.bindingCalled': {
        if (p.name !== '__mWebAnalyzeNotify') return;
        try {
          const v = JSON.parse(p.payload);
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
      case 'Network.requestWillBeSent': log('network', 'request', {requestId: p.requestId,
        loaderId: p.loaderId, frameId: p.frameId, url: _safeUrl(p.request?.url),
        httpMethod: p.request?.method, resourceType: p.type, hasPostData: !!p.request?.hasPostData,
        initiatorType: p.initiator?.type, redirectStatus: p.redirectResponse?.status}); return;
      case 'Network.responseReceived': log('network', 'response', {requestId: p.requestId,
        resourceType: p.type, url: _safeUrl(p.response?.url), status: p.response?.status,
        mimeType: p.response?.mimeType, fromDiskCache: p.response?.fromDiskCache,
        fromServiceWorker: p.response?.fromServiceWorker, protocol: p.response?.protocol}); return;
      case 'Network.loadingFinished': log('network', 'finished', {requestId: p.requestId,
        encodedDataLength: p.encodedDataLength}); return;
      case 'Network.loadingFailed': log('network', 'failed', {requestId: p.requestId,
        errorText: p.errorText, canceled: p.canceled, blockedReason: p.blockedReason}); return;
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
 * @returns {Promise<{stop: Function, closed: Promise, outputDir: string, profileDir: string, pid: number}>}
 */
async function startWebAnalyze({url, outputDir, profileDir, headless = false,
  chromium = 'chromium', timeoutMs = 20000} = {}) {
  let parsed;
  try { parsed = new URL(url); }
  catch (_) { throw _failure('invalid-url', 'url must be an absolute HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw _failure('invalid-scheme', 'url must use HTTP or HTTPS');
  if (typeof outputDir !== 'string' || !outputDir.trim())
    throw _failure('invalid-output', 'a new outputDir is required');
  if (typeof chromium !== 'string' || !chromium.trim())
    throw _failure('invalid-chromium', 'chromium executable name is required');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000)
    throw _failure('invalid-timeout', 'timeoutMs must be at least 1000');
  const dest = path.resolve(outputDir);
  const log = _recording(dest);
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
        const summary = await log.finish();
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
    const limit = performance.now() + timeoutMs;
    while (!fs.existsSync(portFile) && performance.now() < limit) {
      if (spawnError) throw _failure('chromium-launch-failed', 'cannot launch Chromium from effective PATH', spawnError);
      if (child.exitCode !== null || child.signalCode !== null) throw _failure('chromium-exited-early', 'Chromium quit before publishing TCP endpoint');
      await _wait(75);
    }
    if (!fs.existsSync(portFile)) throw _failure('tcp-port-timeout', 'Chromium did not publish DevToolsActivePort');
    const [portText, endpoint] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535 ||
        !/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(endpoint || ''))
      throw _failure('invalid-cdp-endpoint', 'Chromium published an invalid TCP endpoint');
    // Bind the debugger to loopback only. No all-interface remote debugger.
    cdp = new _Cdp(`ws://127.0.0.1:${port}${endpoint}`, log,
      () => { if (!closeRequested) {closeRequested = true; void stop('tcp-disconnected');} });
    await cdp.connect();
    await cdp.send('Target.setDiscoverTargets', {discover: true});
    await cdp.send('Target.setAutoAttach', {autoAttach: true,
      waitForDebuggerOnStart: true, flatten: true});
    const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank'});
    while (!cdp.targetSessions.has(targetId) && performance.now() < limit) await _wait(30);
    const sid = cdp.targetSessions.get(targetId);
    if (!sid) throw _failure('target-attach-timeout', 'Chromium page was not attached');
    // Wait for instrumentation confirmation before navigating to user URL.
    while (!cdp.sessions.get(sid)?.ready && performance.now() < limit) await _wait(30);
    if (!cdp.sessions.get(sid)?.ready) throw _failure('target-instrumentation-timeout', 'page observer not ready');
    const navigation = await cdp.send('Page.navigate', {url: parsed.href}, sid);
    if (navigation.errorText) log.write('error', 'page.initial-navigation-failed',
      {errorText: navigation.errorText, url: _safeUrl(url)});
    log.write('lifecycle', 'capture.ready', {targetId, url: _safeUrl(url), port, pid: child.pid});
    return {stop, closed, outputDir: dest, profileDir: profile, pid: child.pid};
  } catch (error) {
    log.write('error', 'capture.start-failed', {code: error.code || 'unknown', message: error.message});
    await stop('startup-failed');
    throw error;
  }
}

module.exports = {startWebAnalyze};
