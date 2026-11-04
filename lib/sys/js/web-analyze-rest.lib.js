'use strict';

// Read-only, best-effort acquisition of browser state before exploration.
// CDP output is private and may include authentication/session material.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {StringDecoder} = require('node:string_decoder');

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
  const failures = groups.filter(group => group.error).length;
  _record(manifest, 'event-listeners', target.targetId,
    failures ? 'partial' : 'saved',
    {method:'DOMDebugger.getEventListeners',
      total:groups.reduce((sum,group) => sum + (group.listeners?.length || 0), 0),
      failures, ...artifact});
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
  const failed = rows.filter(row => row.status !== 'saved').length;
  _record(manifest, 'stylesheets', null, failed ? 'partial' : 'saved',
    {method:'CSS.getStyleSheetText', count:rows.length, failed,
      file:'stylesheets/index.json', bytes:artifact.bytes,
      sha256:artifact.sha256});
}


function _cdpMethodSupported(capabilities, domain, method)
{
  if (capabilities?.protocol?.status !== 'saved') return null;
  const entry = capabilities.protocol.domains.find(item => item.name === domain);
  return !!entry?.commands?.includes(method);
}

// Preserve the complete CDP AX response, including backendDOMNodeId and
// frameId links. Each frame is independently verifiable and may fail alone.
// getFullAXTree does not require Accessibility.enable, avoiding the persistent
// performance side effect of enabling the domain.
async function _accessibility(session, manifest, target, folder, frameTree, capabilities)
{
  const directory = path.join(folder, 'accessibility');
  fs.mkdirSync(directory, {mode:0o700});
  const method = 'Accessibility.getFullAXTree';
  const supported = _cdpMethodSupported(capabilities, 'Accessibility', 'getFullAXTree');
  const index =
  {
    capturedAt:new Date().toISOString(),
    method,
    protocolStatus:capabilities?.protocol?.status || 'unavailable',
    frameTreeObserved:!!frameTree?.frameTree,
    frames:[],
    skippedFrames:0,
    status:'partial'
  };
  if (supported === false)
  {
    index.status = 'unsupported';
    index.errorCode = 'accessibility-method-not-in-browser-schema';
  }
  else if (supported === null)
    index.errorCode = 'accessibility-browser-schema-unavailable';
  else
  {
    const frames = [];
    const visited = new Set();
    function walk(tree)
    {
      const frameId = tree?.frame?.id;
      if (frameId && !visited.has(frameId))
      {
        visited.add(frameId);
        frames.push(frameId);
      }
      for (const child of tree?.childFrames || [])
        walk(child);
    }
    if (frameTree?.frameTree) walk(frameTree.frameTree);
    // If frame discovery fails, still acquire the default document and
    // distinguish this from successfully enumerating all frame contexts.
    if (!frames.length) frames.push(null);
    const limit = 128;
    index.skippedFrames = Math.max(0, frames.length - limit);
    for (const [position, frameId] of frames.slice(0, limit).entries())
    {
      const entry = {frameId, status:'partial'};
      try
      {
        const result = await session.sendTarget
        (
          target.targetId, method, frameId ? {frameId} : {}, 20000
        );
        if (!Array.isArray(result.nodes) || !result.nodes.length)
          throw Object.assign(new Error('no AX nodes'), {code:'accessibility-empty-tree'});
        const file = 'frame-' + String(position).padStart(3,'0') + '.json';
        const artifact = _save(path.join(directory, file), result);
        Object.assign
        (
          entry,
          {
            status:'saved',
            file,
            bytes:artifact.bytes,
            sha256:artifact.sha256,
            nodes:result.nodes.length,
            backendDOMNodes:result.nodes.filter(node => node.backendDOMNodeId !== undefined).length
          }
        );
      }
      catch (error)
      {
        entry.errorCode = error.code || 'accessibility-frame-unavailable';
      }
      index.frames.push(entry);
    }
    if (index.skippedFrames)
      index.errorCode = 'accessibility-frame-limit';
    index.status = frameTree?.frameTree && !index.skippedFrames &&
      index.frames.length && index.frames.every(item => item.status === 'saved') ?
      'saved' : 'partial';
  }
  const artifact = _save(path.join(directory, 'index.json'), index);
  _record
  (
    manifest, 'accessibility', target.targetId, index.status,
    {
      method, file:'accessibility/index.json', bytes:artifact.bytes,
      sha256:artifact.sha256, frames:index.frames.length,
      incomplete:index.frames.filter(item => item.status !== 'saved').length,
      skippedFrames:index.skippedFrames
    }
  );
}


function _cssElements(document)
{
  const elements = [];
  const visited = new Set();
  const stack = [document?.root];
  while (stack.length)
  {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    const identity = node.backendNodeId || node.nodeId;
    if (identity && visited.has(identity)) continue;
    if (identity) visited.add(identity);
    if (node.nodeType === 1 && Number.isInteger(node.nodeId) && node.nodeId > 0)
      elements.push
      (
        {
          nodeId:node.nodeId,
          backendNodeId:node.backendNodeId || null,
          nodeName:node.nodeName || null,
          attributes:node.attributes || []
        }
      );
    const descendants = [];
    for (const property of ['children','shadowRoots','pseudoElements',
      'distributedNodes'])
    {
      descendants.push(...(node[property] || []));
    }
    for (const property of ['contentDocument','templateContent','importedDocument'])
    {
      if (node[property]) descendants.push(node[property]);
    }
    for (let i = descendants.length - 1; i >= 0; i--)
      stack.push(descendants[i]);
  }
  return elements;
}

// CDP reports the real cascade/pseudo selectors, all computed properties
// (including CSS custom properties) and actually used platform fonts. This
// read-only bounded pass never toggles pseudo states or forces CSS animations.
async function _cssNodeDetails(session, manifest, target, folder, domTree,
  capabilities, interrupted)
{
  const directory = path.join(folder, 'css-nodes');
  fs.mkdirSync(directory, {mode:0o700});
  const methods =
  [
    ['computed', 'getComputedStyleForNode'],
    ['matched', 'getMatchedStylesForNode'],
    ['fonts', 'getPlatformFontsForNode']
  ];
  const support = Object.fromEntries
  (
    methods.map
    (
      ([key, method]) => [key, _cdpMethodSupported(capabilities, 'CSS', method)]
    )
  );
  const nodes = _cssElements(domTree);
  const maximum = 384;
  const selected = nodes.slice(0, maximum);
  const index =
  {
    capturedAt:new Date().toISOString(),
    source:'DOM.getDocument(depth=-1,pierce=true)',
    methods:support,
    observedElements:nodes.length,
    selectedElements:selected.length,
    skippedElements:nodes.length - selected.length,
    deadlineMs:20000,
    pages:[],
    status:'partial'
  };
  if (Object.values(support).some(value => value === null))
    index.errorCode = 'css-browser-schema-unavailable';
  else if (Object.values(support).every(value => value === false))
  {
    index.status = 'unsupported';
    index.errorCode = 'css-methods-not-in-browser-schema';
  }
  else if (!domTree?.root)
    index.errorCode = 'css-dom-tree-unavailable';
  else
  {
    const deadline = Date.now() + index.deadlineMs;
    let processed = 0;
    for (let offset = 0; offset < selected.length; offset += 8)
    {
      if (interrupted?.() || Date.now() >= deadline) break;
      const rows = await Promise.all
      (
        selected.slice(offset, offset + 8).map
        (
          async node =>
          {
            const results = {};
            for (const [key, method] of methods)
            {
              if (support[key] !== true)
              {
                results[key] = {status:support[key] === false ?
                  'unsupported' : 'partial'};
                continue;
              }
              try
              {
                const result = await session.sendTarget
                (
                  target.targetId, 'CSS.' + method, {nodeId:node.nodeId}, 6000
                );
                results[key] = {status:'saved', result};
              }
              catch (error)
              {
                results[key] = {status:'partial',
                  errorCode:error.code || 'css-method-unavailable'};
              }
            }
            return {...node, methods:results};
          }
        )
      );
      const name = 'page-' + String(index.pages.length).padStart(3,'0') + '.json';
      const artifact = _save(path.join(directory, name), {nodes:rows});
      const failed = rows.reduce
      (
        (count, row) => count + Object.values(row.methods)
          .filter(item => item.status !== 'saved').length, 0
      );
      index.pages.push
      (
        {
          file:name, bytes:artifact.bytes, sha256:artifact.sha256,
          nodes:rows.length, incompleteMethods:failed,
          status:failed ? 'partial' : 'saved'
        }
      );
      processed += rows.length;
    }
    index.processedElements = processed;
    index.skippedElements = nodes.length - processed;
    index.status = !interrupted?.() && !index.skippedElements &&
      index.pages.length && index.pages.every(page => page.status === 'saved') ?
      'saved' : interrupted?.() ? 'interrupted' : 'partial';
    if (index.skippedElements && !index.errorCode)
      index.errorCode = processed < selected.length ?
        'css-time-budget-or-interruption' : 'css-element-limit';
  }
  const artifact = _save(path.join(directory, 'index.json'), index);
  const incomplete = index.pages.reduce
  (
    (count, page) => count + page.incompleteMethods, 0
  );
  _record
  (
    manifest, 'css-node-details', target.targetId, index.status,
    {
      method:'CSS.getComputedStyleForNode/CSS.getMatchedStylesForNode/' +
        'CSS.getPlatformFontsForNode',
      file:'css-nodes/index.json', bytes:artifact.bytes, sha256:artifact.sha256,
      observedElements:index.observedElements,
      capturedElements:index.processedElements || 0,
      skippedElements:index.skippedElements,
      unsupported:Object.values(support).filter(value => value === false).length,
      incomplete
    }
  );
}

