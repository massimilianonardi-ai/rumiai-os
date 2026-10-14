//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

// todo find an elegant way to reset prototypes link after direct override -> not possible easily 
// (class should be recompiled on a specific method or keep a stack of changes on a method)
// (NB stack only for prototypes, for object is not needed because is handled by javascript)
function Class(target)
{
  if(this instanceof Class)
  {
    throw new SyntaxError();
  }
  
  var c = target;
  if(typeof c === "undefined")
  {
    c = function(){return c.Class.construct(this, arguments);};
  }
  
  if(typeof c === "function")
  {
    if(c.Class instanceof Class)
    {
      return c.Class;
    }
    else
    {
      var instance = Object.create(Class.prototype);
      
      instance._target = c;
      instance._inherit = [];
      instance._instance = undefined;
      
      instance._invoke = {_new: true, _call: true, _singleton: false, _static: false, _safe: true};
//      instance.instance(true, true, false, false);
      instance._compose = {};
      
      c.Class = instance;
      c.prototype._class = instance;
      
      return instance;
    }
  }
  
  throw new ReferenceError();
}

//------------------------------------------------------------------------------
// Functions -------------------------------------------------------------------
//------------------------------------------------------------------------------

Class._constructTTFF = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    context._new = true;
    return this._construct(context, args, args_inherit);
  }
  else
  {
    return this._stateless(this._target, args, args_inherit);
  }
};

Class._constructTTFT = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    context._new = true;
    return this._construct(context, args, args_inherit);
  }
  else
  {
    if(this._instance instanceof this._target)
    {
      return this._instance;
    }
    else if(typeof this._instance === "undefined")
    {
      this._instance = Object.create(this._target.prototype);
      this._instance._new = false;
      if(this._invoke._safe === false)
      {
        this.construct = Class._constructTTFT_inst;
      }
      return this._construct(this._instance, args, args_inherit);
    }
    else
    {
      throw new ReferenceError();
    }
  }
};

Class._constructTTFT_inst = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    context._new = true;
    return this._construct(context, args, args_inherit);
  }
  else
  {
    return this._instance;
  }
};

Class._constructTTTF = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    if(this._instance instanceof this._target)
    {
      return this._instance;
    }
    else if(typeof this._instance === "undefined")
    {
      this._instance = Object.create(this._target.prototype);
      this._instance._new = true;
      if(this._invoke._safe === false)
      {
        this.construct = Class._constructTTTF_inst;
      }
      return this._construct(this._instance, args, args_inherit);
    }
    else
    {
      throw new ReferenceError();
    }
  }
  else
  {
    return this._stateless(this._target, args, args_inherit);
  }
};

Class._constructTTTF_inst = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    return this._instance;
  }
  else
  {
    return this._stateless(this._target, args, args_inherit);
  }
};

Class._constructTTTT = function(context, args, args_inherit)
{
  if(this._instance instanceof this._target)
  {
    return this._instance;
  }
  else if(typeof this._instance === "undefined")
  {
    this._instance = Object.create(this._target.prototype);
    this._instance._new = true;
    if(this._invoke._safe === false)
    {
      this.construct = Class._constructTTTT_inst;
    }
    return this._construct(this._instance, args, args_inherit);
  }
  else
  {
    throw new ReferenceError();
  }
};

Class._constructTTTT_inst = function()
{
  return this._instance;
};

Class._constructTFFA = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    context._new = true;
    return this._construct(context, args, args_inherit);
  }
  else
  {
    throw new SyntaxError();
  }
};

Class._constructTFTA = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    if(this._instance instanceof this._target)
    {
      return this._instance;
    }
    else if(typeof this._instance === "undefined")
    {
      this._instance = Object.create(this._target.prototype);
      this._instance._new = true;
      if(this._invoke._safe === false)
      {
        this.construct = Class._constructTFTA_inst;
      }
      return this._construct(this._instance, args, args_inherit);
    }
    else
    {
      throw new ReferenceError();
    }
  }
  else
  {
    throw new SyntaxError();
  }
};

Class._constructTFTA_inst = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    return this._instance;
  }
  else
  {
    throw new SyntaxError();
  }
};

