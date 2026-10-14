//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Input()
{
  return Input.Class.construct(this, arguments);
}

Class(Input)
.inherit(ElementConfInputStore)
.getter("value", function(value){return this._input.value || null;})
.setter("value", function(value)
{
  if(!this.validate(value))
  {
    throw new Error();
  }
  
  this._input.value = value;
  
  return value;
})
.setter("placeholder", function(value){this._input.placeholder = value; return value;})
.getter("readonly", function(value){return this._input.readOnly;})
.setter("readonly", function(value){this._input.readOnly = value; return value;})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Input.prototype.construct = function()
{
//  var cname = this.constructor.name;
//  if(cname !== Input.name)
//  {
//    this.classes.add(Input.name);
//  }
//  this.classes.add(cname);
  
  this._input = document.createElement("input");
  
  this._field = document.createElement("div");
  this._field.classList.add("icon");
  this._field.appendChild(this._input);
  
  this.node.appendChild(this._field);
};

//------------------------------------------------------------------------------
