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
    _issue(3, 'invalid-module-id', 'invalid module id: ' + String(value));
  return value;
}
function _checkGraph(entries) {
  const graph=new Map(entries.map(e=>[e.id,e.deps]));
  for(const entry of entries)
    for(const dep of entry.deps)
      if(!graph.has(dep))_issue(6,'missing-dependency',entry.id+': missing dependency '+dep);
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
  const manifestPath=resolve(manifestFile), outputPath=resolve(outputFile);
  let root,manifestText,manifest;
  try{
    root=await realpath(dirname(manifestPath));
    manifestText=await readFile(manifestPath,'utf8');
  }catch(e){_issue(2,'manifest-unreadable','cannot read manifest '+manifestPath+': '+e.message);}
  try{manifest=JSON.parse(manifestText);}
  catch(e){_issue(3,'manifest-invalid-json','invalid manifest JSON '+manifestPath+': '+e.message);}
  if(!manifest||manifest.version!==1||!Array.isArray(manifest.modules)||
     Object.keys(manifest).some(k=>!['version','modules'].includes(k)))
    _issue(3,'manifest-invalid-shape','unsupported manifest format: '+manifestPath);

  const ids=new Set(),entries=[];
  for(const entry of manifest.modules){
    if(!entry||Array.isArray(entry)||typeof entry!=='object'||
       Object.keys(entry).some(k=>!['id','file','deps','format'].includes(k)))
      _issue(3,'module-record-invalid','invalid module record in '+manifestPath);
    const id=_moduleId(entry.id);
    if(ids.has(id))_issue(3,'module-duplicate','duplicate module id: '+id);
    ids.add(id);
    if(entry.format!==undefined&&entry.format!=='classic')
      _issue(3,'unsupported-source-format',id+': only classic modules are supported, not ES Modules');
    if(typeof entry.file!=='string'||!entry.file||isAbsolute(entry.file))
      _issue(3,'module-file-invalid',id+': invalid relative module filename');
    if(!Array.isArray(entry.deps))
      _issue(3,'module-deps-invalid',id+': deps must be an array');
    const deps=entry.deps.map(_moduleId);
    if(deps.includes(id)||new Set(deps).size!==deps.length)
      _issue(3,'module-deps-duplicate',id+': invalid module dependency list');
    let sourcePath;
    try{sourcePath=await realpath(resolve(root,entry.file));}
    catch(e){_issue(4,'module-source-unreadable',id+': cannot resolve source '+entry.file+': '+e.message);}
    const rel=relative(root,sourcePath);
    if(rel==='..'||rel.startsWith('..'+'/')||isAbsolute(rel))
      _issue(3,'module-outside-tree',id+': source must be inside manifest tree');
    let source;
    try{source=await readFile(sourcePath,'utf8');}
    catch(e){_issue(4,'module-source-unreadable',id+': cannot read '+rel+': '+e.message);}
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
  try{await writeFile(outputPath,output);}
  catch(e){_issue(8,'output-write-failed','cannot write output '+outputPath+': '+e.message);}
  process.stdout.write('jsc: compiled '+entries.length+' classic modules, '+Buffer.byteLength(output)+' bytes\n');
  return 0;
}

// Public Node library entrypoint. The shell command uses the same real implementation.
async function jscMain(args){
  if(!Array.isArray(args)||args.length!==2||args.some(a=>typeof a!=='string'||!a))
    return _report(1,'invalid-arguments','usage: jsc <manifest.json> <output.js>');
  try{return await _compile(args[0],args[1]);}
  catch(e){return _report(e.jscStatus||9,e.jscCode||'unexpected-failure',e.message||String(e));}
}
function _report(status,code,message){
  process.stderr.write('jsc ['+code+']: '+message+'\n');
  return status;
}
module.exports={jscMain};
if(require.main===module){
  jscMain(process.argv.slice(2)).then(status=>{process.exitCode=status;},
    error=>{process.stderr.write('jsc [unexpected-failure]: '+error.message+'\n');process.exitCode=9;});
}