Class._constructFTAF = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    throw new SyntaxError();
  }
  else
  {
    return this._stateless(this._target, args, args_inherit);
  }
};

Class._constructFTAT = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    throw new SyntaxError();
  }
  else
  {
    if(this._instance instanceof this._target)
    {
      return this._instance;
    }
    else if(typeof this._instance === "undefined")
    {
      this._instance = Object.create(this._target.prototype);
      this._instance._new = false;
      if(this._invoke._safe === false)
      {
        this.construct = Class._constructFTAT_inst;
      }
      return this._construct(this._instance, args, args_inherit);
    }
    else
    {
      throw new ReferenceError();
    }
  }
};

Class._constructFTAT_inst = function(context, args, args_inherit)
{
  if(context instanceof this._target || (typeof context !== "undefined" && context._instanceof === this._target))
  {
    throw new SyntaxError();
  }
  else
  {
    return this._instance;
  }
};

Class._constructFFAA = function()
{
  throw new Error();
};

//------------------------------------------------------------------------------

Class._link = function(source, target, property)
{
  var getter = function(prototypeSource, name)
  {
    return function()
    {
      return prototypeSource[name];
    };
  }(source, property);
  
  var setter = function(prototypeTarget, name)
  {
    return function(value)
    {
      if(this === prototypeTarget)
      {
        delete prototypeTarget[name];
      }
      Object.defineProperty(this, name, {configurable: true, enumerable: true, writable: true, value: value});
    };
  }(target, property);
  
  Object.defineProperty(target, property, {configurable: true, enumerable: true, get: getter, set: setter});
};

//------------------------------------------------------------------------------

Class._copyCallback = function(value)
{
  return function()
  {
    // todo replace with: return util.merge(undefined, value);
    var res = Array.isArray(value) ? [] : {};
    if(Array.isArray(value))
    {
      for(var i = 0; i < value.length; i++)
      {
        res.push(value[i]);
      }
    }
    else
    {
      for(var k in value)
      {
        res[k] = value[k];
      }
    }
    
    return res;
  };
};

//------------------------------------------------------------------------------

Class.getter = function(target, name, callback)
{
  Class.property(target, name, {getter: callback});
  
  return Class;
};

Class.setter = function(target, name, callback)
{
  Class.property(target, name, {setter: callback});
  
  return Class;
};

Class.listener = function(target, name, callback)
{
  Class.property(target, name, {listener: callback});
  
  return Class;
};

Class.property = function(target, name, properties)
{
  if(typeof name !== "string")
  {
    throw new TypeError();
  }
  
  var object = target;
  if(typeof target === "function")
  {
    object = target.prototype;
  }
  else if(typeof target !== "object")
  {
    throw new TypeError();
  }
  
  var propertyFunction = object[name];
  if(typeof propertyFunction !== "function")
  {
    propertyFunction = function(){};
  }
  var getter = propertyFunction.getter;
  var setter = propertyFunction.setter;
  var listener = propertyFunction.listener;
  var internalName = "_property_" + name;
  if(typeof properties === "object")
  {
    if(properties.hasOwnProperty("value"))
    {
      object[internalName] = properties.value;
    }
    
    if(properties.hasOwnProperty("getter"))
    {
      getter = properties.getter;
    }
    
    if(properties.hasOwnProperty("setter"))
    {
      setter = properties.setter;
    }
    
    if(properties.hasOwnProperty("listener"))
    {
      listener = properties.listener;
    }
  }
  
  var constructName = "_property" + (typeof getter === "function" ? "T" : "F") + (typeof setter === "function" ? "T" : "F") + (typeof listener === "function" ? "T" : "F");
  propertyFunction = Class[constructName](name, internalName);
  propertyFunction.property = true;
  propertyFunction.getter = getter;
  propertyFunction.setter = setter;
  propertyFunction.listener = listener;
  
  object[name] = propertyFunction;
  
  return Class;
};

Class._propertyFFF = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[internalName];
    }
    else
    {
      this[internalName] = value;

      return this;
    }
  };
};

