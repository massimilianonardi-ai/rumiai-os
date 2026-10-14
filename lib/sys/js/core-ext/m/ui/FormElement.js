//------------------------------------------------------------------------------
// Functions -------------------------------------------------------------------
//------------------------------------------------------------------------------

function uploadFiles(path, files, success, error)
{
  console.log("files", files);
}

function uploadFile(path, file, success, error)
{
  if(typeof success !== "function")
  {
    success = function(){};
  }
  
  if(typeof error !== "function")
  {
    error = function(){};
  }
  
  var fd = new FormData();
  fd.append("data", file, "");
  new m.service.Data().source("web.data.file").path(path).params(fd).success(success).error(error).create();
}

function uploadFile2(path, file, success, error)
{
  if(typeof success !== "function")
  {
    success = function(){};
  }
  
  if(typeof error !== "function")
  {
    error = function(){};
  }
  
  var fr = new FileReader();
  
  fr.onload = function(event)
  {
//    var fileData = event.target.result;
    var fileData = fr.result;
    new m.service.Data().source("web.data.file").path(path).params({data: fileData}).success(success).error(error).create();
  };
  
  fr.onerror = error;
  
  fr.readAsBinaryString(file);
}



//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function FormElement()
{
  return FormElement.Class.construct(this, arguments);
}

Class(FormElement)
.inherit(Element)
.compose("_label", undefined)
.compose("_node", undefined)
.compose("_hidden", undefined)
.property("label")
.setter("label", function(value){if(typeof value === "string"){this._label.textContent = value; return value;} else {throw new TypeError();}})
.property("placeholder")
.setter("placeholder", function(value){this._node.placeholder = value; this._hidden.placeholder = value; return value;})
.property("type")
.setter("type", function(value){if(this.complexType(value)){return value;} else if(typeof value === "string"){this._node.type = value; return value;} else {throw new TypeError();}})
.property("value")
.getter("value", function(value){return this._node._value || null;})
.setter("value", function(value){this._node.value = value; this._node._value = value; this._hidden.value = value; return value;})
.property("readonly")
.getter("readonly", function(value){return this._node.readOnly;})
.setter("readonly", function(value){this._node.readOnly = value; return value;})
.property("files")
.getter("files", function(value){return this._hidden.files;})
.setter("files", function(value){throw new TypeError();})
.property("success")
.setter("success", function(value){if(typeof value === "function"){return value;} else {throw new TypeError();}})
.properties()
;

FormElement.uploadFile = uploadFile;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

FormElement.prototype.construct = function()
{
  var cname = this.constructor.name;
  if(cname !== "Element")
  {
    this.classes.add(cname);
  }
  this.classes.add(cname);
  
  this._label = document.createElement("label");
  this._node = document.createElement("input");
  this._hidden = document.createElement("input");
  
  this._hidden.style.display = "none";
  this._hidden.onchange = function(event){this.previousElementSibling.value = this.value;};
//  this._hidden.onchange = function(event){this.previousElementSibling.value = this.value; this.parentNode.dispatchEvent(event);};
  
  this.node.appendChild(this._label);
  this.node.appendChild(this._node);
  this.node.appendChild(this._hidden);
};

//------------------------------------------------------------------------------

FormElement.prototype.complexType = function(type)
{
  m.global.log.debug(this, arguments);
  
  var iscomplex = true;
  var _this = this;
  
  if(type === "file")
  {
    this._node.type = "text";
    this._hidden.type = "file";
    this._node.onclick = function(){this.nextElementSibling.click();};
    this._hidden.onchange = function(){_this.fileUpload(this.files[0]);};
  }
  else if(type === "camera.image")
  {
    this._node.type = "text";
    this._hidden.type = "file";
    this._hidden.node.accept = "image/*;capture=camera";
    this._node.onclick = function(){this.nextElementSibling.click();};
    this._hidden.onchange = function(){_this.fileUpload(this.files[0]);};
  }
//  else if(type === "textarea")
//  {
//    this._node.type = "text";
//    this._hidden.type = "file";
//    this._hidden.node.accept = "image/*;capture=camera";
//    this._node.onclick = function(){this.nextElementSibling.click();};
//    this._hidden.onchange = function(){_this.fileUpload(this.files[0]);};
//  }
  else
  {
    iscomplex = false;
    this._node.type = "text";
    this._hidden.type = "text";
    this._node.onclick = null;
    this._hidden.onchange = null;
    this._node.onchange = function(){this.nextElementSibling.value = this.value; this._value = this.value;};
  }
  
  return iscomplex;
};

