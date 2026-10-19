'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {createRequire} = require('node:module');

function _error(status, id, detail)
{
  const error = new Error(detail);
  error.status = status;
  error.id = id;
  return error;
}

function _safeUrl(value)
{
  try
  {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol)) return '[non-http-url]';
    return url.origin + url.pathname + (url.search ? '?[redacted]' : '') +
      (url.hash ? '#[redacted]' : '');
  }
  catch
  {
    return '[unavailable-url]';
  }
}

function _safeMessage(value)
{
  return String(value).replace(/https?:\/\/[^\s"'<>]+/g, match => _safeUrl(match)).slice(0, 2000);
}

function _parse(argv)
{
  if (!Array.isArray(argv) || argv.length !== 2)
    throw _error(1, 'invalid-arguments',
      'usage: nodejs <path-to-lib> <http(s)-url> <analysis-dir>');

  let url;
  try
  {
    const parsed = new URL(argv[0]);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      throw new Error('unsupported URL scheme');
    url = parsed.href;
  }
  catch
  {
    throw _error(1, 'url-invalid', 'expected an HTTP(S) URL');
  }

  if (typeof argv[1] !== 'string' || argv[1].length === 0)
    throw _error(1, 'analysis-dir-invalid', 'expected a nonempty analysis directory');

  return {url, output: path.resolve(argv[1])};
}

function _probePreload()
{
  const destination = process.env.m_WEB_ANALYZE_PW_PROBE_FILE;
  if (!destination) return;
  // m/pkg can invoke other Node tools before reaching Playwright's Node CLI.
  // Only the requested executable's own Node process can provide a valid probe.
  const entry = process.argv[1] || '';
  if (path.basename(entry) !== 'playwright' &&
      !(path.basename(entry) === 'cli.js' &&
        path.basename(path.dirname(entry)) === 'playwright'))
    return;
  let result;
  try
  {
    result =
    {
      module: require.resolve('playwright'),
      browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || null,
      version: require('playwright/package.json').version
    };
  }
  catch (error)
  {
    result = {error: String(error.message || error)};
  }
  fs.writeFileSync(destination, JSON.stringify(result), {flag: 'wx', mode: 0o600});
}

function _resolvePlaywright()
{
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'web-analyze-pw-'));
  fs.chmodSync(temporary, 0o700);
  const file = path.join(temporary, 'probe.json');
  try
  {
    const env = {...process.env};
    env.m_WEB_ANALYZE_PW_PROBE_FILE = file;
    env.NODE_OPTIONS = (env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' : '') +
      '--require=' + JSON.stringify(__filename);

    // Run the installed command, by name, so m/pkg supplies its own NODE_PATH and browser HOME.
    // The preload merely reports the public Node module resolution; no package path is assumed.
    const run = spawnSync('playwright', ['--version'],
      {env, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
    if (run.error || run.status !== 0)
      throw _error(2, 'playwright-command-failed',
        'playwright command on PATH failed: ' + (run.error ? run.error.message :
          (run.stderr || 'exit ' + run.status).trim().slice(0, 500)));
    if (!fs.existsSync(file))
      throw _error(3, 'playwright-node-resolution-unavailable',
        'playwright command did not expose its Node.js module; expected the m pkg Playwright CLI');
    const result = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (result.error || typeof result.module !== 'string')
      throw _error(4, 'playwright-module-unavailable',
        'Playwright module resolution failed: ' + (result.error || 'invalid probe result'));
    const playwright = createRequire(result.module)('playwright');
    if (!playwright || !playwright.chromium)
      throw _error(5, 'playwright-api-invalid', 'resolved module has no Chromium API');
    if (result.browsersPath) process.env.PLAYWRIGHT_BROWSERS_PATH = result.browsersPath;
    return {playwright, version: result.version, browsersPath: result.browsersPath};
  }
  finally
  {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

function _save(file, value)
{
  fs.writeFileSync(file, value, {flag: 'wx', mode: 0o600});
}

function _event(state, kind, data, critical = false)
{
  if (state.blocked && !critical)
  {
    state.dropped++;
    return;
  }
  const record =
  {
    sequence: ++state.sequence,
    time: new Date().toISOString(),
    monotonicNs: process.hrtime.bigint().toString(),
    kind,
    data
  };
  if (!state.stream.write(JSON.stringify(record) + '\n')) state.blocked = true;
}

function _attachPage(page, state)
{
  page.on('domcontentloaded', () => _event(state, 'dom-content-loaded', {url: _safeUrl(page.url())}));
  page.on('load', () => _event(state, 'load', {url: _safeUrl(page.url())}));
  page.on('framenavigated', frame => _event(state, 'frame-navigation',
    {main: frame === page.mainFrame(), url: _safeUrl(frame.url())}));
  page.on('console', message =>
  {
    const loc = message.location();
    _event(state, 'console',
      {type: message.type(), location: {url: _safeUrl(loc.url || ''), line: loc.lineNumber,
        column: loc.columnNumber}, textLength: message.text().length});
  });
  page.on('pageerror', error => _event(state, 'page-error',
    {name: error.name, message: _safeMessage(error.message)}));
  page.on('request', request => _event(state, 'request',
    {url: _safeUrl(request.url()), method: request.method(),
      resource: request.resourceType(), navigation: request.isNavigationRequest()}));
  page.on('response', response => _event(state, 'response',
    {url: _safeUrl(response.url()), status: response.status(),
      resource: response.request().resourceType(), fromServiceWorker: response.fromServiceWorker()}));
  page.on('requestfailed', request => _event(state, 'request-failed',
    {url: _safeUrl(request.url()), failure: request.failure()}));
  page.on('crash', () => _event(state, 'page-crash', {}, true));
}

async function _instrument(context, state)
{
  await context.exposeBinding('__rumiWebAnalyzePWEvent', (_source, payload) =>
  {
    if (payload && typeof payload.kind === 'string')
      _event(state, 'in-page-' + payload.kind, payload.data || {});
  });

  await context.addInitScript(() =>
  {
    const send = (kind, data) =>
    {
      window.__rumiWebAnalyzePWEvent({kind, data}).catch(() => {});
    };
    let lastScroll = 0;
    document.addEventListener('scroll', event =>
    {
      const now = performance.now();
      if (now - lastScroll < 100) return;
      lastScroll = now;
      const target = event.target;
      send('scroll', {top: Number(target && target.scrollTop) || window.scrollY,
        height: Number(target && target.scrollHeight) || 0});
    }, true);
    document.addEventListener('wheel', event =>
    {
      send('wheel', {deltaX: event.deltaX, deltaY: event.deltaY});
    }, {passive: true, capture: true});
    document.addEventListener('click', event =>
    {
      send('click', {tag: event.target && event.target.tagName || null});
    }, true);
    const observe = () =>
    {
      if (!document.documentElement) return;
      let added = 0;
      let removed = 0;
      let changed = 0;
      let pending = false;
      const observer = new MutationObserver(records =>
      {
        for (const record of records)
        {
          added += record.addedNodes.length;
          removed += record.removedNodes.length;
          changed += record.type === 'attributes' || record.type === 'characterData' ? 1 : 0;
        }
        if (pending) return;
        pending = true;
        setTimeout(() =>
        {
          send('mutation-batch', {added, removed, changed});
          added = 0;
          removed = 0;
          changed = 0;
          pending = false;
        }, 200);
      });
      observer.observe(document.documentElement,
        {subtree: true, childList: true, attributes: true, characterData: true});
      if (typeof PerformanceObserver === 'function')
      {
        try
        {
          new PerformanceObserver(list =>
          {
            for (const entry of list.getEntries())
              send('performance', {entryType: entry.entryType, name: entry.name,
                duration: entry.duration, startTime: entry.startTime});
          }).observe({entryTypes: ['longtask', 'layout-shift', 'largest-contentful-paint']});
        }
        catch
        {
          // Unsupported performance entry types are optional instrumentation.
        }
      }
    };
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', observe, {once: true});
    else observe();
  });
}

async function _scrollInfo(page)
{
  return page.evaluate(() =>
  {
    const root = document.scrollingElement || document.documentElement;
    const candidates = [root, ...document.querySelectorAll('*')];
    let best = null;
    for (const element of candidates)
    {
      if (!(element instanceof HTMLElement)) continue;
      const size = element.scrollHeight - element.clientHeight;
      if (size < 70 || element.clientHeight < 90) continue;
      const style = getComputedStyle(element);
      if (element !== root && !/(auto|scroll)/.test(style.overflowY)) continue;
      const rect = element === root ?
        {x: 0, y: 0, width: innerWidth, height: innerHeight} :
        element.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 90) continue;
      const score = size * Math.min(rect.height, innerHeight) *
        Math.min(rect.width, innerWidth);
      if (!best || score > best.score)
      {
        best =
        {
          score,
          top: element.scrollTop,
          extent: size,
          viewport: element.clientHeight,
          x: Math.max(1, Math.min(innerWidth - 2, rect.x + rect.width / 2)),
          y: Math.max(1, Math.min(innerHeight - 2, rect.y + rect.height / 2))
        };
      }
    }
    return best || {top: 0, extent: 0, viewport: innerHeight,
      x: innerWidth / 2, y: innerHeight / 2};
  });
}

async function _capture(page, state, label)
{
  const number = String(state.captures.length).padStart(4, '0');
  const prefix = number + '-' + label;
  const geometry = await _scrollInfo(page);
  const metrics = await page.evaluate(() =>
  ({
    title: document.title,
    readyState: document.readyState,
    elements: document.querySelectorAll('*').length,
    links: document.querySelectorAll('a[href]').length,
    images: document.images.length,
    forms: document.forms.length,
    bodyTextLength: document.body ? document.body.innerText.length : 0,
    documentHeight: document.documentElement.scrollHeight,
    windowScrollY: window.scrollY,
    viewport: {width: innerWidth, height: innerHeight, deviceScale: devicePixelRatio}
  }));
  const html = await page.content();
  const htmlPath = prefix + '.html';
  const imagePath = prefix + '.png';
  _save(path.join(state.dir, htmlPath), html);
  await page.screenshot({path: path.join(state.dir, imagePath),
    animations: 'disabled', timeout: 20000});
  const capture = {label, time: new Date().toISOString(), url: _safeUrl(page.url()),
    geometry, metrics, htmlBytes: Buffer.byteLength(html), htmlPath, imagePath};
  state.captures.push(capture);
  _event(state, 'capture', capture, true);
  process.stdout.write('web-analyze-pw: capture ' + prefix + ' scroll=' +
    Math.round(geometry.top) + '/' + Math.round(geometry.extent) + '\n');
  return capture;
}

async function _sweep(page, state, options, stop)
{
  await _capture(page, state, 'initial');
  for (const direction of [1, -1])
  {
    let still = 0;
    for (let step = 0; step < options.maxSteps && !stop.requested; step++)
    {
      const before = await _scrollInfo(page);
      if (before.extent < 70) break;
      await page.mouse.move(before.x, before.y);
      await page.mouse.wheel(0, direction * Math.max(260, Math.floor(before.viewport * 0.7)));
      await page.waitForTimeout(options.settleMs);
      const after = await _scrollInfo(page);
      const progressed = Math.abs(after.top - before.top) > 2 ||
        Math.abs(after.extent - before.extent) > 2;
      if (progressed)
      {
        still = 0;
        await _capture(page, state, direction > 0 ? 'down' : 'up');
      }
      else
      {
        still++;
        if (still >= 3) break;
      }
    }
  }
}

async function webAnalyzePw(options)
{
  if (!options || typeof options.url !== 'string' || typeof options.output !== 'string')
    throw _error(1, 'library-options-invalid', 'webAnalyzePw expects parsed options with URL and output');
  options = {headless: false, maxSteps: 80, settleMs: 500, observeMs: 0, ...options};
  const analysisDir = path.resolve(options.output);
  fs.mkdirSync(analysisDir, {recursive: true, mode: 0o700});
  if (fs.lstatSync(analysisDir).isSymbolicLink() ||
      !fs.statSync(analysisDir).isDirectory())
    throw _error(8, 'analysis-dir-invalid', 'analysis directory must be a real directory');

  // Each invocation owns an independent private session. An existing directory
  // remains usable; previous evidence is never overwritten or deleted.
  const sessionDir = fs.mkdtempSync(path.join(analysisDir, 'run-'));
  options.output = sessionDir;
  const runtime = _resolvePlaywright();
  const stream = fs.createWriteStream(path.join(options.output, 'events.jsonl'),
    {flags: 'wx', mode: 0o600});
  const state = {dir: options.output, stream, sequence: 0, dropped: 0,
    blocked: false, captures: [], started: new Date().toISOString()};
  const stop = {requested: false};
  stream.on('drain', () => { state.blocked = false; });
  stream.on('error', error => { state.streamError = error.message; });
  const onSignal = () => { stop.requested = true; };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  let browser;
  let context;
  let session;
  let failure = null;
  try
  {
    _event(state, 'start', {url: _safeUrl(options.url), playwright: runtime.version,
      headless: options.headless, browserCache: runtime.browsersPath}, true);
    try
    {
      browser = await runtime.playwright.chromium.launch({headless: options.headless});
    }
    catch (error)
    {
      throw _error(6, 'browser-launch-failed', String(error.message) +
        ' (if the browser is missing, run: playwright install chromium)');
    }
    context = await browser.newContext({viewport: {width: 1440, height: 900},
      ignoreHTTPSErrors: false, serviceWorkers: 'allow'});
    await context.tracing.start({screenshots: true, snapshots: true, sources: false});
    await _instrument(context, state);
    const page = await context.newPage();
    _attachPage(page, state);
    let response;
    try
    {
      response = await page.goto(options.url, {waitUntil: 'domcontentloaded', timeout: 45000});
    }
    catch (error)
    {
      throw _error(7, 'navigation-failed', String(error.message));
    }
    _event(state, 'navigation-result',
      {url: _safeUrl(page.url()), status: response ? response.status() : null}, true);
    await page.waitForTimeout(options.settleMs);
    await _sweep(page, state, options, stop);
    let remaining = options.observeMs;
    while (remaining > 0 && !stop.requested)
    {
      const interval = Math.min(remaining, 250);
      await page.waitForTimeout(interval);
      remaining -= interval;
    }
    if (!stop.requested)
    {
      try
      {
        session = await context.newCDPSession(page);
        const mhtml = await session.send('Page.captureSnapshot', {format: 'mhtml'});
        _save(path.join(options.output, 'final.mhtml'), mhtml.data);
        _event(state, 'mhtml-captured', {name: 'final.mhtml'}, true);
      }
      catch (error)
      {
        _event(state, 'mhtml-unavailable', {message: String(error.message).slice(0, 500)}, true);
      }
    }
  }
  catch (error)
  {
    failure = error;
    _event(state, 'analysis-failed',
      {id: error.id || 'unexpected-failure', message: String(error.message).slice(0, 2000)}, true);
  }
  finally
  {
    if (session) await session.detach().catch(() => {});
    if (context)
    {
      await context.tracing.stop({path: path.join(options.output, 'trace.zip')})
        .catch(error => _event(state, 'trace-stop-failed',
          {message: String(error.message).slice(0, 500)}, true));
      await context.close().catch(() => {});
    }
    if (browser) await browser.close().catch(() => {});
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    _event(state, 'finish', {captures: state.captures.length, droppedEvents: state.dropped,
      interrupted: stop.requested}, true);
    await new Promise(resolve => stream.end(resolve));
    const summary =
    {
      started: state.started,
      finished: new Date().toISOString(),
      requestedUrl: _safeUrl(options.url),
      version: runtime.version,
      captures: state.captures,
      eventCount: state.sequence,
      droppedEvents: state.dropped,
      streamError: state.streamError || null,
      interrupted: stop.requested,
      failure: failure ? {id: failure.id, message: failure.message} : null,
      interpretation: 'Snapshots describe observed mounted DOM at each checkpoint; virtualized content can be absent between checkpoints.',
      sensitiveArtifacts: 'HTML, screenshots, trace.zip and MHTML may contain page/session data. Keep the 0700 output directory private.'
    };
    _save(path.join(options.output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  }
  if (failure) throw failure;
  if (state.streamError)
    throw _error(8, 'event-write-failed', state.streamError);
  return {output: options.output, captures: state.captures.length, droppedEvents: state.dropped};
}

async function webAnalyzePwMain(argv)
{
  let options;
  try
  {
    options = _parse(argv);
    const result = await webAnalyzePw(options);
    process.stdout.write('web-analyze-pw: completed: ' + result.output + '\n');
    return 0;
  }
  catch (error)
  {
    process.stderr.write('web-analyze-pw [' +
      (error.id || 'unexpected-failure') + ']: ' + String(error.message) + '\n');
    if (options) process.stderr.write('web-analyze-pw: output: ' + options.output + '\n');
    return Number.isInteger(error.status) ? error.status : 8;
  }
}

_probePreload();

module.exports = {webAnalyzePw, webAnalyzePwMain};

if (require.main === module)
{
  webAnalyzePwMain(process.argv.slice(2)).then(status =>
  {
    process.exitCode = status;
  });
}
