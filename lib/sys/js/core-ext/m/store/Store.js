//------------------------------------------------------------------------------
// Globals ---------------------------------------------------------------------
//------------------------------------------------------------------------------

var fs = m.sys.nodejs ? m.sys.nodejs.fs : null;

var ajaxAdvanced = m.util.ajaxAdvanced;

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

// on construction returns an instance of Service or File depending on:
// environment, environment override, constructor param
// or...
// internally has an instance of service and one of file and choose wich one to call based on path prefix (https://, /, @, $, file://, etc)
// /m/net/ is service, other /m/ is file, /m/net/web/https://..., /m/net/store/...
// file is only local, service defaults to current origin but can be other
// must define a general interface better than shell command line and web url -> object/json-schema that can be mapped to shell and url
// <origin>/<service>/<command>[/<path>[|...]]
// origin === "" -> local filesystem, origin === "<ip>[:<port>]" -> mnode web service access, path === "http[s]://<...>" -> internet
// cmd: out = origin-path/srv.cmd(in) or origin-path/srv.cmd(in, &out)
// origin-path is a universal address
//

function Store()
{
  return Store.Class.construct(this, arguments);
}

Class(Store)
.property("separator", "/")
.setter("separator", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})

.property("origin", window.origin || "")
.setter("origin", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("service", "/m/store")
.setter("service", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("source", "")
.setter("source", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("command", "")
.setter("command", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("path", "")
.setter("path", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})

.property("params", {})
.setter("params", function(value){if(typeof value === "undefined"){return {};} else if(typeof value === "object"){return value;} else {throw new TypeError();}})
.property("data")
//.listener("data", function(value, prev){this.eventServiceData(value, prev);})
.listener("data", function(value, prev){console.log("service.data", {"service.data": value});})

.property("response")
.setter("response", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})
.property("success")
.setter("success", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})

.property("authentication")
.setter("authentication", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})
.property("password")
.setter("password", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})
.property("unauthorized")
.setter("unauthorized", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})

.property("send")
.setter("send", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})
.property("receive")
.setter("receive", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})

.property("error")
.setter("error", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})
.property("abort")
.setter("abort", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})
.property("timeout")
.setter("timeout", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})

