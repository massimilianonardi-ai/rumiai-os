// Read-through property link. Writing to the receiver detaches only that key.
// Nested values remain shared unless link(..., true, ...) builds linked shells.
function linkProperty(source, target, property, renamed)
{
  if ((source === null || (typeof source !== 'object' && typeof source !== 'function')) ||
      (target === null || (typeof target !== 'object' && typeof target !== 'function')))
  {
    throw new TypeError('linkProperty requires source and target objects');
  }
  if ((typeof property !== 'string' && typeof property !== 'symbol') ||
      (renamed !== undefined && typeof renamed !== 'string' && typeof renamed !== 'symbol'))
  {
    throw new TypeError('linkProperty keys must be strings or Symbols');
  }

  const key = renamed === undefined ? property : renamed;
  if (source === target && property === key)
  {
    throw new TypeError('linkProperty cannot forward a property to itself');
  }

  Object.defineProperty
  (
    target, key,
    {
      configurable: true,
      enumerable: true,
      get()
      {
        return source[property];
      },
      set(value)
      {
        // Defining an own property also handles inherited links correctly:
        // only this receiver detaches, never the object holding the accessor.
        Object.defineProperty
        (
          this, key,
          {value, configurable: true, enumerable: true, writable: true}
        );
      }
    }
  );

  return target;
}

// Enumerable string properties include inherited keys, as in the legacy
// for...in operation; enumerable Symbols are included along the prototype chain.
function _linkKeys(source)
{
  const keys = [];
  const visited = new Set();
  for (const key in source)
  {
    keys.push(key);
    visited.add(key);
  }

  let object = source;
  while (object !== null)
  {
    for (const symbol of Object.getOwnPropertySymbols(object))
    {
      if (!visited.has(symbol))
      {
        visited.add(symbol);
        if (Object.getOwnPropertyDescriptor(object, symbol).enumerable)
        {
          keys.push(symbol);
        }
      }
    }
    object = Object.getPrototypeOf(object);
  }
  return keys;
}

function _linkDescriptor(source, key)
{
  let object = source;
  while (object !== null)
  {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor !== undefined)
    {
      return descriptor;
    }
    object = Object.getPrototypeOf(object);
  }
  return undefined;
}

function _linkShell(value, arrays)
{
  if (value === null || typeof value !== 'object')
  {
    return undefined;
  }
  if (Array.isArray(value))
  {
    if (!arrays)
    {
      return undefined;
    }
    const target = new Array(value.length);
    Object.setPrototypeOf(target, Object.getPrototypeOf(value));
    return target;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== null && Object.getPrototypeOf(proto) !== null)
  {
    // Custom instances and native objects cannot be safely mirrored as
    // ordinary objects; link them as dynamic leaves instead.
    return undefined;
  }
  return Object.create(proto);
}

// Historical overloads:
// link(source, target [, deep [, arrays]])
// link(source, target, property [, renamed | deep [, deep | arrays [, arrays]]])
function link(source, target, property, renamed, deep, arrays)
{
  if (arguments.length < 2 || arguments.length > 6)
  {
    throw new SyntaxError('link requires source and target');
  }
  if ((source === null || (typeof source !== 'object' && typeof source !== 'function')) ||
      (target === null || (typeof target !== 'object' && typeof target !== 'function')))
  {
    throw new TypeError('link requires source and target objects');
  }

  let key;
  let alias;
  let recursive = false;
  let linkArrays = false;

  if (typeof property === 'string' || typeof property === 'symbol')
  {
    key = property;
    alias = property;
    if (typeof renamed === 'string' || typeof renamed === 'symbol')
    {
      alias = renamed;
      if (deep !== undefined && typeof deep !== 'boolean')
      {
        throw new TypeError('link deep must be boolean');
      }
      if (arrays !== undefined && typeof arrays !== 'boolean')
      {
        throw new TypeError('link arrays must be boolean');
      }
      recursive = deep === true;
      linkArrays = arrays === true;
    }
    else if (typeof renamed === 'boolean')
    {
      if (arrays !== undefined || (deep !== undefined && typeof deep !== 'boolean'))
      {
        throw new TypeError('link arrays must be boolean');
      }
      recursive = renamed;
      linkArrays = deep === true;
    }
    else if (renamed !== undefined || deep !== undefined || arrays !== undefined)
    {
      throw new TypeError('link invalid property overload');
    }
  }
  else if (typeof property === 'boolean')
  {
    if (deep !== undefined || arrays !== undefined ||
        (renamed !== undefined && typeof renamed !== 'boolean'))
    {
      throw new TypeError('link invalid bulk overload');
    }
    recursive = property;
    linkArrays = renamed === true;
  }
  else if (property !== undefined || renamed !== undefined ||
           deep !== undefined || arrays !== undefined)
  {
    throw new TypeError('link invalid overload');
  }

  if (source === target && key === undefined)
  {
    throw new TypeError('link cannot link an object to itself');
  }
  if (source === target && key !== undefined && key === alias)
  {
    throw new TypeError('link cannot forward a property to itself');
  }
  if (key !== undefined && !recursive)
  {
    return linkProperty(source, target, key, alias);
  }

  const visited = new WeakMap();
  const pending = [];
  visited.set(source, target);
  pending.push({source, target, property: key, renamed: alias});

  while (pending.length !== 0)
  {
    const entry = pending.pop();
    const keys = entry.property === undefined ?
      _linkKeys(entry.source) : [entry.property];

    for (const sourceKey of keys)
    {
      const targetKey = entry.property === undefined ? sourceKey : entry.renamed;
      const descriptor = _linkDescriptor(entry.source, sourceKey);
      if (recursive && descriptor !== undefined &&
          Object.hasOwn(descriptor, 'value'))
      {
        const value = descriptor.value;
        let linked = value !== null && typeof value === 'object' ?
          visited.get(value) : undefined;
        if (linked === undefined)
        {
          linked = _linkShell(value, linkArrays);
          if (linked !== undefined)
          {
            visited.set(value, linked);
            pending.push({source: value, target: linked});
          }
        }
        if (linked !== undefined)
        {
          Object.defineProperty
          (
            entry.target, targetKey,
            {value: linked, writable: true, enumerable: true, configurable: true}
          );
          continue;
        }
      }
      linkProperty(entry.source, entry.target, sourceKey, targetKey);
    }
  }
  return target;
}
