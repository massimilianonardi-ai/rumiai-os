
function translate(source, language, sectionBegin, sectionEnd, directiveBegin, directiveEnd, elementSeparator)
{
  if(typeof source !== "string")
  {
    throw new TypeError();
  }
  
  var lang = language;
  if(!(typeof lang === "object" && typeof lang.get === "function"))
  {
    lang = g.lang || m.global.lang;
    if(!(typeof lang === "object" && typeof lang.get === "function"))
    {
      throw new ReferenceError();
    }
  }
  
  var _sectionBegin = sectionBegin;
  if(typeof _sectionBegin !== "string")
  {
    _sectionBegin = "<!--";
  }
  
  var _sectionEnd = sectionEnd;
  if(typeof _sectionEnd !== "string")
  {
    _sectionEnd = "-->";
  }
  
  var _directiveBegin = directiveBegin;
  if(typeof _directiveBegin !== "string")
  {
    _directiveBegin = "#translate:";
  }
  
  var _directiveEnd = directiveEnd;
  if(typeof _directiveEnd !== "string")
  {
    _directiveEnd = ";";
  }
  
  var separator = elementSeparator;
  if(typeof separator !== "string")
  {
    separator = ",";
  }
  
  var indexStart = source.indexOf(_sectionBegin);
  if(-1 < indexStart)
  {
    var indexEnd = source.indexOf(_sectionEnd, indexStart);
    if(-1 < indexEnd)
    {
      var directives = source.substring(indexStart + _sectionBegin.length, indexEnd);
      var translated = source.substring(0, indexStart) + source.substring(indexEnd + _sectionEnd.length);
      
      var indexStart = directives.indexOf(_directiveBegin);
      if(-1 < indexStart)
      {
        var indexEnd = directives.indexOf(_directiveEnd, indexStart);
        if(-1 < indexEnd)
        {
          var directive = directives.substring(indexStart + _directiveBegin.length, indexEnd);
          var strings = directive.split(separator);
          strings.sort(function(a, b){return (a.length > b.length ? -1 : 1);});
          for(var i = 0; i < strings.length; i++)
          {
            var string = strings[i].trim();
            var translation = lang.get(string);
            translated = translated.replace(new RegExp(string, "g"), translation);
          }

          return translated;
        }
      }
    }
  }
  
  return source;
}
