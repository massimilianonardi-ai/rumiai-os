/*
//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Queue()
{
  return Queue.Class.construct(this, arguments);
}

Class(Queue)
.compose("queue", [])
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Queue.prototype.add = function(callback)
{
  var _callback = callback;

  if(typeof _callback === "undefined" || _callback === null)
  {
    _callback = function(){};
  }

  if(typeof _callback !== "function")
  {
    throw new TypeError();
  }

  var _this = this;
  var obj = {callback: _callback};
  this.queue.push(obj);
  return function()
  {
    obj.context = this;
    obj.args = arguments;
    obj.ready = true;
    _this.exec();
  };
};

//------------------------------------------------------------------------------

Queue.prototype.exec = function()
{
  var c = this.queue[0];
  if(typeof c !== "undefined" && c.ready === true)
  {
//    this.queue.splice(0, 1);
    if(this.queue.splice(0, 1)[0] !== c)
    {
      console.log("thread race condition!");
      throw new ReferenceError();
    }
    try
    {
      c.callback.apply(c.context, c.args);
    }
    catch(error)
    {
      console.error(error);
    }
    this.exec();
  }

  return this;
};

//------------------------------------------------------------------------------
*/



/*
//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Queue()
{
  return Queue.Class.construct(this, arguments);
}

Class(Queue)
.compose("queue", [])
.compose("_head", 0)
.compose("_executing", false)
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Queue.prototype.add = function(callback)
{
  if(callback === undefined || callback === null)
  {
    callback = function(){};
  }

  if(typeof callback !== "function")
  {
    throw new TypeError();
  }

  const _this = this;

  const obj =
  {
    callback: callback,
    ready: false
  };

  this.queue.push(obj);

  return function()
  {
    if(obj.ready)
    {
      return;
    }

    obj.context = this;
    obj.args = arguments;
    obj.ready = true;

    _this.exec();
  };
};

//------------------------------------------------------------------------------

Queue.prototype.exec = function()
{
  if(this._executing)
  {
    return this;
  }

  this._executing = true;

  try
  {
    while(this._head < this.queue.length)
    {
      const obj = this.queue[this._head];

      if(obj.ready !== true)
      {
        break;
      }

      this.queue[this._head] = null;
      this._head++;

      try
      {
        obj.callback.apply(obj.context, obj.args);
      }
      catch(error)
      {
        console.error(error);
      }
    }
  }
  finally
  {
    if(this._head === this.queue.length)
    {
      this.queue.length = 0;
      this._head = 0;
    }
    else if(this._head >= 1024 && this._head * 2 >= this.queue.length)
    {
      this.queue.splice(0, this._head);
      this._head = 0;
    }

    this._executing = false;
  }

  return this;
};

//------------------------------------------------------------------------------
*/



/*
class Queue
{
  #queue = [];
  #head = 0;
  #executing = false;

  //----------------------------------------------------------------------------
  // Registration --------------------------------------------------------------
  //----------------------------------------------------------------------------

  add(callback)
  {
    callback ??= () => {};

    if(typeof callback !== "function")
    {
      throw new TypeError("Queue.add: callback must be a function");
    }

    const queue = this;

    const entry =
    {
      callback,
      ready: false
    };

    this.#queue.push(entry);

    return function(...args)
    {
      if(entry.ready)
      {
        return;
      }

      entry.context = this;
      entry.args = args;
      entry.ready = true;

      queue.exec();
    };
  }

  //----------------------------------------------------------------------------
  // Execution -----------------------------------------------------------------
  //----------------------------------------------------------------------------

  exec()
  {
    if(this.#executing)
    {
      return this;
    }

    this.#executing = true;

    try
    {
      while(this.#head < this.#queue.length)
      {
        const entry = this.#queue[this.#head];

        if(!entry.ready)
        {
          break;
        }

        this.#queue[this.#head] = null;
        this.#head++;

        try
        {
          entry.callback.apply(entry.context, entry.args);
        }
        catch(error)
        {
          console.error(error);
        }
      }
    }
    finally
    {
      if(this.#head === this.#queue.length)
      {
        this.#queue.length = 0;
        this.#head = 0;
      }
      else if(this.#head >= 1024 && this.#head * 2 >= this.#queue.length)
      {
        this.#queue.splice(0, this.#head);
        this.#head = 0;
      }

      this.#executing = false;
    }

    return this;
  }
}
*/



/*
class Queue
{
  #queue = [];
  #head = 0;
  #executing = false;
  #stopped = false;
  #errors = [];
  #nextIndex = 0;

  //----------------------------------------------------------------------------
  // State ---------------------------------------------------------------------
  //----------------------------------------------------------------------------

  get stopped()
  {
    return this.#stopped;
  }

  get pending()
  {
    return this.#queue.length - this.#head;
  }

  get errors()
  {
    return this.#errors.map
    (
      entry =>
      {
        return {...entry, args: [...entry.args]};
      }
    );
  }

  //----------------------------------------------------------------------------
  // Registration --------------------------------------------------------------
  //----------------------------------------------------------------------------

  add(callback, continueOnError = false)
  {
    callback ??= () => {};

    if(typeof callback !== "function")
    {
      throw new TypeError("Queue.add: callback must be a function");
    }

    if(typeof continueOnError !== "boolean")
    {
      throw new TypeError("Queue.add: continueOnError must be a boolean");
    }

    if(this.#stopped)
    {
      throw new Error("Queue.add: queue stopped after a callback error");
    }

    const entry =
    {
      index: this.#nextIndex++,
      callback,
      continueOnError,
      ready: false,
      context: undefined,
      args: undefined,
      error: undefined
    };

    this.#queue.push(entry);

    const queue = this;

    return function(...args)
    {
      if(entry.ready || queue.#stopped)
      {
        return;
      }

      entry.context = this;
      entry.args = args;
      entry.ready = true;

      queue.exec();
    };
  }

  //----------------------------------------------------------------------------
  // Execution -----------------------------------------------------------------
  //----------------------------------------------------------------------------

  exec()
  {
    if(this.#executing || this.#stopped)
    {
      return this;
    }

    this.#executing = true;

    try
    {
      while(this.#head < this.#queue.length)
      {
        const entry = this.#queue[this.#head];

        if(!entry.ready)
        {
          break;
        }

        this.#queue[this.#head] = null;
        this.#head++;

        try
        {
          entry.callback.apply(entry.context, entry.args);
        }
        catch(error)
        {
          entry.error = error;
          this.#errors.push(entry);

          if(!entry.continueOnError)
          {
            this.#stopped = true;
            break;
          }
        }
      }
    }
    finally
    {
      if(this.#stopped || this.#head === this.#queue.length)
      {
        this.#queue.length = 0;
        this.#head = 0;
      }
      else if(this.#head >= 1024 && this.#head * 2 >= this.#queue.length)
      {
        this.#queue.splice(0, this.#head);
        this.#head = 0;
      }

      this.#executing = false;
    }

    return this;
  }
}
*/