Class._propertyFFT = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[internalName];
    }
    else
    {
      var prev = this[name]();

      this[internalName] = value;
      this[name].listener.call(this, value, prev, arguments);

      return this;
    }
  };
};

Class._propertyFTF = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[internalName];
    }
    else
    {
      this[internalName] = this[name].setter.apply(this, arguments);

      return this;
    }
  };
};

Class._propertyFTT = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[internalName];
    }
    else
    {
      var prev = this[name]();

      this[internalName] = this[name].setter.apply(this, arguments);
      this[name].listener.call(this, value, prev, arguments);

      return this;
    }
  };
};

Class._propertyTFF = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[name].getter.call(this, this[internalName]);
    }
    else
    {
      this[internalName] = value;

      return this;
    }
  };
};

Class._propertyTFT = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[name].getter.call(this, this[internalName]);
    }
    else
    {
      var prev = this[name]();

      this[internalName] = value;
      this[name].listener.call(this, value, prev, arguments);

      return this;
    }
  };
};

Class._propertyTTF = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[name].getter.call(this, this[internalName]);
    }
    else
    {
      this[internalName] = this[name].setter.apply(this, arguments);

      return this;
    }
  };
};

Class._propertyTTT = function(name, internalName)
{
  return function(value)
  {
    if(arguments.length === 0)
    {
      return this[name].getter.call(this, this[internalName]);
    }
    else
    {
      var prev = this[name]();

      this[internalName] = this[name].setter.apply(this, arguments);
      this[name].listener.call(this, value, prev, arguments);

      return this;
    }
  };
};

Class.properties = function(target)
{
  var object = target;
  if(typeof target === "function")
  {
    object = target.prototype;
  }
  else if(typeof target !== "object")
  {
    throw new TypeError();
  }
  
  object.properties = Class._properties;
  
  return Class;
};

Class._properties = function(properties)
{
  if(arguments.length === 0)
  {
    // todo get a copy of all properties
    return this;
  }
  else
  {
    for(var k in properties)
    {
      if(typeof this[k] === "function" && this[k].property === true)
      {
        this[k](properties[k]);
      }
      else
      {
        this[k] = properties[k];
      }
    }

    return this;
  }
};

Class._properties.property = true;

Class.propertyValidatorBoolean = function(value)
{
  if(typeof value === "boolean")
  {
    return value;
  }
  else
  {
    throw new TypeError();
  }
};

Class.propertyValidatorString = function(value)
{
  if(typeof value === "string")
  {
    return value;
  }
  else
  {
    throw new TypeError();
  }
};

Class.propertyValidatorObject = function(value)
{
  if(typeof value === "undefined")
  {
    return {};
  }
  else if(typeof value === "object")
  {
    return value;
  }
  else
  {
    throw new TypeError();
  }
};

Class.propertyValidatorFunction = function(value)
{
  if(typeof value === "function" || typeof value === "undefined" || value === null)
  {
    return value;
  }
  else
  {
    throw new TypeError();
  }
};

//------------------------------------------------------------------------------

Class.method = function(target, name, method)
{
  if(typeof name !== "string")
  {
    throw new TypeError();
  }
  
  var object = target;
  if(typeof target === "function")
  {
    object = target.prototype;
  }
  else if(typeof target !== "object")
  {
    throw new TypeError();
  }
  
  if(arguments.length === 2)
  {
    delete object[name];
  }
  else
  {
    object[name] = method;
  }
  
  return Class;
};

//------------------------------------------------------------------------------

Class.trigger = function(target, name, callback, before)
{
  if(typeof name !== "string")
  {
    throw new TypeError();
  }
  
  var object = target;
  if(typeof target === "function")
  {
    object = target.prototype;
  }
  else if(typeof target !== "object")
  {
    throw new TypeError();
  }
  
  if(arguments.length === 2)
  {
    // todo define proper action
  }
  else if(typeof callback !== "function")
  {
    throw new TypeError();
  }
  else
  {
//    if(!object.hasOwnProperty(name) || typeof object[name] !== "function")
//    {
//      throw new ReferenceError();
//    }
    
    if(typeof object[name] !== "function")
    {
console.log("!=function", name, object, object[name]);
      throw new ReferenceError();
    }
    
    if(!object.hasOwnProperty(name))
    {
console.log("not own", name, object, object[name]);
      var inherited = object[name];
      object[name] = function(){inherited.apply(this, arguments);};
    }
    
    if(object[name].trigger !== true)
    {
      var original = object[name];
      object[name] = Class._triggerBA(name);
      object[name].trigger = true;
      object[name].original = original;
      object[name].before = [];
      object[name].after = [];
    }
    
    if(before === true)
    {
      object[name].before.push(callback);
    }
    else
    {
      object[name].after.push(callback);
    }
  }
  
  return Class;
};

