'use strict';

// m-owned jsc classic module compiler. No loader implementation is embedded.
// The CLI is bin/sys/jsc; direct Node execution is also the thin CLI transport.
const {readFile,writeFile,realpath} = require('node:fs/promises');
const {dirname,resolve,relative,isAbsolute} = require('node:path');
const {Script} = require('node:vm');

function _issue(status, code, message) {
  const error = new Error(message);
  error.jscStatus = status;
  error.jscCode = code;
  throw error;
}
function _moduleId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z][a-zA-Z0-9._/-]*$/.test(value) || value.includes('..'))
    _issue(10, 'invalid-module-id', 'invalid module id: ' + String(value));
  return value;
}
function _checkGraph(entries) {
  const graph=new Map(entries.map(e=>[e.id,e.deps]));
  for(const entry of entries)
    for(const dep of entry.deps)
      if(!graph.has(dep))_issue(22,'missing-dependency',entry.id+': missing dependency '+dep);
  const done=new Set(),visiting=new Set();
  function _visit(id){
    if(visiting.has(id))_issue(6,'cyclic-dependency','circular module dependencies involving '+id);
    if(done.has(id))return;
    visiting.add(id);
    for(const dep of graph.get(id))_visit(dep);
    visiting.delete(id);
    done.add(id);
  }
  for(const entry of entries)_visit(entry.id);
}
async function _compile(manifestFile,outputFile){
  const manifestPath=resolve(manifestFile), outputPath=outputFile ? resolve(outputFile) : '<stdout>';
  let root,manifestText,manifest;
  try{
    root=await realpath(dirname(manifestPath));
    manifestText=await readFile(manifestPath,'utf8');
  }catch(e){_issue(2,'manifest-unreadable','cannot read manifest '+manifestPath+': '+e.message);}
  try{manifest=JSON.parse(manifestText);}
  catch(e){_issue(11,'manifest-invalid-json','invalid manifest JSON '+manifestPath+': '+e.message);}
  if(!manifest||manifest.version!==1||!Array.isArray(manifest.modules)||
     Object.keys(manifest).some(k=>!['version','modules'].includes(k)))
    _issue(12,'manifest-invalid-shape','unsupported manifest format: '+manifestPath);

  if(manifest.modules.length===0)
    _issue(3,'manifest-no-modules','manifest must declare at least one classic module: '+manifestPath);
  const ids=new Set(),entries=[];
  for(const entry of manifest.modules){
    if(!entry||Array.isArray(entry)||typeof entry!=='object'||
       Object.keys(entry).some(k=>!['id','file','deps','format'].includes(k)))
      _issue(13,'module-record-invalid','invalid module record in '+manifestPath);
    const id=_moduleId(entry.id);
    if(ids.has(id))_issue(14,'module-duplicate','duplicate module id: '+id);
    ids.add(id);
    if(entry.format!==undefined&&entry.format!=='classic')
      _issue(15,'unsupported-source-format',id+': only classic modules are supported, not ES Modules');
    if(typeof entry.file!=='string'||!entry.file||isAbsolute(entry.file))
      _issue(16,'module-file-invalid',id+': invalid relative module filename');
    if(!Array.isArray(entry.deps))
      _issue(17,'module-deps-invalid',id+': deps must be an array');
    const deps=entry.deps.map(_moduleId);
    if(deps.includes(id))
      _issue(18,'module-self-dependency',id+': a module must not depend on itself');
    if(new Set(deps).size!==deps.length)
      _issue(19,'module-deps-duplicate',id+': repeated module dependency');
    let sourcePath;
    try{sourcePath=await realpath(resolve(root,entry.file));}
    catch(e){_issue(4,'module-source-unresolvable',id+': cannot resolve source '+entry.file+': '+e.message);}
    const rel=relative(root,sourcePath);
    if(rel==='..'||rel.startsWith('..'+'/')||isAbsolute(rel))
      _issue(20,'module-outside-tree',id+': source must be inside manifest tree');
    let source;
    try{source=await readFile(sourcePath,'utf8');}
    catch(e){_issue(21,'module-source-unreadable',id+': cannot read '+rel+': '+e.message);}
    try{new Script("(function(require,module,exports){\n'use strict';\n"+source+"\n})",{filename:rel});}
    catch(e){_issue(5,'module-syntax-invalid',id+' ('+rel+'): invalid classic source: '+e.message+
      '. ES Module import/export syntax is unsupported; choose an independent ESM toolchain.');}
    entries.push({id,deps,source,path:rel});
  }
  _checkGraph(entries);
  let output='/* jsc: classic module registrations; load dynamic-loader.lib.js before this script */\n';
  output+='globalThis.JscRuntime.installBatch([\n';
  for(const e of entries){
    output+='\n/* module '+e.id+'; source '+e.path.replace(/\*\//g,'* /')+' */\n';
    output+='{id:'+JSON.stringify(e.id)+',deps:'+JSON.stringify(e.deps)+
      ",factory:function(require,module,exports){\n'use strict';\n"+e.source+'\n}},\n';
  }
  output+=']);\n';
  try{new Script(output,{filename:outputPath});}
  catch(e){_issue(7,'compiled-output-invalid','generated output invalid for '+outputPath+': '+e.message);}
  if(outputFile){
    try{await writeFile(outputPath,output);}
    catch(e){_issue(8,'output-write-failed','cannot write output '+outputPath+': '+e.message);}
    process.stdout.write('jsc: compiled '+entries.length+' classic modules, '+Buffer.byteLength(output)+' bytes\n');
  }else process.stdout.write(output);
  return 0;
}

// Original m/jsc source-list authoring mode. Entries are evaluated in the
// descriptor's authored order. No id/deps graph or JscRuntime is involved.
async function _compileLegacy(manifestFile,outputFile){
  const manifestPath=resolve(manifestFile), root=await realpath(dirname(manifestPath));
  let manifest;
  try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}
  catch(e){_issue(e instanceof SyntaxError?11:2,e instanceof SyntaxError?'manifest-invalid-json':'manifest-unreadable',
    'cannot read legacy manifest '+manifestPath+': '+e.message);}
  if(!manifest || Array.isArray(manifest) || typeof manifest!=='object' ||
      !Array.isArray(manifest.modules) ||
      Object.keys(manifest).some(k=>k!=='modules'))
    _issue(12,'manifest-invalid-shape','expected a root object containing an ordered modules array: '+manifestPath);
  if(!manifest.modules.length)_issue(3,'manifest-no-modules','no source modules in '+manifestPath);
  const rootTypes=new Set(), seenSources=[];
  function _jsName(name,kind){
    if(typeof name!=='string'||!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)||
       ['arguments','eval','undefined','NaN','Infinity','__proto__'].includes(name)||
       !(_validIdentifierSyntax(name)))
      _issue(23,'legacy-invalid-name',kind+' must be a safe JavaScript identifier: '+String(name));
    return name;
  }
  function _validIdentifierSyntax(name){
    try{new Script('var '+name+';');return true;}catch{return false;}
  }
  async function _render(entry,location){
    if(!entry||Array.isArray(entry)||typeof entry!=='object')_issue(24,'legacy-invalid-entry','invalid entry at '+location);
    const keys=Object.keys(entry);
    if(Object.prototype.hasOwnProperty.call(entry,'modules')){
      if(keys.some(k=>!['name','modules'].includes(k))||
         !Array.isArray(entry.modules))
        _issue(24,'legacy-invalid-entry','invalid nested modules record at '+location);
      let chunk='';
      for(let i=0;i<entry.modules.length;i++)chunk+=await _render(entry.modules[i],location+'/'+i);
      if(entry.name===undefined)return chunk;
      const name=_jsName(entry.name,'namespace');
      if(rootTypes.has('css'))_issue(25,'legacy-mixed-source-types','CSS cannot contain JavaScript namespaces');
      // An explicit wrapper retains the original lexical scope, and a
      // validated direct eval imports pre-existing namespace properties as
      // same-scope identifiers when this namespace was loaded previously.
      return '\nvar '+name+' = this['+JSON.stringify(name)+'] || {};\n'+
        'this['+JSON.stringify(name)+'] = '+name+';\n'+
        name+' = (function(){\n'+
        'for (const $_legacy_import of Object.keys(this)) {\n'+
        '  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test($_legacy_import) &&\n'+
        '      !/^(arguments|eval|undefined|NaN|Infinity|__proto__)$/.test($_legacy_import)) {\n'+
        '    try { eval("var "+$_legacy_import+"=this["+JSON.stringify($_legacy_import)+"]"); } catch (_) { /* nonbinding property */ }\n'+
        '  }\n'+
        '}\n'+chunk+'\nreturn this;\n}).call('+name+');\n';
    }
    if(keys.some(k=>!['file','symbols'].includes(k)) || typeof entry.file!=='string'||
       !entry.file||isAbsolute(entry.file))
      _issue(24,'legacy-invalid-entry','invalid source file entry at '+location);
    let full;
    try{full=await realpath(resolve(root,entry.file));}
    catch(e){_issue(4,'module-source-unresolvable','cannot resolve '+entry.file+': '+e.message);}
    const rel=relative(root,full);
    if(rel==='..'||rel.startsWith('..'+'/')||isAbsolute(rel))
      _issue(20,'module-outside-tree','source outside manifest tree: '+entry.file);
    let body;
    try{body=await readFile(full,'utf8');}
    catch(e){_issue(21,'module-source-unreadable','cannot read '+entry.file+': '+e.message);}
    const type=entry.file.endsWith('.css')?'css':'js';
    rootTypes.add(type);
    if(rootTypes.size>1)_issue(25,'legacy-mixed-source-types','JS and CSS require separate source manifests');
    const symbols=entry.symbols===undefined?'':entry.symbols;
    if(typeof symbols!=='string')_issue(24,'legacy-invalid-entry','symbols must be a comma-separated string: '+entry.file);
    if(type==='css'){
      if(symbols.trim())_issue(24,'legacy-invalid-entry','CSS cannot export JavaScript symbols: '+entry.file);
      seenSources.push(rel);
      return '\n/* '+rel.replace(/\*\//g,'* /')+' */\n'+body+'\n';
    }
    const names=symbols===''?[]:symbols.split(',').map(x=>_jsName(x.trim(),'export symbol'));
    if(new Set(names).size!==names.length)_issue(26,'legacy-duplicate-symbol','duplicate export symbol in '+entry.file);
    seenSources.push(rel);
    return '\n/* '+rel.replace(/\*\//g,'* /')+' */\n'+body+'\n'+
      names.map(name=>'this['+JSON.stringify(name)+'] = '+name+';\n').join('');
  }
  let assembled='';
  for(let i=0;i<manifest.modules.length;i++)assembled+=await _render(manifest.modules[i],String(i));
  if(!seenSources.length)_issue(3,'manifest-no-modules','legacy manifest has no source leaves: '+manifestPath);
  const isCss=rootTypes.has('css');
  const output=isCss?assembled:
    '/* jsc: ordered classic namespace assembly */\n(function(){\n'+assembled+'\n}).call(globalThis);\n';
  if(!isCss){
    try{new Script(output,{filename:outputFile||manifestPath});}
    catch(e){_issue(7,'compiled-output-invalid','invalid assembled JavaScript: '+e.message);}
  }
  if(outputFile){
    try{await writeFile(resolve(outputFile),output);}
    catch(e){_issue(8,'output-write-failed','cannot write '+outputFile+': '+e.message);}
  }else process.stdout.write(output);
  return 0;
}

async function _manifestIsExplicit(manifestFile){
  let text;
  try{text=await readFile(resolve(manifestFile),'utf8');}
  catch(e){_issue(2,'manifest-unreadable','cannot read manifest '+manifestFile+': '+e.message);}
  let data;
  try{data=JSON.parse(text);}
  catch(e){_issue(11,'manifest-invalid-json','invalid manifest JSON '+manifestFile+': '+e.message);}
  return data && typeof data==='object' && Object.prototype.hasOwnProperty.call(data,'version');
}

// Public Node library entrypoint. The shell command uses the same real implementation.
async function jscMain(args){
  if(!Array.isArray(args)||args.length<1||args.length>2||args.some(a=>typeof a!=='string'||!a))
    return _report(1,'invalid-arguments','usage: jsc <modules.json> [output]');
  try{
    return (await _manifestIsExplicit(args[0]))?
      await _compile(args[0],args[1]):
      await _compileLegacy(args[0],args[1]);
  }catch(e){return _report(e.jscStatus||9,e.jscCode||'unexpected-failure',e.message||String(e));}
}
function _report(status,code,message){
  // After m launches Node, shell functions log/fatal are not in this process.
  // Preserve branch-specific semantic identity and contextual diagnostics here;
  // the m launcher only propagates this status to avoid duplicate error logs.
  process.stderr.write('[error] [jsc.'+code+'] '+message+'\n');
  return status;
}
module.exports={jscMain};
if(require.main===module){
  jscMain(process.argv.slice(2)).then(status=>{process.exitCode=status;},
    error=>{process.stderr.write('[error] [jsc.unexpected-failure] '+error.message+'\n');process.exitCode=9;});
}
