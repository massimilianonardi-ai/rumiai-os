//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function File()
{
  return File.Class.construct(this, arguments);
}

Class(File)
.inherit(ElementConfInputStore)
.property("path", "")
.property("conf", {locale: "en"})
.event("ConfChanged", function(value, prev)
{
  this.rebuild();
})
.property("text", "Upload")
.property("accept")
.setter("accept", function(value)
{
  this._input.accept = value;
  
  return value;
})
.property("multiple")
.setter("multiple", function(value)
{
  if(value === true)
  {
    this._input.setAttribute("multiple", "");
  }
  else
  {
    this._input.removeAttribute("multiple");
  }
  
  return value;
})
.property("auto")
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

File.prototype.construct = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

File.prototype.update = function()
{
//  this.rebuild();
};

//------------------------------------------------------------------------------

File.prototype.rebuild = function()
{
  console.log("rebuild");
  
  this.html("");
  
  this._label = document.createElement("label");
  this._label.style.display = "none";
  this.node.appendChild(this._label);
  this.label(this.label());
  
  this._file = document.createElement("label");
  this._file.classList.add("button");
  this._file.classList.add("upload");
  this._file.innerText = this.text();
  this.node.appendChild(this._file);
  
  this._icon = document.createElement("i");
  this._file.appendChild(this._icon);
  
  this._hidden = document.createElement("div");
  this._file.appendChild(this._hidden);
  
  this._input = document.createElement("input");
  this._input.type = "file";
  this._hidden.appendChild(this._input);
  
  this._break = document.createElement("div");
  this._break.classList.add("flex-break-row");
  this.node.appendChild(this._break);
  
  this._empty = document.createElement("div");
  this._empty.classList.add("empty");
  this.node.appendChild(this._empty);
  
  this._list = document.createElement("div");
//  this._list.classList.add("upload");
  this._list.classList.add("list");
  this.node.appendChild(this._list);
  
//  this.input.accept = "image/png, image/jpeg, image/gif";
//  this._node.onclick = function(){this.nextElementSibling.click();};
//  this._hidden.onchange = function(){_this.fileUpload(this.files[0]);};
  var _this = this;
  this._input.onchange = function()
  {
    _this.filesUpload(this.files);
    this.value = "";
  };
};

//------------------------------------------------------------------------------

File.prototype.filesUpload = function(files)
{
  console.log(files);
  
  for(var i = 0; i < files.length; i++)
  {
    console.log(files[i]);
    
    this.fileUploadButton(files[i]);
  }
};

//------------------------------------------------------------------------------

File.prototype.fileUploadButton = function(file)
{
  var _this = this;
  
  var thumbnail = document.createElement("div");
  thumbnail.classList.add("thumbnail");
  this._list.appendChild(thumbnail);
  
  var cancel = document.createElement("i");
  cancel.classList.add("button");
  cancel.classList.add("icon");
  cancel.classList.add("cancel");
  cancel.classList.add("icon-cancel");
  cancel.addEventListener("click", function()
  {
    // todo probably a confirm dialog would be appropriated
    _this._list.removeChild(thumbnail);
  });
  thumbnail.appendChild(cancel);
  
  var label = document.createElement("label");
  label.classList.add("name");
  label.innerText = file.name;
  thumbnail.appendChild(label);
  
  var upload = document.createElement("i");
  upload.classList.add("button");
  upload.classList.add("icon");
  upload.classList.add("upload");
  upload.classList.add("icon-upload-cloud");
  upload.addEventListener("click", function()
  {
    _this.fileUpload(file, uploadSuccessCallback, uploadProgressCallback, uploadErrorCallback);
  });
  thumbnail.appendChild(upload);
  
  var uploadSuccessCallback = function(file)
  {
    console.log("uploadSuccessCallback");
    // clear/destroy thumbnail div and create download button passing the file-data-service-object and thumbnail div to be reused
    thumbnail.innerHTML = "";
    _this.fileDownloadButton(file, thumbnail);
  };
  
  var uploadProgressCallback = function(progress)
  {
    console.log("uploadProgressCallback", progress);
  };
  
  var uploadErrorCallback = function()
  {
    console.log("uploadErrorCallback");
  };
  
  if(this.auto() === true)
  {
    this.fileUpload(file, uploadSuccessCallback, uploadProgressCallback, uploadErrorCallback);
  }
};

//------------------------------------------------------------------------------

File.prototype.fileUpload = function(file, uploadSuccessCallback, uploadProgressCallback, uploadErrorCallback)
{
  var name = new Date().getTime() + "_" + Math.random().toString().substring(2);
  var path = this.path() + "/" + name;
  var dir = path.replace(/\/[^\/]*$/g, "");
console.log(path, dir);
  
  var fd = new FormData();
  fd.append("data", file, "");
  new m.store.Store().path(path).params(fd)
  .send(function(computable, loaded, total)
  {
    if(computable)
    {
      uploadProgressCallback(loaded / total);
    }
  })
  .success(function()
  {
    uploadSuccessCallback(this);
  })
  .error(uploadErrorCallback)
  .command("write")
  .exec();
};

//------------------------------------------------------------------------------

File.prototype.fileUpload___ = function(file, uploadSuccessCallback, uploadProgressCallback, uploadErrorCallback)
{
//  var name = new Date().toISOString().replace(/[-T:]/g, "/") + "_" + Math.random().toString().substring(2);
  var name = new Date().getTime() + "_" + Math.random().toString().substring(2);
//  var path = "file/.tmp/" + value;
//  var path = this.path() + "/" + name;
  var path = this.path().replace("read", "write") + "/" + name;
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
        uploadProgressCallback(loaded / total);
      }
    })
    .success(function(){uploadSuccessCallback(this);})
    .error(uploadErrorCallback)
    .create();
  };
  
  fufunc();
  
//  new m.service.Data().source("web.data.dir").path(dir)
//  .success(function()
//  {
//    console.log("dir creation success");
//    fufunc();
//  })
//  .error(function()
//  {
//    console.log("dir creation error");
//    // todo warn and add remove mini button
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

File.prototype.fileDownloadButton = function(fileService, elem)
{
  var _this = this;
  
  var thumbnail = elem;
  if(typeof thumbnail === "undefined")
  {
    thumbnail = document.createElement("div");
    thumbnail.classList.add("thumbnail");
    this._list.appendChild(thumbnail);
  }
  else
  {
    thumbnail.innerHTML = "";
  }
  
  var remove = document.createElement("i");
  remove.classList.add("button");
  remove.classList.add("icon");
  remove.classList.add("delete");
  remove.classList.add("icon-cancel");
  remove.addEventListener("click", function()
  {
    // todo probably a confirm dialog would be appropriated
    fileService.params({destroy: true}).destroy();
    _this._list.removeChild(thumbnail);
  });
  thumbnail.appendChild(remove);
  
  var label = document.createElement("label");
  label.classList.add("name");
  label.innerText = fileService.path().replace(/.*\//g, "");
  thumbnail.appendChild(label);
  
  var download = document.createElement("i");
  download.classList.add("button");
  download.classList.add("icon");
  download.classList.add("download");
  download.classList.add("icon-download-cloud");
  download.addEventListener("click", function()
  {
//    window.open(file.path());
    a.click();
  });
  var a = document.createElement("a");
  // todo get proper file name or at least real file id/hash
  a.setAttribute("download", fileService.path().replace(/.*\//g, ""));
  a.href = fileService.path().replace("write", "read");
  download.appendChild(a);
  thumbnail.appendChild(download);
};

//------------------------------------------------------------------------------