Class._triggerB = function(name)
{
  return function()
  {
    var triggers = this[name].before;
    for(var i = 0; i < triggers.length; i++)
    {
      triggers[i].apply(this, arguments);
    }
    
    return this[name].original.apply(this, arguments);
  };
};

Class._triggerA = function(name)
{
  return function()
  {
    var res = this[name].original.apply(this, arguments);
    
    var triggers = this[name].after;
    for(var i = 0; i < triggers.length; i++)
    {
      triggers[i].apply(this, arguments);
    }
    
    return res;
  };
};

Class._triggerBA = function(name)
{
  return function()
  {
    var triggers = undefined;
    
    triggers = this[name].before;
    for(var i = 0; i < triggers.length; i++)
    {
      triggers[i].apply(this, arguments);
    }
    
    var res = this[name].original.apply(this, arguments);
    
    triggers = this[name].after;
    for(var i = 0; i < triggers.length; i++)
    {
      triggers[i].apply(this, arguments);
    }
    
    return res;
  };
};

Class.untrigger = function(target, name, callback)
{
  if(typeof name !== "string")
  {
    throw new TypeError();
  }
  
  var object = target;
  if(typeof target === "function")
  {
    object = target.prototype;
  }
  else if(typeof target !== "object")
  {
    throw new TypeError();
  }
  
  if(!object.hasOwnProperty(name) || typeof object[name] !== "function" || object[name].trigger !== true)
  {
    throw new ReferenceError();
  }
  
  if(arguments.length === 2)
  {
    object[name] = object[name].original;
  }
  else if(typeof callback !== "function")
  {
    throw new TypeError();
  }
  else
  {
    var index = -1;
    
    index = object[name].before.indexOf(callback);
    if(index !== -1)
    {
      object[name].before.splice(index, 1);
    }
    
    index = object[name].after.indexOf(callback);
    if(index !== -1)
    {
      object[name].after.splice(index, 1);
    }
    
    if(object[name].before.length === 0 && object[name].after.length === 0)
    {
      object[name] = object[name].original;
    }
  }
  
  return Class;
};

//------------------------------------------------------------------------------

Class.event = function()
{
  event.Event.apply(undefined, arguments);
  
  return Class;
};

//------------------------------------------------------------------------------

Class.functionEmpty = function()
{
};

Class.functionThrowing = function()
{
  throw new Error();
};

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Class.prototype.construct = Class._constructTTFF;

//------------------------------------------------------------------------------

Class.prototype._construct = function(context, args, args_inherit)
{
//console.log(this._target.prototype.constructor.name, args, args_inherit, args_inherit ? args_inherit.length : null, this._inherit, this._inherit.length);
  args_inherit = args_inherit || [];
  for(var i = 0; i < this._inherit.length; i++)
  {
    context._instanceof = this._inherit[i];
//console.log("constructor chain", this._target.name, this._inherit[i].name);
    this._inherit[i].apply(context, args_inherit[i]);
  }
  delete context._instanceof;
  
  for(var k in this._compose)
  {
//    context[k] = this._compose[k](args);
    context[k] = this._compose[k].apply(context);
  }
  
//console.log(this._target.prototype.constructor.name, "_________________________________own constructor", args, args_inherit, args_inherit ? args_inherit.length : null, this._inherit, this._inherit.length);
  if(this._target.prototype.hasOwnProperty("construct") && typeof this._target.prototype.construct === "function")
  {
    var res = this._target.prototype.construct.apply(context, args);
    if(typeof res !== "undefined")
    {
      return res;
    }
  }
  
  return context;
};

