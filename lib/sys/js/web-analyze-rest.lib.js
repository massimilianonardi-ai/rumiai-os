'use strict';

// Read-only, best-effort acquisition of browser state before exploration.
// CDP output is private and may include authentication/session material.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const _styles = ['display', 'visibility', 'position', 'overflow', 'overflow-x',
  'overflow-y', 'width', 'height', 'max-width', 'max-height', 'min-width',
  'min-height', 'transform', 'opacity', 'z-index', 'font', 'font-family',
  'font-size', 'font-weight', 'line-height', 'color', 'background',
  'background-color', 'content', 'pointer-events', 'white-space',
  'grid-template-columns', 'grid-template-rows', 'flex-direction',
  'align-items', 'justify-content', 'margin', 'padding', 'border',
  'top', 'left', 'right', 'bottom', 'box-sizing'];

const _environmentExpression = String.raw`(async () => {
  const error = value => ({error: String(value?.message || value)});
  const safe = fn => {try {return fn();} catch (e) {return error(e);}};
  const list = (nodes, fn) => Array.from(nodes || []).map(node => safe(() => fn(node)));
  const stylesheet = sheet => safe(() => ({
    href: sheet.href, disabled: sheet.disabled, media: sheet.media?.mediaText,
    ownerNode: sheet.ownerNode?.localName || null,
    rules: list(sheet.cssRules, rule => rule.cssText)
  }));
  const storage = store => safe(() => {
    const entries = {};
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      entries[key] = {valueLength:(store.getItem(key) || '').length};
    }
    return entries;
  });
  const attributes = el => Object.fromEntries(Array.from(el.attributes || [])
    .map(a => [a.name, a.value]));
  const controls = list(document.querySelectorAll('input,textarea,select,option'), el => ({
    tag: el.localName, attributes: attributes(el),
    valueLength: String(el.value || '').length,
    checked: el.checked, selected: el.selected, validity: el.validity?.valid
  }));
  const roots = [];
  const scan = (node, depth) => {
    if (!node || depth > 50 || roots.length >= 3000) return;
    if (node.nodeType === 1 && node.shadowRoot) {
      roots.push({host: node.localName, hostId: node.id || null,
        mode: node.shadowRoot.mode, html: node.shadowRoot.innerHTML,
        adoptedStylesheets: list(node.shadowRoot.adoptedStyleSheets, stylesheet)});
      scan(node.shadowRoot, depth + 1);
    }
    for (const child of Array.from(node.children || [])) scan(child, depth + 1);
  };
  scan(document.documentElement, 0);
  const globalKeys = safe(() => Object.getOwnPropertyNames(window).sort());
  const registrations = await Promise.race([
    safe(() => navigator.serviceWorker?.getRegistrations()
      .then(items => items.map(r => ({scope:r.scope, active:r.active?.scriptURL,
        waiting:r.waiting?.scriptURL, installing:r.installing?.scriptURL})))
      .catch(error)),
    new Promise(resolve => setTimeout(() => resolve({error:'service-worker-timeout'}), 2500))
  ]);
  const cacheNames = await Promise.race([
    safe(() => window.caches?.keys().catch(error)),
    new Promise(resolve => setTimeout(() => resolve({error:'cache-keys-timeout'}), 2500))
  ]);
  const databases = await Promise.race([
    safe(() => indexedDB?.databases?.().catch(error)),
    new Promise(resolve => setTimeout(() => resolve({error:'indexeddb-list-timeout'}), 2500))
  ]);
  return {
    url: location.href, title: document.title, baseURI: document.baseURI,
    readyState: document.readyState, charset: document.characterSet,
    referrer: document.referrer, language: document.documentElement.lang,
    capturedAt: new Date().toISOString(),
    location: {href:location.href, origin:location.origin, hash:location.hash},
    scroll: {x:window.scrollX, y:window.scrollY,
      height:document.scrollingElement?.scrollHeight, viewport:window.innerHeight},
    scripts: list(document.scripts, el => ({
      src:el.src, type:el.type, async:el.async, defer:el.defer,
      integrity:el.integrity, crossOrigin:el.crossOrigin,
      inlineSource:el.src ? null : el.textContent
    })),
    links: list(document.querySelectorAll('link'), el => ({
      attributes:attributes(el), href:el.href, rel:el.rel
    })),
    stylesheets:list(document.styleSheets, stylesheet),
    adoptedStylesheets:list(document.adoptedStyleSheets, stylesheet),
    shadowRoots:roots,
    frames:list(document.querySelectorAll('iframe,frame'), el => ({
      attributes:attributes(el), src:el.src,
      readableDocument:safe(() => el.contentDocument?.documentElement?.outerHTML || null)
    })),
    media:list(document.querySelectorAll('img,video,audio,source,track,object,embed'), el => ({
      tag:el.localName, attributes:attributes(el), currentSrc:el.currentSrc,
      naturalWidth:el.naturalWidth, naturalHeight:el.naturalHeight,
      readyState:el.readyState
    })),
    canvas:list(document.querySelectorAll('canvas'), el => ({
      attributes:attributes(el), width:el.width, height:el.height,
      image:safe(() => el.toDataURL())
    })),
    controls,
    localStorage:storage(localStorage),
    sessionStorage:storage(sessionStorage),
    serviceWorkers:registrations,
    cacheNames, indexedDB:databases, globals:globalKeys,
    resources:safe(() => performance.getEntriesByType('resource').map(entry => ({
      name:entry.name, initiatorType:entry.initiatorType,
      startTime:entry.startTime, duration:entry.duration,
      transferSize:entry.transferSize, encodedBodySize:entry.encodedBodySize,
      decodedBodySize:entry.decodedBodySize
    }))),
    customElements:safe(() => [...new Set(Array.from(document.querySelectorAll('*'))
      .map(el => el.localName).filter(name => name.includes('-')))].sort()),
    elementCounts:safe(() => ({total:document.querySelectorAll('*').length,
      scripts:document.scripts.length, links:document.querySelectorAll('link').length,
      forms:document.forms.length, shadowRoots:roots.length}))
  };
})()`;

