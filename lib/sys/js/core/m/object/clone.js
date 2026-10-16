// Clone an object graph without executing constructors of user-defined classes.
// Depth 0 clones the root; positive levels include that many property edges.
function clone(source, level, bitmask)
{
  if (arguments.length === 0)
  {
    throw new SyntaxError('clone requires a source');
  }

  let depth = 0;
  if (level === true)
  {
    depth = Infinity;
  }
  else if (level !== undefined && level !== false)
  {
    if (typeof level !== 'number' || Number.isNaN(level) || level < 0)
    {
      throw new TypeError('clone level must be a nonnegative number or boolean');
    }
    depth = Math.floor(level);
  }

  if (bitmask !== undefined && (!Number.isSafeInteger(bitmask) || bitmask < 0 || bitmask > 63))
  {
    throw new TypeError('clone bitmask must contain only supported flags');
  }

  const flags = bitmask || 0;
  const seen = new WeakMap();
  const pending = [];
  const records = [];
  const hasFlag = flag => (flags & flag) !== 0;
  const typedConstructors =
  {
    '[object Int8Array]': Int8Array,
    '[object Uint8Array]': Uint8Array,
    '[object Uint8ClampedArray]': Uint8ClampedArray,
    '[object Int16Array]': Int16Array,
    '[object Uint16Array]': Uint16Array,
    '[object Int32Array]': Int32Array,
    '[object Uint32Array]': Uint32Array,
    '[object Float32Array]': Float32Array,
    '[object Float64Array]': Float64Array,
    '[object BigInt64Array]': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
    '[object BigUint64Array]': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array
  };
  const typedPrototype = Object.getPrototypeOf(Uint8Array.prototype);
  const typedBuffer = Object.getOwnPropertyDescriptor(typedPrototype, 'buffer').get;
  const typedOffset = Object.getOwnPropertyDescriptor(typedPrototype, 'byteOffset').get;
  const typedLength = Object.getOwnPropertyDescriptor(typedPrototype, 'length').get;
  const viewBuffer = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer').get;
  const viewOffset = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset').get;
  const viewLength = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get;

  function copy(value, remaining)
  {
    if (value === null || typeof value !== 'object')
    {
      return value;
    }

    const existing = seen.get(value);
    if (existing !== undefined)
    {
      if (remaining > existing.depth)
      {
        existing.depth = remaining;
        pending.push(existing);
      }
      return existing.target;
    }
    if (remaining < 0)
    {
      return value;
    }

    const proto = Object.getPrototypeOf(value);
    const tag = Object.prototype.toString.call(value);
    let kind = 'object';
    let target;

    if (Array.isArray(value))
    {
      kind = 'array';
      target = new Array(value.length);
      Object.setPrototypeOf(target, proto);
    }
    else if (proto === null || Object.getPrototypeOf(proto) === null)
    {
      target = Object.create(proto);
    }
    else if (ArrayBuffer.isView(value))
    {
      if (tag === '[object DataView]')
      {
        kind = 'view';
        const buffer = copy(viewBuffer.call(value), 0);
        target = new DataView(buffer, viewOffset.call(value), viewLength.call(value));
      }
      else
      {
        kind = 'typed';
        const Constructor = typedConstructors[tag];
        if (Constructor !== undefined)
        {
          const buffer = copy(typedBuffer.call(value), 0);
          target = new Constructor(buffer, typedOffset.call(value), typedLength.call(value));
        }
      }
      if (target !== undefined)
      {
        Object.setPrototypeOf(target, proto);
      }
    }
    else if (tag === '[object ArrayBuffer]')
    {
      kind = 'buffer';
      target = ArrayBuffer.prototype.slice.call(value, 0);
    }
    else if (tag === '[object SharedArrayBuffer]' && typeof SharedArrayBuffer !== 'undefined')
    {
      kind = 'buffer';
      target = SharedArrayBuffer.prototype.slice.call(value, 0);
    }
    else if (tag === '[object Map]')
    {
      kind = 'map';
      target = new Map();
    }
    else if (tag === '[object Set]')
    {
      kind = 'set';
      target = new Set();
    }
    else if (tag === '[object Date]')
    {
      target = new Date(Date.prototype.getTime.call(value));
    }
    else if (tag === '[object RegExp]')
    {
      const getSource = Object.getOwnPropertyDescriptor(RegExp.prototype, 'source').get;
      const getFlags = Object.getOwnPropertyDescriptor(RegExp.prototype, 'flags').get;
      target = new RegExp(getSource.call(value), getFlags.call(value));
    }
    else if (tag === '[object Boolean]')
    {
      target = new Boolean(Boolean.prototype.valueOf.call(value));
    }
    else if (tag === '[object Number]')
    {
      target = new Number(Number.prototype.valueOf.call(value));
    }
    else if (tag === '[object String]')
    {
      kind = 'boxed-string';
      target = new String(String.prototype.valueOf.call(value));
    }
    else if (tag === '[object BigInt]')
    {
      target = Object(BigInt.prototype.valueOf.call(value));
    }
    else if (tag === '[object Symbol]')
    {
      target = Object(Symbol.prototype.valueOf.call(value));
    }
    else if (typeof Blob !== 'undefined' && value instanceof Blob)
    {
      target = typeof File !== 'undefined' && value instanceof File
        ? new File([value], value.name, {type: value.type, lastModified: value.lastModified})
        : Blob.prototype.slice.call(value, 0, value.size, value.type);
    }
    else if (typeof URL !== 'undefined' && value instanceof URL)
    {
      target = new URL(URL.prototype.toString.call(value));
    }
    else if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams)
    {
      target = new URLSearchParams(URLSearchParams.prototype.toString.call(value));
    }
    else if (value instanceof Error || /^\[object (?:[A-Z][a-zA-Z]*Error|Error)\]$/.test(tag))
    {
      target = new Error();
    }
    else if (tag === '[object Object]' && hasFlag(clone.instance))
    {
      kind = 'instance';
      target = Object.create(proto);
    }

    if (target === undefined)
    {
      if (hasFlag(clone.error))
      {
        throw new TypeError('clone cannot reproduce this object type: ' + tag);
      }
      return value;
    }

    if (kind !== 'array' && kind !== 'typed' && kind !== 'view' && kind !== 'instance')
    {
      Object.setPrototypeOf(target, proto);
    }

    const record = {source: value, target, kind, depth: remaining, processed: -1, properties: new Map()};
    seen.set(value, record);
    records.push(record);
    pending.push(record);
    return target;
  }

  const result = copy(source, depth);
  while (pending.length !== 0)
  {
    const record = pending.pop();
    if (record.processed >= record.depth)
    {
      continue;
    }
    record.processed = record.depth;
    const remaining = record.depth - 1;

    if (record.kind === 'map')
    {
      Map.prototype.clear.call(record.target);
      for (const [key, value] of Map.prototype.entries.call(record.source))
      {
        Map.prototype.set.call(record.target, copy(key, remaining), copy(value, remaining));
      }
    }
    else if (record.kind === 'set')
    {
      Set.prototype.clear.call(record.target);
      for (const value of Set.prototype.values.call(record.source))
      {
        Set.prototype.add.call(record.target, copy(value, remaining));
      }
    }

    const byValue = hasFlag(clone.value) && !(record.kind === 'instance' && hasFlag(clone.ideep));
    const enumerableOnly = hasFlag(clone.enum) && !(record.kind === 'instance' && hasFlag(clone.iall));
    const properties = new Map();
    for (const key of Reflect.ownKeys(record.source))
    {
      if (record.kind === 'typed' && typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < record.source.length)
      {
        continue;
      }
      if (record.kind === 'boxed-string' && typeof key === 'string' && (key === 'length' || (/^(0|[1-9]\d*)$/.test(key) && Number(key) < record.source.length)))
      {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(record.source, key);
      if (enumerableOnly && !descriptor.enumerable && !(record.kind === 'array' && key === 'length'))
      {
        continue;
      }
      if (record.kind === 'array' && key === 'length')
      {
        properties.set(key, descriptor);
      }
      else if (byValue)
      {
        properties.set
        (
          key,
          {
            value: copy(Reflect.get(record.source, key), remaining),
            enumerable: descriptor.enumerable,
            writable: true,
            configurable: true
          }
        );
      }
      else if (Object.hasOwn(descriptor, 'value'))
      {
        properties.set(key, {...descriptor, value: copy(descriptor.value, remaining)});
      }
      else
      {
        properties.set(key, descriptor);
      }
    }
    record.properties = properties;
  }

  // Define properties after resolving all graph depths, so frozen/non-writable
  // descriptors do not prevent a later shared-reference depth upgrade.
  for (const record of records)
  {
    for (const [key, descriptor] of record.properties)
    {
      Object.defineProperty(record.target, key, descriptor);
    }
  }
  return result;
}

Object.assign
(
  clone,
  {
    error: 1,
    value: 2,
    enum: 4,
    instance: 8,
    ideep: 16,
    iall: 32
  }
);
Object.freeze(clone);