//------------------------------------------------------------------------------

FormElement.prototype.fileUpload = function(file)
{
  m.global.log.debug(this, arguments);
  
  var value = new Date().toISOString().replace(/[-T:]/g, "/") + "_" + Math.random().toString().substring(2);
  var path = "file/.tmp/" + value;
  var dir = path.replace(/\/[^\/]*$/g, "");
//  path = this.path || path;
  if(this.path)
  {
    path = this.path + "" + Math.random().toString().substring(2);
  }
  console.log(path, dir);
  
  var _this = this;
  
  var fufunc = function()
  {
    var fd = new FormData();
    fd.append("data", file, "");
    new m.service.Data().source("web.app.file").path(path).params(fd)
    .send(function(computable, loaded, total)
    {
//      console.log("file creation send", arguments, computable, loaded, total);
      if(computable)
      {
        _this._node.value = Math.floor(loaded / total * 100) + "%";
        _this._node.blur();
      }
    })
    .success(function()
    {
      console.log("file creation success");
      _this._node.value = "SALVATO!";
      _this._node._value = value;
      _this._node.blur();
      if(typeof _this.success() === "function")
      {
        _this.success()();
      }
    })
    .error(function()
    {
      console.log("file creation error");
      _this._node.value = "ERRORE!!!";
      _this._node.blur();
    })
    .create();
  };
  
  fufunc();
//  new m.service.Data().source("web.app.file").path(dir)
//  .success(function()
//  {
//    console.log("dir creation success");
//    fufunc();
//  })
//  .error(function()
//  {
//    console.log("dir creation error");
//  })
//  .write();
  
//  new m.service.Data().source("web.data.dir").path(dir)
//  .success(function()
//  {
//    console.log("dir creation success");
//    fufunc();
//  })
//  .error(function()
//  {
//    console.log("dir creation error");
//    fufunc();
//  })
//  .create();
};

//------------------------------------------------------------------------------

FormElement.prototype.fileUpload_ = function(file)
{
  m.global.log.debug(this, arguments);
  
  var value = new Date().toISOString().replace(/[-T:]/g, "/") + "_" + Math.random().toString().substring(2);
  var path = "file/.tmp/" + value;
  var dir = path.replace(/\/[^\/]*$/g, "");
  console.log(path, dir);
  
  var _this = this;
  
  var fufunc = function()
  {
    var fd = new FormData();
    fd.append("data", file, "");
    new m.service.Data().source("web.data.file").path(path).params(fd)
    .send(function(computable, loaded, total)
    {
//      console.log("file creation send", arguments, computable, loaded, total);
      if(computable)
      {
        _this._node.value = Math.floor(loaded / total * 100) + "%";
        _this._node.blur();
      }
    })
    .success(function()
    {
      console.log("file creation success");
      _this._node.value = "SALVATO!";
      _this._node._value = value;
      _this._node.blur();
    })
    .error(function()
    {
      console.log("file creation error");
      _this._node.value = "ERRORE!!!";
      _this._node.blur();
    })
    .create();
  };
  
  new m.service.Data().source("web.data.dir").path(dir)
  .success(function()
  {
    console.log("dir creation success");
    fufunc();
  })
  .error(function()
  {
    console.log("dir creation error");
  })
  .write();
  
//  new m.service.Data().source("web.data.dir").path(dir)
//  .success(function()
//  {
//    console.log("dir creation success");
//    fufunc();
//  })
//  .error(function()
//  {
//    console.log("dir creation error");
//    fufunc();
//  })
//  .create();
};

//------------------------------------------------------------------------------
