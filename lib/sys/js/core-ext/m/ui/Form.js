
var merge = m.util.merge;

// todo dynamic replicate the form with rules how many replicas at start, how to index id the array elements
// subforms as array and not only as subobject
// most advanced is a mix array/object where items can have name OR index (eg. address["home"], address["work"], address[0], address[1], ...)
// implement as pre-form + dynamic-form + post-form -> NB value is an object with a special key (id of the sub-dynamic-form (autogen if null)) that has an array
// easy with plain object with "$m" subobject with functions to access length push etc.
// on first build only one/none sub-form into a sub-div with add/remove buttons, on set regenerate each sub-form for each array element
// an add button for whole form-dynamic, one remove button for each sub-form
// 
// conditional input is logically typical for map-input but could be extended
// change in conf/data/store somewhere must trigger conf/data/store somewhere else
// 
// progressive/wizard forms with arrows/tabs/bradcrumb navigation
// 
// form element label, full icons, hint, required/optional, validation icons/colors, validation messages, all translated, css classes for dom struct (list count, nest count, etc.)
// input is something that enters a value and generally does not interfere with ui/workflow
// control is something that controls ui/workflow
// 
// think about conditional input (conditional select-lists, radio buttons for alternative sub-sections, etc.)
// select translations??? value as id + translatable text OR enum with fixed text (the latter is hash/signature friendly, the former not so much)???
// struct/schema references even cyclic vs hash/signature
// schema ref in every object
// objects refs
// files as base64 text OR hash refs??? -> same as object refs since objects are saved as files and hashed
// 
// 
// 
// workflow:
// acts on info=doc=json+files through states
// one/many docs enter a state from one/many arrow-flows and one/many docs exits from each arrow-flow corresponding to a state trigger
// workflow-graph: states connected with directional arrows that represents the state change (on every arrow flows (is associated) one/many docs)
// out arrows are all and only possible states that can change from present one
// ui to list all states allowed to user with list of current docs
// ui to specific state and ui to specific doc
// state has associated enabled user-roles and enabled-in-schema-docs and enabled-schema-out-docs
// 
// wf-app: menu + form. menu is all his group for such app, alerts, messages and or list of other users for supeusers, etc.
// standard menu is generated automatically, but custom one can be provided
// 
// bpmn service: is the interface against all the logic
// conf service returns the list of confs for all current profiles, but confs should not be used for app logic
// bpmn-srv commands: applist, app, execute-task, etc.
// applist gives complete list of apps allowed for current profiles
// app gives the app.js (also other js, css, mod, lib, conf, etc.) requested only if allowed by current profiles
//

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Form()
{
  return Form.Class.construct(this, arguments);
}

Class(Form)
//.inherit(Element)
.inherit(ElementConfInputStore)
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
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Form.prototype.construct = function()
{
};

//------------------------------------------------------------------------------

Form.prototype.build = function(struct)
{
  if(!(struct && struct.constructor && struct.constructor.name === "Array"))
//  if(!Array.isArray(struct))
  {
    throw new TypeError();
  }
  
  var count = 0;
  
  for(var i = 0; i < struct.length; i++)
  {
    var elemStruct = struct[i];
    if(typeof elemStruct !== "object")
    {
      throw new TypeError();
    }
    
    var elem;
    if(Array.isArray(elemStruct))
    {
      elem = new FormDynamic().conf(elemStruct);
      merge(this.elems, elem.elems, true, true);
    }
    else if(typeof elemStruct._class === "string")
    {
      elem = new ui[elemStruct._class]();
      
      for(var k in elemStruct)
      {
        if(typeof elem[k] === "function")
        {
          elem[k](elemStruct[k]);
        }
        else
        {
          elem[k] = elemStruct[k];
        }
      }
    }
    else
    {
      throw new TypeError();
    }
    
    elem.parent(this);
    this.list.push(elem);
    this.elems[elemStruct.id || count++] = elem;
//    this.elems[elemStruct.id || (this.list.length - 1)] = elem;
//    if(typeof elemStruct.id !== "undefined")
//    {
//      this.elems[elemStruct.id] = elem;
//    }
  }
};

//------------------------------------------------------------------------------

Form.prototype.get = function(elements)
{
  var elems = elements;
  if(arguments.length === 0)
  {
    elems = this.elems;
  }
  
  var res = {};
  
  for(var k in elems)
  {
    res[k] = elems[k].value();
  }
  
  return res;
};

//------------------------------------------------------------------------------

Form.prototype.set = function(elems)
{
  if(typeof elems !== "object" || Array.isArray(elems))
  {
    throw new TypeError();
  }
  
  for(var k in elems)
  {
    this.elems[k].value(elems[k]);
  }
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
