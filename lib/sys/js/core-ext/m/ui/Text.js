//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Text()
{
  return Text.Class.construct(this, arguments);
}

Class(Text)
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

Text.prototype.construct = function()
{
  var cname = this.constructor.name;
  if(cname !== Text.name)
  {
    this.classes.add(Text.name);
  }
  this.classes.add(cname);
  
  this._input = document.createElement("textarea");
  this._input.classList.add("input");
  this.node.appendChild(this._input);
  
  this._input.rows = 1;
  this._input.onchange = function()
  {
    this.nextElementSibling.value = this.value; this._value = this.value;
    this.rows = 1;
    this.style.height = "0";
    this.style.height = (this.scrollHeight + 2) + "px";
  };
  this._input.onkeydown = function()
  {
    if(0 < this.scrollHeight)
    {
      this.rows = 1;
      this.style.height = "0";
      this.style.height = (Math.max(30, this.scrollHeight + 2)) + "px";
    }
  };
};

//------------------------------------------------------------------------------
