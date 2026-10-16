// Interpret a JSON configuration into a new JavaScript result.
// Executable dependencies are supplied through references or opted-in globals.
function resolve(config, references, allowGlobals)
{
  if(allowGlobals !== undefined && typeof allowGlobals !== "boolean")
  {
    throw new TypeError("resolve: allowGlobals must be a boolean");
  }

  if(references === undefined || references === null)
  {
    references = {};
  }
  if(typeof references !== "object" && typeof references !== "function")
  {
    throw new TypeError("resolve: references must be an object");
  }

  const directives = new WeakMap();
  const nodes = new WeakMap();
  const visited = new WeakSet();

  function _location(path)
  {
    return "$" + path.map(key => "[" + JSON.stringify(key) + "]").join("");
  }

  function _path(expression, location, externalOnly)
  {
    if(typeof expression !== "string" || expression === "")
    {
      throw new SyntaxError("resolve: " + location + ": expected a nonempty static path");
    }

    let pos = 0;
    let base = "external";
    let up = 0;
    const keys = [];
    const identifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*/;

    if(expression[0] === "$")
    {
      base = "root";
      pos = 1;
    }
    else if(expression[0] === "^")
    {
      base = "relative";
      while(expression[pos] === "^")
      {
        up++;
        pos++;
      }
    }
    else
    {
      const match = identifier.exec(expression);
      if(match === null)
      {
        throw new SyntaxError("resolve: " + location + ": invalid external name: " + expression);
      }
      keys.push(match[0]);
      pos = match[0].length;
    }

    if(externalOnly && base !== "external")
    {
      throw new SyntaxError("resolve: " + location + ": callable name must be external");
    }

    while(pos < expression.length)
    {
      if(expression[pos] === ".")
      {
        const match = identifier.exec(expression.slice(++pos));
        if(match === null)
        {
          throw new SyntaxError("resolve: " + location + ": invalid property in path: " + expression);
        }
        keys.push(match[0]);
        pos += match[0].length;
      }
      else if(expression[pos] === "[")
      {
        const remaining = expression.slice(pos);
        const numeric = /^\[(0|[1-9][0-9]*)\]/.exec(remaining);
        if(numeric !== null)
        {
          if(!Number.isSafeInteger(Number(numeric[1])))
          {
            throw new SyntaxError("resolve: " + location + ": unsafe array index");
          }
          keys.push(numeric[1]);
          pos += numeric[0].length;
          continue;
        }
        if(expression[pos + 1] !== '"')
        {
          throw new SyntaxError("resolve: " + location + ": dynamic property expressions are forbidden");
        }
        const begin = ++pos;
        let escaped = false;
        for(pos++; pos < expression.length; pos++)
        {
          if(escaped)
          {
            escaped = false;
          }
          else if(expression[pos] === "\\")
          {
            escaped = true;
          }
          else if(expression[pos] === '"')
          {
            break;
          }
        }
        if(pos >= expression.length || expression[pos + 1] !== "]")
        {
          throw new SyntaxError("resolve: " + location + ": malformed quoted property");
        }
        let key;
        try
        {
          key = JSON.parse(expression.slice(begin, pos + 1));
        }
        catch(error)
        {
          throw new SyntaxError("resolve: " + location + ": invalid JSON string in path");
        }
        keys.push(key);
        pos += 2;
      }
      else
      {
        throw new SyntaxError("resolve: " + location + ": invalid static path: " + expression);
      }
    }
    return {base, up, keys};
  }

  function _directive(value, location)
  {
    if(!Array.isArray(value) || typeof value[0] !== "string")
    {
      return null;
    }
    const tag = value[0];
    if(tag === "@eval")
    {
      throw new SyntaxError("resolve: " + location + ": @eval is unsupported");
    }
    if(tag !== "@ref" && tag !== "@new" && tag !== "@call")
    {
      return null;
    }
    if(tag === "@ref")
    {
      if(value.length !== 2)
      {
        throw new SyntaxError("resolve: " + location + ": @ref requires exactly one path");
      }
      return {tag, path: _path(value[1], location, false)};
    }
    if((value.length !== 2 && value.length !== 3) ||
      (value.length === 3 && !Array.isArray(value[2])))
    {
      throw new SyntaxError("resolve: " + location + ": " + tag + " requires a name and optional argument array");
    }
    return {tag, path: _path(value[1], location, true)};
  }

  // Validate every input node before invoking user-provided code.
  const pending = [{value: config, path: []}];
  while(pending.length)
  {
    const entry = pending.pop();
    const value = entry.value;
    const location = _location(entry.path);
    if(value === null || typeof value === "string" || typeof value === "boolean")
    {
      continue;
    }
    if(typeof value === "number")
    {
      if(!Number.isFinite(value))
      {
        throw new TypeError("resolve: " + location + ": nonfinite number is not JSON data");
      }
      continue;
    }
    if(typeof value !== "object")
    {
      throw new TypeError("resolve: " + location + ": value is not JSON data");
    }
    if(visited.has(value))
    {
      throw new TypeError("resolve: " + location + ": input is not a JSON tree (cycle or shared object)");
    }
    visited.add(value);
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if(array)
    {
      // Array.prototype is itself an array, including across JS realms.
      if(!Array.isArray(prototype) || Object.getPrototypeOf(Object.getPrototypeOf(prototype)) !== null)
      {
        throw new TypeError("resolve: " + location + ": custom array prototype");
      }
    }
    else if(prototype === null || Object.getPrototypeOf(prototype) !== null)
    {
      throw new TypeError("resolve: " + location + ": custom object prototype");
    }
    const props = Reflect.ownKeys(value);
    if(array && Object.getOwnPropertyDescriptor(value, "length").writable !== true)
    {
      throw new TypeError("resolve: " + location + ": nonstandard array length");
    }
    if(array && props.length !== value.length + 1)
    {
      throw new TypeError("resolve: " + location + ": sparse or extended array");
    }
    for(let i = props.length - 1; i >= 0; i--)
    {
      const key = props[i];
      if(array && key === "length")
      {
        continue;
      }
      if(typeof key !== "string")
      {
        throw new TypeError("resolve: " + location + ": symbol key is not JSON data");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if(!descriptor.enumerable || !descriptor.configurable || !descriptor.writable ||
        !Object.hasOwn(descriptor, "value"))
      {
        throw new TypeError("resolve: " + location + ": non-JSON property " + JSON.stringify(key));
      }
      if(array && (!/^(0|[1-9][0-9]*)$/.test(key) ||
        !Number.isSafeInteger(Number(key)) || Number(key) >= value.length))
      {
        throw new TypeError("resolve: " + location + ": non-JSON array key " + JSON.stringify(key));
      }
      pending.push({value: descriptor.value, path: [...entry.path, key]});
    }
    const directive = _directive(value, location);
    if(directive)
    {
      directives.set(value, directive);
    }
  }

  function _external(path, location)
  {
    const first = path.keys[0];
    let value;
    let receiver;
    if(Object.hasOwn(references, first))
    {
      receiver = references;
      value = references[first];
    }
    else if(allowGlobals === true && first in globalThis)
    {
      receiver = globalThis;
      value = globalThis[first];
    }
    else
    {
      throw new ReferenceError("resolve: " + location + ": unknown external name " + JSON.stringify(first));
    }
    for(const key of path.keys.slice(1))
    {
      if(value === null || value === undefined || !(key in Object(value)))
      {
        throw new ReferenceError("resolve: " + location + ": external property " + JSON.stringify(key) + " not found");
      }
      receiver = value;
      value = value[key];
    }
    return {value, receiver};
  }

  function _property(node, key, location)
  {
    if(node === null || node === undefined || !(key in Object(node)))
    {
      throw new ReferenceError("resolve: " + location + ": property " + JSON.stringify(key) + " not found");
    }
    return node[key];
  }

  function _local(path, origin)
  {
    let keys;
    if(path.base === "root")
    {
      keys = [];
    }
    else
    {
      if(path.up > origin.length)
      {
        throw new ReferenceError("resolve: " + _location(origin) + ": relative path escapes the root");
      }
      keys = origin.slice(0, origin.length - path.up);
    }
    keys = keys.concat(path.keys);
    let current = config;
    let location = [];
    let runtime = false;
    for(const key of keys)
    {
      if(!runtime && current !== null && typeof current === "object" && !directives.has(current))
      {
        if(!Object.hasOwn(current, key))
        {
          throw new ReferenceError("resolve: " + _location(origin) + ": local path missing " + _location([...location, key]));
        }
        current = current[key];
      }
      else
      {
        current = _property(runtime ? current : _value(current, location), key, _location(origin));
        runtime = true;
      }
      location.push(key);
    }
    return runtime ? current : _value(current, location);
  }

  function _value(value, path)
  {
    if(value === null || typeof value !== "object")
    {
      return value;
    }
    if(nodes.has(value))
    {
      const record = nodes.get(value);
      if(record.processing && record.directive)
      {
        throw new ReferenceError("resolve: " + _location(path) + ": circular directive dependency");
      }
      return record.result;
    }

    const directive = directives.get(value);
    if(directive)
    {
      const record = {processing: true, directive: true, result: undefined};
      nodes.set(value, record);
      const location = _location(path);
      let result;
      if(directive.tag === "@ref")
      {
        result = directive.path.base === "external"
          ? _external(directive.path, location).value
          : _local(directive.path, path);
      }
      else
      {
        const {value: callable, receiver} = _external(directive.path, location);
        if(typeof callable !== "function")
        {
          throw new TypeError("resolve: " + location + ": " + directive.tag + " target is not callable");
        }
        const args = value.length === 3
          ? value[2].map((item, i) => _value(item, [...path, "2", String(i)]))
          : [];
        result = directive.tag === "@new"
          ? Reflect.construct(callable, args)
          : Reflect.apply(callable, receiver, args);
      }
      record.result = result;
      record.processing = false;
      return result;
    }

    const result = Array.isArray(value) ? [] : {};
    const record = {processing: true, directive: false, result};
    nodes.set(value, record);
    for(const key of Object.keys(value))
    {
      const item = _value(value[key], [...path, key]);
      Object.defineProperty(result, key, {value: item, writable: true, enumerable: true, configurable: true});
    }
    record.processing = false;
    return result;
  }

  return _value(config, []);
}
