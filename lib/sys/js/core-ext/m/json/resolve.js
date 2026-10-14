
function resolve(object, references)
{
  var PREFIX_REFERENCE = "@ref:";
  var PREFIX_EVAL = "@eval:";
  var KEY_CALL = "@call";
  var KEY_NEW = "@new";
  var PARENT_OPERATOR = "^";
  var LOCAL_OBJECT_REFERENCE = "$";
  
  var isArray = function(o)
  {
    return (typeof o === "object" && o !== null && o.constructor.name === "Array");
  };
  
  var isArrayOrUndefinedOrNull = function(o)
  {
    return (typeof o === "undefined" || o === null || (typeof o === "object" && o !== null && o.constructor.name === "Array"));
  };
  
  var resolveLocalObjectReferencePath = function(o, path, pathArray, parents, parentsPaths)
  {
    var ref = o.substring(PREFIX_REFERENCE.length);
    
    if(0 === ref.indexOf(LOCAL_OBJECT_REFERENCE))
    {
      ref = ref.substring(LOCAL_OBJECT_REFERENCE.length);
      ref = canonicalize(ref);
      
      return ref;
    }
    else if(0 === ref.indexOf(PARENT_OPERATOR))
    {
      ref = ref.substring(PARENT_OPERATOR.length);
      var index = 0;
      while(0 === ref.indexOf(PARENT_OPERATOR))
      {
        ref = ref.substring(PARENT_OPERATOR.length);
        index++;
      }
      
      ref = parentsPaths[index] + canonicalize(ref);
      
      return ref;
    }
    
    throw new Error();
  };
  
  var resolveFunction = function(name, references)
  {
    var f;
    try
    {
      eval("f = references." + name + ";");
      if(typeof f === "undefined") throw new Error();
    }
    catch(error)
    {
      eval("f = " + name + ";");
    }
    
    if(typeof f !== "function")
    {
      throw new TypeError();
    }
    
    return f;
  };
  
  var resolveExternalObjectReference = function(o, references)
  {
    var obj;
    try
    {
      eval("obj = references." + o + ";");
      if(typeof obj === "undefined") throw new Error();
    }
    catch(error)
    {
      try
      {
        eval("obj = " + o + ";");
      }
      catch(error)
      {
      }
    }
    
    return obj;
  };
  
  var traverse_callback_resolve_external_dependencies = function(o, path, pathArray, parents, parentsPaths)
  {
    if(typeof o === "string" && 0 === o.indexOf(PREFIX_REFERENCE) && -1 === o.indexOf(PREFIX_REFERENCE + LOCAL_OBJECT_REFERENCE) && -1 === o.indexOf(PREFIX_REFERENCE + PARENT_OPERATOR))
    {
      var obj = resolveExternalObjectReference(o.substring(PREFIX_REFERENCE.length), references);
      
      eval("object" + path + " = obj;");
      
      return obj;
    }
    
    return null;
  };
  
  var traverse_callback_find_dependencies = function(o, path, pathArray, parents, parentsPaths)
  {
    var depend = null;
    var func = null;
    var context = null;
    
    if(typeof o === "string")
    {
      if(0 === o.indexOf(PREFIX_REFERENCE + LOCAL_OBJECT_REFERENCE) || 0 === o.indexOf(PREFIX_REFERENCE + PARENT_OPERATOR))
      {
        depend = resolveLocalObjectReferencePath(o, path, pathArray, parents, parentsPaths);
      }
      else if(0 === o.indexOf(PREFIX_EVAL))
      {
        func = eval;
      }
    }
    else if(isArray(o) && 1 < o.length && typeof o[0] === "string" && (0 === o[0].indexOf(KEY_CALL) || 0 === o[0].indexOf(KEY_NEW)))
    {
      if(typeof o[1] !== "string")
      {
        throw new ReferenceError();
      }
      
      if(o.length === 2)
      {
      }
      else if(o.length === 3)
      {
        if(!isArray(o[2]))
        {
          throw new ReferenceError();
        }
        
        var arg = o[2];
        if(arg.length === 1)
        {
          depend = path + "[2][0]";
        }
        else if(1 < arg.length)
        {
          depend = [];
          for(var i = 0; i < arg.length; i++)
          {
            depend.push(path + "[2][" + i + "]");
          }
        }
      }
      else
      {
        throw new ReferenceError();
      }
      
      func = resolveFunction(o[1], references);
      if(0 === o[0].indexOf(KEY_NEW))
      {
        context = Object.create(func.prototype);
      }
    }
    
    if(depend !== null || func !== null)
    {
      return {path: path, depend: depend, func: func, context: context};
    }
    
    return null;
  };
  
  var resolveDependenciesOrder = function(dependencies)
  {
    var resolveArray = [];
    
    var pathArray = dependencies.paths;
    var dependenciesArray = Array.from(dependencies.calcs);
    
    var hasDependancySingle = function(dependancy)
    {
      var index = pathArray.indexOf(dependancy);
      
//      return (index === -1 ? false : (dependenciesArray[index] !== null));
      if(index === -1)
      {
        throw new ReferenceError();
//        return false;
      }
      
      var dependent = false;
      while(pathArray[index] && (0 === pathArray[index].indexOf(dependancy)))
      {
        if(dependenciesArray[index] !== null)
        {
          dependent = true;
        }
        index++;
      }
      
      return dependent;
    };
    
    var hasDependancy = function(dependancy)
    {
      if(dependancy === null)
      {
        return false;
      }
      else if(typeof dependancy === "string")
      {
        return hasDependancySingle(dependancy);
      }
      if(isArray(dependancy))
      {
        var dependent = false;
        for(var i = 0; i < dependancy.length; i++)
        {
          if(hasDependancySingle(dependancy[i]))
          {
            dependent = true;
          }
        }
        
        return dependent;
      }
      
      return false;
    };
    
    var complete = false;
    var processEval = false;
    var prevCount = dependenciesArray.length;
    while(complete === false)
    {
      complete = true;
      var count = 0;
      for(var i = 0; i < dependenciesArray.length; i++)
      {
        var obj = dependenciesArray[i];
        if(!obj)
        {
          continue;
        }
        
        complete = false;
        count++;
        
        if(!hasDependancy(obj.depend) && (obj.func !== eval || processEval === true))
        {
          resolveArray.push(obj);
          dependenciesArray[i] = null;
        }
      }
      
      if(!(count < prevCount))
      {
        if(processEval === false)
        {
          processEval = true;
          count = dependenciesArray.length;
        }
        else
        {
          throw new ReferenceError("circular reference");
        }
      }
      
      prevCount = count;
    }
    
    return resolveArray;
  };
  
  var resolveDependencies = function(resolveArray)
  {
    for(var i = 0; i < resolveArray.length; i++)
    {
      var obj = resolveArray[i];
      
      var path = obj.path;
      var depend = obj.depend;
      var func = obj.func;
      var context = obj.context;
      
      if(func === null)
      {
        eval("object" + path + " = object" + depend + ";");
      }
      else
      {
        var arg;
        if(func === eval)
        {
          eval("var " + LOCAL_OBJECT_REFERENCE + " = object; arg = object" + path + ";");
          arg = arg.substring(PREFIX_EVAL.length);
          eval("object" + path + " = " + arg + ";");
        }
        else
        {
          eval("arg = object" + path + ";");
          if(typeof arg === "object" && arg !== null && arg.constructor.name === "Array" && 1 < arg.length)
          {
            if(arg.length === 3 && typeof arg[2] === "object" && arg[2] !== null && arg[2].constructor.name === "Array")
            {
              arg = arg[2];
            }
            else
            {
              arg.splice(0, 2);
            }
          }
          var res;
          try
          {
            res = func.apply(context, arg);
          }
          catch(error)
          {
            try
            {
              res = func.apply(context || "", arg);
            }
            catch(error1)
            {
              try
              {
                res = func.apply(context || {}, arg);
              }
              catch(error2)
              {
                throw error;
              }
            }
          }
          eval("object" + path + " = res;");
        }
      }
    }
  };
  
  traverse(object, traverse_callback_resolve_external_dependencies);
  var dependencies = traverse(object, traverse_callback_find_dependencies);
  var resolveArray = resolveDependenciesOrder(dependencies);
  resolveDependencies(resolveArray);
  
  return object;
}