// End the opt-in CSS rule-usage interval at the beginning of rest capture,
// before inspecting further DOM/CSS or issuing optional automatic scrolling.
// The returned coverage is evidence of observed rule use, not of every style
// declaration or every future interaction state. An unreported rule is not
// synonymous with a CSS.RuleUsage entry explicitly bearing used:false.
async function _cssRuleUsage(session, manifest, directory, interrupted)
{
  const root = path.join(directory, 'css-rule-usage');
  fs.mkdirSync(root, {mode:0o700});
  const targets = session.targets().filter(target =>
    ['page','iframe','background_page'].includes(target.type));
  const index =
  {
    requestedEndAt:new Date().toISOString(),
    source:'native-CDP-attached-target-instrumentation',
    stopMethod:'CSS.stopRuleUsageTracking',
    scope:'initial-navigation-to-rest-entry',
    effect:'CSS.enable and selector usage tracking were active',
    entries:[],
    status:'partial'
  };
  const deadline = Date.now() + 20000;
  const maximum = 64;
  for (let offset = 0; offset < Math.min(targets.length, maximum); offset += 4)
  {
    if (Date.now() >= deadline || interrupted?.()) break;
    const rows = await Promise.all
    (
      targets.slice(offset, offset + 4).map
      (
        async (target, slot) =>
        {
          const state = target.cssRuleUsage || null;
          const entry =
          {
            targetId:target.targetId,
            type:target.type,
            startedAt:state?.startedAt || null,
            requestedAt:state?.requestedAt || null,
            stoppedAt:null,
            status:'partial'
          };
          if (!state)
          {
            entry.status = 'inapplicable';
            entry.errorCode = 'css-coverage-not-requested-for-target';
          }
          else if (state.status !== 'started')
          {
            entry.status = state.status === 'unsupported' ? 'unsupported' : 'partial';
            entry.errorCode = state.errorCode || 'css-coverage-not-started';
          }
          else
          {
            try
            {
              const response = await session.sendTarget
              (
                target.targetId, 'CSS.stopRuleUsageTracking', {}, 10000
              );
              entry.stoppedAt = new Date().toISOString();
              if (!Array.isArray(response.ruleUsage))
                throw Object.assign(new Error('ruleUsage absent'),
                  {code:'css-coverage-missing-results'});
              const file = 'target-' + String(offset + slot).padStart(3,'0') + '.json';
              const artifact = _save(path.join(root, file), response);
              Object.assign
              (
                entry,
                {
                  file, bytes:artifact.bytes, sha256:artifact.sha256,
                  status:'saved',
                  rules:response.ruleUsage.length,
                  used:response.ruleUsage.filter(rule => rule.used === true).length,
                  reportedUnused:response.ruleUsage.filter(rule =>
                    rule.used === false).length,
                  unlinked:response.ruleUsage.filter(rule => !rule.styleSheetId).length
                }
              );
            }
            catch (error)
            {
              entry.stoppedAt = new Date().toISOString();
              entry.errorCode = error.code || 'css-coverage-stop-unavailable';
            }
          }
          if (entry.startedAt && entry.stoppedAt)
            entry.elapsedMs = Math.max(0,
              Date.parse(entry.stoppedAt) - Date.parse(entry.startedAt));
          return entry;
        }
      )
    );
    index.entries.push(...rows);
  }
  index.skippedTargets = targets.length - index.entries.length;
  index.finishedAt = new Date().toISOString();
  const statuses = index.entries.map(entry => entry.status);
  index.status = interrupted?.() ? 'interrupted' :
    index.skippedTargets ? 'partial' :
    statuses.length && statuses.every(status => status === 'saved') ? 'saved' :
    statuses.length && statuses.every(status => status === 'unsupported') ?
      'unsupported' : statuses.length && statuses.every(status => status === 'inapplicable') ?
        'inapplicable' : 'partial';
  if (index.skippedTargets) index.errorCode = 'css-coverage-target-limit-or-time-budget';
  const artifact = _save(path.join(root, 'index.json'), index);
  _record
  (
    manifest, 'css-rule-usage', null, index.status,
    {
      method:'CSS.stopRuleUsageTracking',
      file:'css-rule-usage/index.json', bytes:artifact.bytes,
      sha256:artifact.sha256, targets:index.entries.length,
      skippedTargets:index.skippedTargets,
      rules:index.entries.reduce((sum, entry) => sum + (entry.rules || 0), 0)
    }
  );
  if (index.status === 'partial' || index.status === 'interrupted')
    manifest.limitations.push('CSS rule usage tracking did not cover all ' +
      'instrumented targets; inspect css-rule-usage/index.json');
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


// Resolve source-map references solely against inlined data or completed
// response bodies already observed by the native CDP recorder. Never fetch a
// map URL: that would introduce a new page/network observation side effect.
function _sourceMapsAtRest(directory, dir, manifest, interrupted)
{
  const root = path.join(dir, 'source-maps');
  fs.mkdirSync(root, {mode:0o700});
  const index =
  {
    capturedAt:new Date().toISOString(),
    scope:'scriptParsed-before-rest-boundary',
    policy:'offline-existing-evidence-only',
    noNetworkRequests:true,
    scriptIndexStatus:'unavailable',
    resourceIndexStatus:'unavailable',
    scriptsObserved:0,
    referencesObserved:0,
    skippedReferences:0,
    entries:[],
    status:'partial'
  };
  const resources = new Map();
  const resourceState = _auditJsonl
  (
    directory, 'rest/resources-at-rest.jsonl', row =>
    {
      if (row.status === 'saved' && typeof row.url === 'string' &&
          typeof row.file === 'string' && !resources.has(row.url))
        resources.set(row.url, row);
    }
  );
  index.resourceIndexStatus = resourceState.status;
  const scriptReferences = [];
  const scriptState = _auditJsonl
  (
    directory, 'rest/scripts-at-rest.jsonl', row =>
    {
      index.scriptsObserved++;
      if (typeof row.sourceMapURL === 'string' && row.sourceMapURL)
      {
        index.referencesObserved++;
        if (scriptReferences.length < 128)
          scriptReferences.push(row);
        else
          index.skippedReferences++;
      }
    }
  );
  index.scriptIndexStatus = scriptState.status;
  const started = Date.now();
  let remainingBytes = 32 * 1024 * 1024;
  for (const script of scriptReferences)
  {
    const reference = script.sourceMapURL;
    const entry =
    {
      session:script.session,
      scriptId:script.scriptId,
      scriptURL:script.url || null,
      referenceLength:reference.length,
      referenceSha256:crypto.createHash('sha256')
        .update(reference).digest('hex'),
      reference:reference.length <= 2048 ? reference : null,
      kind:reference.startsWith('data:') ? 'inline-data' : 'external',
      status:'unavailable'
    };
    index.entries.push(entry);
    if (interrupted?.() || Date.now() - started >= 10000)
    {
      entry.status='partial';
      entry.errorCode='source-map-budget-or-interruption';
      continue;
    }
    try
    {
      let bytes;
      if (entry.kind === 'inline-data')
      {
        const match = /^data:([^,]*),(.*)$/s.exec(reference);
        if (!match)
          throw Object.assign(new Error('invalid inline map'),
            {code:'source-map-data-url-invalid'});
        const encoded = match[2];
        if (encoded.length > 24 * 1024 * 1024)
          throw Object.assign(new Error('inline map size cap'),
            {code:'source-map-size-limit'});
        if (/(?:^|;)base64(?:;|$)/i.test(match[1]))
        {
          bytes = Buffer.from(encoded, 'base64');
          if (bytes.toString('base64').replace(/=+$/, '') !==
              encoded.replace(/=+$/, ''))
            throw Object.assign(new Error('invalid base64 map'),
              {code:'source-map-base64-invalid'});
        }
        else
          bytes = Buffer.from(decodeURIComponent(encoded), 'utf8');
      }
      else
      {
        if (!script.url)
          throw Object.assign(new Error('script URL not available'),
            {code:'source-map-script-url-unavailable'});
        const resolved = new URL(reference, script.url);
        if (!['http:', 'https:'].includes(resolved.protocol))
          throw Object.assign(new Error('map scheme not supported'),
            {code:'source-map-scheme-unsupported'});
        resolved.hash = '';
        entry.resolvedURL = resolved.href;
        const resource = resources.get(resolved.href);
        if (!resource)
          throw Object.assign(new Error('map not in observed responses'),
            {code:'source-map-resource-not-observed'});
        if (!/^resources\/[0-9a-f]{64}\.[a-z0-9]+$/.test(resource.file))
          throw Object.assign(new Error('untrusted resource reference'),
            {code:'source-map-archive-path-invalid'});
        if (resource.bytes > 16 * 1024 * 1024)
          throw Object.assign(new Error('archived map size cap'),
            {code:'source-map-size-limit'});
        bytes = fs.readFileSync(path.join(directory, resource.file));
        if (bytes.length !== resource.bytes ||
            crypto.createHash('sha256').update(bytes).digest('hex') !== resource.sha256)
          throw Object.assign(new Error('resource evidence mismatch'),
            {code:'source-map-resource-integrity-failed'});
        entry.resource = resource.file;
      }
      if (!bytes.length || bytes.length > 16 * 1024 * 1024 ||
          bytes.length > remainingBytes)
        throw Object.assign(new Error('source map byte limit'),
          {code:'source-map-size-limit'});
      remainingBytes -= bytes.length;
      const artifact = _contentAddressed(root, bytes);
      entry.file = 'source-maps/' + artifact.file;
      entry.bytes = artifact.bytes;
      entry.sha256 = artifact.sha256;
      try
      {
        const parsed = JSON.parse(bytes.toString('utf8'));
        if (parsed?.version !== 3)
          throw Object.assign(new Error('non-v3 source map'),
            {code:'source-map-format-unsupported'});
        entry.format = 'source-map-v3';
        entry.sources = Array.isArray(parsed.sources) ? parsed.sources.length : 0;
        entry.sourcesContent = Array.isArray(parsed.sourcesContent) ?
          parsed.sourcesContent.filter(value => typeof value === 'string').length : 0;
        entry.sections = Array.isArray(parsed.sections) ? parsed.sections.length : 0;
        entry.status = 'saved';
      }
      catch (error)
      {
        entry.status='partial';
        entry.errorCode=error.code || 'source-map-json-invalid';
      }
    }
    catch (error)
    {
      entry.errorCode=error.code || 'source-map-recovery-failed';
    }
  }
  index.status = interrupted?.() ? 'interrupted' :
    scriptState.status !== 'saved' || resourceState.status !== 'saved' ||
    index.skippedReferences ||
    index.entries.some(entry => entry.status !== 'saved') ?
      'partial' : 'saved';
  index.finishedAt = new Date().toISOString();
  const artifact = _save(path.join(root, 'index.json'), index);
  _record
  (
    manifest, 'source-maps', null, index.status,
    {
      ...artifact, file:'source-maps/index.json',
      references:index.referencesObserved,
      resolved:index.entries.filter(entry => entry.status === 'saved').length,
      skipped:index.skippedReferences,
      policy:index.policy
    }
  );
  if (index.status === 'partial' || index.status === 'interrupted')
    manifest.limitations.push('Some source-map references could not be ' +
      'resolved from existing observed evidence; inspect source-maps/index.json');
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
    const localStatus = values.localStorage?.status || 'unavailable';
    const sessionStatus = values.sessionStorage?.status || 'unavailable';
    const status = localStatus === 'saved' && sessionStatus === 'saved' ?
      'saved' : 'partial';
    _record(manifest, 'storage', target.targetId, status,
      {method:'Runtime.evaluate', localStatus, sessionStatus, ...artifact});
  }
  catch (error)
  {
    _record(manifest, 'storage', target.targetId, 'unavailable',
      {method:'Runtime.evaluate', error:String(error?.message || error)});
  }
}


