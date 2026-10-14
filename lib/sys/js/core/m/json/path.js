
function path(pathString, object)
{
  if(typeof pathString === "undefined" || pathString === null || pathString === "")
  {
    return object;
  }
  
  eval("var obj = object" + pathString + ";");
  
//  var pathSegments = pathString
//  .replace(new RegExp("\\[", "g"), ".")
//  .replace(new RegExp("\\]", "g"), "")
//  .split(".");
//  
//  var obj = object;
//  
//  if(pathSegments[0] !== "")
//  {
//    throw new ReferenceError();
//  }
//  
//  for(var i = 1; i < pathSegments.length; i++)
//  {
//    if(pathSegments[i] === "" || typeof obj[pathSegments[i]] === "undefined")
//    {
//      throw new ReferenceError();
//    }
//    obj = obj[pathSegments[i]];
//  }
  
  return obj;
}
