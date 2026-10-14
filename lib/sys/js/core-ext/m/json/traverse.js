
function traverse(o, f)
{
  var nodes = [];
  var paths = [];
  var calcs = [];
  
  var _traverse = function(o, f, path, pathArray, parents, parentsPaths)
  {
    if(-1 !== nodes.indexOf(o) && typeof o === "object" && o !== null)
    {
      return;
    }
    
    var c;
    if(typeof f === "function")
    {
      c = f(o, path, pathArray, parents, parentsPaths);
    }
    
    nodes.push(o);
    paths.push(path);
    calcs.push(c);
    
    if(typeof o !== "object" || o === null)
    {
      return;
    }
    
    var _parents = Array.from(parents);
    _parents.unshift(o);
    
    var _parentsPaths = Array.from(parentsPaths);
    _parentsPaths.unshift(path);
    
    for(var k in o)
    {
      var p = !isNaN(k) ? path + "[" + k + "]" : path + "[" + JSON.stringify(k) + "]";
      var pa = Array.from(pathArray);
      pa.push(k);
      
      _traverse(o[k], f, p, pa, _parents, _parentsPaths);
    }
  };
  
  _traverse(o, f, "", [], [], []);
  
  return {nodes: nodes, paths: paths, calcs: calcs};
}

traverse.advanced = function(o, fAnte, fPost, fRecurse)
{
  var nodes = [];
  var paths = [];
  var calcsAnte = [];
  var calcsPost = [];
  
  var _traverse = function(o, fAnte, fPost, fRecurse, path, pathArray, parents, parentsPaths)
  {
    if(-1 !== nodes.indexOf(o) && typeof o === "object" && o !== null)
    {
      return;
    }
    
    var calcAnte;
    if(typeof fAnte === "function")
    {
      calcAnte = fAnte(o, path, pathArray, parents, parentsPaths);
    }
    
    if(typeof o === "object" && o !== null && (typeof fRecurse !== "function" || (typeof fRecurse === "function" && fRecurse(o, path, pathArray, parents))))
    {
      var _parents = Array.from(parents);
      _parents.unshift(o);
      
      var _parentsPaths = Array.from(parentsPaths);
      _parentsPaths.unshift(path);
      
      for(var k in o)
      {
        var p = !isNaN(k) ? path + "[" + k + "]" : path + "[" + JSON.stringify(k) + "]";
        var pa = Array.from(pathArray);
        pa.push(k);

        _traverse(o[k], fAnte, fPost, fRecurse, p, pa, _parents, _parentsPaths);
      }
    }
    
    var calcPost;
    if(typeof fPost === "function")
    {
      calcPost = fPost(o, path, pathArray, parents, parentsPaths);
    }
    
    nodes.push(o);
    paths.push(path);
    calcsAnte.push(calcAnte);
    calcsPost.push(calcPost);
  };
  
  _traverse(o, fAnte, fPost, fRecurse, "", [], [], []);
  
  return {nodes: nodes, paths: paths, calcs: calcsAnte};
};
