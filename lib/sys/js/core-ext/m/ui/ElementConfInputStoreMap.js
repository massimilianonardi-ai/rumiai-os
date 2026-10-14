//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ElementConfInputStoreMap()
{
  return ElementConfInputStoreMap.Class.construct(this, arguments);
}

Class(ElementConfInputStoreMap)
.inherit(ElementConfInputStore)
//.property("value")
//.getter("value", function(value){return this.map(value);})
//.setter("value", function(value){return this.revmap(value);})
//.property("text")
////.getter("text", function(value){return this.map(value);})
////.setter("text", function(value){return this.revmap(value);})
.property("map")
//.listener("map", function(value, prev){this.update();})
//.property("revmap")
//.listener("revmap", function(value, prev){this.update();})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

//ElementConfInputStoreMap.prototype.construct = function()
//{
//};

//------------------------------------------------------------------------------