async function _targetOrigin(session, target)
{
  const response = await session.sendTarget(target.targetId,
    'Runtime.evaluate', {expression:'location.origin', returnByValue:true}, 7000);
  const value = response.result?.value;
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : null;
}

function _contentAddressed(directory, bytes)
{
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const filename = digest + '.bin';
  try
  {
    fs.writeFileSync(path.join(directory, filename), bytes, {flag:'wx',mode:0o600});
  }
  catch (error)
  {
    if (error.code !== 'EEXIST') throw error;
  }
  return {file:filename, sha256:digest, bytes:bytes.length};
}

async function _serializedRemote(session, target, remote)
{
  if (!remote?.objectId) return {status:'inline', remote};
  try
  {
    const response = await session.sendTarget(target.targetId,
      'Runtime.callFunctionOn',
      {objectId:remote.objectId, functionDeclaration:'function(){return this;}',
        serializationOptions:{serialization:'deep'}}, 12000);
    if (response.exceptionDetails || !response.result?.deepSerializedValue)
      throw new Error('deep remote serialization was not returned');
    return {status:'deep', value:response.result.deepSerializedValue};
  }
  catch (error)
  {
    // CDP previews are incomplete. Preserve the original object metadata
    // instead of silently treating that preview as a complete value.
    return {status:'unavailable', remote, error:String(error?.message || error)};
  }
  finally
  {
    await session.sendTarget(target.targetId, 'Runtime.releaseObject',
      {objectId:remote.objectId}, 3000).catch(() => {});
  }
}

async function _indexedDb(session, manifest, target, directory, origin, interrupted,
  slice = {})
{
  const folder = slice.folder || 'indexeddb';
  const selector = slice.selector || {securityOrigin:origin};
  const root = path.join(directory, folder);
  fs.mkdirSync(root, {mode:0o700, recursive:true});
  const index = {origin, selector, databases:[], errors:[]};
  const limited = () => interrupted?.() || (slice.deadline && Date.now() >= slice.deadline);
  try
  {
    await session.sendTarget(target.targetId, 'IndexedDB.enable', {}, 8000);
    const names = await session.sendTarget(target.targetId,
      'IndexedDB.requestDatabaseNames', selector, 12000);
    const databases = names.databaseNames || [];
    if (slice.maxDatabases !== undefined && databases.length > slice.maxDatabases)
      index.errors.push({code:'database-limit', skipped:databases.length-slice.maxDatabases});
    for (let databaseIndex = 0; databaseIndex < databases.length &&
      databaseIndex < (slice.maxDatabases ?? Infinity); databaseIndex++)
    {
      if (limited()) {index.errors.push('interrupted-or-budget');break;}
      const name = databases[databaseIndex];
      const db = {name, stores:[], status:'saved'};
      index.databases.push(db);
      try
      {
        const info = await session.sendTarget(target.targetId,
          'IndexedDB.requestDatabase',
          {...selector, databaseName:name}, 12000);
        db.schema = info.databaseWithObjectStores || null;
        const stores = db.schema?.objectStores || [];
        if (slice.maxStores !== undefined && stores.length > slice.maxStores)
        {
          db.status='partial';
          index.errors.push({code:'store-limit', database:name,
            skipped:stores.length-slice.maxStores});
        }
        for (let storeIndex = 0; storeIndex < stores.length &&
          storeIndex < (slice.maxStores ?? Infinity); storeIndex++)
        {
          if (limited()) {db.status='partial';break;}
          const storeName = stores[storeIndex].name;
          const store = {name:storeName, pages:[], entries:0, status:'saved'};
          db.stores.push(store);
          let offset = 0;
          let pageIndex = 0;
          while (!limited())
          {
            if (slice.maxPages !== undefined && pageIndex >= slice.maxPages)
            {
              store.status='partial';
              index.errors.push({code:'page-limit',database:name,store:storeName});
              break;
            }
            const result = await session.sendTarget(target.targetId,
              'IndexedDB.requestData',
              {...selector, databaseName:name,
                objectStoreName:storeName, skipCount:offset,
                pageSize:slice.pageSize || 50}, 20000);
            const entries = result.objectStoreDataEntries || [];
            const resolved = [];
            for (const entry of entries)
              resolved.push({
                key:await _serializedRemote(session,target,entry.key),
                primaryKey:await _serializedRemote(session,target,entry.primaryKey),
                value:await _serializedRemote(session,target,entry.value)
              });
            const filename = 'database-' + databaseIndex + '-store-' +
              storeIndex + '-page-' + pageIndex + '.json';
            const artifact = _save(path.join(root,filename),
              {offset,hasMore:!!result.hasMore,entries:resolved});
            const unavailable = resolved.filter(row =>
              row.value.status === 'unavailable' || row.key.status === 'unavailable' ||
              row.primaryKey.status === 'unavailable').length;
            store.pages.push({...artifact, offset, count:resolved.length, unavailable});
            if (unavailable) store.status = 'partial';
            offset += entries.length;
            store.entries += entries.length;
            pageIndex++;
            if (!result.hasMore) break;
            if (!entries.length)
              throw new Error('IndexedDB indicated more results but returned no entries');
          }
          if (limited()) store.status='partial';
          if (store.status !== 'saved') db.status='partial';
        }
      }
      catch (error)
      {
        db.status='partial';
        db.error=String(error?.message || error);
        index.errors.push({database:name,error:db.error});
      }
    }
  }
  catch (error)
  {
    index.errors.push({method:'IndexedDB',error:String(error?.message || error)});
  }
  const artifact = _save(path.join(root,'index.json'), index);
  const status = index.errors.length || index.databases.some(db => db.status !== 'saved')
    ? 'partial' : 'saved';
  _record(manifest, slice.artifactName || 'indexeddb', target.targetId, status,
    {databases:index.databases.length, ...artifact, file:folder + '/index.json',
      errors:index.errors.length});
}

async function _cacheStorage(session, manifest, target, directory, origin, interrupted,
  slice = {})
{
  const folder = slice.folder || 'cache-storage';
  const selector = slice.selector || {securityOrigin:origin};
  const root = path.join(directory, folder);
  const bodies = path.join(root, 'bodies');
  fs.mkdirSync(root, {mode:0o700, recursive:true});
  fs.mkdirSync(bodies, {mode:0o700});
  const index = {origin, selector, caches:[], errors:[]};
  const limited = () => interrupted?.() || (slice.deadline && Date.now() >= slice.deadline);
  try
  {
    const names = await session.sendTarget(target.targetId,
      'CacheStorage.requestCacheNames', selector, 12000);
    const caches = names.caches || [];
    if (slice.maxCaches !== undefined && caches.length > slice.maxCaches)
      index.errors.push({code:'cache-limit',skipped:caches.length-slice.maxCaches});
    for (const cache of caches.slice(0, slice.maxCaches ?? caches.length))
    {
      if (limited()) {index.errors.push('interrupted-or-budget');break;}
      const saved = {name:cache.cacheName, id:cache.cacheId, entries:[], status:'saved'};
      index.caches.push(saved);
      let offset=0;
      try
      {
        let pageIndex = 0;
        while (!limited())
        {
          if (slice.maxPages !== undefined && pageIndex >= slice.maxPages)
          {
            saved.status='partial';
            index.errors.push({code:'page-limit', cache:cache.cacheName});
            break;
          }
          const result = await session.sendTarget(target.targetId,
            'CacheStorage.requestEntries',
            {cacheId:cache.cacheId,skipCount:offset,
              pageSize:slice.pageSize || 50}, 20000);
          pageIndex++;
          const entries=result.cacheDataEntries || [];
          for (const entry of entries)
          {
            const item = {...entry};
            try
            {
              const response = await session.sendTarget(target.targetId,
                'CacheStorage.requestCachedResponse',
                {cacheId:cache.cacheId,requestURL:entry.requestURL,
                  requestHeaders:entry.requestHeaders || []}, 20000);
              if (typeof response.response?.body !== 'string')
                throw new Error('cached body unavailable from CDP');
              const artifact = _contentAddressed(bodies,
                Buffer.from(response.response.body,'base64'));
              item.body={status:'saved',...artifact,
                file:'bodies/'+artifact.file};
            }
            catch (error)
            {
              saved.status='partial';
              item.body={status:'unavailable',error:String(error?.message || error)};
            }
            saved.entries.push(item);
          }
          offset += entries.length;
          if (!result.hasMore) break;
          if (!entries.length)
            throw new Error('CacheStorage indicated more results with zero entries');
        }
        if (limited()) saved.status='partial';
      }
      catch (error)
      {
        saved.status='partial';
        saved.error=String(error?.message || error);
        index.errors.push({cache:cache.cacheName,error:saved.error});
      }
    }
  }
  catch (error)
  {
    index.errors.push({method:'CacheStorage',error:String(error?.message || error)});
  }
  const artifact = _save(path.join(root,'index.json'),index);
  _record(manifest, slice.artifactName || 'cache-storage', target.targetId,
    index.errors.length || index.caches.some(cache=>cache.status!=='saved') ?
      'partial' : 'saved',
    {caches:index.caches.length,entries:index.caches.reduce((sum,c)=>sum+c.entries.length,0),
      ...artifact,file:folder + '/index.json',errors:index.errors.length});
}