//------------------------------------------------------------------------------

Class.prototype._stateless = function(context, args, args_inherit)
{
//  args_inherit = args_inherit || [];
//  for(var i = 0; i < this._inherit.length; i++)
//  {
//    this._inherit[i].apply(context, args_inherit[i]);
//  }
//  
//  for(var k in this._compose)
//  {
////    context[k] = this._compose[k](args);
//    context[k] = this._compose[k].apply(context);
//  }
  
  if(this._target.prototype.hasOwnProperty("stateless") && typeof this._target.prototype.stateless === "function")
  {
    return this._target.prototype.stateless.apply(context, args);
  }
};

//------------------------------------------------------------------------------

Class.prototype.inherit = function(base, dynamic, link)
{
//console.log("inherit", this._target.prototype.constructor.name, base.prototype.constructor.name, this._inherit);
  
  var _target = this._target;
  
  var constructor = _target.prototype.constructor;
  var _class = _target.prototype._class;
  
  var construct = _target.prototype.construct;
  
  if(arguments.length === 0)
  {
    this._inherit = [];
    this._target.prototype = Object.create(Object.prototype);
  }
  else if(typeof base !== "function")
  {
    throw new TypeError();
  }
  else
  {
// better dynamic inheritance also for first
    if(this._inherit.length___ === 0)
    {
      var prototype = _target.prototype;
      _target.prototype = Object.create(base.prototype);
      for(var k in prototype)
      {
        if(!(k in _target.prototype))
        {
          _target.prototype[k] = prototype[k];
        }
      }
    }
    else
    {
      var prototype = base.prototype;
      
      if(dynamic === false)
      {
        for(var k in prototype)
        {
          _target.prototype[k] = prototype[k];
        }
      }
      else
      {
        for(var k in prototype)
        {
//console.log("inherit method by link", this._target.prototype.constructor.name, base.prototype.constructor.name, this._inherit, k);
          Class._link(prototype, _target.prototype, k);
        }
      }
      
      if(Array.isArray(link))
      {
        for(var i = 0; i < link.length; i++)
        {
          if(typeof link[i] !== "string")
          {
            throw new TypeError();
          }

          Class._link(prototype, _target.prototype, link[i]);
        }
      }
    }
    
    if(base.Class instanceof Class)
    {
      var invoke = base.Class._invoke;
      this.instance(invoke._new, invoke._call, invoke._singleton, invoke._static, invoke._safe);
      
      var compose = base.Class._compose;
      var eventTarget = this._compose.event;
      var eventBase = compose.event;
      for(var k in compose)
      {
        this._compose[k] = compose[k];
      }
      
      if(typeof eventTarget === "function")
      {
        this._compose.event = function(){eventBase.apply(this); eventTarget.apply(this); return this.event;};
      }
      else
      {
        delete this._compose.event;
      }
    }
    
    this._inherit.push(base);
  }
  
  _target.prototype.constructor = constructor;
  _target.prototype._class = _class;
  
  _target.prototype.construct = construct;
  
//console.log("inherit", this._target.prototype.constructor.name, base.prototype.constructor.name, JSON.stringify(Object.getOwnPropertyNames(_target.prototype)), JSON.stringify(Object.keys(_target.prototype)));
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.inherited = function(base)
{
  return this._inherit.indexOf(base) !== -1;
//  for(var i = 0; i < this._inherit.length; i++)
//  {
//    if(this._inherit[i] === base)
//    {
//      return true;
//    }
//  }
//  
//  return false;
};

//------------------------------------------------------------------------------

Class.prototype.instance = function(invokeNew, invokeFunction, singletonNew, singletonFunction, singletonSafe)
{
  var n = undefined;
  var f = undefined;
  var ns = undefined;
  var fs = undefined;
  var ss = undefined;
  
  if(typeof invokeNew === "undefined")
  {
    n = true;
  }
  else if(typeof invokeNew === "boolean")
  {
    n = invokeNew;
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof invokeFunction === "undefined")
  {
    f = true;
  }
  else if(typeof invokeFunction === "boolean")
  {
    f = invokeFunction;
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof singletonNew === "undefined")
  {
    ns = false;
  }
  else if(typeof singletonNew === "boolean")
  {
    ns = singletonNew;
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof singletonFunction === "undefined")
  {
    fs = false;
  }
  else if(typeof singletonFunction === "boolean")
  {
    fs = singletonFunction;
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof singletonSafe === "undefined")
  {
    ss = true;
  }
  else if(typeof singletonSafe === "boolean")
  {
    ss = singletonSafe;
  }
  else
  {
    throw new TypeError();
  }
  
  this._invoke._new = n;
  this._invoke._call = f;
  this._invoke._singleton = ns;
  this._invoke._static = fs;
  this._invoke._safe = ss;
  
  var constructName = "_construct" + (n ? "T" : "F") + (f ? "T" : "F") + (n ? (ns ? "T" : "F") : "A") + (f ? (fs ? "T" : "F") : "A");
  delete this._instance;
  this.construct = Class[constructName];
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.compose = function(name, value)
{
  if(typeof name !== "string")
  {
    throw new TypeError();
  }
  
  if(arguments.length === 1)
  {
    delete this._target.prototype[name];
  }
  else if(typeof value === "undefined" || typeof value === "boolean" || typeof value === "number" || typeof value === "string" || typeof value === "function" || value === null)
  {
    this._target.prototype[name] = value;
  }
  else if(typeof value === "object")
  {
    this._compose[name] = Class._copyCallback(value);
  }
  else
  {
    throw new TypeError();
  }
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.shared = function(name, value)
{
  if(typeof name !== "string")
  {
    throw new TypeError();
  }
  
  this._target.prototype._shared = this._target.prototype._shared || {};
  if(1 < arguments.length)
  {
    this._target.prototype._shared[name] = value;
  }
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.getter = function(property, callback)
{
  Class.property(this._target, property, {getter: callback});
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.setter = function(property, callback)
{
  Class.property(this._target, property, {setter: callback});
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.listener = function(property, callback)
{
  Class.property(this._target, property, {listener: callback});
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.property = function(property, value, getter, setter, listener)
{
  var params = {};
  
  if(typeof getter === "function" || getter === null)
  {
    params.getter = getter;
  }
  else if(typeof getter !== "undefined")
  {
    throw new TypeError();
  }
  
  if(typeof setter === "function" || setter === null)
  {
    params.setter = setter;
  }
  else if(typeof setter !== "undefined")
  {
    throw new TypeError();
  }
  
  if(typeof listener === "function" || listener === null)
  {
    params.listener = listener;
  }
  else if(typeof listener !== "undefined")
  {
    throw new TypeError();
  }
  
  Class.property(this._target, property, params);
  if(arguments.length !== 1)
  {
    this.compose("_property_" + property, value);
  }
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.properties = function()
{
  Class.properties(this._target);
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.method = function(name, method)
{
  Class.method(this._target, name, method);
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.trigger = function(name, callback, before)
{
  Class.trigger(this._target, name, callback, before);
  
  return this;
};

//------------------------------------------------------------------------------

Class.prototype.untrigger = function(name, callback)
{
  Class.untrigger(this._target, name, callback);
  
  return this;
};

//------------------------------------------------------------------------------

//Class.prototype.event = function(event, classEventCallback)
//{
//  if(typeof event !== "string")
//  {
//    throw new TypeError();
//  }
//  
//  var _class = this;
//  var eventMethodName = "event" + this._target.name + event;
//  
//  if(typeof this._target.prototype[eventMethodName] === "undefined")
//  {
//    this._target.prototype[eventMethodName] = function(){};
//  }
//  
//  if(typeof classEventCallback !== "undefined")
//  {
//    if(typeof classEventCallback !== "function")
//    {
//      throw new TypeError();
//    }
//    
//    this._target.prototype[eventMethodName] = classEventCallback;
//  }
//  this._target.prototype[eventMethodName + "Register"] = function(callback, before){_class.trigger(eventMethodName, callback, before);};
//  this._target.prototype[eventMethodName + "Unregister"] = function(callback){_class.untrigger(eventMethodName, callback);};
//  
//  return this;
//};

//------------------------------------------------------------------------------

Class.prototype.event = function(event, classEventCallback)
{
  if(typeof event !== "string")
  {
    throw new TypeError();
  }
  
  var _class = this;
//  var eventMethodName = "event" + this._target.name + event;
//  var eventMethodName = "_event" + event;
  var eventMethodName = "event" + event;
  
//console.log(eventMethodName, this._target.prototype[eventMethodName]);
  if(typeof this._target.prototype[eventMethodName] === "undefined")
  {
    this._target.prototype[eventMethodName] = function(){};
  }
  
  if(typeof classEventCallback !== "undefined")
  {
    if(typeof classEventCallback !== "function")
    {
      throw new TypeError();
    }
    
    this._target.prototype[eventMethodName] = classEventCallback;
  }
  
  // todo: reg/unreg for any event -> first check for existence, if not create methods eventRegister/eventUnregister(eventName, callback)
  // NB also eventNotify to completely hide implementation that only calls the event function that now will have a "_" prefix as internal
//  this._target.prototype[eventMethodName + "Register"] = function(callback, before){_class.trigger(eventMethodName, callback, before);};
//  this._target.prototype[eventMethodName + "Unregister"] = function(callback){_class.untrigger(eventMethodName, callback);};
  
//  this._target.prototype.eventNotify = function(eventName, args){this["_event" + eventName].apply(this, args);};
//  this._target.prototype.eventRegister = function(eventName, callback, before){_class.trigger("_event" + eventName, callback, before);};
//  this._target.prototype.eventUnregister = function(eventName, callback){_class.untrigger("_event" + eventName, callback);};
  
//  this._target.prototype.eventNotify = function(eventName, args){console.log(this); this["event" + eventName].apply(this, args);};
  this._target.prototype.eventNotify = function(eventName, args){this["event" + eventName].apply(this, args);};
//  this._target.prototype.eventNotify = function(eventName, args){this._class._target.prototype["event" + eventName].apply(this, args);};
//  this._target.prototype.eventRegister = function(eventName, callback, before){_class.trigger("event" + eventName, callback, before);};
//  this._target.prototype.eventUnregister = function(eventName, callback){_class.untrigger("event" + eventName, callback);};
  this._target.prototype.eventRegister = function(eventName, callback, before){Class.trigger(this, "event" + eventName, callback, before);};
  this._target.prototype.eventUnregister = function(eventName, callback){Class.untrigger(this, "event" + eventName, callback);};
  
  return this;
};

//------------------------------------------------------------------------------

//Class.prototype.event = function(event, global)
//{
//  if(arguments.length === 0)
//  {
//    delete this._compose.event;
//    delete this._target.event;
//  }
//  else if(arguments.length === 1 && typeof event === "boolean")
//  {
//    if(event)
//    {
//      delete this._target.event;
//    }
//    else
//    {
//      delete this._compose.event;
//    }
//  }
//  else if(global === true)
//  {
//    Class.event(this._target, event, undefined, undefined, true);
//  }
//  else
//  {
//    var prev = this._compose.event;
////    if(typeof prev === "function")
////    {
////      this._compose.event = function(){prev.apply(this); Class.event(this, event); return this.event;};
////    }
////    else
////    {
////      this._compose.event = function(){Class.event(this, event); return this.event;};
////    }
//    if(typeof prev === "function")
//    {
//      this._compose.event = function(){prev.apply(this); Class.event(this, event, undefined, undefined, true); return this.event;};
//    }
//    else
//    {
//      this._compose.event = function(){Class.event(this, event, undefined, undefined, true); return this.event;};
//    }
//  }
//  
//  return this;
//};

//------------------------------------------------------------------------------

Class.prototype.get = function()
{
  return this._target;
};

//------------------------------------------------------------------------------

Class.prototype.bind = function(registerProperty, valueProperty)
{
  this.shared("_bind_" + registerProperty, {});
  
  this.listener(registerProperty, function(value, prev)
  {
    var registers = this._shared["_bind_" + registerProperty];
    var oldRegister = registers[prev] || [];
    var newRegister = registers[value] || [];
    registers[value] = newRegister;
    
    newRegister.push(this);
    var index = oldRegister.indexOf(this);
    if(-1 < index)
    {
      oldRegister.splice(index, 1);
    }
    
    console.log("bind to new value", newRegister, oldRegister);
  });
  
  this.listener(valueProperty, function(value, prev)
  {
    var internalName = "_property_" + registerProperty;
    
    var listeners = this._shared["_bind_" + registerProperty][this[registerProperty]()];
console.log("bind property", valueProperty, "broadcasting value", value, "key", this[registerProperty](), "listeners", listeners);
    if(typeof listeners !== "undefined")
    {
      for(var i = 0; i < listeners.length; i++)
      {
        var l = listeners[i];
        var f = l[valueProperty];
        if(typeof f === "function")
        {
//          f(value);
          if(typeof f.setter !== "function")
          {
            l[internalName] = value;
          }
          else
          {
            l[internalName] = f.setter.apply(l, arguments);
          }
        }
        else
        {
          console.error("bind: no value property");
        }
      }
    }
  });
  
  return this;
};

//------------------------------------------------------------------------------

//Class.prototype.bindable = function()
//{
//  for(var i = 0; i < arguments.length; i++)
//  {
//    
//  }
//  
//  Class.method(this._target, "bind", function(obj, property)
//  {
//    
//  });
//  
//  return this;
//};

//------------------------------------------------------------------------------

Class.prototype.inheritMethodsAs = function(base, methods, renamedMethods, dynamic)
{
  var _target = this._target;
  
  var constructor = _target.prototype.constructor;
  var _class = _target.prototype._class;
  
  if(typeof base !== "function")
  {
    throw new TypeError();
  }
  
  var prototype = base.prototype;
  
  if(typeof methods === "string" && typeof renamedMethods === "string")
  {
    if(dynamic === false)
    {
      _target.prototype[methods] = prototype[renamedMethods];
    }
    else
    {
      Class._linkAs(prototype, _target.prototype, methods, renamedMethods);
    }
  }
  else if(Array.isArray(methods) && Array.isArray(renamedMethods))
  {
    if(dynamic === false)
    {
      for(var i = 0; i < methods.length; i++)
      {
        if(typeof methods[i] !== "string" || typeof renamedMethods[i] !== "string")
        {
          throw new TypeError();
        }
        
        _target.prototype[methods[i]] = prototype[renamedMethods[i]];
      }
    }
    else
    {
      for(var i = 0; i < methods.length; i++)
      {
        if(typeof methods[i] !== "string" || typeof renamedMethods[i] !== "string")
        {
          throw new TypeError();
        }
        
        Class._linkAs(prototype, _target.prototype, methods[i], renamedMethods[i]);
      }
    }
  }
  else
  {
    throw new TypeError();
  }
  
  if(base.Class instanceof Class)
  {
    var invoke = base.Class._invoke;
    this.instance(invoke._new, invoke._call, invoke._singleton, invoke._static, invoke._safe);
    
    var compose = base.Class._compose;
    var eventTarget = this._compose.event;
    var eventBase = compose.event;
    for(var k in compose)
    {
      this._compose[k] = compose[k];
    }
    
    if(typeof eventTarget === "function")
    {
      this._compose.event = function(){eventBase.apply(this); eventTarget.apply(this); return this.event;};
    }
    else
    {
      delete this._compose.event;
    }
  }

  this._inherit.push(base);
  
  _target.prototype.constructor = constructor;
  _target.prototype._class = _class;
  
  return this;
};

//------------------------------------------------------------------------------

Class._linkAs = function(source, target, property, renamedProperty)
{
  var getter = function(prototypeSource, name)
  {
    return function()
    {
      return prototypeSource[name];
    };
  }(source, property);
  
  var setter = function(prototypeTarget, name)
  {
    return function(value)
    {
      if(this === prototypeTarget)
      {
        delete prototypeTarget[name];
      }
      Object.defineProperty(this, name, {configurable: true, enumerable: true, writable: true, value: value});
    };
  }(target, property);
  
  Object.defineProperty(target, renamedProperty, {configurable: true, enumerable: true, get: getter, set: setter});
};

//------------------------------------------------------------------------------
