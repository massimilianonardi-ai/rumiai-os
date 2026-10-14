//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ElementInput()
{
  return ElementInput.Class.construct(this, arguments);
}

Class(ElementInput)
.inherit(Element)
.property("value")
//.getter("value", function(value){return this._input.value || null;})
.setter("value", function(value)
{
  if(!this.validate(value))
  {
    throw new Error();
  }
  
  return value;
})
//.listener("value", function(value, prev){this.update();})
// real-time validator (eg while typing) is provided by the specific control eventually using the property "validator"
.property("validator")
// if not lang then use global else use specified -> used for label and anything else within the control
.property("lang", new conf.Language())
// label should be translated, or translated by default except if second argument is false, or if null by transaltion of "id"
.property("label")
.setter("label", function(value)
{
  if(typeof value === "string")
  {
    this._label.textContent = this.lang().get(value);
//    this._label.style.display = "inline";
    this._label.style.display = "inline-block";
    
    return value;
  }
  else if(typeof value === "undefined" || value === null)
  {
    this._label.textContent = "";
    this._label.style.display = "none";
    
    return value;
  }
  else
  {
    throw new TypeError();
  }
})
.property("placeholder")
//.setter("placeholder", function(value){this._input.placeholder = value; return value;})
.property("readonly")
//.getter("readonly", function(value){return this._input.readOnly;})
//.setter("readonly", function(value){this._input.readOnly = value; return value;})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

ElementInput.prototype.construct = function()
{
//  var cname = this.constructor.name;
//  this.classes.add(cname);
  this.node.classList.add("icon");
  
  this._label = document.createElement("label");
  this._label.classList.add("icon");
  this._label.style.display = "none";
  this.node.appendChild(this._label);
  
//  this._icon = document.createElement("i");
//  this._icon.classList.add("icon");
//  this.node.appendChild(this._icon);
  
  var cname = this.constructor.name;
  if(cname !== ElementInput.name)
  {
    this.classes.add(ElementInput.name);
  }
  this.classes.add(cname);
  
//  if(cname === "ElementInput" || cname === "ElementInputStore")
//  {
//    this._input = document.createElement("input");
//    this.node.appendChild(this._input);
////    Class.getter(this, "value", function(value){return this._input.value || null;})
//  }
  
  this.lang(m.global.lang);
};

//------------------------------------------------------------------------------

ElementInput.prototype.validate = function(value)
{
  var validator = this.validator();
  
  if (typeof validator === "function")
  {
    return validator.call(this, value);
  }
  
  return true;
};

//------------------------------------------------------------------------------
