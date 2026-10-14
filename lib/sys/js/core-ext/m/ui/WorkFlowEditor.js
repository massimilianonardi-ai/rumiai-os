//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function WorkFlowEditor()
{
  return WorkFlowEditor.Class.construct(this, arguments);
}

Class(WorkFlowEditor)
.inherit(ElementConfInputStore)
//.inherit(ElementConfInput)
//.inherit(ElementConf)
.property("conf", {locale: "en"})
.event("ConfChanged", function(value, prev)
{
  this.rebuild();
})
.property("value")
.getter("value", function(value)
{
  return this.editor.getValue();
})
.setter("value", function(value)
{
  this.editor.setValue(value);
  
  return value;
//  return this.editor.getValue();
})
//.property("text")
//.property("callback")
//.setter("callback", function(value)
//{
//  if(typeof value === "function")
//  {
//    this.node.onclick = value;
//    
//    return value;
//  }
//  else
//  {
//    throw new TypeError();
//  }
//})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

WorkFlowEditor.prototype.construct = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

WorkFlowEditor.prototype.update = function()
{
//  this.rebuild();
};

//------------------------------------------------------------------------------

WorkFlowEditor.prototype.rebuild = function()
{
  this.html("");
  
  this._editor = document.createElement("div");
  this.node.appendChild(this._editor);
  
  var conf = this.conf() || {};
  if(!conf.schema) conf.schema = {};
  this.editor = new JSONEditor(this._editor, conf);
//  this.editor = new JSONEditor(this._editor, this.conf());
};

//------------------------------------------------------------------------------

function mWorkFlowEditor()
{

var Element = window.Element;


};

mWorkFlowEditor.call(window);

//------------------------------------------------------------------------------