// Bounded read-only metadata. This is not full partition/bucket/OPFS capture.
async function _frameContext(session, manifest, target, directory, frameTree,
  capabilities, interrupted)
{
  const started = Date.now();
  const inventory = {scope:'observed-read-only-context-metadata',
    startedAt:new Date(started).toISOString(), targetId:target.targetId,
    frames:[], skippedFrames:0, limitations:[]};
  const query = async (domain, method, params = {}) =>
  {
    const supported = _cdpMethodSupported(capabilities, domain, method);
    if (supported === false)
      return {status:'unsupported', method:domain + '.' + method};
    if (supported === null)
      return {status:'partial', method:domain + '.' + method,
        errorCode:'browser-protocol-schema-unavailable'};
    try
    {
      return {status:'saved', method:domain + '.' + method,
        result:await session.sendTarget(target.targetId,
          domain + '.' + method, params, 4500)};
    }
    catch (error)
    {
      return {status:'partial', method:domain + '.' + method,
        errorCode:'browser-read-failed', error:String(error?.message || error)};
    }
  };
  const queue = frameTree?.frameTree ? [frameTree.frameTree] : [];
  const frames = [];
  while (queue.length && frames.length < 24)
  {
    const entry = queue.shift();
    if (entry?.frame?.id) frames.push(entry.frame);
    queue.push(...(entry.childFrames || []));
  }
  inventory.skippedFrames = queue.length;
  if (!frames.length)
    inventory.limitations.push('Frame tree did not expose frame identities');
  if (queue.length)
    inventory.limitations.push('Frame inventory bounded at 24 entries');
  for (let index = 0; index < frames.length; index++)
  {
    if (interrupted?.() || Date.now() - started > 20000)
    {
      inventory.skippedFrames += frames.length - index;
      inventory.limitations.push('Frame query budget or interruption reached');
      break;
    }
    const frame = frames[index];
    const item = {frameId:frame.id, parentId:frame.parentId || null};
    inventory.frames.push(item);
    item.storageKey = await query('Storage','getStorageKey',{frameId:frame.id});
    item.permissionsPolicy = await query('Page','getPermissionsPolicyState',
      {frameId:frame.id});
    item.originTrials = await query('Page','getOriginTrials',{frameId:frame.id});
    item.securityIsolation = await query('Network','getSecurityIsolationStatus',
      {frameId:frame.id});
  }
  if (!interrupted?.() && Date.now() - started < 20000)
  {
    inventory.resourceTree = await query('Page','getResourceTree');
    inventory.appManifest = await query('Page','getAppManifest');
    // Checking getDirectory support does not create an OPFS root.
    const expression = String.raw`(async () => {
      const result = {opfsSupported:typeof navigator.storage?.getDirectory === 'function',
        bucketNames:{status:'unsupported'}};
      if (typeof navigator.storageBuckets?.keys !== 'function') return result;
      try {
        const names = await Promise.race([
          navigator.storageBuckets.keys(),
          new Promise((_,reject) => setTimeout(() => reject(Error('bucket-keys-timeout')), 2000))
        ]);
        result.bucketNames = {status:'saved',names:Array.from(names)};
      } catch (error) {
        result.bucketNames = {status:'partial',error:String(error)};
      }
      return result;
    })()`;
    const runtime = await query('Runtime','evaluate',
      {expression, returnByValue:true, awaitPromise:true});
    if (runtime.status !== 'saved')
    {
      inventory.bucketNames = runtime;
      inventory.opfsSupport = {status:runtime.status, enumerated:false};
    }
    else if (runtime.result.exceptionDetails ||
      !Object.hasOwn(runtime.result.result || {}, 'value'))
    {
      inventory.bucketNames = {status:'partial',
        errorCode:'bucket-probe-unavailable'};
      inventory.opfsSupport = {status:'partial', enumerated:false};
    }
    else
    {
      const value = runtime.result.result.value;
      inventory.bucketNames = value.bucketNames;
      inventory.opfsSupport = {status:'saved', supported:value.opfsSupported,
        enumerated:false, reason:'getDirectory not invoked (possible root creation)'};
    }
  }
  else
  {
    inventory.resourceTree = {status:'partial',errorCode:'context-query-budget'};
    inventory.appManifest = {status:'partial',errorCode:'context-query-budget'};
    inventory.bucketNames = {status:'partial',errorCode:'context-query-budget'};
    inventory.opfsSupport = {status:'partial',enumerated:false};
  }
  const statuses = inventory.frames.flatMap(frame => [
    frame.storageKey.status, frame.permissionsPolicy.status,
    frame.originTrials.status, frame.securityIsolation.status
  ]).concat([inventory.resourceTree.status, inventory.appManifest.status,
    inventory.bucketNames.status, inventory.opfsSupport.status]);
  inventory.status = !inventory.limitations.length &&
    statuses.every(status => status === 'saved') ? 'saved' : 'partial';
  inventory.finishedAt = new Date().toISOString();
  const artifact = _save(path.join(directory,'frame-context.json'), inventory);
  _record(manifest, 'frame-context', target.targetId, inventory.status,
    {method:'CDP storage/page/network and navigator read-only queries',
      frames:inventory.frames.length, skippedFrames:inventory.skippedFrames,
      ...artifact});
  return inventory;
}

// The saved /json/protocol is the installed browser's parameter contract.
// A method name alone does not authorize a storageBucket/storageKey argument.
function _cdpParameterSupported(protocol, domain, method, parameter)
{
  const entry = protocol?.domains?.find(item => item.domain === domain);
  const command = entry?.commands?.find(item => item.name === method);
  return command ? !!command.parameters?.some(item => item.name === parameter) : false;
}

// Reuse the ordinary IndexedDB/Cache Storage readers with exact storage
// selectors; never silently fall back to origin-wide reads for other buckets.
async function _partitionStorage(session, manifest, target, directory, context,
  capabilities, protocol, interrupted)
{
  const root = path.join(directory, 'storage-partitions');
  fs.mkdirSync(root, {mode:0o700});
  const deadline = Date.now() + 40000;
  const index = {scope:'observed-storage-key-and-bucket-selections',
    startedAt:new Date().toISOString(), targets:[], selections:[],
    limitations:[], skippedKeys:0, skippedBuckets:0, status:'partial'};
  const keys = new Map();
  for (const frame of context?.frames || [])
  {
    const value = frame.storageKey?.result?.storageKey;
    if (frame.storageKey?.status !== 'saved' || typeof value !== 'string')
    {
      index.limitations.push('A frame storage key was unavailable');
      continue;
    }
    if (!keys.has(value)) keys.set(value, []);
    keys.get(value).push(frame.frameId);
  }
  const entries = [...keys].slice(0, 3);
  index.skippedKeys = Math.max(0, keys.size - entries.length);
  if (index.skippedKeys)
    index.limitations.push('Storage key enumeration exceeded its cap');
  if (!entries.length)
    index.limitations.push('No observed frame storage key can be enumerated');
  const mainFrameId = context?.frames?.[0]?.frameId || null;
  const mainKey = context?.frames?.[0]?.storageKey?.result?.storageKey || null;
  const named = context?.bucketNames?.status === 'saved' &&
    Array.isArray(context.bucketNames.names) ?
    context.bucketNames.names.filter(item => typeof item === 'string') : null;
  if (!named)
    index.limitations.push('Named buckets could not be enumerated from the main frame');
  const idbSupported = ['requestDatabaseNames','requestDatabase','requestData']
    .every(method => _cdpMethodSupported(capabilities, 'IndexedDB', method) === true) &&
    _cdpParameterSupported(protocol, 'IndexedDB','requestDatabaseNames','storageBucket') &&
    _cdpParameterSupported(protocol, 'IndexedDB','requestDatabase','storageBucket') &&
    _cdpParameterSupported(protocol, 'IndexedDB','requestData','storageBucket');
  const cacheSupported =
    _cdpMethodSupported(capabilities,'CacheStorage','requestCacheNames') === true &&
    _cdpParameterSupported(protocol,'CacheStorage','requestCacheNames','storageBucket');
  const filesystemSupported =
    _cdpMethodSupported(capabilities,'FileSystem','getDirectory') === true &&
    _cdpParameterSupported(protocol,'FileSystem','getDirectory','bucketFileSystemLocator');
  for (const [key, frameIds] of entries)
  {
    if (interrupted?.() || Date.now() >= deadline)
    {
      index.limitations.push('Partition collection stopped by interruption or time budget');
      break;
    }
    const names = key === mainKey ? named : null;
    if (key !== mainKey)
      index.limitations.push('Named buckets not enumerated for another frame storage key');
    const bucketNames = [null, ...(names || []).slice(0, 2)];
    index.skippedBuckets += Math.max(0, (names || []).length - 2);
    for (const name of bucketNames)
    {
      if (interrupted?.() || Date.now() >= deadline)
      {
        index.limitations.push('Bucket collection stopped by interruption or time budget');
        break;
      }
      const count = index.selections.length;
      const id = 'selection-' + String(count).padStart(3, '0');
      const selector = {storageBucket:{storageKey:key}};
      if (name !== null) selector.storageBucket.name = name;
      const row = {id, selector, frameIds, name, status:'partial', sources:{}};
      index.selections.push(row);
      const folder = 'storage-partitions/' + id;
      fs.mkdirSync(path.join(directory, folder), {mode:0o700, recursive:true});
      const capture = {selector, deadline, maxDatabases:4, maxStores:4,
        maxCaches:4, maxPages:3, pageSize:25};
      if (idbSupported)
      {
        await _indexedDb(session, manifest, target, directory, null, interrupted,
          {...capture, folder:folder + '/indexeddb', artifactName:'partition-indexeddb'});
        const artifact = manifest.artifacts.at(-1);
        row.sources.indexeddb = {status:artifact.status,
          file:artifact.file, sha256:artifact.sha256, bytes:artifact.bytes};
      }
      else
      {
        row.sources.indexeddb = {status:'unsupported',
          reason:'installed protocol lacks storageBucket selector'};
      }
      if (cacheSupported)
      {
        await _cacheStorage(session, manifest, target, directory, null, interrupted,
          {...capture, folder:folder + '/cache-storage', artifactName:'partition-cache-storage'});
        const artifact = manifest.artifacts.at(-1);
        row.sources.cacheStorage = {status:artifact.status,
          file:artifact.file, sha256:artifact.sha256, bytes:artifact.bytes};
      }
      else
      {
        row.sources.cacheStorage = {status:'unsupported',
          reason:'installed protocol lacks storageBucket selector'};
      }
      const opfs = {scope:'read-only-CDP-file-system-directory',
        selector, status:'unsupported', directories:[], limitations:[]};
      if (filesystemSupported)
      {
        const queue = [{components:[],depth:0}];
        while (queue.length && opfs.directories.length < 12 &&
          !interrupted?.() && Date.now() < deadline)
        {
          const item = queue.shift();
          const locator = {storageKey:key, pathComponents:item.components};
          if (name !== null) locator.bucketName = name;
          try
          {
            const response = await session.sendTarget(target.targetId,
              'FileSystem.getDirectory', {bucketFileSystemLocator:locator}, 4500);
            opfs.directories.push({pathComponents:item.components, status:'saved',
              result:response});
            if (item.depth < 3)
              for (const child of response.directory?.nestedDirectories || [])
                queue.push({components:[...item.components, child],depth:item.depth+1});
            else if ((response.directory?.nestedDirectories || []).length)
              opfs.limitations.push('Directory nesting depth exceeded');
          }
          catch (error)
          {
            opfs.directories.push({pathComponents:item.components,
              status:'partial', errorCode:'cdp-file-system-read-failed',
              error:String(error?.message || error)});
          }
        }
        if (queue.length || interrupted?.() || Date.now() >= deadline)
          opfs.limitations.push('Directory enumeration was bounded or interrupted');
        opfs.status = opfs.directories.length &&
          opfs.directories.every(item => item.status === 'saved') &&
          !opfs.limitations.length ? 'saved' : 'partial';
      }
      else
        opfs.limitations.push('Installed protocol does not expose read-only FileSystem.getDirectory');
      const opfsFile = folder + '/opfs.json';
      const artifact = _save(path.join(directory, opfsFile), opfs);
      _record(manifest, 'partition-opfs', target.targetId, opfs.status,
        {method:'FileSystem.getDirectory', file:opfsFile,
          bytes:artifact.bytes, sha256:artifact.sha256});
      row.sources.opfs = {status:opfs.status, file:opfsFile,
        bytes:artifact.bytes, sha256:artifact.sha256};
      row.status = Object.values(row.sources).every(item => item.status === 'saved') ?
        'saved' : 'partial';
    }
  }
  if (index.skippedBuckets)
    index.limitations.push('Named bucket enumeration exceeded its cap');
  index.finishedAt = new Date().toISOString();
  if (index.selections.length && !index.limitations.length &&
    index.selections.every(item => item.status === 'saved'))
    index.status = 'saved';
  const artifact = _save(path.join(root,'index.json'), index);
  _record(manifest, 'storage-partitions', target.targetId, index.status,
    {method:'Storage.getStorageKey/IndexedDB/CacheStorage/FileSystem.getDirectory',
      selections:index.selections.length, skippedKeys:index.skippedKeys,
      skippedBuckets:index.skippedBuckets, ...artifact,
      file:'storage-partitions/index.json'});
  if (index.status !== 'saved')
    manifest.limitations.push('Partition and bucket evidence is incomplete; ' +
      'inspect private storage-partitions/index.json');
}

