//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Authentication()
{
  return Authentication.Class.construct(this, arguments, [["m/authentication"]]);
}

Class(Authentication)
.inherit(Service)
.property("parse", "json")
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Authentication.prototype.challenge = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("challenge").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.authenticate = function(id, credential)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").params({id: id, credential: credential}).command("authenticate").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.unauthenticate = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("unauthenticate").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.credential = function(id, credential, credentialNew)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").params({id: id, credential: credential, credentialNew: credentialNew}).command("credential").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.session = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("session").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.profile = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("profile").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.profiles = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("profiles").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.id = function()
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").command("id").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.add = function(id, credential, expiration)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").params({id: id, credential: credential, expiration: expiration}).command("add").exec();
  
  return this;
};

//------------------------------------------------------------------------------

Authentication.prototype.remove = function(id)
{
  m.global.log.debug(this, arguments);
  
  this.method("POST").params({id: id}).command("remove").exec();
  
  return this;
};

//------------------------------------------------------------------------------
