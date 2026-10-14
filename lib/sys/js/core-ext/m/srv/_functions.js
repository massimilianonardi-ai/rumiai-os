
//------------------------------------------------------------------------------

function ajax(url, responseCallback, responseCallbackContext, params, parse, method, async, type, mime, headers, loadstartDownload, progressDownload, abortDownload, errorDownload, timeoutDownload, loadDownload, loadendDownload, loadstartUpload, progressUpload, abortUpload, errorUpload, timeoutUpload, loadUpload, loadendUpload)
{
  if(1 === arguments.length)
  {
    var args = arguments[0];
    if(typeof args === "string")
    {
      return _ajax(args);
    }
    else if(typeof args === "object")
    {
      return _ajax(args.url, args.responseCallback, args.responseCallbackContext, args.params, args.parse, args.method, args.async, args.type, args.mime, args.headers, args.loadstartDownload, args.progressDownload, args.abortDownload, args.errorDownload, args.timeoutDownload, args.loadDownload, args.loadendDownload, args.loadstartUpload, args.progressUpload, args.abortUpload, args.errorUpload, args.timeoutUpload, args.loadUpload, args.loadendUpload);
    }
    else
    {
      throw new TypeError();
    }
  }
  else
  {
    return _ajax.apply(this, arguments);
//    return _ajax.call(this, url, responseCallback, responseCallbackContext, params, parse, method, type, mime, headers, loadstartDownload, progressDownload, abortDownload, errorDownload, timeoutDownload, loadDownload, loadendDownload, loadstartUpload, progressUpload, abortUpload, errorUpload, timeoutUpload, loadUpload, loadendUpload);
  }
}

//------------------------------------------------------------------------------

function _ajax(url, responseCallback, responseCallbackContext, params, parse, method, async, type, mime, headers, loadstartDownload, progressDownload, abortDownload, errorDownload, timeoutDownload, loadDownload, loadendDownload, loadstartUpload, progressUpload, abortUpload, errorUpload, timeoutUpload, loadUpload, loadendUpload)
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
    if(Object.getPrototypeOf(params) === Object.prototype || Object.getPrototypeOf(params) === null)
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
