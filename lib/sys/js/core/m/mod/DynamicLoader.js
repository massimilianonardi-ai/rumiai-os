// Browser runtime source composition. Queue is provided by the enclosing m.mod scope.

function _dynamicLoaderIdentifier(value)
{
  return typeof value === "string" &&
    /^[A-Za-z_$][\w$]*$/.test(value) &&
    !/^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|let|static|implements|interface|package|private|protected|public)$/.test(value) &&
    !["__proto__", "constructor", "prototype"].includes(value);
}

function _dynamicLoaderImports(node)
{
  if(node.imports === undefined)
  {
    return "";
  }

  if(!node.imports || typeof node.imports !== "object" || Array.isArray(node.imports))
  {
    throw new Error("[mod.dynamic-loader.invalid-imports] Expected an object");
  }

  let code = "";

  for(const [local, source] of Object.entries(node.imports))
  {
    if(!_dynamicLoaderIdentifier(local) ||
      typeof source !== "string" || !source.includes(".") ||
      !source.split(".").every(_dynamicLoaderIdentifier))
    {
      throw new Error("[mod.dynamic-loader.invalid-import] " + local);
    }

    code += "var " + local + " = " + source + ";\n";
  }

  return code;
}

function _dynamicLoaderExports(node)
{
  if(node.exports === undefined || node.exports === "")
  {
    return "";
  }

  if(typeof node.exports !== "string")
  {
    throw new Error("[mod.dynamic-loader.invalid-exports] Expected a string");
  }

  let code = "";

  for(const item of node.exports.split(","))
  {
    const name = item.trim();

    if(!_dynamicLoaderIdentifier(name))
    {
      throw new Error("[mod.dynamic-loader.invalid-export] " + name);
    }

    code += "this." + name + " = " + name + ";\n";
  }

  return code;
}

function _dynamicLoaderInspect(nodes, state)
{
  for(const node of nodes)
  {
    if(node === null || typeof node !== "object" || Array.isArray(node))
    {
      throw new Error("[mod.dynamic-loader.invalid-node] Expected an object");
    }

    if(node.modules !== undefined)
    {
      if(!Array.isArray(node.modules) ||
        (node.name !== undefined && !_dynamicLoaderIdentifier(node.name)))
      {
        throw new Error("[mod.dynamic-loader.invalid-namespace] Invalid namespace");
      }

      state.namespaces++;
      _dynamicLoaderInspect(node.modules, state);
    }
    else if(typeof node.file === "string")
    {
      const extension = node.file.toLowerCase().endsWith(".js") ? "js" :
        node.file.toLowerCase().endsWith(".css") ? "css" : null;

      if(extension === null)
      {
        throw new Error("[mod.dynamic-loader.invalid-extension] " + node.file);
      }

      if(extension === "css")
      {
        if(node.imports !== undefined || node.exports !== undefined)
        {
          throw new Error("[mod.dynamic-loader.invalid-css-entry] " + node.file);
        }
      }
      else
      {
        _dynamicLoaderImports(node);
        _dynamicLoaderExports(node);
      }

      state.types.add(extension);
      state.files.push(node.file);
    }
    else
    {
      throw new Error("[mod.dynamic-loader.missing-file] Invalid source entry");
    }
  }
}

