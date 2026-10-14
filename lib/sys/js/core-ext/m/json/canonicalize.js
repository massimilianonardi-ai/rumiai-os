
function canonicalize(path)
{
  var _path = "";
  var residualPath = path;
  while(0 < residualPath.length)
  {
    if(residualPath[0] === "[")
    {
      if(residualPath[1] !== "\"" && residualPath[1] !== "'")
      {
        var index = residualPath.indexOf("]");
        _path += residualPath.substring(0, index) + "]";
        residualPath = residualPath.substring(index + 1);
      }
      else
      {
        var index = residualPath.length - 2;
        var escape = false;
        for(var i = 2; i < residualPath.length - 2; i++)
        {
          if(escape === false && (residualPath[i] === "\"" || residualPath[i] === "'") && residualPath[i + 1] === "]")
          {
            index = i;
            break;
          }
          else if(escape === false && residualPath[i] === "\\")
          {
            escape = true;
          }
          else if(escape === true)
          {
            escape = false;
          }
        }
        _path += residualPath.substring(0, index) + "\"]";
        residualPath = residualPath.substring(index + 2);
      }
    }
    else if(residualPath[0] === ".")
    {
      residualPath = residualPath.substring(1);
      var index = residualPath.length;
      var index1 = residualPath.indexOf(".");
      var index2 = residualPath.indexOf("[");
      if(index1 === -1 && index2 === -1)
      {
      }
      else if(index1 === -1)
      {
        index = index2;
      }
      else if(index2 === -1)
      {
        index = index1;
      }
      else
      {
        index = Math.min(index1, index2);
      }
      
      _path += "[" + JSON.stringify(residualPath.substring(0, index)) + "]";
      residualPath = residualPath.substring(index);
    }
    else
    {
      throw new SyntaxError();
    }
  }
  
  return _path;
}
