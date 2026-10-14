
function environment()
{
//  return (new Function(_environment.toString().slice(25, -1)))();
  return (new Function("return (" + _environment.toString() + ")()"))();
}

function _environment()
{
  var e = "undefined";
  
//  if(Object.prototype.toString.call(window) === "[object Window]")
  if(typeof window !== "undefined")
  {
    if(-1 < navigator.userAgent.toLowerCase().indexOf(" electron/"))
    {
      e = "electron";
    }
    else
    {
      e = "browser";
    }
  }
  else if(typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node !== "undefined")
  {
    e = "nodejs";
  }
  
  return e;
}

function deviceMobility()
{
  if(navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i))
  {
    return "mobile";
  }
  else
  {
    return "fixed";
  }
}

function isMobile()
{
  if(navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i))
  {
    return true;
  }
  else
  {
    return false;
  }
}
