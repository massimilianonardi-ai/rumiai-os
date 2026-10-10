/* Original m dynamic JS/CSS source-list loader, adapted for current browsers. */
(function (host) {
  'use strict';

  function _identifier(name) {
    if (typeof name !== 'string' ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ||
        !/^(?!arguments$|eval$|undefined$|NaN$|Infinity$|__proto__$)/.test(name)) {
      throw new TypeError('invalid namespace or exported symbol: ' + name);
    }
    return name;
  }

  function _sourceUrl(path,file) {
    if (typeof file !== 'string' || !file || file.startsWith('/') ||
        file.split('/').includes('..') || file.includes('\\')) {
      throw new TypeError('invalid relative source path');
    }
    return new URL(file, new URL((path || './').replace(/\/?$/, '/'), document.baseURI));
  }

  async function _readText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('cannot load ' + url + ': HTTP ' + response.status);
    return response.text();
  }

  async function _source(path, entry, css) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new TypeError('invalid module description');

    if (Array.isArray(entry.modules)) {
      if (css && entry.name !== undefined)
        throw new TypeError('CSS source lists cannot contain namespaces');
      let body = '';
      for (const child of entry.modules) body += await _source(path,child,css);
      if (entry.name === undefined || entry.name === '') return body;
      const name = _identifier(entry.name);
      const declared=entry.modules.filter(child=>typeof child.file==='string')
        .flatMap(child=>typeof child.symbols==='string'&&child.symbols?
          child.symbols.split(',').map(x=>x.trim()):[]);
      // This preserves the original jsc lexical namespace assembly: symbols
      // from earlier source files are visible in scope without a deps list.
      return '\nvar '+name+' = '+name+' || this['+JSON.stringify(name)+'] || {};\n'+
        'this['+JSON.stringify(name)+'] = '+name+';\n'+
        name+' = (function(){\n'+
        'for(var $_sub_module_iterator in '+name+'){'+
        'if('+JSON.stringify(declared)+'.includes($_sub_module_iterator)) continue;'+
        'eval("var "+$_sub_module_iterator+" = '+name+'[$_sub_module_iterator];");}\n'+
        body+'\nreturn this;\n}.call('+name+'));\n';
    }

    if(typeof entry.file !== 'string') throw new TypeError('missing module source filename');
    const url=_sourceUrl(path,entry.file);
    const text=await _readText(url);
    if(css){
      if(entry.symbols !== undefined && entry.symbols !== '')
        throw new TypeError('CSS source may not export JavaScript symbols');
      return '\n'+text+'\n';
    }
    const symbols=entry.symbols===undefined||entry.symbols===''?[]:
      entry.symbols.split(',').map(x=>_identifier(x.trim()));
    return '\n'+text+'\n'+symbols.map(x=>
      'this['+JSON.stringify(x)+'] = '+x+';\n').join('');
  }

  async function _modules(path,filename,css){
    const data=JSON.parse(await _readText(_sourceUrl(path,filename)));
    if(!data||!Array.isArray(data.modules))
      throw new TypeError('expected ordered modules array');
    let code='';
    for(const entry of data.modules)code+=await _source(path,entry,css);
    return code;
  }

  function loadModulesDynamically(path,modulesFile,callback){
    const promise=_modules(path,modulesFile||'modules-js.json',false);
    if(typeof callback==='function')return promise.then(code=>{callback(code);});
    return promise.then(code=>{
      const script=document.createElement('script');
      script.textContent=code;
      document.head.appendChild(script);
      return script;
    });
  }

  function _replace(path,file,oldElement,css){
    return _modules(path,file,css).then(code=>{
      let previous=oldElement;
      if(typeof previous==='string') {
        previous=document.getElementById(previous) ||
          Array.from(document.querySelectorAll(css?'link[rel="stylesheet"],style':'script'))
            .find(element=>element.href===previous||element.src===previous);
      }
      const element=document.createElement(css?'style':'script');
      element.textContent=code;
      // Do not remove a working library when manifest/source retrieval fails.
      if(previous?.parentNode) previous.parentNode.removeChild(previous);
      document.head.appendChild(element);
      return element;
    });
  }

  function replaceModulesDynamically(path,modulesFile,libraryElement,defaultModulesFile,tag){
    const css=tag==='style';
    return _replace(path,modulesFile||defaultModulesFile||
      (css?'modules-css.json':'modules-js.json'),libraryElement,css);
  }

  function loadJSLibraryDynamically(path,jsModulesFile,jsElement){
    return replaceModulesDynamically(path,jsModulesFile,jsElement,'modules-js.json','script');
  }

  function loadCSSLibraryDynamically(path,cssModulesFile,cssElement){
    return replaceModulesDynamically(path,cssModulesFile,cssElement,'modules-css.json','style');
  }

  function loadLibraryDynamically(path,jsModulesFile,cssModulesFile,jsElement,cssElement){
    if(!path && Array.isArray(host.dynamicLibs)) {
      return Promise.all(host.dynamicLibs.map(dir=>
        loadLibraryDynamically(dir,jsModulesFile,cssModulesFile,jsElement,cssElement)));
    }
    return Promise.all([
      loadJSLibraryDynamically(path,jsModulesFile,jsElement),
      loadCSSLibraryDynamically(path,cssModulesFile,cssElement)
    ]);
  }

  Object.assign(host,{
    loadModulesDynamically,
    replaceModulesDynamically,
    loadJSLibraryDynamically,
    loadCSSLibraryDynamically,
    loadLibraryDynamically
  });

  if(Array.isArray(host.dynamicLibs))
    loadLibraryDynamically().catch(error=>console.error(error));
})(globalThis);
