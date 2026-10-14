
//var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
//var FN_ARG_SPLIT = /,/;
//var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
//var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
////                   /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$

function decompile(func)
{
  var source = func;
  
  if(typeof func === "function")
  {
    source = func.toString();
  }
  else if(typeof func !== "string")
  {
    throw new TypeError();
  }
  
  source += "\n";
  
  // index of " ' // /* {
  // if min is {, then start of function body
  // last index of " ' // */ }
  // if max is }, then end of function body and signature is clean from comments
  // else relace comments with a number of spaces equal to number of comment characters
  // OR
  // parse first line if { is min, then start
  // if // is min, then ignore and repeat for next line
  // if /* is min, then jump at next index of */ and repeat
  //
  
//  var indexBodyStart = 0;
//  var indexBodyEnd = source.length;
  var indexBracketStart = 0;
  var indexCommentStart = 0;
  var indexCommentLineStart = 0;
  var index = 0;
  
//  do
//  {
//    indexBracketStart = source.indexOf("{", index);
//    indexCommentStart = source.indexOf("/*", index);
//    indexCommentLineStart = source.indexOf("//", index);
//    
//    if(indexCommentStart < indexBracketStart && indexCommentStart < indexCommentLineStart)
//    {
//      index = source.indexOf("*/", index);
//    }
//    else if(indexCommentLineStart < indexBracketStart && indexCommentLineStart < indexCommentStart)
//    {
//      index = source.indexOf("\n", index);
//    }
//  }
//  while(!(indexBracketStart < indexCommentStart && indexBracketStart < indexCommentLineStart))
  
  var indexBracketEnd = 0;
  var indexCommentEnd = 0;
  var indexCommentLineEnd = 0;
  index = source.length;
//  indexBodyStart = indexBracketStart;
  
//  do
//  {
//    indexBracketEnd = source.lastIndexOf("}", index);
//    indexCommentStart = source.lastIndexOf("/*", index);
//    indexCommentLineStart = source.lastIndexOf("//", index);
//    indexCommentEnd = source.lastIndexOf("*/", index);
//    indexCommentLineEnd = source.lastIndexOf("\n", index);
//    
//    if(indexCommentStart < indexBracketEnd && indexBracketEnd < indexCommentEnd)
//    {
//      index = indexCommentStart;
//    }
//    else if(indexCommentLineStart < indexBracketEnd && indexBracketEnd < indexCommentLineEnd)
//    {
//      index = indexCommentLineStart;
//    }
//    else
//    {
//      break;
//    }
//  }
//  while(true)
  
  indexBracketStart = source.indexOf("{");
  indexBracketEnd = source.lastIndexOf("}");
  
  var decompiledSource = {};
//  decompiledSource.signature = source.slice(0, indexBracketStart);
  decompiledSource.body = source.slice(indexBracketStart + 1, indexBracketEnd);
  console.log(decompiledSource);
  
  return decompiledSource;
}
