//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function App()
{
  return App.Class.construct(this, arguments, [["m/app"]]);
}

Class(App)
.inherit(Service)
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

App.prototype.app = function(path)
{
  this.method("POST").mime("text/html").path(path).exec();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.file = function(path)
{
  this.method("POST").path(path).exec();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.list = function(path)
{
  this.method("POST").parse("json").path(path + "@list").exec();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.info = function(path)
{
  this.method("POST").parse("json").path(path + "@info").exec();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.dir = function(path)
{
  this.method("POST").parse("json").path(path + "@dir").exec();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.find = function(path)
{
  this.method("POST").parse("json").path(path + "@find").exec();
  
  return this;
};

//------------------------------------------------------------------------------
