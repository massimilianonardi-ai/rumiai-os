//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Store()
{
  return Store.Class.construct(this, arguments, [["m/data"]]);
}

// builds generic store services on crwd model on objects, eg: 
// /m/store/[dbschema|dbtable|dbrow|file|dir|symlink|store-file|store-node-file|store-node-link]/[create|read|write|destroy]/<resource-path>
// under store namespace there are classes derived from this and customized commands
// store.FileSystem has additional feature to switch from srv to local nodejs/electron filesystem module
Class(Store)
//.implements(m.ifaces.Data)
//.inherit(m.service.Data)
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

Store.prototype.eventServiceSuccess = function(data)
{
//  m.global.log.debug(this, arguments);
  
  this.data(data);
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.cmd = function(command)
{
//  m.global.log.debug(this, arguments);
  
  this.command(command + "/" + this.source());
  m.srv.Service.prototype.exec.call(this);
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.read = function()
{
//  m.global.log.debug(this, arguments);
  
  this.method("POST").cmd("read");
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.write = function()
{
//  m.global.log.debug(this, arguments);
  
  this.method("POST").cmd("write");
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.create = function()
{
//  m.global.log.debug(this, arguments);
  
  this.method("POST").cmd("create");
  
  return this;
};

//------------------------------------------------------------------------------

Store.prototype.destroy = function()
{
//  m.global.log.debug(this, arguments);
  
  this.method("POST").cmd("destroy");
  
  return this;
};

//------------------------------------------------------------------------------
