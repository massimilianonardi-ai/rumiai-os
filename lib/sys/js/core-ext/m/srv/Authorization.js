//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Authorization()
{
  return Authorization.Class.construct(this, arguments, [["m/authorization"]]);
}

Class(Authorization)
.inherit(Service)
.property("parse", "json")
.property("authentication", "id")
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Authorization.prototype.roles = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("roles").path(this.authentication()).exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authorization.prototype.ids = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("ids").path(this.authentication()).exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authorization.prototype.idsWithRole = function(role)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("idsWithRole").path(this.authentication() + "/" + role).exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authorization.prototype.getIDRoles = function(id)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("getIDRoles").path(this.authentication() + "/" + id).exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authorization.prototype.setIDRoles = function(id, roles)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").params({roles: roles}).command("setIDRoles").path(this.authentication() + "/" + id).exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authorization.prototype.getRules = function(role)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("getRules").path(this.authentication() + "/" + role).exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authorization.prototype.setRules = function(role, rules)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").params({rules: rules}).command("setRules").path(this.authentication() + "/" + role).exec();
  
  return this;
};

//------------------------------------------------------------------------------
