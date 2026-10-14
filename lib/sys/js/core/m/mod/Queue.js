//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Queue()
{
  return Queue.Class.construct(this, arguments);
}

Class(Queue)
.compose("queue", []);
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
