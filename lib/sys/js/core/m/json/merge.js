
var clone = util.clone;

// - level merge/replace tells level of algorithm where to stop
// - level copy tells how replace happens (NB -1 means copyreference)
// - append allows special merge for arrays
// - instances allows simple merge of instances
// 
// todo more params + distinct params for clone
// - level merge/replace for simple objects
// - level merge/replace/append for arrays
// - level merge/replace for instances
// - merge/replace by propdescr/value, enum/all distinct for simple objects, arrays and instances
// - instances merge by cloning proto chain into object linearly
// - instances merge own and merge proto chains
// - instances merge own and merge proto chains into a new one
// todo better instances merge (whole prototype chain, not enumerable properties and getters/setters)
// todo faster native detection
function merge(target, source, levelMerge, levelCopy, append, instances)
{
  if(arguments.length < 2)
  {
    throw new SyntaxError();
  }
  
  var _levelMerge = levelMerge;
  if(_levelMerge === true)
  {
    _levelMerge = Number.MAX_SAFE_INTEGER;
  }
  else if(typeof _levelMerge === "undefined" || _levelMerge === false)
  {
    _levelMerge = 0;
  }
  else if(typeof _levelMerge === "number" && 0 <= _levelMerge)
  {
    _levelMerge = Math.floor(_levelMerge);
  }
  else
  {
    throw new TypeError();
  }
  
  var _levelCopy = levelCopy;
  if(_levelCopy === true)
  {
    _levelCopy = Number.MAX_SAFE_INTEGER;
  }
  else if(typeof _levelCopy === "undefined" || _levelCopy === false)
  {
    _levelCopy = 0;
  }
  else if(typeof _levelCopy === "number" && 0 <= _levelCopy)
  {
    _levelCopy = Math.floor(_levelCopy);
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof append !== "undefined" && append !== null && typeof append !== "boolean")
  {
    throw new TypeError();
  }
  
  if(typeof instances !== "undefined" && instances !== null && typeof instances !== "boolean")
  {
    throw new TypeError();
  }
  
  if(typeof target === "function" && (typeof source === "function" || (typeof source === "object" && source !== null && (Object.getPrototypeOf(source) === Object.prototype || Object.getPrototypeOf(source) === null))))
  {
    var _referencesSource = [];
    var _referencesTarget = [];
    
    _referencesSource.push(source);
    _referencesTarget.push(target);
    
    for(var k in source)
    {
      target[k] = _merge(target[k], source[k], _levelMerge - 1, _levelCopy, append, instances, _referencesSource, _referencesTarget);
    }
  }
  else
  {
    target = _merge(target, source, _levelMerge, _levelCopy, append, instances);
  }
  
  return target;
}

function _merge(target, source, levelMerge, levelCopy, append, instances, referencesSource, referencesTarget)
{
  var _rs = referencesSource || [];
  var _rt = referencesTarget || [];
  
  var _index = _rs.indexOf(source);
  
  if(_index !== -1)
  {
    return _rt[_index];
  }
  
  if(levelMerge < 0 || typeof source !== "object" || source === null)
  {
//    console.log("level", source, levelMerge);
    return source;
  }
  
  var _levelMerge = levelMerge - 1;
  
  _rs.push(source);
  _rt.push(target);
  
  if(typeof append === "boolean" && Array.isArray(target) && Array.isArray(source))
  {
    if(append === true)
    {
      for(var i = 0; i < source.length; i++)
      {
        target.push(clone(source[i], levelCopy));
      }
    }
    else
    {
      for(var i = 0; i < source.length; i++)
      {
        target[i] = _merge(target[i], source[i], _levelMerge, levelCopy, append, instances, _rs, _rt);
      }
    }
  }
  else if(typeof target === "object" && target !== null && (Object.getPrototypeOf(target) === Object.prototype || Object.getPrototypeOf(target) === null) && (Object.getPrototypeOf(source) === Object.prototype || Object.getPrototypeOf(source) === null))
  {
    for(var k in source)
    {
      target[k] = _merge(target[k], source[k], _levelMerge, levelCopy, append, instances, _rs, _rt);
    }
  }
  else if(instances === true && Object.prototype.toString.call(target).slice(8, -1) === "Object" && Object.prototype.toString.call(source).slice(8, -1) === "Object")
  {
    for(var k in source)
    {
      target[k] = _merge(target[k], source[k], _levelMerge, levelCopy, append, instances, _rs, _rt);
    }
  }
  else
  {
    return clone(source, levelCopy);
  }
  
  return target;
};
