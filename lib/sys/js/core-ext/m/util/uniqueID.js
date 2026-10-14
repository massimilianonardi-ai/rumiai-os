
var uniqueIDSequence = 0;

function uniqueID()
{
  return Math.floor((uniqueIDSequence++ + Math.random()) * 1000);
//  var id = "" + new Date().getTime() + "_" + Math.random().toString().substring(2);
//  var date = new Date();
//  return date.getSeconds() * 1000 + date.getMilliseconds();
//  return new Date().getTime() + Math.random();
}
