//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ElementConfInputStore()
{
  return ElementConfInputStore.Class.construct(this, arguments);
}

Class(ElementConfInputStore)
.inherit(ElementConf)
.inherit(ElementInputStore)
.properties()
;
//console.log("class inherit", "ElementConfInputStore", ElementConfInputStore.prototype, ElementConf.prototype, ElementInputStore.prototype);

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

ElementConfInputStore.prototype.construct = function()
{
};

//------------------------------------------------------------------------------
