//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Event()
{
  return Event.Class.construct(this, arguments);
}

Class(Event)
.instance(true, true, false, false, true)
.compose("_object", undefined)
.compose("_parent", undefined)
.compose("_global", [])
.compose("_listeners", {})
.property("enable", true)
;

//------------------------------------------------------------------------------
// Private ---------------------------------------------------------------------
//------------------------------------------------------------------------------

function EventCreate(container, name, target, parent, force)
{
  if(typeof name === "string")
  {
    if(!container.hasOwnProperty(name) || force === true)
    {
      container[name] = new Event(target, parent);
    }
    else
    {
      throw new ReferenceError();
    }
  }
  else if(Array.isArray(name))
  {
    EventCreate(container, name[0], target, parent, force);
    var p = container[name[0]];
    for(var i = 1; i < name.length; i++)
    {
      EventCreate(container, name[i], target, p, force);
    }
  }
  else
  {
    throw new TypeError();
  }
}

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Event.prototype.stateless = function(target, event, parent, name, force)
{
  if(typeof target !== "object" && typeof target !== "function")
  {
    throw new TypeError();
  }
  
  var property = "event";
  if(typeof name === "string")
  {
    property = name;
  }
  else if(typeof name !== "undefined")
  {
    throw new TypeError();
  }
  
  var container = target[property];
  if(!target.hasOwnProperty(property) || force === true)
  {
    container = {};
  }
  else if(typeof container !== "object")
  {
    throw new TypeError();
  }
  
  EventCreate(container, event, target, parent, force);
  
  target[property] = container;
  
  return target[property];
};

//------------------------------------------------------------------------------

Event.prototype.construct = function(object, parent)
{
  this._object = object;
  
  if(typeof parent !== "undefined" && !(parent instanceof Event))
  {
    throw new TypeError();
  }
  
  this._parent = parent;
};

//------------------------------------------------------------------------------

Event.prototype.register = function(callback, path)
{
  if(typeof callback !== "function")
  {
    throw new TypeError();
  }
  
  if(arguments.length === 1)
  {
    this._global.push(callback);
  }
  else
  {
    if(typeof path !== "string")
    {
      throw new TypeError();
    }
    
    this._listeners[path] = this._listeners[path] || [];
    this._listeners[path].push(callback);
  }
  
  return this._object;
};

//------------------------------------------------------------------------------

Event.prototype.unregister = function(callback, path)
{
  if(typeof callback !== "function")
  {
    throw new TypeError();
  }
  
  var index = -1;
  if(arguments.length === 1)
  {
    index = this._global.indexOf(callback);
    if(index === -1)
    {
      throw new ReferenceError();
    }
    
    m.global.log.debug(index);
    this._global.splice(index, 1);
  }
  else
  {
    if(typeof path !== "string")
    {
      throw new TypeError();
    }
    
    this._listeners[path] = this._listeners[path] || [];
    index = this._listeners[path].indexOf(callback);
    if(index === -1)
    {
      throw new ReferenceError();
    }
    
    this._listeners[path].splice(index, 1);
  }
  
  return this._object;
};

//------------------------------------------------------------------------------

Event.prototype.notify = function(path, args)
{
  if(!this.enable())
  {
    return this;
  }
  
  var arg = [];
  var listeners = undefined;
  
  if(0 < arguments.length)
  {
    if(typeof path === "string")
    {
      if(Array.isArray(args))
      {
        arg = args;
      }
      else if(1 < arguments.length)
      {
        throw new TypeError();
      }
      
      listeners = this._listeners[path] || [];
      for(var i = 0; i < listeners.length; i++)
      {
        listeners[i].apply(this._object, arg);
      }
    }
    else if(Array.isArray(path))
    {
      arg = path;
    }
  }
  
  listeners = this._global;
  for(var i = 0; i < listeners.length; i++)
  {
    listeners[i].apply(this._object, arg);
  }
  
  if(this._parent instanceof Event)
  {
    this._parent.notify(path, args);
  }
  
  return this._object;
};

//------------------------------------------------------------------------------
