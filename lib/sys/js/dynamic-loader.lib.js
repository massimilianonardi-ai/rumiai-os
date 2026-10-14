/* Browser-only source-list loader. Independent of the Node.js compiler. */
(function (global) {
'use strict';

function identifier(value) {
  return typeof value === 'string' && /^[A-Za-z_$][\w$]*$/.test(value) &&
    !/^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|let|static|implements|interface|package|private|protected|public)$/.test(value) &&
    !['__proto__','constructor','prototype'].includes(value);
}

function imports(node) {
  if (node.imports === undefined) return '';
  if (!node.imports || typeof node.imports !== 'object' || Array.isArray(node.imports))
    throw new Error('invalid imports');
  let code = '';
  for (const [local, source] of Object.entries(node.imports)) {
    if (!identifier(local) || typeof source !== 'string' ||
        source.indexOf('.') < 0 || !source.split('.').every(identifier))
      throw new Error('invalid import: ' + local);
    code += `var ${local} = ${source};\n`;
  }
  return code;
}

function exportsCode(node) {
  if (node.exports === undefined || node.exports === '') return '';
  if (typeof node.exports !== 'string') throw new Error('invalid exports');
  let code = '';
  for (const value of node.exports.split(',')) {
    const name = value.trim();
    if (!identifier(name)) throw new Error('invalid export: ' + name);
    code += `this.${name} = ${name};\n`;
  }
  return code;
}

async function readText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('cannot load ' + url + ': HTTP ' + response.status);
  return response.text();
}

async function sourceCode(nodes, base, level) {
  let code = '';
  for (const node of nodes) {
    if (node.modules !== undefined) {
      if (!Array.isArray(node.modules)) throw new Error('invalid modules array');
      if (node.name === undefined) {
        code += await sourceCode(node.modules, base, level);
        continue;
      }
      if (!identifier(node.name)) throw new Error('invalid namespace: ' + node.name);
      const name = node.name;
      if (level === 0) {
        code += `var ${name} = global.${name} || (global.${name} = {});\n`;
        code += `publicRoots.${name} = ${name};\n`;
      } else {
        code += `var ${name} = this.${name} || (this.${name} = {});\n`;
      }
      code += `(function () {\n${await sourceCode(node.modules, base, level + 1)}\n}).call(${name});\n`;
    } else if (typeof node.file === 'string') {
      code += imports(node);
      code += await readText(new URL(node.file, base).href) + '\n';
      code += exportsCode(node);
    } else throw new Error('invalid source entry');
  }
  return code;
}

async function assemble(descriptor, base) {
  if (!descriptor || !Array.isArray(descriptor.modules)) throw new Error('invalid descriptor');
  let css = '';
  let jsFiles = 0;
  let cssFiles = 0;
  async function walkCss(nodes) {
    for (const node of nodes) {
      if (node.modules !== undefined) {
        if (!Array.isArray(node.modules)) throw new Error('invalid modules');
        await walkCss(node.modules);
      } else if (typeof node.file === 'string') {
        if (node.file.endsWith('.css')) {
          cssFiles++;
          css += await readText(new URL(node.file, base).href) + '\n';
        } else if (node.file.endsWith('.js')) jsFiles++;
        else throw new Error('unsupported source extension: ' + node.file);
      } else throw new Error('invalid source');
    }
  }
  await walkCss(descriptor.modules);
  if (cssFiles && jsFiles) throw new Error('mixed JavaScript and CSS descriptor');
  if (cssFiles) return {code: css, type: 'css'};
  if (!jsFiles) throw new Error('descriptor has no source');
  const body = await sourceCode(descriptor.modules, base, 0);
  const code = `(function (global) {\n'use strict';\nvar publicRoots = {};\n` +
    `(function () {\n${body}\n}).call(publicRoots);\n` +
    `Object.assign(global, publicRoots);\n})(globalThis);\n`;
  return {code, type: 'js'};
}

function basePath(pathValue) {
  if (typeof pathValue === 'string') return new URL(pathValue.replace(/\/?$/, '/'), location.href);
  if (document.currentScript && document.currentScript.src)
    return new URL('.', document.currentScript.src);
  return new URL('.', location.href);
}

async function loadModulesDynamically(path, modulesFile, callback) {
  const base = basePath(path);
  const descriptorUrl = new URL(modulesFile || 'modules-js.json', base);
  const descriptorResponse = await fetch(descriptorUrl.href);
  if (!descriptorResponse.ok) throw new Error('cannot load ' + descriptorUrl.href);
  const data = await descriptorResponse.json();
  const result = await assemble(data, base);
  if (typeof callback === 'function') {
    callback(result.code);
    return result.code;
  }
  const element = document.createElement(result.type === 'css' ? 'style' : 'script');
  element.textContent = result.code;
  document.head.appendChild(element);
  return element;
}

async function replaceModulesDynamically(path, modulesFile, libraryElement, defaultModulesFile, tag) {
  const base = basePath(path);
  const manifest = new URL(modulesFile || defaultModulesFile, base);
  const response = await fetch(manifest.href);
  if (!response.ok) throw new Error('cannot load ' + manifest.href);
  const result = await assemble(await response.json(), base);
  if ((tag === 'style') !== (result.type === 'css')) throw new Error('descriptor type mismatch');
  const element = document.createElement(tag);
  element.textContent = result.code;
  // Do not remove a previously working element until all sources have loaded.
  let previous = libraryElement;
  if (typeof previous === 'string') {
    previous = document.getElementById(previous) ||
      Array.from(document.getElementsByTagName(tag === 'style' ? 'link' : 'script'))
        .find(entry => entry.src === libraryElement || entry.href === libraryElement);
  }
  document.head.appendChild(element);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);
  return element;
}

function loadJSLibraryDynamically(path, jsModulesFile, jsElement) {
  return replaceModulesDynamically(path, jsModulesFile, jsElement, 'modules-js.json', 'script');
}

function loadCSSLibraryDynamically(path, cssModulesFile, cssElement) {
  return replaceModulesDynamically(path, cssModulesFile, cssElement, 'modules-css.json', 'style');
}

async function loadLibraryDynamically(path, jsModulesFile, cssModulesFile, jsElement, cssElement) {
  if (!path && Array.isArray(global.dynamicLibs)) {
    const result = [];
    for (const entry of global.dynamicLibs)
      result.push(await loadLibraryDynamically(entry, jsModulesFile, cssModulesFile, jsElement, cssElement));
    return result;
  }
  const js = await loadJSLibraryDynamically(path, jsModulesFile, jsElement);
  const css = await loadCSSLibraryDynamically(path, cssModulesFile, cssElement);
  return [js, css];
}

Object.assign(global, {
  loadModulesDynamically, replaceModulesDynamically, loadJSLibraryDynamically,
  loadCSSLibraryDynamically, loadLibraryDynamically
});
if (typeof document !== 'undefined') {
  // Preserve original initialization behavior, but defer to a microtask so
  // a host can configure dynamicLibs before the initial request starts.
  Promise.resolve().then(() => loadLibraryDynamically()).catch(error => console.error('dynamic-loader: ' + error.message));
}
})(typeof globalThis === 'object' ? globalThis : this);