function _dynamicLoaderSourceURL(file, base)
{
  if(typeof file !== "string" || file === "" ||
    file.startsWith("/") || file.includes("\\") ||
    file.includes("?") || file.includes("#") || file.includes("%") ||
    file.split("/").includes(".."))
  {
    throw new Error("[mod.dynamic-loader.invalid-path] " + String(file));
  }

  const url = new URL(file, base);

  if(url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
  {
    throw new Error("[mod.dynamic-loader.path-outside-root] " + file);
  }

  return url;
}

async function _dynamicLoaderFetchText(url, signal)
{
  let response;

  try
  {
    response = await fetch(url.href, {signal});
  }
  catch(error)
  {
    if(signal && signal.aborted)
    {
      throw error;
    }

    throw new Error
    (
      "[mod.dynamic-loader.fetch-failed] " + url.href,
      {cause: error}
    );
  }

  if(!response.ok)
  {
    throw new Error
    (
      "[mod.dynamic-loader.http-failed] HTTP " +
      response.status + " " + url.href
    );
  }

  try
  {
    return await response.text();
  }
  catch(error)
  {
    if(signal && signal.aborted)
    {
      throw error;
    }

    throw new Error
    (
      "[mod.dynamic-loader.read-failed] " + url.href,
      {cause: error}
    );
  }
}

function _dynamicLoaderRender(nodes, sources, cursor, level = 0)
{
  let code = "";

  for(const node of nodes)
  {
    if(node.modules !== undefined)
    {
      if(node.name === undefined)
      {
        code += _dynamicLoaderRender(node.modules, sources, cursor, level);
        continue;
      }

      const name = node.name;

      if(level === 0)
      {
        code += "var " + name +
          " = global." + name + " || (global." + name + " = {});\n";
        code += "publicRoots." + name + " = " + name + ";\n";
      }
      else
      {
        code += "var " + name +
          " = this." + name + " || (this." + name + " = {});\n";
      }

      code += "(function ()\n{\n";
      code += _dynamicLoaderRender(node.modules, sources, cursor, level + 1);
      code += "\n}\n).call(" + name + ");\n";
    }
    else
    {
      code += _dynamicLoaderImports(node);
      code += sources[cursor.index++] + "\n";
      code += _dynamicLoaderExports(node);
    }
  }

  return code;
}

class DynamicLoader
{
  async compose(manifest, {signal} = {})
  {
    if(typeof manifest !== "string" || manifest === "")
    {
      throw new TypeError
      (
        "[mod.dynamic-loader.invalid-manifest] Expected a manifest URL"
      );
    }

    const manifestURL = new URL(manifest, document.baseURI);

    if(manifestURL.origin !== location.origin)
    {
      throw new Error
      (
        "[mod.dynamic-loader.cross-origin] " + manifestURL.href
      );
    }

    const text = await _dynamicLoaderFetchText(manifestURL, signal);
    let descriptor;

    try
    {
      descriptor = JSON.parse(text);
    }
    catch(error)
    {
      throw new Error
      (
        "[mod.dynamic-loader.invalid-json] " + manifestURL.href,
        {cause: error}
      );
    }

    if(!descriptor || !Array.isArray(descriptor.modules) ||
      (descriptor.nodeGlobal !== undefined &&
       typeof descriptor.nodeGlobal !== "boolean"))
    {
      throw new Error
      (
        "[mod.dynamic-loader.invalid-descriptor] " + manifestURL.href
      );
    }

    const state =
    {
      files: [],
      types: new Set(),
      namespaces: 0
    };

    _dynamicLoaderInspect(descriptor.modules, state);

    if(state.files.length === 0 || state.types.size !== 1)
    {
      throw new Error
      (
        "[mod.dynamic-loader.mixed-or-empty] " + manifestURL.href
      );
    }

    const kind = state.types.values().next().value;

    if(kind === "css" && state.namespaces !== 0)
    {
      throw new Error
      (
        "[mod.dynamic-loader.css-namespace] " + manifestURL.href
      );
    }

    const base = new URL(".", manifestURL);
    const urls = state.files.map(file => _dynamicLoaderSourceURL(file, base));
    const queue = new Queue();
    const ordered = [];

    await Promise.all
    (
      urls.map
      (
        url =>
        {
          const done = queue.add(result => ordered.push(result));

          return _dynamicLoaderFetchText(url, signal).then
          (
            code => done({code}),
            error => done({error})
          );
        }
      )
    );

    const failure = ordered.find(result => result.error);

    if(failure)
    {
      throw failure.error;
    }

    const sources = ordered.map(result => result.code);

    if(kind === "css")
    {
      return {kind, code: sources.join("\n") + "\n"};
    }

    const cursor = {index: 0};
    const body = _dynamicLoaderRender(descriptor.modules, sources, cursor);
    const code =
      "(function (global)\n{\n'use strict';\n" +
      "var publicRoots = {};\n" +
      "(function ()\n{\n" + body + "\n}\n).call(publicRoots);\n" +
      "Object.assign(global, publicRoots);\n" +
      "}\n)(globalThis);\n";

    return {kind, code};
  }

  async load(manifest, {replace = null, signal, nonce} = {})
  {
    const result = await this.compose(manifest, {signal});
    const tag = result.kind === "js" ? "script" : "style";

    if(replace !== null &&
      (!(replace instanceof Element) || !replace.parentNode ||
       replace.tagName.toLowerCase() !== tag))
    {
      throw new TypeError
      (
        "[mod.dynamic-loader.invalid-replacement] Expected an attached " + tag
      );
    }

    const element = document.createElement(tag);

    if(nonce !== undefined)
    {
      element.nonce = nonce;
    }

    element.textContent = result.code;
    document.head.appendChild(element);

    if(replace)
    {
      replace.remove();
    }

    return element;
  }
}