async function _originStorage(session, manifest, target, directory, interrupted)
{
  let origin;
  try {origin=await _targetOrigin(session,target);}
  catch (error)
  {
    _record(manifest,'origin-storage',target.targetId,'unavailable',
      {error:String(error?.message || error)});
    return;
  }
  if (!origin)
  {
    _record(manifest,'origin-storage',target.targetId,'unavailable',
      {error:'opaque or non-HTTP security origin'});
    return;
  }
  await _capture(session,manifest,target,directory,'storage-usage',
    'Storage.getUsageAndQuota',{origin},null,'.json',12000);
  await _indexedDb(session,manifest,target,directory,origin,interrupted);
  await _cacheStorage(session,manifest,target,directory,origin,interrupted);
}

function _targetSignature(graph)
{
  const entries = [];
  for (const target of graph.targets)
  {
    entries.push([target.targetId, target.attached, target.ready].join(':'));
  }
  entries.sort();
  return JSON.stringify(entries);
}

async function _settleTargetGraph(session, interrupted)
{
  let graph = await session.targetGraph();
  let signature = _targetSignature(graph);
  let unchangedSince = Date.now();
  const deadline = Date.now() + 3000;
  while (!interrupted?.() && Date.now() < deadline &&
    Date.now() - unchangedSince < 800)
  {
    await new Promise(resolve => setTimeout(resolve, 200));
    const next = await session.targetGraph();
    const nextSignature = _targetSignature(next);
    if (nextSignature !== signature)
    {
      signature = nextSignature;
      unchangedSince = Date.now();
    }
    graph = next;
  }
  const result =
  {
    ...graph,
    targetQuietMs:Date.now() - unchangedSince,
    targetQuiescenceBounded:true
  };
  return result;
}

async function _captureDomHistoryContexts(session, manifest, directory, graph)
{
  const results = [];
  const targets = new Map(graph.targets.map(target =>
    [target.targetId, target]));
  for (const context of graph.contexts)
  {
    const target = targets.get(context.targetId);
    if (!target || !target.attached ||
      !['page','iframe','background_page'].includes(target.type) ||
      context.destroyedAt || context.auxData?.isDefault === false)
      continue;
    const entry =
    {
      targetId:context.targetId,
      contextId:context.contextId,
      frameId:context.auxData?.frameId || null,
      origin:context.origin || null,
      status:'unavailable'
    };
    try
    {
      const response = await session.sendTarget(context.targetId,
        'Runtime.evaluate', {
          contextId:context.contextId,
          expression:'globalThis.__mWebAnalyzeDomHistoryReport?.() || null',
          returnByValue:true
        }, 7000);
      const value = response.result?.value;
      if (response.exceptionDetails || !value)
        throw Error('context observer status unavailable');
      entry.observer = value;
      entry.status = value.observerFailures || value.notificationsFailed ||
        value.serializedTruncated || value.attachShadowHook !== 'installed' ||
        !value.hookStillInstalled || value.documentAtInstall ? 'partial' : 'saved';
    }
    catch (error)
    {
      entry.errorCode = error.code || 'dom-history-context-unavailable';
    }
    results.push(entry);
  }
  const artifact = _save(path.join(directory, 'dom-history-contexts.json'),
    {capturedAt:new Date().toISOString(), contexts:results});
  const status = results.length && results.every(item => item.status === 'saved') ?
    'saved' : 'partial';
  _record(manifest, 'dom-history-contexts', null, status, {
    ...artifact,
    contexts:results.length,
    incomplete:results.filter(item => item.status !== 'saved').length
  });
  if (status !== 'saved')
    manifest.limitations.push('Document mutation instrumentation is incomplete ' +
      'or unavailable in one or more JavaScript contexts; inspect dom-history-contexts.json');
}

async function captureRestEvidence(session, directory, options = {})
{
  if (!session || typeof session.sendTarget !== 'function' ||
      typeof session.targets !== 'function' || typeof session.targetGraph !== 'function' ||
      typeof session.styleSheets !== 'function')
    throw new TypeError('captureRestEvidence requires an active native CDP recording session');
  const capabilities = (() =>
  {
    try {return JSON.parse(fs.readFileSync(path.join(directory,
      'cdp-capabilities.json'), 'utf8'));}
    catch (_) {return null;}
  })();
  const protocol = (() =>
  {
    try {return JSON.parse(fs.readFileSync(path.join(directory,
      'cdp-protocol.json'), 'utf8'));}
    catch (_) {return null;}
  })();
  const dir = path.join(directory, 'rest');
  fs.mkdirSync(dir, {mode:0o700});
  const manifest = {phase:'rest-before-automated-input', capturedAt:new Date().toISOString(),
    artifacts:[], targets:[], limitations:[], networkAtStart:session.networkActivity()};
  // A CSS coverage failure must not prevent unrelated rest acquisition.
  // Keep the complete failure private; only a stable identity enters summaries.
  try
  {
    await _cssRuleUsage(session, manifest, dir, options.interrupted);
  }
  catch (error)
  {
    const details = _save
    (
      path.join(dir, 'css-rule-usage-error.json'),
      {
        name:error.name || 'Error',
        code:error.code || 'css-rule-usage-error',
        message:String(error.message || error),
        stack:String(error.stack || '')
      }
    );
    _record(manifest, 'css-rule-usage', null, 'partial', {
      ...details, errorCode:error.code || 'css-rule-usage-error',
      errorName:error.name || 'Error'
    });
    manifest.limitations.push('CSS rule usage collection failed; inspect ' +
      'private css-rule-usage-error.json');
  }
  // Snapshot discovery after initial settlement: targetGraph refreshes the
  // browser's complete known-target inventory, including unattached targets.
  let initialGraph;
  try
  {
    initialGraph = await _settleTargetGraph(session, options.interrupted);
    const artifact = _save(path.join(dir, 'target-graph-initial.json'),
      initialGraph);
    _record(manifest, 'target-graph-initial', null,
      initialGraph.discovery.status === 'saved' ? 'saved' : 'partial',
      artifact);
    await _captureDomHistoryContexts(session, manifest, dir, initialGraph);
  }
  catch (error)
  {
    manifest.limitations.push('Target graph unavailable: ' +
      String(error?.message || error));
  }
  const targets = session.targets().filter(item =>
    item.ready && ['page','iframe','background_page',
      'worker','shared_worker','service_worker'].includes(item.type));
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
      ready:target.ready, parentTargetId:target.parentTargetId || null,
      main:!!target.main});
    if (['worker','shared_worker','service_worker'].includes(target.type))
    {
      // Workers have no document or CSSOM; inspect their global environment
      // using their own attached Runtime session, not the page target.
      await _capture(session, manifest, target, folder, 'worker-environment',
        'Runtime.evaluate', {
          expression:'(() => ({kind:self.constructor?.name || null,' +
            'url:self.location?.href || null,' +
            'scope:typeof registration === "undefined" ? null : registration.scope,' +
            'navigator:self.navigator?.userAgent || null}))()',
          returnByValue:true
        }, null, '.json', 8000);
      continue;
    }
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
    await _originStorage(session, manifest, target, folder, options.interrupted);
    const frameTree = await _capture(session, manifest, target, folder, 'frame-tree',
      'Page.getFrameTree', {}, null, '.json', 8000);
    const frameContext = await _frameContext(session, manifest, target, folder,
      frameTree, capabilities, options.interrupted);
    await _partitionStorage(session, manifest, target, folder, frameContext,
      capabilities, protocol, options.interrupted);
    const domTree = await _capture(session, manifest, target, folder, 'dom-tree',
      'DOM.getDocument', {depth:-1,pierce:true}, null, '.json', 20000);
    await _cssNodeDetails(session, manifest, target, folder, domTree,
      capabilities, options.interrupted);
    await _capture(session, manifest, target, folder, 'dom-snapshot',
      'DOMSnapshot.captureSnapshot',
      {computedStyles:_styles, includePaintOrder:true,includeDOMRects:true},
      null, '.json', 20000);
    await _accessibility(session, manifest, target, folder, frameTree, capabilities);
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
  try
  {
    const graph = await session.targetGraph();
    const artifact = _save(path.join(dir, 'target-graph-final.json'), graph);
    const notAttached = graph.targets.filter(target =>
      !target.attached && !target.destroyedAt &&
      ['page','iframe','worker','shared_worker',
        'service_worker','background_page'].includes(target.type));
    const unfinished = graph.targets.filter(target =>
      target.attached && !target.ready);
    if (notAttached.length || unfinished.length)
      manifest.limitations.push('Target graph has ' + notAttached.length +
        ' unattached and ' + unfinished.length + ' unready relevant targets');
    const captured = new Set(manifest.targets.map(target => target.targetId));
    const uncaptured = graph.targets.filter(target =>
      target.attached && target.ready &&
      ['page','iframe','worker','shared_worker',
        'service_worker','background_page'].includes(target.type) &&
      !captured.has(target.targetId));
    if (uncaptured.length)
      manifest.limitations.push('Target graph has ' + uncaptured.length +
        ' attached, ready, but uncaptured targets');
    if (graph.issues.length)
      manifest.limitations.push('CDP target instrumentation issues: ' +
        graph.issues.length);
    _record(manifest, 'target-graph-final', null,
      graph.discovery.status === 'saved' && !notAttached.length &&
        !unfinished.length && !uncaptured.length && !graph.issues.length ?
        'saved' : 'partial',
      {...artifact, totalTargets:graph.targets.length,
        contexts:graph.contexts.length,
        unattached:notAttached.map(target => target.targetId),
        unready:unfinished.map(target => target.targetId),
        uncaptured:uncaptured.map(target => target.targetId)});
  }
  catch (error)
  {
    manifest.limitations.push('Final target graph unavailable: ' +
      String(error?.message || error));
  }
  _archiveBoundaryIndex(directory, dir, manifest, 'resources');
  _archiveBoundaryIndex(directory, dir, manifest, 'scripts');
  _archiveBoundaryIndex(directory, dir, manifest, 'network-details');
  _archiveBoundaryIndex(directory, dir, manifest, 'dom-mutations');
  _sourceMapsAtRest(directory, dir, manifest, options.interrupted);
  manifest.networkAtEnd = session.networkActivity();
  manifest.finishedAt = new Date().toISOString();
  manifest.status = options.interrupted?.() ? 'interrupted' :
    manifest.artifacts.some(item => item.status !== 'saved') ||
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
    '', 'Target discovery, execution contexts, attachment parents and explicit',
    'unattached/unready targets: [initial graph](target-graph-initial.json)',
    'and [final graph](target-graph-final.json).',
    'Document-context observer status: [dom-history-contexts.json](dom-history-contexts.json).',
    'Sensitive chronological node changes before rest exploration are mirrored in',
    '[dom-mutations-at-rest.jsonl](dom-mutations-at-rest.jsonl).',
    'Initial-navigation CSS rule usage ends at rest entry (before optional',
    'scroll); per-target used/unused ranges and timing: css-rule-usage/.',
    'Per-document matched/computed CSS and platform font results (including',
    'custom properties and pseudo rules) are under each target css-nodes/.',
    'Limits and per-method failures are explicit in css-nodes/index.json.',
    'Per-document Accessibility.getFullAXTree responses, including backend DOM',
    'node links and frame-specific partial outcomes, are under each target accessibility/.',
    'Frame storage keys, permissions policy, origin trials, security isolation,',
    'resource tree and app manifest are indexed in target-NNN/frame-context.json.',
    'Storage-partition evidence (per observed storage key and named/default bucket)',
    'is in targets/target-NNN/storage-partitions/ with separate indexeddb,',
    'cache-storage and read-only CDP FileSystem directory metadata artifacts.',
    'The original origin-wide archive remains separately labeled; selector',
    'support is checked against the installed Chromium CDP protocol.',
    'Collection caps and missing bucket/content/OPFS file bytes are explicit.',
    'Worker global snapshots are saved under targets/target-NNN/worker-environment.json.',
    'Not all targets are page documents and not every worker has a DOM.',
    '', 'Full metadata, errors and SHA-256 hashes: [manifest.json](manifest.json).',
    'Source-map references resolved only from inline data or already observed',
    'response bodies are indexed privately in source-maps/index.json.',
    'Unobserved external map URLs remain explicitly unavailable; no new',
    'map downloads or page requests are performed.',
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

