
//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Service()
{
  return Service.Class.construct(this, arguments);
}

Class(Service)
.property("server", "")
.setter("server", Class.propertyValidatorString)
.property("service", "")
.setter("service", Class.propertyValidatorString)
.property("command", "")
.setter("command", Class.propertyValidatorString)
.property("path", "")
.setter("path", Class.propertyValidatorString)

.property("url", "")
//.property("encode", true)
//.property("method", "GET")
.property("method", "POST")
.setter("method", Class.propertyValidatorString)
.property("async")
.setter("async", Class.propertyValidatorBoolean)
.property("headers", {})
.setter("headers", Class.propertyValidatorObject)
.property("params", {})
.setter("params", Class.propertyValidatorObject)
.property("type")
.setter("type", Class.propertyValidatorString)
.property("parse", "")
//.property("parse", "mime")
//.property("parse", "json")
.setter("parse", Class.propertyValidatorString)
.property("mime", "")
.setter("mime", Class.propertyValidatorString)

.property("response")
.setter("response", Class.propertyValidatorFunction)
.property("success")
.setter("success", Class.propertyValidatorFunction)
.property("error")
.setter("error", Class.propertyValidatorFunction)
.property("completed")
.setter("completed", Class.propertyValidatorFunction)
.property("unauthorized")
.setter("unauthorized", Class.propertyValidatorFunction)
.property("forbidden")
.setter("forbidden", Class.propertyValidatorFunction)
.property("send")
.setter("send", Class.propertyValidatorFunction)
.property("receive")
.setter("receive", Class.propertyValidatorFunction)

//.property("data")
//.listener("data", function(value, prev){this.eventServiceData(value, prev);})

.properties()

.event("ServiceResponse")
.event("ServiceSuccess")
.event("ServiceError")
.event("ServiceCompleted")
.event("ServiceUnauthorized")
.event("ServiceForbidden")
.event("ServiceSend")
.event("ServiceReceive")

//.event("ServiceData")

;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Service.prototype.construct = function(service)
{
  if(typeof service === "string")
  {
    this.service(service);
  }
};

//------------------------------------------------------------------------------

