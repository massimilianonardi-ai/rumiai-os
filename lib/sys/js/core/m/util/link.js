
function link(source, target, property, renamed, deep, arrays)
{
  if(typeof source !== "object" && typeof source !== "function")
  {
    throw new TypeError();
  }
  
  if(typeof target !== "object" && typeof target !== "function")
  {
    throw new TypeError();
  }
  
  var _property = undefined;
  var _renamed = undefined;
  var _deep = false;
  var _arrays = false;
  
  if(typeof property === "string")
  {
    _property = property;
    if(typeof renamed === "string")
    {
      _renamed = renamed;
      if(typeof deep === "boolean")
      {
        _deep = deep;
        if(typeof arrays === "boolean")
        {
          _arrays = arrays;
        }
        else if(5 < arguments.length)
        {
          throw new TypeError();
        }
      }
      else if(4 < arguments.length)
      {
        throw new TypeError();
      }
    }
    else if(typeof renamed === "boolean")
    {
      _renamed = property;
      _deep = renamed;
      if(typeof deep === "boolean")
      {
        _arrays = deep;
      }
      else if(4 < arguments.length)
      {
        throw new TypeError();
      }
    }
    else if(3 < arguments.length)
    {
      throw new TypeError();
    }
  }
  else if(typeof property === "boolean")
  {
    _deep = property;
    if(typeof renamed === "boolean")
    {
      _arrays = renamed;
    }
    else if(3 < arguments.length)
    {
      throw new TypeError();
    }
  }
  else if(2 < arguments.length)
  {
    throw new TypeError();
  }
  
  console.log(source, target, property, renamed, deep, arrays);
  console.log(source, target, _property, _renamed, _deep, _arrays);
  
  if(typeof _property === "undefined")
  {
    if(typeof _renamed === "undefined")
    {
      for(var k in source)
      {
        link(source, target, k, _deep, _arrays);
      }
    }
    else
    {
      throw new TypeError();
    }
  }
  else if(typeof _property === "string")
  {
    link(source, target, _property, _renamed, _deep, _arrays);
  }
  else if(_arrays === false)
  {
    var value = source[k];
    if(typeof value === "undefined" || typeof value === "boolean" || typeof value === "number" || typeof value === "string" || value === null)
    {
      var todo;
    }
    if(typeof source[k] === "object" && typeof source[k] === "function")
    {
      link(source[k], target[k]);
    }
    else
    {
      link(source, target, k);
    }
    
    return target;
  }
  
  
  
  
  
  if(typeof property !== "string")
  {
    throw new TypeError();
  }
  
  var targetProperty = renamed;
  if(arguments.length === 3)
  {
    targetProperty = property;
  }
  else if(typeof renamed !== "string")
  {
    throw new TypeError();
  }
  
  var getter = function(_source, _property)
  {
    return function()
    {
      return _source[_property];
    };
  }(source, property);
  
  var setter = function(_target, _property)
  {
    return function(value)
    {
      if(this === _target)
      {
        delete _target[_property];
      }
      Object.defineProperty(this, _property, {configurable: true, enumerable: true, writable: true, value: value});
    };
  }(target, targetProperty);
  
  Object.defineProperty(target, targetProperty, {configurable: true, enumerable: true, get: getter, set: setter});
  
  return target;
}

//------------------------------------------------------------------------------

function linkProperty(source, target, property, renamed)
{
  if(typeof source !== "object" && typeof source !== "function")
  {
    throw new TypeError();
  }
  
  if(typeof target !== "object" && typeof target !== "function")
  {
    throw new TypeError();
  }
  
  if(typeof property !== "string")
  {
    throw new TypeError();
  }
  
  var propertyTarget = renamed;
  if(arguments.length === 3 || typeof renamed === "undefined")
  {
    propertyTarget = property;
  }
  
  var getter = function(_source, _property)
  {
    return function()
    {
      return _source[_property];
    };
  }(source, property);
  
  var setter = function(_target, _property)
  {
    return function(value)
    {
      if(this === _target)
      {
        delete _target[_property];
      }
      Object.defineProperty(this, _property, {configurable: true, enumerable: true, writable: true, value: value});
    };
  }(target, propertyTarget);
  
  Object.defineProperty(target, propertyTarget, {configurable: true, enumerable: true, get: getter, set: setter});
  
  return target;
};

//------------------------------------------------------------------------------

function linkObject(source, target, own, level, arrays)
{
  if(typeof source !== "object" && typeof source !== "function")
  {
    throw new TypeError();
  }
  
  if(typeof target !== "object" && typeof target !== "function")
  {
    throw new TypeError();
  }
  
  var _own = true;
  var _level = 0;
  var _arrays = false;
  
  if(typeof own === "boolean")
  {
    _own = own;
  }
  else if(2 < arguments.length)
  {
    throw new TypeError();
  }
  
  if(typeof level === "number")
  {
    _level = level;
  }
  else if(3 < arguments.length)
  {
    throw new TypeError();
  }
  
  if(typeof arrays === "boolean")
  {
    _arrays = arrays;
  }
  else if(4 < arguments.length)
  {
    throw new TypeError();
  }
  
  // if 0<=level if correct own
  for(var k in source)
  {
    if(_own === false || (_own === true && source.hasOwnProperty(k)))
    {
      link(source, target, _own, _level, _arrays);
    }
  }
  
  return target;
};

//------------------------------------------------------------------------------
