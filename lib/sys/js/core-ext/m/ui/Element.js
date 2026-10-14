//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

// when remake of js-lib will be complete, Element must be renamed to a non conflicting name with dom (UIElement, UIE, etc.)
// UIE basic element rendered at specific user interface output (graphical, textual, audio, etc.)
// ElementStore element that links data for rendering only to/from store (eg stored configuration, list, etc.)
// ElementInput ui element that receives user input (eg control to other ui elements or volatile text notes)
// ElementInputStore io: user <-> store (eg text input that is stored as it is)
// ElementStoreInput ui element that receives user input (eg button whose icon is loaded from store by path)
// ElementStoreInputStore io: user <-> store (eg text input bound to one store with icon background bound to second store)
// 
// ElementStoreInputStoreMap uses part of its conf to map/translate store data to/from user output/input (eg yes/no mapped to true/false)
// ElementStoreInputStoreMapStore uses a map-store to map/translate store data to/from user output/input (eg text mapped to id via table)
//
function Element()
{
  return Element.Class.construct(this, arguments);
}

Class(Element)
// todo save id as it is as property, but prefix parent-id + "." to the internal node id to keep dom ids unique and hierarchical
// add method to get the full path of node hierarchy
// in constructor autegenerate unique id, but do not set to internal node, but provide a global search by id path (not dom id)
//.compose("_id", function()
//{
//  return uniqueID();
//})
//.property("id")
//.getter("id", function(value){})
//.setter("id", function(value){})
//.listener("id", function(value, prev){})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Element.prototype.construct = function(tag)
{
  var _tag = "div";
  if(typeof tag === "string")
  {
    _tag = tag;
  }
  this.node = document.createElement(_tag);
  this.node.Element = this;
  this.classes = this.node.classList;
  this.style = this.node.style;
  
//  var cname = this.constructor.name;
//  if(cname !== "Element")
//  {
//    this.classes.add(cname);
//  }
//  this.classes.add(cname);
};

//------------------------------------------------------------------------------

Element.prototype.render = function()
{
  // rebuilds ui
};

//------------------------------------------------------------------------------

Element.prototype.id = function(identifier)
{
  if(arguments.length === 0)
  {
    return this.node.id;
  }
  else
  {
    this.node.id = identifier;
    
    return this;
  }
};

//------------------------------------------------------------------------------

Element.prototype.parent = function(element)
{
  if(arguments.length === 0)
  {
    return this.node.parentNode;
  }
  else if(typeof element === "undefined" || element === null)
  {
    if(!(typeof this.node.parentNode === "undefined" || this.node.parentNode === null))
    {
      this.node.parentNode.removeChild(this.node);
    }
    
    return this;
  }
  else if(element === 0)
  {
    document.getElementsByTagName("body")[0].appendChild(this.node);
    
    return this;
  }
  else if(element instanceof window.Element || element instanceof window.Node)
  {
    element.appendChild(this.node);
    
    return this;
  }
  else if(element.node && (element.node instanceof window.Element || element.node instanceof window.Node))
  {
    element.node.appendChild(this.node);
    
    return this;
  }
  else
  {
    throw new TypeError();
  }
};

//------------------------------------------------------------------------------

Element.prototype.visible = function(visible)
{
  if(typeof visible !== "boolean" && typeof visible !== "undefined")
  {
    throw new TypeError();
  }
  
//  if(typeof visible === "undefined")
  if(arguments.length === 0)
  {
    return (this.node.style.display !== "none");
  }
  else if(visible === true)
  {
//    $(this.node).show();
    this.node.style.display = this.node.style._display || "";
  }
  else
  {
//    $(this.node).hide();
    if(this.node.style.display !== "none")
    {
      this.node.style._display = this.node.style.display;
    }
    this.node.style.display = "none";
  }
  
  return this;
};

//------------------------------------------------------------------------------

//Element.prototype.type = function(value)
//{
//  if(arguments.length === 0)
//  {
//    return this.node.type;
//  }
//  else if(typeof value === "string")
//  {
//    this.node.type = value;
//    
//    return this;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//};

