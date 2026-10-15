/*
//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Log()
{
  return Log.Class.construct(this);
}

Class(Log)
.instance(true, true, false, true, true)
.property("level", 3)
.properties()
.compose("_loggers", [])
;

//------------------------------------------------------------------------------
// Enums -----------------------------------------------------------------------
//------------------------------------------------------------------------------

Log.level = Object.freeze(
{
  OFF: 0,
  FATAL: 1,
  ERROR: 2,
  WARN: 3,
  INFO: 4,
  DEBUG: 5,
  TRACE: 6,
  ALL: 9
});

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Log.prototype.log = function(level, levelString, data)
{
  if(level <= this.level())
  {
    var now = new Date();

    var timestamp = now.getTime();
    var date = now.toISOString().split("T")[0];
    var time = now.toTimeString().split(" ")[0];
    // todo integrate with build time filename and line
    var caller = (new Error()).stack.split('\n')[3].split(' ')[5];

    for(var i = 0; i < this._loggers.length; i++)
    {
      this._loggers[i].log(timestamp, date, time, level, levelString, caller, data);
    }

    if(data[0] instanceof Error)
    {
      throw data[0];
    }
  }
};

//------------------------------------------------------------------------------

Log.prototype.add = function(logger)
{
  // todo replace onstanceof with similar but for multiple dynamic inheritance
//  if(!(logger instanceof Logger))
//  {
//    throw new TypeError();
//  }

  this._loggers.push(logger);

  return this;
};

//------------------------------------------------------------------------------

Log.prototype.remove = function(logger)
{
  if(typeof logger === "number")
  {
    this._loggers.splice(logger, 1);
  }
  else if(logger instanceof Logger)
  {
    var index = this._loggers.indexOf(logger);
    if(index === -1)
    {
      throw new ReferenceError();
    }
    this._loggers.splice(index, 1);
  }
  else
  {
    throw new TypeError();
  }

  return this;
};

//------------------------------------------------------------------------------

Log.prototype.fatal = function()
{
  this.log(Log.level.FATAL, "FATAL", arguments);
};

//------------------------------------------------------------------------------

Log.prototype.error = function()
{
  this.log(Log.level.ERROR, "ERROR", arguments);
};

//------------------------------------------------------------------------------

Log.prototype.warn = function()
{
  this.log(Log.level.WARN, "WARN", arguments);
};

//------------------------------------------------------------------------------

Log.prototype.info = function()
{
  this.log(Log.level.INFO, "INFO", arguments);
};

//------------------------------------------------------------------------------

Log.prototype.debug = function()
{
  this.log(Log.level.DEBUG, "DEBUG", arguments);
};

//------------------------------------------------------------------------------

Log.prototype.trace = function()
{
  this.log(Log.level.TRACE, "TRACE", arguments);
};

//------------------------------------------------------------------------------
*/



//------------------------------------------------------------------------------
// Log -------------------------------------------------------------------------
//------------------------------------------------------------------------------

class Log
{
  static level = Object.freeze
  (
    {
      OFF: 0,
      FATAL: 1,
      ERROR: 2,
      WARN: 3,
      INFO: 4,
      DEBUG: 5,
      TRACE: 6,
      ALL: 9
    }
  );

  #level = Log.level.WARN;
  #loggers = [];

  //----------------------------------------------------------------------------
  // Configuration -------------------------------------------------------------
  //----------------------------------------------------------------------------

  level(value)
  {
    if(arguments.length === 0)
    {
      return this.#level;
    }

    this.#level = value;
    return this;
  }

  //----------------------------------------------------------------------------
  // Loggers -------------------------------------------------------------------
  //----------------------------------------------------------------------------

  add(logger)
  {
    if(logger instanceof Logger)
    {
      this.#loggers.push(logger);
    }
    else
    {
      throw new ReferenceError();
    }
    
    return this;
  }

  remove(logger)
  {
    if(typeof logger === "number")
    {
      this.#loggers.splice(logger, 1);
    }
    else if(logger instanceof Logger)
    {
      const index = this.#loggers.indexOf(logger);

      if(index === -1)
      {
        throw new ReferenceError();
      }

      this.#loggers.splice(index, 1);
    }
    else
    {
      throw new TypeError();
    }

    return this;
  }

  //----------------------------------------------------------------------------
  // Logging -------------------------------------------------------------------
  //----------------------------------------------------------------------------

  log(level, levelString, data)
  {
    if(level <= this.#level)
    {
      const now = new Date();

      const timestamp = now.getTime();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0];

      const caller = (new Error()).stack.split("\n")[3].split(" ")[5];

      for(const logger of this.#loggers)
      {
        logger.log(timestamp, date, time, level, levelString, caller, data);
      }

      if(data[0] instanceof Error)
      {
        throw data[0];
      }
    }
  }

  //----------------------------------------------------------------------------
  // Levels --------------------------------------------------------------------
  //----------------------------------------------------------------------------

  fatal()
  {
    this.log(Log.level.FATAL, "FATAL", arguments);
  }

  error()
  {
    this.log(Log.level.ERROR, "ERROR", arguments);
  }

  warn()
  {
    this.log(Log.level.WARN, "WARN", arguments);
  }

  info()
  {
    this.log(Log.level.INFO, "INFO", arguments);
  }

  debug()
  {
    this.log(Log.level.DEBUG, "DEBUG", arguments);
  }

  trace()
  {
    this.log(Log.level.TRACE, "TRACE", arguments);
  }
}

//------------------------------------------------------------------------------