// Verify indexes after the browser is stopped: metadata is never a substitute
// for checking the exact bytes already on disk. Do not copy private values
// from any input index into the evidence-integrity report.
function _auditArtifact(directory, relative, reference = {})
{
  const record =
  {
    file:relative,
    source:reference.source || 'filesystem',
    target:reference.target || null,
    method:reference.method || null,
    expectedStatus:reference.status || 'saved',
    status:'failed'
  };
  if (typeof relative !== 'string' || !relative ||
      path.isAbsolute(relative) || relative.split('/').some(item =>
        !item || item === '..' || item === '.'))
  {
    record.errorCode = 'invalid-evidence-path';
    return record;
  }
  const file = path.resolve(directory, relative);
  if (!file.startsWith(path.resolve(directory) + path.sep))
  {
    record.errorCode = 'outside-evidence-root';
    return record;
  }
  try
  {
    let current = path.resolve(directory);
    for (const segment of relative.split('/'))
    {
      current = path.join(current, segment);
      if (fs.lstatSync(current).isSymbolicLink())
        throw Object.assign(new Error('linked evidence'), {code:'evidence-symlink'});
    }
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw Object.assign(new Error('not a file'), {
      code:'evidence-not-file'
    });
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(file, 'r');
    const buffer = Buffer.allocUnsafe(256 * 1024);
    let bytes = 0;
    try
    {
      let length;
      while ((length = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0)
      {
        hash.update(buffer.subarray(0, length));
        bytes += length;
      }
    }
    finally {fs.closeSync(fd);}
    record.bytes = bytes;
    record.sha256 = hash.digest('hex');
    record.private = (stat.mode & 0o077) === 0;
    if (reference.bytes !== undefined && reference.bytes !== bytes)
      record.errorCode = 'evidence-byte-count-mismatch';
    else if (reference.sha256 && reference.sha256 !== record.sha256)
      record.errorCode = 'evidence-sha256-mismatch';
    else if (!record.private)
      record.errorCode = 'evidence-permissions-too-broad';
    else record.status = 'saved';
  }
  catch (error)
  {
    record.errorCode = error.code === 'ENOENT' ? 'evidence-file-missing' :
      error.code || 'evidence-read-failed';
  }
  return record;
}

function _auditJsonl(directory, name, callback)
{
  const file = path.join(directory, name);
  const index =
  {
    file:name, status:'saved', records:0,
    invalidRecords:0, sequenceErrors:0
  };
  try
  {
    const fd = fs.openSync(file, 'r');
    const buffer = Buffer.allocUnsafe(128 * 1024);
    let carry = '';
    const decoder = new StringDecoder('utf8');
    const parse = line =>
    {
      if (!line) return;
      index.records++;
      try
      {
        const row = JSON.parse(line);
        callback?.(row, index.records, index);
      }
      catch (error)
      {
        index.invalidRecords++;
        if (!index.errorCode)
          index.errorCode = error.code || 'malformed-jsonl-record';
      }
    };
    try
    {
      let size;
      while ((size = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0)
      {
        carry += decoder.write(buffer.subarray(0, size));
        let end;
        while ((end = carry.indexOf('\n')) !== -1)
        {
          parse(carry.slice(0, end));
          carry = carry.slice(end + 1);
        }
        // An individual packet may be large. The file's full byte integrity
        // is separately hashed; reject unbounded line materialization.
        if (carry.length > 64 * 1024 * 1024)
        {
          index.errorCode = 'jsonl-record-size-limit';
          index.invalidRecords++;
          break;
        }
      }
      carry += decoder.end();
      if (carry.trim()) parse(carry);
    }
    finally {fs.closeSync(fd);}
  }
  catch (error)
  {
    index.errorCode = error.code === 'ENOENT' ? 'index-file-missing' :
      error.code || 'index-unreadable';
  }
  if (index.errorCode || index.invalidRecords || index.sequenceErrors)
    index.status = 'failed';
  return index;
}

function _auditSourceStatus(value)
{
  if (value === 'saved' || value === 'captured') return 'saved';
  if (value === 'redirect-no-body') return 'inapplicable';
  if (value === 'unsupported' || value === 'inapplicable') return value;
  if (value === 'interrupted' || value === 'unfinished-at-shutdown' ||
      value === 'body-read-pending-at-shutdown') return 'interrupted';
  if (['partial','unavailable','request-failed','body-unavailable',
    'source-unavailable','finished-without-metadata'].includes(value))
    return 'partial';
  return 'failed';
}

function _auditAggregate(rows)
{
  if (rows.some(row => row.status === 'failed')) return 'failed';
  if (rows.some(row => row.status === 'interrupted')) return 'interrupted';
  if (rows.some(row => row.status === 'partial')) return 'partial';
  if (rows.some(row => row.status === 'unsupported')) return 'partial';
  if (!rows.length) return 'partial';
  return 'saved';
}

function _auditDocument(directory, relative)
{
  try {return JSON.parse(fs.readFileSync(path.join(directory, relative), 'utf8'));}
  catch (_) {return null;}
}

function auditWebAnalyzeEvidence(directory, options = {})
{
  const root = path.resolve(directory);
  const startedAt = new Date().toISOString();
  const summary = _auditDocument(root, 'summary.json');
  const manifest = _auditDocument(root, 'rest/manifest.json');
  const ledger =
  {
    checkedAt:startedAt,
    finishedAt:null,
    source:'post-capture-filesystem-verification',
    scope:'observed-evidence-only',
    status:'partial',
    artifacts:[],
    streams:[],
    targets:[],
    domains:[],
    discrepancies:[],
    coverage:
    {
      network:
      {
        requests:summary?.resourceCapture?.requests ?? null,
        savedBodies:summary?.resourceCapture?.saved ?? null,
        failedRequests:summary?.resourceCapture?.failed ?? null,
        unfinishedRequests:summary?.resourceCapture?.unfinished ?? null,
        pendingBodies:summary?.resourceCapture?.pendingBodies ?? null,
        pendingReads:summary?.resourceCapture?.pendingReads ?? null,
        drained:summary?.resourceCapture?.networkDrained ?? null,
        partialStreams:summary?.resourceCapture?.partialStreams ?? null,
        truncatedStreams:0,
        streamDataGaps:0,
        bufferConfiguration:(summary?.resourceCapture?.networkConfiguration || [])
          .map(item => ({
            enabled:item.enabled,
            durable:item.durable,
            bufferErrorCode:item.bufferErrorCode || null,
            durableErrorCode:item.durableErrorCode || null,
            buffers:item.buffers || null
          }))
      },
      dom:
      {
        events:summary?.resourceCapture?.domHistory?.events ?? null,
        records:summary?.resourceCapture?.domHistory?.records ?? null,
        truncatedValues:summary?.resourceCapture?.domHistory?.truncatedValues ?? null,
        writeFailures:summary?.resourceCapture?.domHistory?.errors?.length ?? null
      },
      cdp:
      {
        packets:summary?.resourceCapture?.wireCapture?.packets ?? null,
        writeFailures:summary?.resourceCapture?.wireCapture?.errors?.length ?? null
      },
      diagnostics:
      {
        dropped:summary?.dropped || {},
        capturedEvents:summary?.totalEvents ?? null
      },
      rest:
      {
        status:manifest?.status || 'unavailable',
        artifactCount:manifest?.artifacts?.length ?? null,
        limitations:manifest?.limitations?.length ?? null
      }
    }
  };
  const check = (relative, reference = {}) =>
  {
    const row = _auditArtifact(root, relative, reference);
    if (reference.status && _auditSourceStatus(reference.status) !== 'saved' &&
        row.status === 'saved')
      row.status = _auditSourceStatus(reference.status);
    ledger.artifacts.push(row);
    return row;
  };
  const discrepancy = (identity, domain) =>
  {
    ledger.discrepancies.push({identity, domain});
  };
  const readIndex = (relative, callback) =>
  {
    const result = _auditJsonl(root, relative, callback);
    ledger.streams.push(result);
    const artifact = check(relative, {source:'index'});
    if (result.status !== 'saved' || artifact.status !== 'saved')
      discrepancy('index-integrity-failed', relative);
    return result;
  };
  for (const name of ['summary.json', 'cdp-capabilities.json',
    'network-details.jsonl', 'cdp-wire.jsonl', 'dom-mutations.jsonl',
    'resources.jsonl', 'scripts.jsonl', 'rest/manifest.json',
    'states/dom-rest-initial.html', 'states/dom-rest-initial.json',
    'states/dom-rest-final.html', 'states/dom-rest-final.json'])
    check(name, {source:'required'});
  if (!summary) discrepancy('capture-summary-unavailable', 'summary');
  if (!manifest) discrepancy('rest-manifest-unavailable', 'rest');
  const capabilities = _auditDocument(root, 'cdp-capabilities.json');
  if (capabilities?.protocol?.status === 'saved')
    check('cdp-protocol.json', {source:'browser-cdp-schema'});
  const statuses = new Map();
  function tracked(domain, status, source, target = null, extra = {})
  {
    const record = {domain, status, source, target, ...extra};
    if (!statuses.has(domain)) statuses.set(domain, []);
    statuses.get(domain).push(record);
    return record;
  }
  const rootFiles = [
    ['network', 'resources.jsonl'], ['scripts', 'scripts.jsonl'],
    ['network', 'network-details.jsonl'], ['cdp', 'cdp-wire.jsonl'],
    ['dom', 'dom-mutations.jsonl']
  ];
  for (const [domain, filename] of rootFiles)
    tracked(domain, 'saved', filename);
  try
  {
    for (const filename of fs.readdirSync(path.join(root, 'states')))
    {
      if (!/^(?:state-\d+\.json|screen-\d+\.png)$/.test(filename))
        continue;
      const relative = 'states/' + filename;
      const artifact = check(relative, {source:'observed-state'});
      tracked('dom', artifact.status, relative);
      if (filename.endsWith('.json'))
      {
        const snapshot = _auditDocument(root, relative);
        if (snapshot?.screenshot)
        {
          const screen = check('states/' + snapshot.screenshot, {
            source:'state-screenshot'
          });
          tracked('dom', screen.status, 'state-screenshot');
        }
      }
    }
    for (const stage of ['initial', 'final'])
    {
      const metadata = _auditDocument(root, 'states/dom-rest-' + stage + '.json');
      if (metadata?.htmlBytes !== undefined)
      {
        const file = check('states/dom-rest-' + stage + '.html', {
          source:'state-html-byte-reference', bytes:metadata.htmlBytes
        });
        tracked('dom', file.status, 'state-html-byte-reference');
      }
    }
  }
  catch (error)
  {
    discrepancy('state-directory-or-snapshot-unavailable', 'dom');
    tracked('dom', 'partial', 'state-directory');
  }
  const indexed = [];
  for (const [domain, index] of [
    ['network', 'resources.jsonl'], ['scripts', 'scripts.jsonl']
  ])
  {
    let saved = 0;
    const result = readIndex(index, row =>
    {
      const status = _auditSourceStatus(row.status);
      if (domain === 'network' && row.streamCapture?.truncated)
        ledger.coverage.network.truncatedStreams++;
      if (domain === 'network' && row.streamCapture?.missingDataEvents)
        ledger.coverage.network.streamDataGaps +=
          row.streamCapture.missingDataEvents;
      if (status === 'saved')
      {
        saved++;
        indexed.push({domain, status:'saved', path:row.file});
        if (!row.file || !row.sha256 || !Number.isInteger(row.bytes))
        {
          tracked(domain, 'failed', index, null, {reason:'missing-body-reference'});
          return;
        }
        const file = check(row.file, {
          source:index, method:domain === 'scripts' ? 'Debugger.getScriptSource' :
            row.source || 'Network.getResponseBody',
          status:'saved', sha256:row.sha256, bytes:row.bytes
        });
        tracked(domain, file.status, index);
        if (domain === 'scripts' && row.textSource)
        {
          const secondary = check(row.textSource.file, {
            source:'Debugger.getScriptSource.text', status:'saved',
            sha256:row.textSource.sha256, bytes:row.textSource.bytes
          });
          tracked('scripts', secondary.status, 'wasm-text-source');
        }
        if (domain === 'scripts' &&
            row.scriptLanguage === 'WebAssembly' &&
            row.bytecodeStatus !== 'saved')
          tracked('scripts', 'partial', 'wasm-bytecode-unavailable', null,
            {reason:row.sourceKind || 'no-bytecode'});
      }
      else
        tracked(domain, status, index, null, {reason:row.status || 'unknown'});
      if (row.partialBody)
      {
        const body = row.partialBody;
        const part = check(body.file, {
          source:index, status:'partial', bytes:body.bytes, sha256:body.sha256
        });
        tracked(domain, part.status === 'failed' ? 'failed' : 'partial',
          index, null, {reason:'partial-body'});
      }
    });
    if (result.status !== 'saved') tracked(domain, 'failed', index);
    const expected = domain === 'network' ?
      summary?.resourceCapture?.saved : summary?.resourceCapture?.scriptsSaved;
    if (expected !== saved)
    {
      discrepancy('saved-body-count-mismatch', domain);
      tracked(domain, 'partial', index, null, {reason:'summary-count-mismatch'});
    }
  }
  const sequences = [
    ['cdp','cdp-wire.jsonl',summary?.resourceCapture?.wireCapture?.packets],
    ['dom','dom-mutations.jsonl',summary?.resourceCapture?.domHistory?.events]
  ];
  for (const [domain, filename, expected] of sequences)
  {
    let observedMutations = 0;
    const result = readIndex(filename, (row, count, current) =>
    {
      if (row.sequence !== count) current.sequenceErrors++;
      if (domain === 'dom' && row.detail?.type === 'mutation-batch')
        observedMutations += row.detail.records?.length || 0;
      if (domain === 'cdp')
      {
        try {JSON.parse(row.raw);}
        catch (_) {current.invalidRecords++;}
      }
    });
    if (result.status !== 'saved' || expected !== result.records)
    {
      discrepancy('raw-ledger-sequence-or-count-mismatch', domain);
      tracked(domain, 'failed', filename);
    }
    if (domain === 'dom' &&
        observedMutations !== summary?.resourceCapture?.domHistory?.records)
    {
      discrepancy('dom-mutation-record-count-mismatch', 'dom');
      tracked('dom', 'partial', filename, null, {reason:'record-count-mismatch'});
    }
  }
  for (const name of ['network-details', 'lifecycle', 'interaction',
    'dom', 'network', 'console', 'performance', 'error'])
  {
    const filename = name + '.jsonl';
    const result = readIndex(filename);
    if (name !== 'network-details' &&
        summary?.counts?.[name] !== result.records)
      discrepancy('diagnostic-count-mismatch', name);
    tracked(name === 'network-details' ? 'network' : 'diagnostics',
      result.status, filename);
  }
  if (summary?.resourceCapture?.wireCapture?.status !== 'saved')
    tracked('cdp', 'partial', 'wireCapture');
  if (summary?.resourceCapture?.domHistory?.status !== 'saved')
    tracked('dom', 'partial', 'domHistory');
  if (Object.values(summary?.dropped || {}).some(count => count > 0))
    tracked('diagnostics', 'partial', 'dropped-events');
  if (summary?.resourceCapture?.pendingBodies ||
      summary?.resourceCapture?.pendingReads ||
      summary?.resourceCapture?.unfinished ||
      summary?.resourceCapture?.networkDrained === false)
    tracked('network', 'partial', 'network-shutdown');
  if (summary?.resourceCapture?.scriptsFailed)
    tracked('scripts', 'partial', 'source-unavailable');
  if (summary?.resourceCapture?.networkConfiguration?.some(item =>
    item.enabled !== 'buffered' || item.durable === 'unavailable'))
    tracked('network', 'partial', 'cdp-network-configuration');

  const targets = new Map((manifest?.targets || []).map(item =>
    [item.targetId, item]));
  for (const row of manifest?.artifacts || [])
  {
    const target = targets.get(row.target);
    const domain = ({
      'accessibility':'accessibility',
      'css-node-details':'css',
      'css-rule-usage':'css',
      'event-listeners':'listeners',
      'stylesheets':'css',
      'source-maps':'scripts',
      'storage':'storage',
      'frame-context':'security',
      'storage-usage':'storage',
      'indexeddb':'storage',
      'cache-storage':'storage',
      'dom-history-contexts':'dom',
      'dom-tree':'dom',
      'dom-snapshot':'dom',
      'environment':'dom',
      'target-graph-initial':'targets',
      'target-graph-final':'targets'
    })[row.name] || 'rest';
    let status = _auditSourceStatus(row.status);
    if (row.file)
    {
      const relative = !target || row.name === 'cookies' ||
        row.name === 'page' || row.name === 'viewport' ||
        row.name.endsWith('-at-rest') ?
        'rest/' + row.file : 'rest/targets/' + target.name + '/' + row.file;
      const artifact = check(relative, {
        status:row.status, source:'rest-manifest',
        target:row.target, method:row.method, bytes:row.bytes,
        sha256:row.sha256
      });
      if (artifact.status === 'failed') status = 'failed';
    }
    tracked(domain, status, row.name, row.target || null);
  }
  const maps = _auditDocument(root, 'rest/source-maps/index.json');
  if (maps)
  {
    if (maps.status !== 'saved')
      tracked('scripts', _auditSourceStatus(maps.status),
        'source-map-index', null,
        {references:maps.referencesObserved || 0});
    if (maps.skippedReferences)
      tracked('scripts', 'partial', 'source-map-limit', null,
        {count:maps.skippedReferences});
    for (const entry of maps.entries || [])
    {
      if (!entry.file)
      {
        tracked('scripts', 'partial', 'source-map-not-archived', null,
          {reason:entry.errorCode || 'unavailable'});
        continue;
      }
      const artifact = check('rest/' + entry.file, {
        source:'source-map-recovery', bytes:entry.bytes, sha256:entry.sha256
      });
      tracked('scripts', artifact.status === 'failed' ? 'failed' :
        _auditSourceStatus(entry.status), 'source-map-payload');
    }
  }
  const coverageIndex = _auditDocument(root, 'rest/css-rule-usage/index.json');
  if (coverageIndex)
  {
    if (coverageIndex.status !== 'saved')
      tracked('css', _auditSourceStatus(coverageIndex.status),
        'css-rule-usage-index');
    if (coverageIndex.skippedTargets)
      tracked('css', 'partial', 'css-rule-usage-unobserved-targets',
        null, {count:coverageIndex.skippedTargets});
    for (const entry of coverageIndex.entries || [])
    {
      if (entry.status !== 'saved')
      {
        tracked('css', _auditSourceStatus(entry.status),
          'css-rule-usage-target', entry.targetId || null);
        continue;
      }
      const artifact = check
      (
        'rest/css-rule-usage/' + entry.file,
        {
          source:'CSS.stopRuleUsageTracking', target:entry.targetId,
          bytes:entry.bytes, sha256:entry.sha256
        }
      );
      tracked('css', artifact.status, 'css-rule-usage-target',
        entry.targetId || null);
    }
  }
  const stylesheetIndex = _auditDocument(root, 'rest/stylesheets/index.json');
  if (Array.isArray(stylesheetIndex))
  {
    for (const row of stylesheetIndex)
    {
      if (row.status !== 'saved')
      {
        tracked('css', _auditSourceStatus(row.status), 'stylesheet-source',
          row.targetId || null);
        continue;
      }
      const artifact = check('rest/' + row.file, {
        source:'CSS.getStyleSheetText', target:row.targetId,
        bytes:row.bytes, sha256:row.sha256
      });
      tracked('css', artifact.status, 'stylesheet-source', row.targetId);
    }
  }
  for (const target of targets.values())
  {
    const prefix = 'rest/targets/' + target.name + '/';
    const nested = [
      ['indexeddb', 'storage'], ['cache-storage', 'storage']
    ];
    for (const [name, domain] of nested)
    {
      const source = prefix + name + '/index.json';
      const index = _auditDocument(root, source);
      if (!index) continue;
      if (index.errors?.length)
        tracked(domain, 'partial', source, target.targetId,
          {reason:'nested-index-errors', count:index.errors.length});
      if (name === 'indexeddb')
      {
        for (const database of index.databases || [])
        {
          if (database.status !== 'saved')
            tracked(domain, 'partial', source, target.targetId,
              {reason:'database-incomplete'});
          for (const store of database.stores || [])
          {
            if (store.status !== 'saved')
              tracked(domain, 'partial', source, target.targetId,
                {reason:'store-incomplete'});
            for (const page of store.pages || [])
            {
              const artifact = check(prefix + name + '/' + page.file, {
                source:'IndexedDB.requestData', target:target.targetId,
                bytes:page.bytes, sha256:page.sha256
              });
              tracked(domain, artifact.status, 'indexeddb-page', target.targetId);
              if (page.unavailable)
                tracked(domain, 'partial', 'indexeddb-serialization',
                  target.targetId, {count:page.unavailable});
            }
          }
        }
      }
      else
      {
        for (const cache of index.caches || [])
        {
          if (cache.status !== 'saved')
            tracked(domain, 'partial', source, target.targetId,
              {reason:'cache-incomplete'});
          for (const entry of cache.entries || [])
          {
            if (entry.body?.status !== 'saved')
            {
              tracked(domain, 'partial', 'cache-body', target.targetId);
              continue;
            }
            const artifact = check(prefix + name + '/' + entry.body.file, {
              source:'CacheStorage.requestCachedResponse', target:target.targetId,
              bytes:entry.body.bytes, sha256:entry.body.sha256
            });
            tracked(domain, artifact.status, 'cache-body', target.targetId);
          }
        }
      }
    }
    const cssNodes = _auditDocument(root, prefix + 'css-nodes/index.json');
    if (cssNodes)
    {
      if (cssNodes.status !== 'saved')
        tracked('css', _auditSourceStatus(cssNodes.status),
          'css-node-index', target.targetId);
      if (cssNodes.skippedElements)
        tracked('css', 'partial', 'css-elements-not-captured',
          target.targetId, {count:cssNodes.skippedElements});
      for (const page of cssNodes.pages || [])
      {
        const artifact = check
        (
          prefix + 'css-nodes/' + page.file,
          {
            source:'CSS node methods', target:target.targetId,
            bytes:page.bytes, sha256:page.sha256
          }
        );
        tracked('css', artifact.status === 'failed' ? 'failed' :
          _auditSourceStatus(page.status), 'css-node-page', target.targetId);
      }
    }
    const accessibility = _auditDocument(root, prefix + 'accessibility/index.json');
    if (accessibility)
    {
      if (accessibility.status !== 'saved')
        tracked
        (
          'accessibility', _auditSourceStatus(accessibility.status),
          'accessibility-index', target.targetId
        );
      if (accessibility.skippedFrames)
        tracked
        (
          'accessibility', 'partial', 'accessibility-frame-limit',
          target.targetId, {count:accessibility.skippedFrames}
        );
      for (const frame of accessibility.frames || [])
      {
        if (frame.status !== 'saved')
        {
          tracked
          (
            'accessibility', 'partial', 'accessibility-frame',
            target.targetId, {reason:frame.errorCode || 'frame-unavailable'}
          );
          continue;
        }
        const artifact = check
        (
          prefix + 'accessibility/' + frame.file,
          {
            source:'Accessibility.getFullAXTree', target:target.targetId,
            bytes:frame.bytes, sha256:frame.sha256
          }
        );
        tracked
        (
          'accessibility', artifact.status, 'accessibility-frame', target.targetId
        );
      }
    }
    const listeners = _auditDocument(root, prefix + 'event-listeners.json');
    if (Array.isArray(listeners) && listeners.some(group => group.error))
      tracked('listeners', 'partial', 'per-listener-result', target.targetId);
    const context = _auditDocument(root, prefix + 'frame-context.json');
    if (context)
    {
      if (context.skippedFrames)
        tracked('security', 'partial', 'frame-context-skipped',
          target.targetId, {count:context.skippedFrames});
      for (const frame of context.frames || [])
      {
        for (const [key, domain] of [
          ['storageKey','storage'], ['permissionsPolicy','security'],
          ['originTrials','security'], ['securityIsolation','security']
        ])
          tracked(domain, _auditSourceStatus(frame[key]?.status),
            'frame-context-' + key, target.targetId);
      }
      for (const [key, domain] of [
        ['resourceTree','network'], ['appManifest','security'],
        ['bucketNames','storage'], ['opfsSupport','storage']
      ])
        tracked(domain, _auditSourceStatus(context[key]?.status),
          'frame-context-' + key, target.targetId);
    }
    const storage = _auditDocument(root, prefix + 'storage.json');
    if (storage && (storage.localStorage?.status !== 'saved' ||
      storage.sessionStorage?.status !== 'saved'))
      tracked('storage', 'partial', 'storage-kind', target.targetId);
  }
  const finalGraph = _auditDocument(root, 'rest/target-graph-final.json');
  for (const target of finalGraph?.targets || [])
  {
    if (targets.has(target.targetId)) continue;
    const relevant = ['page','iframe','background_page','worker',
      'shared_worker','service_worker'].includes(target.type);
    if (!relevant) continue;
    const status = target.destroyedAt ? 'inapplicable' : 'partial';
    ledger.targets.push({
      targetId:target.targetId, type:target.type, status,
      artifactCount:0, reason:'not-captured-in-rest'
    });
    tracked('targets', status, 'target-discovery', target.targetId);
  }
  for (const target of targets.values())
  {
    const records = [...statuses.values()].flat().filter(row =>
      row.target === target.targetId);
    const status = _auditAggregate(records);
    ledger.targets.push({
      targetId:target.targetId, type:target.type, status,
      artifactCount:records.length
    });
    tracked('targets', status, 'rest-target', target.targetId);
  }
  if (manifest)
  {
    if (manifest.status !== 'captured')
      tracked('rest', _auditSourceStatus(manifest.status), 'rest-manifest');
    if (manifest.limitations?.length)
      tracked('rest', 'partial', 'rest-limitations', null,
        {count:manifest.limitations.length});
  }
  if (summary?.resourceCapture?.stopReason === 'signal' ||
    ['sigint','sigterm'].includes(summary?.resourceCapture?.stopReason) ||
    options.interrupted)
    tracked('capture', 'interrupted', 'stop-reason');
  for (const [domain, records] of statuses)
  {
    const status = _auditAggregate(records);
    ledger.domains.push({
      domain, status,
      outcomes:records.reduce((result, row) =>
      {
        result[row.status] = (result[row.status] || 0) + 1;
        return result;
      }, {})
    });
  }
  const failed = ledger.artifacts.some(item => item.status === 'failed') ||
    ledger.streams.some(item => item.status === 'failed') ||
    ledger.domains.some(item => item.status === 'failed');
  const incomplete = ledger.domains.some(item => item.status !== 'saved') ||
    ledger.discrepancies.length;
  const interrupted = options.interrupted ||
    ['signal','sigint','sigterm'].includes(summary?.resourceCapture?.stopReason);
  ledger.status = failed ? 'failed' :
    interrupted ? 'interrupted' : incomplete ? 'partial' : 'saved';
  ledger.counts =
  {
    verifiedFiles:ledger.artifacts.filter(item => item.status === 'saved').length,
    missingOrCorrupt:ledger.artifacts.filter(item => item.status === 'failed').length,
    indexedFiles:indexed.length,
    checkedStreams:ledger.streams.length,
    discrepancies:ledger.discrepancies.length
  };
  ledger.finishedAt = new Date().toISOString();
  if (options.write)
    fs.writeFileSync(path.join(root, 'evidence-integrity.json'),
      JSON.stringify(ledger, null, 2) + '\n', {flag:'wx', mode:0o600});
  return ledger;
}

module.exports = {captureRestEvidence, auditWebAnalyzeEvidence};
