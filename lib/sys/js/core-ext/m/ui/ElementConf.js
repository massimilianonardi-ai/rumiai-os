//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ElementConf()
{
  return ElementConf.Class.construct(this, arguments);
}

Class(ElementConf)
.inherit(Element)
.inherit(conf.Conf)
//.inherit(conf.Configuration)
.event("ConfChanged", function(value, prev)
{
  // each subclass registers class event callback where it updates the ui
  // then code that instantiates such subclass can call eventConfChangedRegister to register on that instance to receive event only for that obj
//  console.log("ElementConf - event conf changed", value, prev);
})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

//ElementConf.prototype.construct = function()
//{
//};

//------------------------------------------------------------------------------

//ElementConf.prototype.update = function()
//{
//};

//------------------------------------------------------------------------------

//ElementConf.prototype.parent = function(element)
//{
//  if(arguments.length === 0)
//  {
//    return this.node.parentNode;
//  }
//  else if(typeof element === "undefined" || element === null)
//  {
//    if(!(typeof this.node.parentNode === "undefined" || this.node.parentNode === null))
//    {
//      this.node.parentNode.removeChild(this.node);
//    }
//    
//    return this;
//  }
//  else if(element === 0)
//  {
//    document.getElementsByTagName("body")[0].appendChild(this.node);
//    this.update();
//    
//    return this;
//  }
//  else if(element instanceof window.ElementStore || element instanceof window.Node)
//  {
//    element.appendChild(this.node);
//    this.update();
//    
//    return this;
//  }
//  else if(element.node && (element.node instanceof window.ElementStore || element.node instanceof window.Node))
//  {
//    element.node.appendChild(this.node);
//    this.update();
//    
//    return this;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//};

//------------------------------------------------------------------------------
