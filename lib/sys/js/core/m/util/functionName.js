
function functionName(func)
{
  if(typeof func !== "function")
  {
    throw new TypeError();
  }
  
  var fname = func.name;
  if(typeof fname === "undefined")
  {
    fname = func.toString();
    fname = fname.substring(9, fname.indexOf("("));
  }
  
  return fname;
}
