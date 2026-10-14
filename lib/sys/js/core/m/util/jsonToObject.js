
function jsonToObject(json, references)
{
  if(typeof json === "undefined")
  {
    return undefined;
  }
  
  var jsonObject = json;
  
  if(typeof json === "string")
  {
    jsonObject = JSON.parse(json);
  }
  else if(typeof json !== "object")
  {
    throw new TypeError();
  }
  
  var refs = {};
  
  if(typeof references === "object")
  {
    var r = references;
    
    if(!Array.isArray(references))
    {
      r = [references];
    }
    
    for(var i = 0; i < r.length; i++)
    {
      var obj = r[i];
      
      if(typeof obj !== "object")
      {
        throw new TypeError();
      }
      
      for(var k in obj)
      {
        refs[k] = obj[k];
      }
    }
  }
  
  return _jsonToObject(jsonObject, refs);
}

function _jsonToObject(json, refs, path)
{
  var references = refs || {};
  var currentPath = path || "";
  
  if(typeof json !== "undefined" && json !== null && typeof json.MassimilianoNardiObjectReference !== "undefined")
  {
    var ref = references[json.MassimilianoNardiObjectReference];
    if(typeof ref !== "undefined")
    {
      if(json.isConstructor === true)
      {
        if(typeof ref !== "function")
        {
          throw new TypeError();
        }
        
        var args = json.args;
        if(typeof args === "undefined")
        {
          args = [];
        }
        else if(json.recursion === true)
        {
          args = [];
          for(var i = 0; i < json.args.length; i++)
          {
            args.push(_jsonToObject(json.args[i], references, currentPath + "." + i));
          }
        }
        
        if(json.newOperator === true)
        {
//          references[currentPath] = new ref(...args);
          references[currentPath] = Object.create(ref.prototype);
          ref.apply(references[currentPath], args);
          return references[currentPath];
        }
        else
        {
//          references[currentPath] = ref(...args);
          references[currentPath] = ref.apply(undefined, args);
          return references[currentPath];
        }
      }
      else
      {
        references[currentPath] = ref;
        return references[currentPath];
      }
    }
    else
    {
      throw new ReferenceError();
    }
  }
  else
  {
    if(typeof json === "object")
    {
      var obj = {};
      if(Array.isArray(json))
      {
        obj = [];
      }
      
      for(var k in json)
      {
        obj[k] = _jsonToObject(json[k], references, currentPath + "." + k);
      }
      
      references[currentPath] = obj;
      return references[currentPath];
    }
    else
    {
      references[currentPath] = json;
      return references[currentPath];
    }
  }
}