.property("parse", "mime")
.setter("parse", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("type", "")
.setter("type", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
//.property("method", "GET")
.property("method", "POST")
.setter("method", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})
.property("httpError")
.setter("httpError", function(value){if(typeof value === "function" || typeof value === "undefined" || value === null){return value;} else {throw new TypeError();}})

.properties()
.event("ServiceData")
.event("ServiceResponse")
.event("ServiceSuccess")
.event("ServiceAuthentication")
.event("ServicePassword")
.event("ServiceUnauthorized")
.event("ServiceSend")
.event("ServiceReceive")
.event("ServiceError")
.event("ServiceAbort")
.event("ServiceTimeout")

.event("ServiceHttpError")
;



//  public Attributes attributes(String path) throws Exception;
//  public void attributes(String path, Attributes attributes) throws Exception;
//  
//  public boolean exists(String path) throws Exception;
//  
//  public boolean isFile(String path) throws Exception;
//  public boolean isNode(String path) throws Exception;
//  public boolean isLink(String path) throws Exception;
//  
//  public void copy(String path, String dest, boolean replace, boolean follow) throws Exception;
//  default public void copy(String path, String dest) throws Exception {copy(path, dest, false, false);}
//  public void move(String path, String dest, boolean replace) throws Exception;
//  default public void move(String path, String dest) throws Exception {move(path, dest, false);}
//  public void rename(String path, String name) throws Exception;
//  public void delete(String path, boolean deep) throws Exception;
//  default public void delete(String path) throws Exception {delete(path, false);}
//  
//  public void file(String path) throws Exception;
//  public StreamSeekable stream(String path) throws Exception;
//  default public StreamSeekableInput read(String path) throws Exception {return stream(path);}
//  public void node(String path) throws Exception;
//  public void nodes(String path) throws Exception;
//  default public void hardLink(String path, String dest) throws Exception {link(path, dest);}
//  public void link(String path, String dest) throws Exception;
//  public String link(String path) throws Exception;
//  
//  public StreamInput list(String path) throws Exception;
//  public StreamInput find(String path, Map options) throws Exception;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

//Store.prototype.construct = function()
//{
//  m.global.log.debug(this, arguments);
//};

//------------------------------------------------------------------------------

Store.prototype.restructData = function(data, reformatOptions)
{
  // restruct data and calls this.data(restruturedData);
  // think well about the flow: like this above or restruct is a property (eventually a callback) and data has a global setter to restruct
};

//------------------------------------------------------------------------------

Store.prototype.exec = function()
{
  var command = this.command();
  var origin = this.origin();
  if(origin === "" || origin === "file://")
  {
    this.execFile(command);
  }
  else
  {
    this.execService(command);
  }
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.execFile = function(command)
{
  console.log(m, fs, command, fs[command]);
  fs[command].apply(this, args);
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.url = function(command)
{
  var path = this.path();
  
  if("/" === path.charAt(0) || -1 !== path.indexOf("://"))
  {
    return path;
  }
  
  var separator = this.separator();
  var service = this.service();
  var source = this.source();
  var url = "";
  
  if(service !== "")
  {
    url += service;
  }
  
  if(command !== "")
  {
    url += separator + command;
  }
  
  if(source !== "")
  {
    url += separator + source;
  }
  
  if(path !== "")
  {
    url += separator + encodeURIComponent(encodeURIComponent(path));
  }
  
  return url;
};

//------------------------------------------------------------------------------

Store.prototype.execService = function(command)
{
  var _this = this;
  
  var url = this.url(command);
  
  var params = this.params();
  var parse = this.parse();
  var type = this.type();
  var method = this.method();
  
  var response = this.response();
  var success = this.success();
  var authentication = this.authentication();
  var unauthorized = this.unauthorized();
  var send = this.send();
  var receive = this.receive();
  var error = this.error();
  var abort = this.abort();
  var timeout = this.timeout();
  var httpError = this.httpError();
  
  var _response = function(event){_this.eventServiceResponse(event);};
  if(typeof response === "function")
  {
    _response = function(event){_this.eventServiceResponse(event); response.call(_this, event);};
  }
  else if(typeof response !== "undefined")
  {
    throw new TypeError();
  }
  
  var _success = function(data){_this.data(data); _this.eventServiceSuccess(data);};
  if(typeof success === "function")
  {
    _success = function(data){_this.data(data); _this.eventServiceSuccess(data); success.call(_this, data);};
  }
  else if(typeof success !== "undefined")
  {
    throw new TypeError();
  }
    
  var _authentication = function(event){_this.eventServiceAuthentication(event);};
  if(typeof authentication === "function")
  {
    _authentication = function(event){_this.eventServiceAuthentication(event); authentication.call(_this, event);};
  }
  else if(typeof authentication !== "undefined")
  {
    throw new TypeError();
  }
  
  var _unauthorized = function(event){_this.eventServiceUnauthorized(event);};
  if(typeof unauthorized === "function")
  {
    _unauthorized = function(event){_this.eventServiceUnauthorized(event); unauthorized.call(_this, event);};
  }
  else if(typeof unauthorized !== "undefined")
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
  
  var _error = function(event){_this.eventServiceError(event);};
  if(typeof error === "function")
  {
    _error = function(event){_this.eventServiceError(event); error.call(_this, event);};
  }
  else if(typeof error !== "undefined")
  {
    throw new TypeError();
  }
  
  var _abort = function(event){_this.eventServiceAbort(event);};
  if(typeof abort === "function")
  {
    _abort = function(event){_this.eventServiceAbort(event); abort.call(_this, event);};
  }
  else if(typeof abort !== "undefined")
  {
    throw new TypeError();
  }
  
  var _timeout = function(event){_this.eventServiceTimeout(event);};
  if(typeof timeout === "function")
  {
    _timeout = function(event){_this.eventServiceTimeout(event); timeout.call(_this, event);};
  }
  else if(typeof timeout !== "undefined")
  {
    throw new TypeError();
  }
  
  var _httpError = function(event){_this.eventServiceHttpError(event);};
  if(typeof httpError === "function")
  {
    _httpError = function(event){_this.eventServiceHttpError(event); httpError.call(_this, event);};
  }
  else if(typeof httpError !== "undefined")
  {
    throw new TypeError();
  }
  else if(typeof error === "function")
  {
    _httpError = function(event){_this.eventServiceHttpError(event); error.call(_this, event);};
  }
  
  ajaxAdvanced(
  {
    url: url,
    params: params,
    parse: parse,
    type: type,
    method: method,
    success: _success,
    authentication: _authentication,
    unauthorized: _unauthorized,
    send: _send,
    receive: _receive,
    response: _response,
    error: _error,
    abort: _abort,
    timeout: _timeout,
    httpError: _httpError
  });
  
  return this;
};

//------------------------------------------------------------------------------
