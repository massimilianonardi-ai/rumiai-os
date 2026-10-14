//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ElementInputStore()
{
  return ElementInputStore.Class.construct(this, arguments);
}

Class(ElementInputStore)
.inherit(ElementInput)
.inherit(store.Store)
.property("autoLoad", true)
.property("autoSave", true)
.property("value")
.listener("value", function(value, prev)
{
  // if autosave then put value into data and call store save
  this.update();
})
.property("data")
.listener("data", function(value, prev)
{
  // if autoload then put data into value
  this.update();
})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

ElementInputStore.prototype.construct = function()
{
};

//------------------------------------------------------------------------------

ElementInputStore.prototype.update = function()
{
};

//------------------------------------------------------------------------------

ElementInputStore.prototype.load = function()
{
};

//------------------------------------------------------------------------------

ElementInputStore.prototype.save = function()
{
};

//------------------------------------------------------------------------------
