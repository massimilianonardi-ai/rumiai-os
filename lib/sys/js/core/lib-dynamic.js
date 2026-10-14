(function()
{

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Queue()
{
  this.queue = [];
}

//------------------------------------------------------------------------------

Queue.prototype.add = function(callback)
{
  var _callback = callback;
  
  if(typeof _callback === "undefined" || _callback === null)
  {
    _callback = function(){};
  }
  
  if(typeof _callback !== "function")
  {
    throw new TypeError();
  }
  
  var _this = this;
  var obj = {callback: _callback};
  this.queue.push(obj);
  return function()
  {
    obj.context = this;
    obj.args = arguments;
    obj.ready = true;
    _this.exec();
  };
};

//------------------------------------------------------------------------------

Queue.prototype.exec = function()
{
  var c = this.queue[0];
  if(typeof c !== "undefined" && c.ready === true)
  {
//    this.queue.splice(0, 1);
    if(this.queue.splice(0, 1)[0] !== c)
    {
      console.log("thread race condition!");
      throw new ReferenceError();
    }
    try
    {
      c.callback.apply(c.context, c.args);
    }
    catch(error)
    {
      console.error(error);
    }
    this.exec();
  }
  
  return this;
};

//------------------------------------------------------------------------------
// Functions -------------------------------------------------------------------
//------------------------------------------------------------------------------

function ajax(url, responseCallback, responseCallbackContext, params, parse, method, async, type, mime, headers, loadstartDownload, progressDownload, abortDownload, errorDownload, timeoutDownload, loadDownload, loadendDownload, loadstartUpload, progressUpload, abortUpload, errorUpload, timeoutUpload, loadUpload, loadendUpload)
{
  if(typeof url !== "string")
  {
    throw new TypeError();
  }
  
  var _method = "GET";
  if(typeof method !== "undefined" && method !== null)
  {
    if(typeof method !== "string")
    {
      throw new TypeError();
    }
    else
    {
      _method = method.toUpperCase();
      if(!(method === "GET" || method === "POST" || method === "PUT" || method === "DELETE" || method === "HEAD" || method === "CONNECT" || method === "TRACE" || method === "OPTIONS" || method === "PATCH"))
      {
        throw new SyntaxError();
      }
    }
  }
  
  var _paramsURL = "";
  var _paramsBody = undefined;
  if(_method === "GET" || _method === "HEAD" || _method === "DELETE" || _method === "CONNECT" || _method === "TRACE")
  {
    if(!(Object.getPrototypeOf(params) === Object.prototype || Object.getPrototypeOf(params) === null))
    {
      throw new TypeError();
    }
    
    for(var k in params)
    {
      var value = params[k];
      
      if(typeof value === "undefined" || typeof value === "boolean" || typeof value === "number" || typeof value === "string" || value === null)
      {
      }
      else if(typeof value === "object")
      {
        value = JSON.stringify(value);
      }
      else
      {
        throw new TypeError();
      }
      
      _paramsURL += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(value);
    }
    
    if(0 < _paramsURL.length)
    {
      _paramsURL = "?" + _paramsURL.substr(1);
    }
  }
  else
  {
    if(typeof params !== "undefined" && params !== null && (Object.getPrototypeOf(params) === Object.prototype || Object.getPrototypeOf(params) === null))
    {
      var fd = new FormData();
      for(var k in params)
      {
        var value = params[k];

        if(typeof value === "undefined" || typeof value === "boolean" || typeof value === "number" || typeof value === "string" || value === null)
        {
          fd.append(k, value);
        }
        else if(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null || Object.getPrototypeOf(value) === Array.prototype)
        {
          fd.append(k, JSON.stringify(value));
        }
        else if(value instanceof ArrayBuffer)
        {
          fd.append(k, new Blob([value]));
        }
        else if(typeof value === "object")
        {
          fd.append(k, value);
        }
        else
        {
          throw new TypeError();
        }
      }
      
      _paramsBody = fd;
    }
    else
    {
      _paramsBody = params;
    }
  }
  
  var xhr = new XMLHttpRequest();
  
  if(typeof loadstartDownload === "function")
  {
    xhr.onloadstart = loadstartDownload;
  }
  
  if(typeof progressDownload === "function")
  {
    xhr.onprogress = progressDownload;
  }
  
  if(typeof abortDownload === "function")
  {
    xhr.onabort = abortDownload;
  }
  
  if(typeof errorDownload === "function")
  {
    xhr.onerror = errorDownload;
  }
  
  if(typeof timeoutDownload === "function")
  {
    xhr.ontimeout = timeoutDownload;
  }
  
  if(typeof loadDownload === "function")
  {
    xhr.onload = loadDownload;
  }
  
  if(typeof loadendDownload === "function")
  {
    xhr.onloadend = loadendDownload;
  }
  
  if(typeof loadstartUpload === "function")
  {
    xhr.upload.onloadstart = loadstartUpload;
  }
  
  if(typeof progressUpload === "function")
  {
    xhr.upload.onprogress = progressUpload;
  }
  
  if(typeof abortUpload === "function")
  {
    xhr.upload.onabort = abortUpload;
  }
  
  if(typeof errorUpload === "function")
  {
    xhr.upload.onerror = errorUpload;
  }
  
  if(typeof timeoutUpload === "function")
  {
    xhr.upload.ontimeout = timeoutUpload;
  }
  
  if(typeof loadUpload === "function")
  {
    xhr.upload.onload = loadUpload;
  }
  
  if(typeof loadendUpload === "function")
  {
    xhr.upload.onloadend = loadendUpload;
  }
  
  xhr.onreadystatechange = function()
  {
    switch(xhr.readyState)
    {
      case XMLHttpRequest.UNSENT:
        // request not initialized
        break;
      
      case XMLHttpRequest.OPENED:
        // connection established
        break;
      
      case XMLHttpRequest.HEADERS_RECEIVED:
        // request received
        break;
      
      case XMLHttpRequest.LOADING:
        // processing request
        break;
      
      case XMLHttpRequest.DONE:
        // response is ready
        if(typeof responseCallback === "function")
        {
          var request = 
          {
            url: url,
            responseCallback: responseCallback,
            responseCallbackContext: responseCallbackContext,
            method: method,
            _method: _method,
            headers: headers,
            params: params,
            _paramsURL: _paramsURL,
            _paramsBody: _paramsBody,
            parse: parse,
            type: type,
            mime: mime,
            loadstartDownload: loadstartDownload,
            progressDownload: progressDownload,
            loadDownload: loadDownload,
            loadendDownload: loadendDownload,
            loadstartUpload: loadstartUpload,
            progressUpload: progressUpload,
            loadUpload: loadUpload,
            loadendUpload: loadendUpload,
            abortDownload: abortDownload,
            errorDownload: errorDownload,
            timeoutDownload: timeoutDownload,
            abortUpload: abortUpload,
            errorUpload: errorUpload,
            timeoutUpload: timeoutUpload
          };
          var response = xhr.response;
          var responseError = null;
          var _mime = (xhr.getResponseHeader("Content-Type") || "").split(";")[0];
          if(!(typeof parse === "undefined" || parse === null || parse === "" || typeof response === "undefined" || response === null || response === ""))
          {
            var data = response;
            try
            {
              if(parse === "json" || (parse === "mime" && _mime === "application/json"))
              {
                data = JSON.parse(response);
              }
              else if(parse === "xml" || (parse === "mime" && _mime === "application/xml"))
              {
                data = (new DOMParser()).parseFromString(response, "application/xml");
              }
              else if(parse === "binary")
              {
                var size = response.length;
                data = new ArrayBuffer(size * 2);
                var abv = new Uint16Array(data);
                for(var i = 0; i < size; i++)
                {
                  abv[i] = response.charCodeAt(i);
                }
              }
              else
              {
                throw new TypeError();
              }
            }
            catch(e)
            {
              data = null;
              responseError = e;
            }
            response = data;
          }
          responseCallback.call(responseCallbackContext || this, response, _mime, responseError, request, xhr.status, xhr.statusText, xhr.getAllResponseHeaders(), xhr);
        }
        break;
      
      default:
        break;
    }
  };
  
  if(typeof async === "boolean")
  {
    xhr.open(_method, url + _paramsURL, async);
  }
  else
  {
    xhr.open(_method, url + _paramsURL);
  }
  
  if(typeof type === "string" && type !== "")
  {
    xhr.responseType = type;
  }
  
  if(typeof mime === "string")
  {
    xhr.overrideMimeType(mime);
  }
  
  if(typeof headers === "object")
  {
    for(k in headers)
    {
      xhr.setRequestHeader(k, headers[k]);
    }
  }
  
  if(typeof _paramsBody !== "undefined" && _paramsBody !== null)
  {
    xhr.send(_paramsBody);
  }
  else
  {
    xhr.send();
  }
}

//------------------------------------------------------------------------------

function responseCallback(_success, _error, _completed, _response, _unauthorized, _forbidden)
{
  return function(response, responseMime, responseError, request, status, statusText, responseHeaders, xhr)
  {
//  console.log("response", this, arguments);
    
    if(typeof _response === "function") _response.call(this, new Event("response"), response, responseMime, responseError, request, status, statusText, responseHeaders, xhr);
//    if(responseError instanceof Error)
    if(typeof responseError !== "undefined" && responseError !== null)
    {
//console.log("response-parse-error", response, xhr.response, xhr);
//      if(typeof _error === "function") _error.apply(this, arguments);
      if(typeof _error === "function") _error.call(this, new ErrorEvent("ResponseParseError"), response, responseMime, responseError, request, status, statusText, responseHeaders, xhr);
    }
    else if((200 <= status) && (status <= 299))
    {
//      if(typeof _success === "function") _success.call(this, data);
      if(typeof _success === "function") _success.apply(this, arguments);
    }
    else if(status === 401)
    {
      if(typeof _unauthorized === "function") _unauthorized.apply(this, arguments);
    }
    else if(status === 403)
    {
      if(typeof _forbidden === "function") _forbidden.apply(this, arguments);
    }
    else
    {
//      if(typeof _error === "function") _error.apply(this, arguments);
      if(typeof _error === "function") _error.call(this, new ErrorEvent("HttpError"), response, responseMime, responseError, request, status, statusText, responseHeaders, xhr);
    }
    
    if(typeof _completed === "function") _completed.apply(this, arguments);
  };
}

//------------------------------------------------------------------------------

Queue.prototype.load = function(url, callback, parse)
{
  var error = function()
  {
    console.error("ERROR");
  };
  
  ajax(url, responseCallback(this.add(callback), error, null, null, error, error), {}, null, parse, "POST", false, null, null, null, null, null, error, error, error, null, null, null, null, error, error, error, null, null);
};

//------------------------------------------------------------------------------

function loadModulesDynamically(path, modulesFile, callback)
{
  var source_dir = path + "/";
  
  var queue = new Queue();
  
  var modules;
  queue.load(source_dir + modulesFile, function(data){modules = data;}, "json");
  
  var code = "";
  var getModulesCode = function(modules)
  {
    if(modules.modules)
    {
      if(modules.name && typeof modules.name === "string" && modules.name !== "")
      {
        queue.add(function()
        {
          var code_ns_start = "";
          code_ns_start += "\nvar " + modules.name + " = " + modules.name + " || this." + modules.name + " || {};\n";
          code_ns_start += "\nthis." + modules.name + " = " + modules.name + ";\n";
          code_ns_start += "\n" + modules.name + " = (function ()\n{\n";
          code_ns_start += "\nfor(var $_sub_module_iterator in " + modules.name + "){eval(\"var \" + $_sub_module_iterator + \" = " + modules.name + "[$_sub_module_iterator];\");}\n";
          code += code_ns_start;
        })();
      }
      
      var ma = modules.modules;
      for(var i = 0; i < ma.length; i++)
      {
        getModulesCode(ma[i]);
      }
      
      if(modules.name && typeof modules.name === "string" && modules.name !== "")
      {
        queue.add(function()
        {
          var code_ns_end = "";
          code_ns_end += "\nreturn this;\n";
          code_ns_end += "\n}.call(" + modules.name + "));\n";
          code += code_ns_end;
        })();
      }
      
      if(!modules.name)
      {
        queue.add(function()
        {
//          console.log("code", code);
          
          if(typeof callback === "function")
          {
            callback(code);
          }
          else
          {
            eval(code);
          }
        })();
      }
    }
    else if(modules.file)
    {
      queue.load(source_dir + modules.file, function(data)
      {
        code += data;
        if(modules.symbols && typeof modules.symbols === "string" && modules.symbols !== "")
        {
          var symbolsArray = modules.symbols.split(",");
          for(var i = 0; i < symbolsArray.length; i++)
          {
            code += "this." + symbolsArray[i] + " = " + symbolsArray[i] + ";\n";
          }
        }
      });
    }
  };
  
  queue.add(function(){getModulesCode(modules);})();
}

//------------------------------------------------------------------------------

function replaceModulesDynamically(path, modulesFile, libraryElement, defaultModulesFile, tag)
{
  var source_dir = "";
  
  if(typeof path === "string")
  {
    source_dir = path;
  }
  else if(document.currentScript === null)
  {
    source_dir = location.pathname;
  }
  else
  {
    source_dir = document.currentScript.src.replace(location.origin, "").replace(new RegExp("\/([^/]+)$"), "");
  }
  
  var file = defaultModulesFile;
  if(typeof modulesFile === "string")
  {
    file = modulesFile;
  }
  
  if(typeof libraryElement === "string")
  {
    var element = document.getElementById(libraryElement);
    
    if(element === null)
    {
      var elements = document.getElementsByTagName(tag === "style" ? "link" : tag);
      for(var i = 0; i < elements.length; i++)
      {
        if(elements[i].href === libraryElement || elements[i].href === location.origin + libraryElement)
        {
          element = elements[i];
        }
      }
    }
    
    element.parentNode.removeChild(element);
  }
  else if(typeof libraryElement !== "undefined" && libraryElement !== null)
  {
    libraryElement.parentNode.removeChild(libraryElement);
  }
  
  loadModulesDynamically(source_dir, file, function(code)
  {
    var element = document.createElement(tag);
    document.head.appendChild(element);
    element.innerHTML = code;
  });
}

//------------------------------------------------------------------------------

function loadJSLibraryDynamically(path, jsModulesFile, jsElement)
{
  replaceModulesDynamically(path, jsModulesFile, jsElement, "modules_js.json", "script");
}

//------------------------------------------------------------------------------

function loadCSSLibraryDynamically(path, cssModulesFile, cssElement)
{
  replaceModulesDynamically(path, cssModulesFile, cssElement, "modules_css.json", "style");
}

//------------------------------------------------------------------------------

function loadLibraryDynamically(path, jsModulesFile, cssModulesFile, jsElement, cssElement)
{
  loadJSLibraryDynamically(path, jsModulesFile, jsElement);
  loadCSSLibraryDynamically(path, cssModulesFile, cssElement);
}

//------------------------------------------------------------------------------

loadLibraryDynamically();
})();