class Queue
{
  #queue = [];
  #head = 0;
  #executing = false;
  #round = null;
  #stopped = false;
  #errors = [];
  #nextIndex = 0;
  #completedCallback = null;
  #successCallback = null;
  #errorCallback = null;

  //----------------------------------------------------------------------------
  // State ---------------------------------------------------------------------
  //----------------------------------------------------------------------------

  get stopped()
  {
    return this.#stopped;
  }

  get pending()
  {
    return this.#queue.length - this.#head;
  }

  get errors()
  {
    return this.#errors.map
    (
      entry => ({...entry, args: [...entry.args]})
    );
  }

  //----------------------------------------------------------------------------
  // Notifications -------------------------------------------------------------
  //----------------------------------------------------------------------------

  completed(callback = null)
  {
    if(callback !== null && typeof callback !== "function")
    {
      throw new TypeError("Queue.completed: callback must be a function or null");
    }

    this.#completedCallback = callback;
    return this;
  }

  success(callback = null)
  {
    if(callback !== null && typeof callback !== "function")
    {
      throw new TypeError("Queue.success: callback must be a function or null");
    }

    this.#successCallback = callback;
    return this;
  }

  error(callback = null)
  {
    if(callback !== null && typeof callback !== "function")
    {
      throw new TypeError("Queue.error: callback must be a function or null");
    }

    this.#errorCallback = callback;
    return this;
  }

  //----------------------------------------------------------------------------
  // Registration --------------------------------------------------------------
  //----------------------------------------------------------------------------

  add(callback, continueOnError = false)
  {
    callback ??= () => {};

    if(typeof callback !== "function")
    {
      throw new TypeError("Queue.add: callback must be a function");
    }

    if(typeof continueOnError !== "boolean")
    {
      throw new TypeError("Queue.add: continueOnError must be a boolean");
    }

    if(this.#round === null)
    {
      this.#round = {};
      this.#errors = [];
      this.#stopped = false;
    }

    const round = this.#round;

    const entry =
    {
      index: this.#nextIndex++,
      callback,
      continueOnError,
      ready: false,
      context: undefined,
      args: undefined,
      error: undefined
    };

    this.#queue.push(entry);

    const queue = this;

    return function(...args)
    {
      if(entry.ready || queue.#round !== round)
      {
        return;
      }

      entry.context = this;
      entry.args = args;
      entry.ready = true;

      queue.exec();
    };
  }

  //----------------------------------------------------------------------------
  // Execution -----------------------------------------------------------------
  //----------------------------------------------------------------------------

  exec()
  {
    if(this.#executing)
    {
      return this;
    }

    this.#executing = true;

    let notificationFailed = false;
    let notificationError;

    const notify = (callback, ...args) =>
    {
      if(callback === null)
      {
        return;
      }

      try
      {
        callback.apply(this, args);
      }
      catch(error)
      {
        if(!notificationFailed)
        {
          notificationFailed = true;
          notificationError = error;
        }
      }
    };

    try
    {
      while(this.#round !== null)
      {
        while(this.#head < this.#queue.length)
        {
          const entry = this.#queue[this.#head];

          if(!entry.ready)
          {
            break;
          }

          this.#queue[this.#head] = null;
          this.#head++;

          try
          {
            entry.callback.apply(entry.context, entry.args);
          }
          catch(error)
          {
            entry.error = error;
            this.#errors.push(entry);

            if(!entry.continueOnError)
            {
              this.#stopped = true;
              break;
            }
          }
        }

        if(!this.#stopped && this.#head < this.#queue.length)
        {
          if(this.#head >= 1024 && this.#head * 2 >= this.#queue.length)
          {
            this.#queue.splice(0, this.#head);
            this.#head = 0;
          }

          break;
        }

        const stopped = this.#stopped;
        const errors = this.errors;

        const errorCallback = this.#errorCallback;
        const successCallback = this.#successCallback;
        const completedCallback = this.#completedCallback;

        // Close the finished round before notifying observers.
        // New entries registered by observers start a new round.

        this.#queue.length = 0;
        this.#head = 0;
        this.#round = null;

        if(errors.length !== 0)
        {
          notify
          (
            errorCallback,
            stopped ? errors[errors.length - 1] : errors,
            stopped
          );
        }

        if(!stopped)
        {
          notify(successCallback, errors.length !== 0);
        }

        notify(completedCallback);
      }
    }
    finally
    {
      this.#executing = false;
    }

    if(notificationFailed)
    {
      throw notificationError;
    }

    return this;
  }
}
