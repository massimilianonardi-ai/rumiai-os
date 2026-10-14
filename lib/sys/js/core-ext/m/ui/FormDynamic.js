
var merge = m.util.merge;

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function FormDynamic()
{
  return FormDynamic.Class.construct(this, arguments);
}

Class(FormDynamic)
//.inherit(Element)
.inherit(ElementConfInputStore)
//.inherit(Form)
.compose("elems", {})
.compose("list", [])
//.property("struct")
//.setter("struct", function(value){this.build(value); return value;})
.property("conf")
.event("ConfChanged", function(value, prev)
{
  this.build(value);
})
.property("value")
.getter("value", function(value){return this.get(this.elems);})
.setter("value", function(value){return this.set(value);})
.property("sublabel")
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

FormDynamic.prototype.construct = function()
{
  this.classes.add("Form");
};

//------------------------------------------------------------------------------

FormDynamic.prototype.rebuild = function()
{
  this.list = [];
  this.elems = {};
  this.html("");
};

//------------------------------------------------------------------------------

FormDynamic.prototype.build = function(struct)
{
  var _this = this;
  var index = this.list.length;
  
  var container = new ui.Element().parent(this);
  container.classes.add("container");
  
  this._label = document.createElement("label");
//  this._label.style.display = "none";
  container.node.appendChild(this._label);
//  this.label("[" + index + "]" + this.label());
  this._label.textContent = index;
  
  var form = new ui.Form().conf(struct).parent(container);
  if(this.sublabel()) form.label(this.sublabel());
  this.list.push(form);
  this.elems[index] = form;
  
  var buttons = new ui.Element().parent(container);
  buttons.classes.add("buttons");
  
//  var add = new ui.Button().icon("icon-add").label("ADD BELOW").callback(function(){_this.add(index, container);}).parent(buttons);
//  var remove = new ui.Button().icon("icon-remove").label("REMOVE").callback(function(){_this.remove(index, container);}).parent(buttons);
//  var up = new ui.Button().icon("icon-up").label("UP").callback(function(){_this.up(index, container);}).parent(buttons);
//  var down = new ui.Button().icon("icon-down").label("DOWN").callback(function(){_this.down(index, container);}).parent(buttons);
  var add = new ui.Button().label("ADD BELOW").callback(function(){_this.add(index, container);}).parent(buttons);
  var remove = new ui.Button().label("REMOVE").callback(function(){_this.remove(index, container);}).parent(buttons);
  var up = new ui.Button().label("UP").callback(function(){_this.up(index, container);}).parent(buttons);
  var down = new ui.Button().label("DOWN").callback(function(){_this.down(index, container);}).parent(buttons);
  
  add.classes.add("add");
  remove.classes.add("remove");
  up.classes.add("up");
  down.classes.add("down");
};

//------------------------------------------------------------------------------

FormDynamic.prototype.swap = function(node1, node2)
{
  var afterNode2 = node2.nextElementSibling;
  var parent = node2.parentNode;
  node1.replaceWith(node2);
  parent.insertBefore(node1, afterNode2);
};

//------------------------------------------------------------------------------

FormDynamic.prototype.rebuildElements = function()
{
  this.elems = {};
  
  for(var i = 0; i < this.list.length; i++)
  {
    this.elems[i] = this.list[i];
  }
};

//------------------------------------------------------------------------------

FormDynamic.prototype.add = function(index, container)
{
//  console.log("add", this, this.conf(), index, container);
  this.build(this.conf());
  for(var i = index + 1; i < this.list.length; i++)
  {
    this.swap(this.list[i].node, this.list[this.list.length - 1].node);
  }
  var form = this.list.pop();
  this.list.splice(index + 1, -1, form);
  this.rebuildElements();
//  console.log(this.list, this.elems);
};

//------------------------------------------------------------------------------

FormDynamic.prototype.remove = function(index, container)
{
//  console.log("remove", this, this.conf(), index, container);
//  this.node.removeChild(container.node);
  container.node.remove();
  this.list.splice(index, 1);
  this.rebuildElements();
//  console.log(this.list, this.elems);
};

//------------------------------------------------------------------------------

FormDynamic.prototype.up = function(index, container)
{
//  console.log("up", this, this.conf(), index, container);
  if(index === 0)
  {
    return;
  }
  this.swap(this.list[index].node, this.list[index - 1].node);
  var form = this.list[index];
  this.list[index] = this.list[index - 1];
  this.list[index - 1] = form;
  this.rebuildElements();
//  console.log(this.list, this.elems);
};

//------------------------------------------------------------------------------

FormDynamic.prototype.down = function(index, container)
{
//  console.log("down", this, this.conf(), index, container);
  if(index === this.list.length - 1)
  {
    return;
  }
  this.swap(this.list[index].node, this.list[index + 1].node);
  var form = this.list[index];
  this.list[index] = this.list[index + 1];
  this.list[index + 1] = form;
  this.rebuildElements();
//  console.log(this.list, this.elems);
};

//------------------------------------------------------------------------------

FormDynamic.prototype.get = function(elements)
{
  var elems = elements;
  if(arguments.length === 0)
  {
    elems = this.elems;
  }
  
//  var res = {};
//  
//  for(var k in elems)
//  {
//    res[k] = elems[k].value();
//  }
  var res = [];
  
  for(var i = 0; i < this.list.length; i++)
  {
    res[i] = this.list[i].value();
  }
  
  return res;
};

//------------------------------------------------------------------------------

FormDynamic.prototype.set = function(values)
{
//  if(typeof values !== "object" || Array.isArray(values))
  if(!Array.isArray(values))
  {
    throw new TypeError();
  }
  
  this.rebuild();
//  var keys = Object.getOwnPropertyNames(values);
//  for(var i = 0; i < keys.length; i++)
//  {
//    this.build(this.conf());
//  }
  for(var i = 0; i < values.length; i++)
  {
    this.build(this.conf());
    this.list[i].value(values[i]);
  }
  this.rebuildElements();
  
//  for(var k in values)
//  {
//    this.elems[k].value(values[k]);
//  }
};

//------------------------------------------------------------------------------

//Form.prototype.reset = function(values)
//{
//  var struct = this.struct();
//  for(var i = 0; i < struct.length; i++)
//  {
//    var elemStruct = struct[i];
//    if(typeof elemStruct !== "object" || typeof elemStruct.name !== "string")
//    {
//      throw new TypeError();
//    }
//    
//    var elem = this.list[i];
//    if(elemStruct.type === "form" && Array.isArray(elemStruct.struct))
//    {
//      elem.reset();
//    }
//    
//    if(typeof elemStruct.value !== "undefined")
//    {
//      elem.value(elemStruct.value);
//    }
//    else
//    {
//      elem.value("");
//    }
//  }
//};

//------------------------------------------------------------------------------
