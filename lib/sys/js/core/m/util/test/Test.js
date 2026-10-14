//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Test()
{
  this.env = {};
  this.env.common = new TestEnvironment(this.env, "common");
  this.env[environment] = new TestEnvironment(this.env, environment);
  this.env[environment].exec = TestEnvironment.prototype["exec_" + environment];
}

//------------------------------------------------------------------------------
// Private ---------------------------------------------------------------------
//------------------------------------------------------------------------------

var environment = m.util.environment();
var performance = m.util.performance;
//var log = console.log;
//var log = m.log.LoggerConsoleSimple.prototype.log;
var log = function(){console.log.apply(console, arguments);};
var timestamp = Date.now;
//var timestamp = performance.now;

function TestEnvironment(environments, name)
{
  if(typeof environments !== "object")
  {
    throw new TypeError();
  }
  
  this.env = environments;
  this.name = name;
  
  this.reset();
}

TestEnvironment.prototype.reset = function()
{
  this._list = [];
  this._context = {};
  
  return this;
};

TestEnvironment.prototype.exec_default = function()
{
  var _list = this._list;
  
  for(var i = 0; i < _list.length; i++)
  {
    var _t = _list[i];
    
    log("");
    log("");
    log("");
    log("_____________________________________________________________________________________________________________");
    log("_____________________________________________________________________________________________________________");
    log("### START ###");
    log("### environment:", this.name);
    log("### type.......:", _t.type);
    log("### index......:", i);
    log("### name.......:", _t.name);
    log("### test.......:", {object: _t.test, source: _t.test.toString()});
    log("### context....:", _t.context);
    log("### arguments..:", _t.args);
    log("_____________________________________________________________________________________________________________");
    log("_____________________________________________________________________________________________________________");
    log("");
    
    var t1 = timestamp();
    var result = undefined;
    
    try
    {
      result = _t.method.call(this, _t.test, _t.context, _t.args);
    }
    catch(e)
    {
      log("exception", e);
    }
    
    var t2 = timestamp();
    
    log("");
    log("=============================================================================================================");
    log(">>> name..:", _t.name);
    log(">>> result:", result);
    log(">>> time..:", t2 - t1);
    log(">>> END <<<");
    log("=============================================================================================================");
    log("");
    log("");
    log("");
    log("");
    log("");
    log("");
    log("");
    log("");
    log("");
  }
  
  return this;
};

TestEnvironment.prototype.exec = TestEnvironment.prototype.exec_default;

TestEnvironment.prototype.exec_browser = function()
{
  if(environment === "browser")
  {
    // todo change invokation to work even if at this time window is loaded or not and run inside a window (create a new window)
    // use the Document.readyState property
    if(document.readyState === "complete")
    {
      TestEnvironment.prototype.exec_default.apply(this);
    }
    else
    {
      var _this = this;
      window.addEventListener("load", function(){TestEnvironment.prototype.exec_default.apply(_this);});
    }
  }
  else
  {
    this._exec();
  }
  
  return this;
};

TestEnvironment.prototype.log = function(test, isolation, args)
{
  var _test = this.test.apply(this, arguments);
  _test.type = "log";
  _test.method = this._log;
  this._list.push(_test);
  
  return this;
};

TestEnvironment.prototype.perf = function(test, isolation, args)
{
  var _test = this.test.apply(this, arguments);
  _test.type = "perf";
  _test.method = this._perf;
  this._list.push(_test);
  
  return this;
};

TestEnvironment.prototype.test = function(test, isolation, args)
{
  if(typeof test !== "function")
  {
    throw new TypeError();
  }
  
  var _name = test.name;
  if(typeof _name === "undefined" || _name === null || _name === "")
  {
    _name = "unknown";
  }
  
  var _context = undefined;
  
  if(typeof isolation === "undefined" || isolation === true)
  {
    _context = undefined;
  }
  else if(isolation === false || isolation === null)
  {
    this._context[""] = this._context[""] || Object.create(null);
    _context = this._context[""];
  }
  else if(typeof isolation === "string")
  {
    this._context[isolation] = this._context[isolation] || Object.create(null);
    _context = this._context[isolation];
  }
  else if((typeof isolation === "object" && !Array.isArray(isolation)) || typeof isolation === "function")
  {
    _context = isolation;
  }
  else
  {
    throw new TypeError();
  }
  
  var _args = args;
  
  if(arguments.length < 3)
  {
    _args = [m, log];
  }
  else if(typeof _args !== "undefined" && _args !== null && !Array.isArray(_args))
  {
    throw new TypeError();
  }
  
  return {name: _name, test: test, context: _context, args: _args};
};

TestEnvironment.prototype._log = function(test, context, args)
{
  return test.apply(context, args);
};

TestEnvironment.prototype._perf = function(test, context, args)
{
  var p = performance(test, context, args);
  return "FUNCTION: " + new Number(p.ops_per_sec).toLocaleString() + " ops/sec - " 
  + new Number(p.avg_ms_per_exec).toLocaleString() + " ms - BODY: " 
  + new Number(p.ops_per_sec_body).toLocaleString() + " ops/sec - " 
  + new Number(p.avg_ms_per_exec_body).toLocaleString() + " ms";
};

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

//Test.prototype.start = function()
//{
//};

//------------------------------------------------------------------------------