function _save(file, payload)
{
  const bytes = Buffer.isBuffer(payload) ? payload :
    Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) + '\n');
  fs.writeFileSync(file, bytes, {flag:'wx', mode:0o600});
  return {file:path.basename(file), bytes:bytes.length,
    sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}

function _record(manifest, name, target, status, detail = {})
{
  manifest.artifacts.push({name, target, status, ...detail});
}

async function _capture(session, manifest, target, dir, name, method, params, field, ext, timeoutMs)
{
  try
  {
    const result = await session.sendTarget(target.targetId, method, params, timeoutMs);
    const value = field ? result[field] : result;
    if (value === undefined || value === null)
      throw new Error('CDP returned no ' + (field || 'result'));
    const artifact = _save(path.join(dir, name + ext),
      ext === '.png' ? Buffer.from(value, 'base64') : value);
    _record(manifest, name, target.targetId, 'saved', {method, ...artifact});
    return value;
  }
  catch (error)
  {
    _record(manifest, name, target.targetId, 'unavailable',
      {method, error:String(error?.message || error)});
    return null;
  }
}

async function _eventListeners(session, manifest, target, dir)
{
  const groups = [];
  for (const [name, expression] of [
    ['window', 'window'],
    ['document', 'document'],
    ['root', 'document.documentElement']
  ])
  {
    try
    {
      const object = await session.sendTarget(target.targetId, 'Runtime.evaluate',
        {expression, returnByValue:false}, 6000);
      const objectId = object.result?.objectId;
      if (!objectId) throw Error('remote object not available');
      try
      {
        const response = await session.sendTarget(target.targetId,
          'DOMDebugger.getEventListeners', {objectId, depth:-1, pierce:true}, 20000);
        groups.push({name, listeners:(response.listeners || []).map(item => ({
          type:item.type, useCapture:item.useCapture, passive:item.passive,
          once:item.once, scriptId:item.scriptId, lineNumber:item.lineNumber,
          columnNumber:item.columnNumber, url:item.url,
          originalHandler:item.originalHandler?.description || null
        }))});
      }
      finally
      {
        await session.sendTarget(target.targetId, 'Runtime.releaseObject',
          {objectId}, 3000).catch(() => {});
      }
    }
    catch (error)
    {
      groups.push({name, error:String(error?.message || error)});
    }
  }
  const artifact = _save(path.join(dir,'event-listeners.json'), groups);
  _record(manifest, 'event-listeners', target.targetId, 'saved',
    {total:groups.reduce((sum,g) => sum + (g.listeners?.length || 0), 0), ...artifact});
}

