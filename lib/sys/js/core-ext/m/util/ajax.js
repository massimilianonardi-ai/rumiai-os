
function ajax(url, params, method, type, async, response, error, abort, timeout, send, receive, username, password)
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
      return _ajax(args.url, args.params, args.method, args.type, args.async, args.response, args.error, args.abort, args.timeout, args.send, args.receive, args.username, args.password);
    }
    else
    {
      throw new TypeError();
    }
  }
  else
  {
    return _ajax.apply(this, arguments);
  }
}

function ajaxAdvanced(url, params, method, type, async, response, error, abort, timeout, send, receive, username, password, parse, success, httpError, authentication, unauthorized)
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
      return _ajax(args.url, args.params, args.method, args.type, args.async, _response(args.parse, args.success, args.httpError, args.authentication, args.unauthorized, args.response), args.error, args.abort, args.timeout, args.send, args.receive, args.username, args.password);
    }
    else
    {
      throw new TypeError();
    }
  }
  else
  {
    return _ajax.call(this, url, params, method, type, async, _response(parse, success, httpError, authentication, unauthorized, response), error, abort, timeout, send, receive, username, password);
  }
}

function _response(parse, success, error, authentication, unauthorized, response)
{
  if(typeof parse === "undefined" && typeof success === "undefined" && typeof error === "undefined" && typeof authentication === "undefined" && typeof unauthorized === "undefined")
  {
    return response;
  }
  else
  {
    return function(event)
    {
      var xhr = this;
      var _response = xhr.response;
      var _status = xhr.status;
      
      if(typeof response === "function")
      {
        response.apply(this, arguments);
      }
      
      var data = _response;
      if(parse === "" || parse === "string" || typeof data === "undefined" || data === null || data === "")
      {
      }
      else if(parse === "mime")
      {
        var mime = (xhr.getResponseHeader("Content-Type") || "").split(";")[0];
        if(mime === "application/json")
        {
          data = JSON.parse(_response);
        }
        else if(mime === "application/xml")
        {
          data = (new DOMParser()).parseFromString(_response, "application/xml");
        }
      }
      else if(parse === "json")
      {
        data = JSON.parse(_response);
      }
      else if(parse === "xml")
      {
        data = (new DOMParser()).parseFromString(_response, "application/xml");
      }
      else if(parse === "binary")
      {
        var size = _response.length;
        data = new ArrayBuffer(size * 2);
        var abv = new Uint16Array(data);
        for(var i = 0; i < size; i++)
        {
          abv[i] = _response.charCodeAt(i);
        }
      }
      else
      {
        throw new TypeError();
      }
      this.data = data;
      
      if((200 <= _status) && (_status <= 299))
      {
        if(typeof success === "function")
        {
          success.call(this, data);
        }
      }
      else if(_status === 401)
      {
        if(typeof authentication === "function")
        {
          authentication.apply(this, arguments);
        }
      }
      else if(_status === 403)
      {
        if(typeof unauthorized === "function")
        {
          unauthorized.apply(this, arguments);
        }
      }
      else
      {
        if(typeof error === "function")
        {
          error.apply(this, arguments);
        }
      }
    };
  }
}

function _ajax(url, params, method, type, async, response, error, abort, timeout, send, receive, username, password)
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
  
  var _async = true;
  if(typeof async !== "undefined" && async !== null)
  {
    if(typeof async !== "boolean")
    {
      throw new TypeError();
    }
    else
    {
      _async = async;
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
  
  if(typeof error === "function")
  {
    xhr.onerror = error;
  }
  
  if(typeof abort === "function")
  {
    xhr.onabort = abort;
  }
  
  if(typeof timeout === "function")
  {
    xhr.ontimeout = timeout;
  }
  
  if(typeof send === "function")
  {
    xhr.upload.onprogress = send;
  }
  
  if(typeof receive === "function")
  {
    xhr.onprogress = receive;
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
        if(typeof response === "function")
        {
          response.apply(this, arguments);
        }
        break;
      
      default:
        break;
    }
  };
  
  if(typeof username === "undefined" && typeof password === "undefined")
  {
    xhr.open(_method, url + _paramsURL, _async);
  }
  else
  {
    xhr.open(_method, url + _paramsURL, _async, username, password);
  }
  
//  xhr.overrideMimeType('text\/plain; charset=x-user-defined');
  
  if(typeof type === "string" && type !== "")
  {
    xhr.responseType = type;
  }
  else
  {
    xhr.responseType = "text";
  }
  
  xhr.send(_paramsBody);
}
