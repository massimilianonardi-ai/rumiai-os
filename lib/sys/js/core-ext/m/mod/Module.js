//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Module()
{
  return Module.Class.construct(this, arguments);
}

Class(Module)
//.inherit(m.store.Store)
.inherit(m.srv.Data)
.property("context")
.property("global")
.property("args", {})
.setter("args", function(value){if(typeof value === "object"){return value;} else {throw new TypeError();}})
.property("strict", false)
.setter("strict", function(value){if(typeof value === "boolean"){return value;} else {throw new TypeError();}})
.property("prefix", "")
.setter("prefix", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("suffix", "")
.setter("suffix", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Module.prototype.construct = function()
{
//  m.global.log.debug(this, arguments);
  
  this.queue = new m.mod.Queue();
};

//------------------------------------------------------------------------------

Module.prototype.exec = function()
{
//  m.global.log.debug(this, arguments);
  
  var code = this.data();
  this.add()(code);
  
  return this;
};

//------------------------------------------------------------------------------

Module.prototype.read = function()
{
//  m.global.log.debug(this, arguments);
  
  var success = this.success();
//  this.success(this.add());
  var callback = this.add();
  this.success(callback);
  this.error(callback);
  if(typeof success === "function")
  {
    this.queue.add(success)();
  }
  m.srv.Data.prototype.read.call(this);
  
  return this;
};

//------------------------------------------------------------------------------

Module.prototype.add = function()
{
//  m.global.log.debug(this, arguments);
  
  var _this = this;
  
  var context = this.context();
  var global = this.global();
  var args = this.args();
  var strict = this.strict();
  var prefix = this.prefix();
  var suffix = this.suffix();
  
  var f = function(code){_this.execute(code, context, global, args, strict, prefix, suffix);};
  
  return this.queue.add(f);
};

//------------------------------------------------------------------------------

Module.prototype.execute = function(code, context, global, args, strict, prefix, suffix)
{
//  m.global.log.debug(this, arguments);
  
  if(typeof code === "function")
  {
    code.apply(context, args);
    
    return this;
  }
  
  var _code = code;
  if(typeof _code !== "string")
  {
    throw new TypeError();
  }
  
  if(typeof prefix === "string")
  {
    _code = prefix + _code;
  }
  if(typeof suffix === "string")
  {
    _code = _code + suffix;
  }
  
  if(strict === true)
  {
    _code = "\"use strict\";\n" + _code;
  }
  
  if(typeof context === "undefined" || context === null)
  {
    context = {};
  }
  
  var signature = [];
  var parameters = [];
  if(typeof args === "object")
  {
    for(var p in args)
    {
      signature.push(p);
      parameters.push(args[p]);
    }
  }
  signature.push(_code);
  
  var func = Function;
  if(typeof global === "object")
  {
    func = global.Function;
  }
  
  try
  {
    func.apply(global, signature).apply(context, parameters);
  }
  catch(e)
  {
    console.error(e);
  }
  
  return this;
};

//------------------------------------------------------------------------------