async function _stylesheets(session, manifest, dir)
{
  const root = path.join(dir, 'stylesheets');
  fs.mkdirSync(root, {mode:0o700});
  const rows = [];
  const found = session.styleSheets();
  for (const header of found)
  {
    const info = {targetId:header.targetId, styleSheetId:header.styleSheetId,
      frameId:header.frameId, sourceURL:header.sourceURL,
      origin:header.origin, isInline:header.isInline,
      isMutable:header.isMutable, startLine:header.startLine};
    try
    {
      const result = await session.sendTarget(header.targetId, 'CSS.getStyleSheetText',
        {styleSheetId:header.styleSheetId}, 8000);
      const bytes = Buffer.from(result.text || '', 'utf8');
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      const filename = hash + '.css';
      try
      {
        fs.writeFileSync(path.join(root,filename), bytes, {flag:'wx',mode:0o600});
      }
      catch (error)
      {
        if (error.code !== 'EEXIST') throw error;
      }
      rows.push({...info, status:'saved', file:'stylesheets/' + filename,
        sha256:hash, bytes:bytes.length});
    }
    catch (error)
    {
      rows.push({...info, status:'unavailable', error:String(error?.message || error)});
    }
  }
  const artifact = _save(path.join(root,'index.json'), rows);
  _record(manifest, 'stylesheets', null, 'saved',
    {count:rows.length, failed:rows.filter(row => row.status !== 'saved').length,
      file:'stylesheets/index.json', bytes:artifact.bytes, sha256:artifact.sha256});
}

function _archiveBoundaryIndex(directory, dir, manifest, name)
{
  const source = path.join(directory, name + '.jsonl');
  if (!fs.existsSync(source))
  {
    _record(manifest, name + '-at-rest', null, 'unavailable',
      {error:'source index absent'});
    return;
  }
  const bytes = fs.readFileSync(source);
  const artifact = _save(path.join(dir, name + '-at-rest.jsonl'), bytes);
  const lines = bytes.toString('utf8').split('\n').filter(Boolean);
  _record(manifest, name + '-at-rest', null, 'saved',
    {...artifact, records:lines.length});
}


async function _cookies(session, manifest, target, directory)
{
  try
  {
    const response = await session.sendTarget(target.targetId,
      'Storage.getCookies', {}, 12000);
    const artifact = _save(path.join(directory, 'cookies.json'), response.cookies || []);
    _record(manifest, 'cookies', target.targetId, 'saved',
      {count:(response.cookies || []).length, ...artifact});
  }
  catch (error)
  {
    _record(manifest, 'cookies', target.targetId, 'unavailable',
      {method:'Storage.getCookies', error:String(error?.message || error)});
  }
}

const _storageExpression = String.raw`(() => {
  const read = storage => {
    const entries = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      entries[key] = storage.getItem(key);
    }
    return entries;
  };
  const inspect = kind => {
    try {return {status:'saved', values:read(window[kind])};}
    catch (error) {return {status:'unavailable', error:String(error)};}
  };
  return {origin:location.origin, url:location.href,
    localStorage:inspect('localStorage'), sessionStorage:inspect('sessionStorage')};
})()`;

async function _storage(session, manifest, target, directory)
{
  try
  {
    const response = await session.sendTarget(target.targetId,
      'Runtime.evaluate',
      {expression:_storageExpression, returnByValue:true}, 12000);
    if (response.exceptionDetails || !Object.hasOwn(response.result || {}, 'value'))
      throw new Error('runtime storage evaluation returned no result');
    const values = response.result.value;
    const artifact = _save(path.join(directory, 'storage.json'), values);
    _record(manifest, 'storage', target.targetId, 'saved',
      {localStatus:values.localStorage?.status,
        sessionStatus:values.sessionStorage?.status, ...artifact});
  }
  catch (error)
  {
    _record(manifest, 'storage', target.targetId, 'unavailable',
      {method:'Runtime.evaluate', error:String(error?.message || error)});
  }
}

