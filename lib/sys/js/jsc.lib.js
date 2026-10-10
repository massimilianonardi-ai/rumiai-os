'use strict';

// Original m/jsc ordered source assembly, adapted to the current m command.
const {readFile,writeFile,realpath} = require('node:fs/promises');
const {dirname,resolve,relative,isAbsolute} = require('node:path');
const {Script} = require('node:vm');
const {gzipSync} = require('node:zlib');
const {spawnSync} = require('node:child_process');

function _issue(status,code,message) {
  const error=new Error(message);
  error.jscStatus=status;
  error.jscCode=code;
  throw error;
}

// Input order and namespace scopes follow original m/cmd/jsc.js.
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
      const declared=entry.modules.filter(child=>typeof child.file==='string')
        .flatMap(child=>typeof child.symbols==='string'&&child.symbols?
          child.symbols.split(',').map(x=>x.trim()):[]);
      if(rootTypes.has('css'))_issue(25,'legacy-mixed-source-types','CSS cannot contain JavaScript namespaces');
      // An explicit wrapper retains the original lexical scope, and a
      // validated direct eval imports pre-existing namespace properties as
      // same-scope identifiers when this namespace was loaded previously.
      return '\nvar '+name+' = this['+JSON.stringify(name)+'] || {};\n'+
        'this['+JSON.stringify(name)+'] = '+name+';\n'+
        name+' = (function(){\n'+
        'for (const $_legacy_import of Object.keys(this)) {\n'+
        '  if ('+JSON.stringify(declared)+'.includes($_legacy_import)) continue;\n'+
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
    await _legacyReleaseArtifacts(outputFile,isCss);
  }else process.stdout.write(output);
  return 0;
}

// Preserve the original optional file-output compression/minification workflow.
// External tools must be already installed: this command never downloads them.
async function _legacyReleaseArtifacts(outputFile,isCss){
  const target=resolve(outputFile),ext=isCss?'.css':'.js';
  let compressedInput=target;
  if(target.endsWith(ext)){
    const min=target.slice(0,-ext.length)+'.min'+ext;
    const cmd=isCss?'uglifycss':'google-closure-compiler';
    const args=isCss?[target]:['--js='+target,'--js_output_file='+min];
    const result=spawnSync(cmd,args,{encoding:'utf8',timeout:120000});
    if(result.error?.code==='ENOENT'){
      process.stderr.write('[warn] [jsc.minifier-unavailable] '+cmd+' is not installed; keeping source output\n');
    }else{
      if(result.error||result.status!==0)_issue(27,'minifier-failed',
        cmd+' failed: '+(result.error?.message||result.stderr||result.status));
      if(isCss){
        try{await writeFile(min,result.stdout);}
        catch(e){_issue(8,'output-write-failed',e.message);}
      }
      compressedInput=min;
    }
  }
  try{await writeFile(compressedInput+'.gz',gzipSync(await readFile(compressedInput)));}
  catch(e){_issue(28,'gzip-failed','cannot write compressed output: '+e.message);}
}

// Public library entrypoint used by the m command.
async function jscMain(args){
  if(!Array.isArray(args)||args.length<1||args.length>2||
      args.some(x=>typeof x!=='string'||x.length===0))
    return _report(1,'invalid-arguments','usage: jsc <modules.json> [output]');
  try{return await _compileLegacy(args[0],args[1]);}
  catch(e){return _report(e.jscStatus||9,e.jscCode||'unexpected-failure',e.message||String(e));}
}
function _report(status,code,message){
  process.stderr.write('[error] [jsc.'+code+'] '+message+'\n');
  return status;
}
module.exports={jscMain};
if(require.main===module){
  jscMain(process.argv.slice(2)).then(status=>{process.exitCode=status;},
    error=>{process.stderr.write('[error] [jsc.unexpected-failure] '+error.message+'\n');process.exitCode=9;});
}
