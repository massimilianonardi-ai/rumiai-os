
var timestamp = Date.now;
//var timestamp = m.util.timestamp;
//var timestamp = util.timestamp;

function performance(test, context, args, accuracy, accuracyFast)
{
  if(typeof test !== "function")
  {
    throw new TypeError();
  }
  
  var _accuracy = 1000;
  var _accuracyFast = 100;
  
  if(typeof accuracy === "number")
  {
    _accuracy = accuracy;
  }
  
  if(typeof accuracyFast === "number")
  {
    _accuracyFast = accuracyFast;
  }
  
  var t1 = timestamp();
  var t2 = t1;
  
  var count = 0;
  
  while((t2 - t1) < _accuracyFast)
  {
    test.apply(context, args);
    t2 = timestamp();
    count++;
  }
  
  var dt = t2 - t1;
  
  if(dt < _accuracy)
  {
    count = Math.ceil(count * _accuracy / _accuracyFast);
  }
  else
  {
    count = 1;
  }
  
  t1 = timestamp();
  for(var i = 0; i < count; i++)
  {
    test.apply(context, args);
  }
  t2 = timestamp();
  
  dt = t2 - t1;
  var empty = function(){};
  
  t1 = timestamp();
  for(var i = 0; i < count; i++)
  {
    empty.apply(context, args);
  }
  t2 = timestamp();
  
  var dte = (t2 - t1);
  
  t1 = timestamp();
  for(var i = 0; i < count; i++)
  {
  }
  t2 = timestamp();
  
  var dtl = (t2 - t1);
  
  var dtne = dt - dte;
  var dtnl = dt - dtl;
  
  var p = {};
  p.ops_per_sec = count * 1000 / dtnl;
  p.ops_per_sec_body = count * 1000 / dtne;
  p.avg_ms_per_exec = dtnl / count;
  p.avg_ms_per_exec_body = dtne / count;
  p.num_tests = count;
  console.log("performance", p);
  
  return p;
}
