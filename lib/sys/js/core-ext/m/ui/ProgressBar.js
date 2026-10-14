//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

// todo percentage in the middle
// percentage easily removable from css
// alt css with "circle" class that makes the same structure circular progress
//

function ProgressBar()
{
  return ProgressBar.Class.construct(this, arguments);
}

Class(ProgressBar)
.inherit(ElementConfInputStore)
.property("conf", {locale: "en"})
.event("ConfChanged", function(value, prev)
{
  this.rebuild();
})
.setter("value", function(value)
{
  if(typeof value !== "number")
  {
    throw new TypeError();
  }
  
  if(value < 0 || 1 < value)
  {
    throw new RangeError();
  }
  
  var perc = "" + Math.floor(value * 100) + "%";
  this._text.innerText = perc;
  this._progress.style.width = perc;
  
  return value;
})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

ProgressBar.prototype.construct = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

ProgressBar.prototype.update = function()
{
//  this.rebuild();
};

//------------------------------------------------------------------------------

ProgressBar.prototype.rebuild = function()
{
  this.html("");
  
  this._label = document.createElement("label");
  this._label.style.display = "none";
  this.node.appendChild(this._label);
  this.label(this.label());
  
  this._container = document.createElement("div");
  this._container.classList.add("progress_container");
  this._container.classList.add("input");
  this.node.appendChild(this._container);
  
  this._progress = document.createElement("div");
  this._progress.classList.add("progress");
  this._progress.classList.add("input");
  this._container.appendChild(this._progress);
  
  this._text = document.createElement("div");
  this._text.classList.add("text");
  this._text.classList.add("input");
  this._container.appendChild(this._text);
};

//------------------------------------------------------------------------------
