// Merge own properties into a compatible target, or replace a branch with a copy.
// levelMerge controls recursive fusion; levelCopy controls replacement depth.
function merge(target, source, levelMerge, levelCopy, append, instances)
{
  if (arguments.length < 2)
  {
    throw new SyntaxError('merge requires target and source');
  }

  function _depth(value, role)
  {
    if (value === undefined || value === false)
    {
      return 0;
    }
    if (value === true)
    {
      return Infinity;
    }
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0)
    {
      throw new TypeError('merge ' + role + ' must be a nonnegative number or boolean');
    }
    return Math.floor(value);
  }

  const mergeDepth = _depth(levelMerge, 'levelMerge');
  const copyDepth = _depth(levelCopy, 'levelCopy');
  if (append !== undefined && append !== null && typeof append !== 'boolean')
  {
    throw new TypeError('merge append must be boolean or null');
  }
  if (instances !== undefined && instances !== null && typeof instances !== 'boolean')
  {
    throw new TypeError('merge instances must be boolean or null');
  }

  const seen = new WeakMap();
  const pending = [];
  const records = [];

  function _plain(value)
  {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
    {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === null || Object.getPrototypeOf(proto) === null;
  }

  function _instance(value)
  {
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
      !_plain(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function _compatible(destination, value)
  {
    return (_plain(destination) && _plain(value)) ||
      (Array.isArray(destination) && Array.isArray(value) && typeof append === 'boolean') ||
      (instances === true && _instance(destination) && _instance(value));
  }

  function _newNode(value)
  {
    if (Array.isArray(value))
    {
      const result = new Array(value.length);
      Object.setPrototypeOf(result, Object.getPrototypeOf(value));
      return result;
    }
    return Object.create(Object.getPrototypeOf(value));
  }

  function _ownValue(object, key)
  {
    if (object === null || (typeof object !== 'object' && typeof object !== 'function'))
    {
      return undefined;
    }
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor === undefined)
    {
      return undefined;
    }
    return Object.hasOwn(descriptor, 'value') ? descriptor.value : Reflect.get(object, key);
  }

  function _put(object, key, value)
  {
    const old = Object.getOwnPropertyDescriptor(object, key);
    if (old === undefined)
    {
      Object.defineProperty
      (
        object, key,
        {value, enumerable: true, configurable: true, writable: true}
      );
    }
    else if (Object.hasOwn(old, 'value'))
    {
      if (!old.writable && !Object.is(old.value, value))
      {
        throw new TypeError('merge cannot replace a read-only property');
      }
      if (!Object.is(old.value, value))
      {
        Object.defineProperty(object, key, {...old, value});
      }
    }
    else
    {
      if (!old.configurable)
      {
        throw new TypeError('merge cannot replace a non-configurable accessor');
      }
      Object.defineProperty
      (
        object, key,
        {value, enumerable: old.enumerable, configurable: true, writable: true}
      );
    }
  }

  function _keys(object, enumerableOnly)
  {
    return Reflect.ownKeys(object).filter
    (
      key => !enumerableOnly || Object.getOwnPropertyDescriptor(object, key).enumerable
    );
  }

  function _resolve(destination, value, fusionDepth, replacementDepth, root)
  {
    const object = value !== null && typeof value === 'object';
    if (!object && !(root && typeof value === 'function' && typeof destination === 'function'))
    {
      return value;
    }
    const old = seen.get(value);
    if (old !== undefined)
    {
      // One source node maps to one destination node, even across branches.
      return old.target;
    }
    if (fusionDepth < 0 && replacementDepth < 0)
    {
      return value;
    }

    const rootFunction = root && typeof destination === 'function' &&
      (typeof value === 'function' || _plain(value));
    const combining = fusionDepth >= 0 && (rootFunction || _compatible(destination, value));
    let output;
    let mode;
    let depth;

    if (combining)
    {
      output = destination;
      depth = fusionDepth;
      mode = rootFunction ? 'function' :
        Array.isArray(value) ? (append === true ? 'append' : 'indexed') : 'merge';
    }
    else if (object && (_plain(value) || Array.isArray(value) ||
      (instances === true && _instance(value))))
    {
      output = _newNode(value);
      depth = replacementDepth;
      mode = 'copy';
    }
    else
    {
      output = clone
      (
        value, replacementDepth,
        instances === true ? clone.instance : 0
      );
      seen.set(value, {target: output});
      return output;
    }

    const record = {source: value, target: output, mode, depth};
    seen.set(value, record);
    records.push(record);
    pending.push(record);
    return output;
  }

  const result = _resolve(target, source, mergeDepth, copyDepth, true);
  while (pending.length > 0)
  {
    const record = pending.pop();
    const sourceNode = record.source;
    const targetNode = record.target;
    if (record.mode === 'append')
    {
      const start = targetNode.length;
      const count = sourceNode.length;
      targetNode.length = start + count;
      for (let i = 0; i < count; i++)
      {
        if (Object.hasOwn(sourceNode, i))
        {
          const value = _resolve
          (
            undefined, _ownValue(sourceNode, String(i)),
            -1, copyDepth, false
          );
          _put(targetNode, String(start + i), value);
        }
      }
      continue;
    }

    if (record.mode === 'copy')
    {
      for (const key of _keys(sourceNode, false))
      {
        if (Array.isArray(sourceNode) && key === 'length')
        {
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(sourceNode, key);
        if (Object.hasOwn(descriptor, 'value'))
        {
          descriptor.value = record.depth > 0 ?
            _resolve(undefined, descriptor.value, -1, record.depth - 1, false) :
            _resolve(undefined, descriptor.value, -1, -1, false);
        }
        Object.defineProperty(targetNode, key, descriptor);
      }
      if (Array.isArray(sourceNode))
      {
        Object.defineProperty
        (
          targetNode, 'length',
          Object.getOwnPropertyDescriptor(sourceNode, 'length')
        );
      }
      continue;
    }

    // Merge mode reads only own enumerable keys: never walk inherited state.
    // Values are written through own descriptors, not assignments to prototypes.
    const keys = _keys(sourceNode, true);
    if (record.mode === 'indexed')
    {
      targetNode.length = Math.max(targetNode.length, sourceNode.length);
    }
    for (const key of keys)
    {
      const src = _ownValue(sourceNode, key);
      const current = _ownValue(targetNode, key);
      const next = _resolve(current, src, record.depth - 1, copyDepth, false);
      _put(targetNode, key, next);
    }
  }
  return result;
}
