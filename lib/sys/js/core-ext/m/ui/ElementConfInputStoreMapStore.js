//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ElementConfInputStoreMapStore()
{
  return ElementConfInputStoreMapStore.Class.construct(this, arguments);
}

Class(ElementConfInputStoreMapStore)
.inherit(ElementConfInputStoreMap)
.compose("mapStore", function()
{
  var _this = this;
  var store = new store.Store();
  Class.listener(store, "data", function(value, prev){_this.map(value);});
  
  return store;
})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

//ElementConfInputStoreMapStore.prototype.construct = function()
//{
//};

//------------------------------------------------------------------------------
