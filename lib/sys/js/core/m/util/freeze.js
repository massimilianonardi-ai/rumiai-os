
function freeze(object)
{
  Object.getOwnPropertyNames(object).forEach(function(name)
  {
    var prop = object[name];
    if(typeof prop === "object" && prop !== null && !Object.isFrozen(prop))
    {
      freeze(prop);
    }
  });

  return Object.freeze(object);
}