Service.prototype.exec = function()
{
  var _this = this;
  
  var server = this.server();
  var service = this.service();
  var command = this.command();
  var path = this.path();
  var url = this.url();
  
  var method = this.method();
  var async = this.async();
  var headers = this.headers();
  var params = this.params();
  var parse = this.parse();
  var type = this.type();
  var mime = this.mime();
  
  var response = this.response();
  var success = this.success();
  var error = this.error();
  var completed = this.completed();
  var unauthorized = this.unauthorized();
  var forbidden = this.forbidden();
  var send = this.send();
  var receive = this.receive();
  
  if(typeof url === "undefined" || url === null || url === "")
  {
    if(typeof server === "string" && server !== "")
    {
      url = server;
    }
    else if(location.origin !== "null")
    {
      url = location.origin;
    }
    else
    {
      url = "";
    }
    
    if(typeof service === "string" && service !== "")
    {
      service = service[0] === "/" ? service.substring(1) : service;
      url += "/" + service;
//      url += "/" + encodeURIComponent(service);
//      url += "/" + encodeURIComponent(encodeURIComponent(service));
    }
    
    if(typeof command === "string" && command !== "")
    {
      command = command[0] === "/" ? command.substring(1) : command;
      url += "/" + command;
//      url += "/" + encodeURIComponent(command);
//      url += "/" + encodeURIComponent(encodeURIComponent(command));
    }
    
    if(typeof path === "string" && path !== "")
    {
      path = path[0] === "/" ? path.substring(1) : path;
      url += "/" + encodeURIComponent(path);
//      url += "/" + encodeURIComponent(encodeURIComponent(path));
    }
  }
  else if(typeof url === "string")
  {
    url = encodeURI(url);
  }
  else
  {
    throw new TypeError();
  }
  
  var _response = function(){_this.eventServiceResponse.apply(_this, arguments);};
  if(typeof response === "function")
  {
    _response = function(){_this.eventServiceResponse.apply(_this, arguments); response.apply(_this, arguments);};
  }
  else if(typeof response !== "undefined")
  {
    throw new TypeError();
  }
  
  var _success = function(data){_this.eventServiceSuccess(data);};
  if(typeof success === "function")
  {
    _success = function(data){_this.eventServiceSuccess(data); success.call(_this, data);};
  }
  else if(typeof success !== "undefined")
  {
    throw new TypeError();
  }
  
//  var _success = function(data){_this.data(data); _this.eventServiceSuccess(data);};
//  if(typeof success === "function")
//  {
//    _success = function(data){_this.data(data); _this.eventServiceSuccess(data); success.call(_this, data);};
//  }
//  else if(typeof success !== "undefined")
//  {
//    throw new TypeError();
//  }
  
  var _error = function(){_this.eventServiceError.apply(_this, arguments);};
  if(typeof error === "function")
  {
    _error = function(){_this.eventServiceError.apply(_this, arguments); error.apply(_this, arguments);};
  }
  else if(typeof error !== "undefined")
  {
    throw new TypeError();
  }
  
  var _completed = function(){_this.eventServiceCompleted.apply(_this, arguments);};
  if(typeof completed === "function")
  {
    _completed = function(){_this.eventServiceCompleted.apply(_this, arguments); completed.apply(_this, arguments);};
  }
  else if(typeof completed !== "undefined")
  {
    throw new TypeError();
  }
  
  var _unauthorized = function(){_this.eventServiceUnauthorized.apply(_this, arguments);};
  if(typeof unauthorized === "function")
  {
    _unauthorized = function(){_this.eventServiceUnauthorized.apply(_this, arguments); unauthorized.apply(_this, arguments);};
  }
  else if(typeof unauthorized !== "undefined")
  {
    throw new TypeError();
  }
  
  var _forbidden = function(){_this.eventServiceForbidden.apply(_this, arguments);};
  if(typeof forbidden === "function")
  {
    _forbidden = function(){_this.eventServiceForbidden.apply(_this, arguments); forbidden.apply(_this, arguments);};
  }
  else if(typeof forbidden !== "undefined")
  {
    throw new TypeError();
  }
  
  var _send = function(event){_this.eventServiceSend(event.lengthComputable, event.loaded, event.total, event);};
  if(typeof send === "function")
  {
    _send = function(event){_this.eventServiceSend(event.lengthComputable, event.loaded, event.total, event); send.call(_this, event.lengthComputable, event.loaded, event.total, event);};
  }
  else if(typeof send !== "undefined")
  {
    throw new TypeError();
  }
  
  var _receive = function(event){_this.eventServiceReceive(event.lengthComputable, event.loaded, event.total, event);};
  if(typeof receive === "function")
  {
    _receive = function(event){_this.eventServiceReceive(event.lengthComputable, event.loaded, event.total, event); receive.call(_this, event.lengthComputable, event.loaded, event.total, event);};
  }
  else if(typeof receive !== "undefined")
  {
    throw new TypeError();
  }
  
  ajax(
  {
    url: url,
    responseCallback: responseCallback(_success, _error, _completed, _response, _unauthorized, _forbidden),
    responseCallbackContext: this,
    method: method,
    async: async,
    headers: headers,
    params: params,
    parse: parse,
    type: type,
    mime: mime,
    loadstartDownload: _response,
    progressDownload: _receive,
    loadDownload: _response,
    loadendDownload: _response,
    loadstartUpload: _response,
    progressUpload: _send,
    loadUpload: _response,
    loadendUpload: _response,
    abortDownload: _error,
    errorDownload: _error,
    timeoutDownload: _error,
    abortUpload: _error,
    errorUpload: _error,
    timeoutUpload: _error
  });
  
  return this;
};

//------------------------------------------------------------------------------
