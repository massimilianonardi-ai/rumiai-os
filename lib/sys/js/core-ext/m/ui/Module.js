//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Module()
{
  return Module.Class.construct(this, arguments, [["iframe"]]);
}

Class(Module)
.inherit(Element)
.inherit(ui.ModuleScript)
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Module.prototype.construct = function()
{
  var node = this.node;
  node.srcdoc = "<!DOCTYPE html><html><head><title> </title><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head><body></body></html>";
  
//  node.classList.add("Module");
  
  node.style.width = "100%";
  node.style.height = "100%";
  node.style.border = "0";
  node.style.margin = "0";
  node.style.padding = "0";
//  node.style.overflow = "hidden";
  
  var _this = this;
  node.addEventListener("load", this.queue.add(function(event)
  {
    var win = this.contentWindow;
    var doc = win.document;
    var body = doc.body;
    
    win._this = _this;
    win.node = node;
    
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.border = "0";
    body.style.margin = "0";
    body.style.padding = "0";
//    body.style.overflow = "hidden";
    
    _this.global(win).context(win);
  }));
//  _this.data(function()
//  {
//    var win = _this.node.contentWindow;
//    win.m = win.m || {};
//    win.m.env = win.m.env || {};
//    if(typeof win.m.env.path === "undefined")
//    {
//      win.m.env.path = m.env.path;
//    }
//  }).exec();
//  _this.path(m.env.path).read();
};

//------------------------------------------------------------------------------

Module.prototype.read = function()
{
  m.global.log.debug(this, arguments);
  
  var success = this.success();
  var callback = this.add();
  this.success(callback);
  this.error(callback);
  if(typeof success === "function")
  {
    this.queue.add(success)();
  }
//  m.srv.Data.prototype.read.call(this);
  m.srv.Data.prototype.cmd.call(this, "read");
  
  return this;
};

//------------------------------------------------------------------------------

Module.prototype.execute = function(code, context, global, args, strict, prefix, suffix)
{
  m.global.log.debug(this, arguments);
  
  m.ui.ModuleScript.prototype.execute.call(this, code, context || this.node.contentWindow, global || this.node.contentWindow, args, strict, prefix, suffix);
};

//------------------------------------------------------------------------------

Module.prototype.cssAdd = function(path, id)
{
  if(typeof path !== "undefined" && typeof path !== "string")
  {
    throw new TypeError();
  }
  
  var node = document.createElement("link");
  node.type = "text/css";
  node.rel = "stylesheet";
  
  if(typeof path === "string")
  {
    node.href = path;
  }
  
  if(typeof id === "string")
  {
    node.id = id;
  }
  
  if(typeof this.node.contentWindow !== "undefined" && this.node.contentWindow !== null)
  {
    this.node.contentWindow.document.head.appendChild(node);
  }
  else
  {
    this.node.addEventListener("load", function(event){this.contentWindow.document.head.appendChild(node);});
  }
  
  this.css = this.css || [];
  this.css.push(node);
  
  return this;
};

//------------------------------------------------------------------------------
