//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Lang()
{
//  return Lang.Class.construct(this, arguments);
}
/*
Class(Lang);

event.Event(Lang);
Lang.prototype._provider = new data.Data();
Lang.prototype._provider.eventDataLoad = function(data, meta, status, obj)
{
  Lang.prototype.lang = data;
  Lang.prototype._event.notify(["LangChanged"], arguments);
};

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Lang.prototype.construct = function(provider)
{
  if(typeof provider !== "undefined")
  {
    if(!(provider instanceof data.Data))
    {
      throw new TypeError();
    }
    
    var _this = this;
    provider.eventDataLoad = function(data, meta, status, obj)
    {
      _this.lang = data;
      _this._event.notify(["LangChanged"], arguments);
    };
    
    this._provider = provider;
  }
  
  this.eventLangChangedID = this._event.register(["LangChanged"], this.eventLangChanged, this);
};

//------------------------------------------------------------------------------

Lang.prototype.loadLang = function(path)
{
  this._provider.path(path);
  this._provider.load();
};

//------------------------------------------------------------------------------

Lang.prototype.eventLangLoad = function(data, meta, status, obj)
{
  m.global.log.debug("Lang.eventLangLoad", arguments, this);
};

//------------------------------------------------------------------------------
*/