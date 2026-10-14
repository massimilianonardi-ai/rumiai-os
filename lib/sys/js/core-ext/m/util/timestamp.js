
var timestamp = Date.now;

if(typeof performance !== "undefined" && typeof performance.now === "function")
{
  timestamp = performance.now;
}

//function timestamp()
//{
//  if(typeof performance !== "undefined" && typeof performance.now === "function")
//  {
//    return performance.now();
//  }
//  else
//  {
//    return Date.now();
//  }
//}
