//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Data()
{
  return Data.Class.construct(this, arguments, [["m/data"]]);
}

Class(Data)
.inherit(Service)
.property("source", "web.app.file")
.setter("source", function(value){if(typeof value === "string"){return value;} else {throw new TypeError();}})

.property("data")
.listener("data", function(value, prev){this.eventDataChanged(value, prev);})
.event("DataChanged")
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Data.prototype.eventServiceSuccess = function(data)
{
  this.data(data);
  
  return this;
};

//------------------------------------------------------------------------------

Data.prototype.cmd = function(command)
{
  this.command(command + "/" + this.source());
  Service.prototype.exec.call(this);
  
  return this;
};

//------------------------------------------------------------------------------

Data.prototype.read = function()
{
  this.method("POST").cmd("read");
  
  return this;
};

//------------------------------------------------------------------------------

Data.prototype.write = function()
{
  this.method("POST").cmd("write");
  
  return this;
};

//------------------------------------------------------------------------------

Data.prototype.create = function()
{
  this.method("POST").cmd("create");
  
  return this;
};

//------------------------------------------------------------------------------

Data.prototype.destroy = function()
{
  this.method("POST").cmd("destroy");
  
  return this;
};

//------------------------------------------------------------------------------
