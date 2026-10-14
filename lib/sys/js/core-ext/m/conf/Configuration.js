/*

implement changes notification to listeners
event fired only for specific registered paths
event fired once for many sub-changes
implement diff function for objects firing create/delete/change events on a node providing its path
for svg only root elements are needed, then propagation depends on action

*/

var merge = m.util.merge;

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Configuration()
{
  return Configuration.Class.construct(this, arguments);
}

Class(Configuration)
.instance(true, true, false, true, true)
//.inherit(m.store.Store)
.inherit(m.srv.Data)
.event("ConfigurationChanged")
.property("parse", "json")
.setter("data", function(value, replace)
{
//  if(typeof value === "string")
//  {
//    value = JSON.parse(value);
//  }
  
  if(replace === true)
  {
    return value;
  }
  else if(1 < arguments.length)
  {
    throw new TypeError();
  }
  
  var data = merge(this.data(), value, true, true);
  
  return data;
})
.listener("data", function(value, prev){this.notify(value);})
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Configuration.prototype.construct = function()
{
//  m.global.log.debug(this, arguments);
};

//------------------------------------------------------------------------------

Configuration.prototype.get = function(value, def, object)
{
//  m.global.log.debug(this, arguments);
  
  var data = object;
  
  if(typeof data === "undefined")
  {
    data = this.data();
  }
  if(typeof data === "undefined")
  {
    return def;
  }
  
  if(typeof value === "string")
  {
    var path = value.split(".");
    for(var i = 0; i < path.length; i++)
    {
      if(typeof data[path[i]] === "undefined")
      {
        return def;
      }
      data = data[path[i]];
    }
  }
  else if(Array.isArray(value))
  {
    for(var i = value.length - 1; -1 < i; i--)
    {
      data = this.get(value[i], undefined, data);
      if(typeof data !== "undefined")
      {
        break;
      }
    }
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof data === "undefined")
  {
    return def;
  }
  
  return data;
};

//------------------------------------------------------------------------------

Configuration.prototype.register = function(callback, path)
{
//  Event.prototype.register.call(this, callback);
//  this.event.ConfChanged.register(callback, path);
//  this.event.ConfChanged.register(callback);
  Configuration.Class.trigger("eventConfigurationChanged", callback);
  
  return this;
};

//------------------------------------------------------------------------------

Configuration.prototype.unregister = function(callback, path)
{
//  Event.prototype.unregister.call(this, callback);
//  this.event.ConfChanged.unregister(callback, path);
//  this.event.ConfChanged.unregister(callback);
  Configuration.Class.untrigger("eventConfigurationChanged", callback);
  
  return this;
};

//------------------------------------------------------------------------------

//Configuration.prototype.notify = function(path, args)
Configuration.prototype.notify = function(args)
{
//  Event.prototype.notify.call(path, args);
//  this.event.ConfChanged.notify(path, args);
//  this.event.ConfChanged.notify(args);
  this.eventConfigurationChanged(args);
  
  return this;
};

//------------------------------------------------------------------------------