//------------------------------------------------------------------------------

//Element.prototype.value = function(value)
//{
//  if(arguments.length === 0)
//  {
//    return this.node.value;
//  }
//  else if(typeof value === "string" || typeof value === "number")
//  {
//    this.node.value = value;
//    
//    return this;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//};

//------------------------------------------------------------------------------

//Element.prototype.enabled = function(value)
//{
//  if(arguments.length === 0)
//  {
//    return !this.node.disabled;
//  }
//  else if(typeof value === "boolean")
//  {
//    this.node.disabled = !value;
//    
//    return this;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//};

//------------------------------------------------------------------------------

//Element.prototype.readonly = function(value)
//{
//  if(arguments.length === 0)
//  {
//    return this.node.readOnly;
//  }
//  else if(typeof value === "boolean")
//  {
//    this.node.readOnly = value;
//    
//    return this;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//};

//------------------------------------------------------------------------------

Element.prototype.html = function(code)
{
  if(arguments.length === 0)
  {
    return this.node.innerHTML;
  }
  else
  {
    this.node.innerHTML = code;
    
    return this;
  }
};

//------------------------------------------------------------------------------

Element.prototype.text = function(text)
{
  if(arguments.length === 0)
  {
    return this.node.textContent;
  }
  else
  {
    this.node.textContent = text;
    
    return this;
  }
};

//------------------------------------------------------------------------------

Element.prototype.import = function(path, callback)
{
  var _this = this;
//  var d = new m.data.Data().path(path).parse("html");
//  d.eventDataChanged = function(value, prev)
//  {
//    var c = value.children;
//    for(var i = 0; c.length; i++)
//    {
//      _this.node.appendChild(c[i]);
//    }
//  };
//  d.read();
  var d = new m.srv.Data().path(path).success(function(value, prev)
  {
    _this.node.innerHTML = value;
    if(typeof callback === "function")
    {
      callback.apply(_this);
    }
  }).read();
  
  return this;
};

//------------------------------------------------------------------------------

Element.prototype.add = function(element)
{
//  if(element instanceof window.Element)
  if(element instanceof window.Node)
  {
    this.node.appendChild(element);
    
    return this;
  }
  else if(element.node && element.node instanceof window.Node)
  {
    this.node.appendChild(element.node);
    
    return this;
  }
  else
  {
    throw new TypeError();
  }
};

//------------------------------------------------------------------------------

Element.prototype.remove = function(element)
{
//  if(element instanceof window.Element)
  if(element instanceof window.Node)
  {
    this.node.removeChild(element);
    
    return this;
  }
  else if(element.node && element.node instanceof window.Node)
  {
    this.node.removeChild(element.node);
    
    return this;
  }
  else
  {
    throw new TypeError();
  }
};

//------------------------------------------------------------------------------

Element.prototype.select = function(selector)
{
  return this.node.querySelectorAll(selector);
};

//------------------------------------------------------------------------------

Element.prototype.escape = function(html)
{
  return document.createElement("div").appendChild(document.createTextNode(html)).parentNode.innerHTML;
};

//------------------------------------------------------------------------------

Element.prototype.has = function(element)
{
  var node;
  if(element instanceof Element)
  {
    node = element.node;
  }
//  else if(element instanceof window.Element)
  else if(element instanceof window.Node)
  {
    node = element;
  }
  else
  {
    throw new TypeError();
  }
  
  while(typeof node !== "undefined" && node !== null)
  {
    if(node === this.node)
    {
      return true;
    }
    
    node = node.parentNode;
  }
  
  return false;
};

//------------------------------------------------------------------------------

Element.prototype.register = function(name, listener)
{
  this.node.addEventListener(name, listener);
  
  return this;
};

//------------------------------------------------------------------------------

Element.prototype.unregister = function(name, listener)
{
  this.node.removeEventListener(name, listener);
  
  return this;
};

//------------------------------------------------------------------------------

Element.prototype.notify = function(event)
{
  this.node.dispatchEvent(event);
  
  return this;
};

//------------------------------------------------------------------------------
