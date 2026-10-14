//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function LoggerStore()
{
  return LoggerStore.Class.construct(this, arguments);
}

Class(LoggerStore)
.inherit(log.Logger)
//.inherit(m.service.Data)
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

LoggerStore.prototype.construct = function()
{
  // todo save log to generic data storage, implement save policies eg. each n log object, at time interval, at generic event, after receiving an error log event, etc.
};

//------------------------------------------------------------------------------

LoggerStore.prototype.log = function(timestamp, date, time, level, levelString, caller, data)
{
  console.log(timestamp, date, time, level, levelString, caller, JSON.stringify(data));
};

//------------------------------------------------------------------------------
