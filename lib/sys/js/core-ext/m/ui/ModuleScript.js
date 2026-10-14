//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ModuleScript()
{
  return ModuleScript.Class.construct(this, arguments);
}

Class(ModuleScript)
.inherit(mod.Module)
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

ModuleScript.prototype.execute = function(code, context, global, args, strict, prefix, suffix)
{
  m.global.log.debug(this, arguments);
  
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
  
  var signature = "";
  var parameters = "";
  if(typeof args === "object")
  {
    for(var p in args)
    {
      signature += ", " + p;
      parameters += ", document.currentScript.m.args[\"" + p + "\"]";
    }
    if(signature.indexOf(", ") === 0)
    {
      signature = signature.substring(2);
    }
  }
  _code = "((function(" + signature + ")\n{\n" + _code + "\n}).call(document.currentScript.m.context" + parameters + "));\n";
  
  var win = window;
  if(typeof global === "object")
  {
    win = global;
  }
  
  var script = win.document.createElement("script");
  script.type = "text/javascript";
  script.charset = "UTF-8";
  script.innerHTML = _code;
  
  script.m = {};
  script.m.context = context;
  script.m.args = args;
  
  win.document.head.appendChild(script);
  
  return this;
};

//------------------------------------------------------------------------------

ModuleScript.prototype.cssAdd = function(path, id)
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
  
  var win = this.global() || window;
  if(typeof win !== "undefined" && win !== null)
  {
    win.document.head.appendChild(node);
  }
  else
  {
    win.addEventListener("load", function(event){win.document.head.appendChild(node);});
  }
  
  this.css = this.css || [];
  this.css.push(node);
  
  return this;
};

//------------------------------------------------------------------------------
