//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function CSS()
{
  return CSS.Class.construct(this, arguments);
}

Class(CSS)
.inherit(srv.Data)
.compose("node", undefined)
.property("id")
.setter("id", function(value){if(typeof value === "string"){this.node.id = value; return value;} else {throw new TypeError();}})
.property("path")
//.setter("path", function(value){if(typeof value === "string"){this.node.href = "data.read/" + this.source() + "/" + value; return value;} else {throw new TypeError();}})
.setter("path", function(value)
{
  if(typeof value === "string")
  {
    if("/" !== value.charAt(0) && -1 === value.indexOf("://"))
    {
      this.node.href = "/m/data.read/" + this.source() + "/" + value;
//      this.node.href = value;
    }
    else
    {
      this.node.href = value;
    }
    return value;
  }
  else
  {
    throw new TypeError();
  }
})
//.setter("path", function(value){if(typeof value === "string"){this.node.href = "data.read/web.file/" + value; return value;} else {throw new TypeError();}})
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

CSS.prototype.construct = function()
{
  this.node = document.createElement("link");
  
  var node = this.node;
  node.type = "text/css";
  node.rel = "stylesheet";
//  node.href = path;
//  if(typeof id === "string")
//  {
//    node.id = id;
//  }
  document.getElementsByTagName("head")[0].appendChild(node);

};

//------------------------------------------------------------------------------
