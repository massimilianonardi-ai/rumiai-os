/*

implement changes notification to listeners
event fired only for specific registered paths
event fired once for many sub-changes
implement diff function for objects firing create/delete/change events on a node providing its path
for svg only root elements are needed, then propagation depends on action

if merge is true then conseguently all notifications (to every listener) provide diff object
still need registration for notifications only on particular branch and not for every change

*/

var merge = m.util.merge;

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Conf()
{
  return Conf.Class.construct(this, arguments);
}

Class(Conf)
//.inherit(m.store.Store)
.property("merge", true)
.property("conf")
.setter("conf", function(value)
{
  if(this.merge() === false)
  {
    return value;
  }
  else
  {
    return merge(this.conf(), value, true, true);
  }
})
//.listener("conf", function(value, prev){this._eventConfChanged(value, prev);})
.listener("conf", function(value, prev){this.eventNotify("ConfChanged", [value, prev]);})
//.event("Changed")
.event("ConfChanged")
//this.eventConfChangedRegister(callback, before);
//this.eventConfChangedUnregister(callback);
.compose("confStore", function()
{
  var _this = this;
  var store = new store.Store();
  Class.listener(store, "data", function(value, prev){_this.conf(value);});
  
  return store;
})
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

//Conf.prototype.construct = function()
//{
//};

//------------------------------------------------------------------------------

Conf.prototype.get = function(value, def, object)
{
  var conf = object;
  
  if(typeof conf === "undefined")
  {
    conf = this.conf();
  }
  
  if(typeof conf === "undefined")
  {
    return def;
  }
  
  if(typeof value === "string")
  {
    var path = value.split(".");
    for(var i = 0; i < path.length; i++)
    {
      if(typeof conf[path[i]] === "undefined")
      {
        return def;
      }
      conf = conf[path[i]];
    }
  }
  else if(Array.isArray(value))
  {
    for(var i = value.length - 1; -1 < i; i--)
    {
      conf = this.get(value[i], undefined, conf);
      if(typeof conf !== "undefined")
      {
        break;
      }
    }
  }
  else
  {
    throw new TypeError();
  }
  
  if(typeof conf === "undefined")
  {
    return def;
  }
  
  return conf;
};

//------------------------------------------------------------------------------
