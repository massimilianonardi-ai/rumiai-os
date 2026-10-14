//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function ResizeListener()
{
  return Class(ResizeListener).construct(this, undefined, undefined, ["iframe"]);
}

Class(ResizeListener)
.inherit(IFrame)
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

ResizeListener.prototype.construct = function()
{
  var _this = this;
  
  this.event.register("load", function()
  {
    _this.node.contentWindow.addEventListener("resize", function(event){_this.eventResizeListenerResize();});
  });
  
  var html = "<!DOCTYPE html><html><head><title></title></head><body></body></html>";
  this.document(html);
};

//------------------------------------------------------------------------------

//ResizeListener.prototype.attach = function(element)
//{
//  var node;
//  
//  if(element instanceof Element)
//  {
//    node = element.node;
//  }
//  else if(element instanceof window.Node)
//  {
//    node = element;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//  
//  node.insertBefore(this.node, node.firstChild);
//  
//  var _this = this;
//  this.eventResizeListenerResize = function()
//  {
//    if(window.getComputedStyle(node).position === "static")
//    {
//      node.style.position = "relative";
//    }
//    _this.eventResizeListenerResize();
//  };
//};

//------------------------------------------------------------------------------

//ResizeListener.prototype.detach = function()
//{
//};

//------------------------------------------------------------------------------

ResizeListener.prototype.eventResizeListenerResize = function()
{
};

//------------------------------------------------------------------------------
