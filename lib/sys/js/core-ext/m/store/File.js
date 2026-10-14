//------------------------------------------------------------------------------
// Globals ---------------------------------------------------------------------
//------------------------------------------------------------------------------

var fs = m.sys.nodejs ? m.sys.nodejs.fs : null;

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function File()
{
  return File.Class.construct(this, arguments);
}

Class(File)
.inherit(Store)
.property("data")
//.listener("data", function(value, prev){this.eventServiceData(value, prev);})
.listener("data", function(value, prev){console.log("service.data", {"service.data": value});})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

File.prototype.construct = function(service)
{
  this.service = service || "";
//  this.service = "/m/" + service || "";
};

//------------------------------------------------------------------------------

File.prototype.command = function(command, args)
{
  m.global.log.debug(this, arguments);
  
//  const fs = require("fs");
//
//fs.readdir(".", (err, dir) => {
//for(let filePath of dir)
//console.log(filePath);
//});
  
  console.log(m, fs, command, fs[command]);
  fs[command].apply(this, args);
  
  return this;
};

//------------------------------------------------------------------------------