async function captureRestEvidence(session, directory, options = {})
{
  if (!session || typeof session.sendTarget !== 'function' ||
      typeof session.targets !== 'function' || typeof session.styleSheets !== 'function')
    throw new TypeError('captureRestEvidence requires an active native CDP recording session');
  const dir = path.join(directory, 'rest');
  fs.mkdirSync(dir, {mode:0o700});
  const manifest = {phase:'rest-before-automated-input', capturedAt:new Date().toISOString(),
    artifacts:[], targets:[], limitations:[], networkAtStart:session.networkActivity()};
  const targets = session.targets().filter(item =>
    item.ready && ['page','iframe','background_page'].includes(item.type));
  const mainTarget = targets.find(item => item.main) || targets.find(item => item.type === 'page');
  if (!mainTarget) manifest.limitations.push('No ready CDP page target available');
  const ordered = mainTarget ? [mainTarget, ...targets.filter(item => item !== mainTarget)] : targets;
  if (mainTarget)
    await _cookies(session, manifest, mainTarget, dir);
  const root = path.join(dir,'targets');
  fs.mkdirSync(root, {mode:0o700});
  for (let index = 0; index < ordered.length; index++)
  {
    if (options.interrupted?.()) {manifest.limitations.push('Interrupted during rest capture');break;}
    const target = ordered[index];
    const name = 'target-' + String(index).padStart(3,'0');
    const folder = path.join(root,name);
    fs.mkdirSync(folder, {mode:0o700});
    manifest.targets.push({name, targetId:target.targetId, type:target.type,
      ready:target.ready, main:!!target.main});
    try
    {
      await session.sendTarget(target.targetId, 'DOM.enable', {}, 8000);
      await session.sendTarget(target.targetId, 'CSS.enable', {}, 8000);
    }
    catch (error)
    {
      manifest.limitations.push(name + ': DOM/CSS unavailable: ' +
        String(error?.message || error));
    }
    try
    {
      const response = await session.sendTarget(target.targetId, 'Runtime.evaluate',
        {expression:_environmentExpression, returnByValue:true,awaitPromise:true}, 15000);
      if (response.exceptionDetails || !Object.hasOwn(response.result || {}, 'value'))
        throw new Error('environment evaluation failed or returned no data');
      const artifact = _save(path.join(folder,'environment.json'), response.result.value);
      _record(manifest, 'environment', target.targetId, 'saved', artifact);
    }
    catch (error)
    {
      _record(manifest, 'environment', target.targetId, 'unavailable',
        {error:String(error?.message || error)});
    }
    await _storage(session, manifest, target, folder);
    await _capture(session, manifest, target, folder, 'frame-tree',
      'Page.getFrameTree', {}, null, '.json', 8000);
    await _capture(session, manifest, target, folder, 'dom-tree',
      'DOM.getDocument', {depth:-1,pierce:true}, null, '.json', 20000);
    await _capture(session, manifest, target, folder, 'dom-snapshot',
      'DOMSnapshot.captureSnapshot',
      {computedStyles:_styles, includePaintOrder:true,includeDOMRects:true},
      null, '.json', 20000);
    await _capture(session, manifest, target, folder, 'layout',
      'Page.getLayoutMetrics', {}, null, '.json', 8000);
    await _eventListeners(session, manifest, target, folder);
    if (target === mainTarget)
    {
      await _capture(session, manifest, target, dir, 'page',
        'Page.captureSnapshot', {format:'mhtml'}, 'data', '.mhtml', 25000);
      await _capture(session, manifest, target, dir, 'viewport',
        'Page.captureScreenshot', {format:'png',captureBeyondViewport:false},
        'data', '.png', 12000);
    }
  }
  await _stylesheets(session, manifest, dir);
  _archiveBoundaryIndex(directory, dir, manifest, 'resources');
  _archiveBoundaryIndex(directory, dir, manifest, 'scripts');
  _archiveBoundaryIndex(directory, dir, manifest, 'network-details');
  manifest.networkAtEnd = session.networkActivity();
  manifest.finishedAt = new Date().toISOString();
  manifest.status = manifest.artifacts.some(item => item.status !== 'saved') ||
    manifest.limitations.length ? 'partial' : 'captured';
  _save(path.join(dir, 'manifest.json'), manifest);
  const document = [
    '# Resting-page evidence (before automated input)', '',
    'These files describe observations, not all possible application behavior.',
    'They are captured after the initial DOM/network-settlement check,',
    'before the command issues any automated scrolling or other user inputs.', '',
    '## Evidence', '',
    '| Artifact | Target | Status | Bytes |',
    '| --- | --- | --- | ---: |',
    ...manifest.artifacts.map(row => '| ' + row.name + ' | ' +
      (row.target || '-') + ' | ' + row.status + ' | ' + (row.bytes ?? '-') + ' |'),
    '', 'Full metadata, errors and SHA-256 hashes: [manifest.json](manifest.json).',
    'Dynamic script files and network responses are archived at the run root.',
    'resources-at-rest.jsonl and scripts-at-rest.jsonl freeze the archival',
    'indexes at the boundary before the first automated scroll.',
    'This observation does not execute unvisited click handlers or discover',
    'server-only code, undisclosed routes, unloaded chunks or future external events.',
    '', '## Confidentiality', '',
    'This directory includes private page markup and runtime metadata,',
    'cookie and storage values, and browser artifacts; do not publish it.',
    ''
  ];
  _save(path.join(dir,'README.md'), document.join('\n'));
  return manifest;
}

module.exports = {captureRestEvidence};
