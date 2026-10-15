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
