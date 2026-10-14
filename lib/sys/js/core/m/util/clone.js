
// todo check if freeze (for bitmask values) at end of file impacts on performance
// todo faster native detection
// todo implement more native objects clone
// todo if source is an anonymous function use decompile + merge to clone it (and named functions???)
// todo add bitmask to keep references to base types for property leaves (where maximum level reached) with getters/setters (according to level)
function clone(source, level, bitmask)
{
  if(arguments.length < 1)
  {
    throw new SyntaxError();
  }
  
  var _level = level;
  
  if(_level === true)
  {
    _level = Number.MAX_SAFE_INTEGER;
  }
  else if(typeof _level === "undefined" || _level === false)
  {
    _level = 0;
  }
  else if(typeof _level === "number" && 0 <= _level)
  {
    _level = Math.floor(_level);
  }
  else
  {
    throw new TypeError();
  }
  
//  if(typeof reference !== "undefined" && reference !== null && typeof reference !== "boolean")
//  {
//    throw new TypeError();
//  }
//  
//  if(typeof values !== "undefined" && values !== null && typeof values !== "boolean")
//  {
//    throw new TypeError();
//  }
//  
//  if(typeof objects !== "undefined" && objects !== null && typeof objects !== "boolean")
//  {
//    throw new TypeError();
//  }
  
  return _clone(source, _level, !!(bitmask & clone.error), !!(bitmask & clone.value), !!(bitmask & clone.enum), !!(bitmask & clone.instance), !!(bitmask & clone.ideep), !!(bitmask & clone.iall));
}

// native unclonable objects throw error instead of returning a reference
clone.error = 1;

// copy properties by value instead of deep cloning by property descriptors
clone.value = 2;

// clone only enumerable properties
clone.enum = 4;

// instances are not cloned, but copied by reference
clone.instance = 8;

// override eventual clone.value flag for instances forcing deep cloning by property descriptors
clone.ideep = 16;

// override eventual clone.enum flag for instances forcing cloning of not enumerable also
clone.iall = 32;

function _clone(source, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone)
{
  var _rs = referencesSource || [];
  var _rc = referencesClone || [];
  
  var _index = _rs.indexOf(source);
  
  if(_index !== -1)
  {
    return _rc[_index];
  }
  
  if(level < 0 || typeof source !== "object" || source === null)
  {
    return source;
  }
  
  var _level = level - 1;
  
  var _target = undefined;
  
  if(Object.getPrototypeOf(source) === Object.prototype || Object.getPrototypeOf(source) === null)
  {
    _target = _cloneObject(source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
  }
  else if(Array.isArray(source))
  {
    _target = _cloneObject(source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
  }
  else
  {
    var _class = Object.prototype.toString.call(source).slice(8, -1);
    
    if(_class === "Object")
    {
      if(_instance === false)
      {
        _target = source;
      }
      else
      {
        _target = _cloneObject(source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
      }
    }
    else if(_class === "RegExp")
    {
      _target = new RegExp(source.source, source.flags);
//      _target.lastIndex = source.lastIndex;
    }
    else if(_class === "Date" || _class === "String" || _class === "Number" || _class === "Boolean")
    {
      _target = new source.constructor(source.valueOf());
    }
//    else if(_class === "Map")
//    {
//      _target = new Map();
//      _target = _cloneMap(_target, source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
//    }
//    else if(_class === "Set")
//    {
//      _target = new Set();
//      _target = _cloneSet(_target, source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
//    }
//    else if(_class === "WeakMap")
//    {
//      _target = new WeakMap();
//      _target = _cloneMap(_target, source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
//    }
//    else if(_class === "WeakSet")
//    {
//      _target = new WeakSet();
//      _target = _cloneSet(_target, source, _level, _error, _value, _enum, _instance, _ideep, _iall, _rs, _rc);
//    }
    else if(_class === "Blob")
    {
      _target = source.slice(0, source.size, source.type);
    }
    else
    {
      if(_error === false)
      {
        _target = source;
      }
      else
      {
        throw new ReferenceError();
      }
    }
  }
  
  return _target;
}

function _cloneObject(source, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone)
{
  var _target = Object.create(Object.getPrototypeOf(source));
  
  referencesSource.push(source);
  referencesClone.push(_target);
  
  var propertyDescriptors = Object.getOwnPropertyDescriptors(source);
  
  if(_value === false && _enum === false)
  {
    for(var k in propertyDescriptors)
    {
      if(propertyDescriptors[k].hasOwnProperty("value"))
      {
        propertyDescriptors[k].value = _clone(propertyDescriptors[k].value, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone);
        Object.defineProperty(_target, k, propertyDescriptors[k]);
      }
      else
      {
        Object.defineProperty(_target, k, propertyDescriptors[k]);
      }
    }
  }
  else if(_value === true && _enum === false)
  {
    for(var k in propertyDescriptors)
    {
      _target[k] = _clone(source[k], level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone);
    }
  }
  else if(_value === false && _enum === true)
  {
    for(var k in propertyDescriptors)
    {
      if(propertyDescriptors[k].enumerable === true)
      {
        if(propertyDescriptors[k].hasOwnProperty("value"))
        {
          propertyDescriptors[k].value = _clone(propertyDescriptors[k].value, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone);
          Object.defineProperty(_target, k, propertyDescriptors[k]);
        }
        else
        {
          Object.defineProperty(_target, k, propertyDescriptors[k]);
        }
      }
    }
  }
  else if(_value === true && _enum === true)
  {
    for(var k in propertyDescriptors)
    {
      if(propertyDescriptors[k].enumerable === true)
      {
        _target[k] = _clone(source[k], level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone);
      }
    }
  }
  
  return _target;
}

//function _cloneMap(target, source, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone)
//{
//  return target;
//}

//function _cloneSet(target, source, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone)
//{
//  return target;
//}

//function _cloneArray(source, level, _error, _value, _enum, _instance, _ideep, _iall, referencesSource, referencesClone)
//{
//  var _target = [];
//
//  referencesSource.push(source);
//  referencesClone.push(_target);
//
//  for(var i = 0; i < source.length; i++)
//  {
//    _target[i] = _clone(source[i], level, reference, values, objects, referencesSource, referencesClone);
//  }
//  
//  return _target;
//}

Object.freeze(clone);
