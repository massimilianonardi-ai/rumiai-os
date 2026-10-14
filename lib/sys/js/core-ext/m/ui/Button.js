//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

// button is an icon then a label and a callback on click (-> the input-label is moved inside the button as part of it: icon + button label)
// icon can be a font+before-content or an svg/png background + min width and min height
// specific icon can be set inside the code by simply adding a css class specified in a companion specific style
// icon by code (through a css class) is set when need to specify a role of that button
// icon by overriding those css classes (eventually by restrcting ths css selector) is set for style
// overriding font-icons mean set new ::before content with proper unicode character (could be used css vars, but huge work to do)
//

function Button()
{
  return Button.Class.construct(this, arguments);
}

Class(Button)
//.inherit(ElementConfInputStore)
.inherit(ElementConfInput)
.property("conf", {locale: "en"})
.event("ConfChanged", function(value, prev)
{
  this.rebuild();
})
//.property("text")
.property("callback")
.setter("callback", function(value)
{
  if(typeof value === "function")
  {
    this.node.onclick = value;
    
    return value;
  }
  else if(typeof value === "undefined" || value === null)
  {
    this.node.onclick = null;
    delete this.node.onclick;
    
    return value;
  }
  else
  {
    throw new TypeError();
  }
})
.property("icon")
.setter("icon", function(value)
{
  if(typeof value === "string")
  {
    this.node.style.setProperty("--icon", "var(--" + value + ")");
    
    return value;
  }
  else if(typeof value === "undefined" || value === null)
  {
//    this.node.style.removeProperty("--icon");
    this.node.style.setProperty("--icon", "initial");
    
    return value;
  }
  else
  {
    throw new TypeError();
  }
})
//.property("icon")
//.setter("icon", function(value)
//{
//  if(typeof value === "string")
//  {
//    this._icon.classList.add(value);
////    this._icon.style.display = "inline";
////    this._icon.style.display = "block";
//    this._icon.style.display = "inline-block";
//    
//    return value;
//  }
//  else if(typeof value === "undefined" || value === null)
//  {
//    this._icon.classList.remove(this.icon());
//    this._icon.style.display = "none";
//    
//    return value;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Button.prototype.construct = function()
{
  this.classes.add("input");
  
  this.rebuild();
};

//------------------------------------------------------------------------------

Button.prototype.update = function()
{
//  this.rebuild();
};

//------------------------------------------------------------------------------

Button.prototype.rebuild = function()
{
//  this.html("");
//  
//  this._icon = document.createElement("i");
//  this._icon.classList.add("icon");
//  this._icon.style.display = "none";
//  this.node.appendChild(this._icon);
//  this.icon(this.icon());
//  
//  this._label = document.createElement("label");
//  this._label.style.display = "none";
//  this.node.appendChild(this._label);
  this.label(this.label());
};

//------------------------------------------------------------------------------
