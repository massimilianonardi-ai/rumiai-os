
function test()
{
  var t = new m.test.Test();
  t
  .env.common
//  .env.browser
//  .perf(test_perf)
  //.perf(function(){})
  //.perf(function(){typeof undefined;})
  //.perf(function(){t.constructor;})
  //.perf(function(){t.constructor === Boolean;})
  //.perf(function(){t instanceof Boolean;})
  //.perf(function(){Object.prototype.toString.call(t);})
  //.perf(function(){Object.prototype.toString.call(t).slice(8, -1);})
  //.perf(function(){Object.prototype.toString.call(t) === "[object Object]";})
  //.perf(function(){Object.prototype.toString.call(t).slice(8, -1) === "Object";})
  //.perf((b = new Boolean(), function(){Object.prototype.toString.call(b) === "[object Boolean]";}))
  //.perf(function(){Object.prototype.toString.call(Boolean).slice(8, -1) === "Object";})
  //.log(m.util.decompile, true, [m.util.Test])
  //.log(test_decompile)
  //.log(test_clone)
  //.log(test_merge)
  //.log(test_link)
  //.log(test_Event)
//  .log(test_Class)
  //.log(test_ClassSimple, {myprop: "myval"}, [t, m, m.Class])
  //.log(test_ClassSimple)
  //.log(test_ClassInstantiation)
  //.log(test_ClassInheritance)
  //.log(test_ClassInheritanceDynamic)
  //.log(test_ClassProperties)
  //.log(test_ClassPrivate)
  //.log(test_ClassTrigger)
  //.log(test_ClassEvent)
  //.log(test_Data)
  //.log(test_Configuration)
  //.exec()
  .env.browser
  .log(test_UI)
  .exec()
  ;
}

function test_perf()
{
}

function test_decompile(m, log)
{
  var decompile = m.compile.decompile;
  
  function f()
  {
    //
  }
  
  var g = function()
  {
    //
  };
  
  var h = "";
  h += "\n";
  h += "function h()\n";
  h += "{\n";
  h += "}\n";
  h += "\n";
  
  var res = [decompile(f), decompile(g), decompile(h)];
  log(res);
  
  return res;
}

function test_link()
{
  console.log("util", m.util);
  console.log("util.link", m.util.link.toString());
  
  var a = 
  {
    p1: 1,
    p2: "val_2",
    p3: ["p3_1", 2, [10, 20, 30], {p3_4_p1: "val_p3_4_p1"}],
    p4:
    {
      p4_1: 41,
      p4_2: "val_p4_2",
      p4_3: ["p4_3_1", 432, [4331, 4332], {p4_3_4_p1: "val_p4_3_4_p1"}]
    }
  };
  var b = 
  {
    p5: 5,
    p6: "val_6",
    p7: ["p7_1", 7, [10, 20, 30], {p7_4_p1: "val_p7_4_p1"}],
    p8:
    {
      p8_1: 81,
      p8_2: "val_p8_2",
      p8_3: ["p8_3_1", 832, [8331, 8332], {p8_3_4_p1: "val_p8_3_4_p1"}]
    }
  };
  console.log("merge", a, b, m.util.link(a, b));
  
  var a = 
  {
    p1: 1,
    p2: "val_2",
    p3: ["p3_1", 2, [10, 20, 30], {p3_4_p1: "val_p3_4_p1"}],
    p4:
    {
      p4_1: 41,
      p4_2: "val_p4_2",
      p4_3: ["p4_3_1", 432, [4331, 4332], {p4_3_4_p1: "val_p4_3_4_p1"}]
    }
  };
  var b = 
  {
    p5: 5,
    p6: "val_6",
    p7: ["p7_1", 7, [10, 20, 30], {p7_4_p1: "val_p7_4_p1"}],
    p8:
    {
      p8_1: 81,
      p8_2: "val_p8_2",
      p8_3: ["p8_3_1", 832, [8331, 8332], {p8_3_4_p1: "val_p8_3_4_p1"}]
    }
  };
  console.log("merge", a, b, m.util.link(a, b));
}

function test_clone()
{
  console.log("util", m.util);
//  console.log("util.clone", m.util.clone.toString());
  
  var a = 
  {
    p1: 1,
    p2: "val_2",
    p3: ["p3_1", 2, [10, 20, 30], {p3_4_p1: "val_p3_4_p1"}],
    p4:
    {
      p4_1: 41,
      p4_2: "val_p4_2",
      p4_3: ["p4_3_1", 432, [4331, 4332], {p4_3_4_p1: "val_p4_3_4_p1"}]
    }
  };
  
  a.p4.a = a;
//  Object.freeze(a);
//  Object.seal(a);
  var t = m.util.clone(a, true);
  console.log("clone", t, a);
  t.p1 = 1000;
  t.p4.p4_1 = 41000;
  t.p5 = 5000;
  t.p4.p4_1 = 81000;
  t.p4.p4_3[1] = 832000;
  t.p4.p4_3[2][0] = 8331000;
  
  console.log("clone", t, a);
}

function test_merge()
{
  console.log("util", m.util);
//  console.log("util.merge", m.util.merge.toString());
  
  var a = 
  {
    p1: 1,
    p2: "val_2",
    p3: ["p3_1", 2, [10, 20, 30], {p3_4_p1: "val_p3_4_p1"}],
    p4:
    {
      p4_1: 41,
      p4_2: "val_p4_2",
      p4_3: ["p4_3_1", 432, [4331, 4332], {p4_3_4_p1: "val_p4_3_4_p1"}]
    }
  };
  
  var b = 
  {
    p5: 5,
    p6: "val_6",
    p7: ["p7_1", 7, [10, 20, 30], {p7_4_p1: "val_p7_4_p1"}],
    p4:
    {
      p4_1: 81,
      p4_2: "val_p8_2",
      p4_3: ["p8_3_1", 832, [8331, 8332], {p8_3_4_p1: "val_p8_3_4_p1"}]
    }
  };
  
  var t = undefined;
//  t = m.util.merge(t, a, 2);
//  t = m.util.merge({}, a, 2);
//  t = m.util.merge(a, b, 2);
//  t = m.util.merge(a, b, true);
//  t = m.util.merge(a, b, false, true);
//  t = m.util.merge(a, b, 2, true);
//  console.log("merge", t, a, b);
  b.p4.b = b;
  var f = function(){console.log("f");};
//  f = {};
  f.p4 = a.p4;
  f.p4.b = b;
  var g = function(){console.log("g");};
  g.p4 = b.p4;
//  t = m.util.merge(f, g, 2, true, true);
//  console.log("merge", t, {c: f}, {c: g});
//  t = m.util.merge(f, b, 2, true, true);
  t = m.util.merge(f, b, true, 1, true);
//  t = m.util.merge(f, b, true, true, true);
  console.log("merge", t, {f: f}, {b: b});
  t.p1 = 1000;
  t.p4.p4_1 = 41000;
  t.p5 = 5000;
  t.p4.p4_1 = 81000;
  t.p4.p4_3[1] = 832000;
  t.p4.p4_3[2][0] = 8331000;
  t.p4.p4_3[5] = 832000;
  t.p4.p4_3[6][0] = 8331000;
  
//  t = undefined;
//  t = m.util.merge(t, a, true)
//  console.log("merge", t, a);
}

function test_Event()
{
  var f = function(){console.log({c: this}, arguments);};
  var Event = m.event.Event;
  console.log({c: Event});
  Event(Event, "evt01");
  console.log({c: Event});
  Event.event.evt01.register(f);
  Event.event.evt01.notify(["my notification"]);
  Event(Event, "evt02");
  console.log({c: Event});
  Event(Event, "evt03", undefined, "custom_event");
  console.log({c: Event});
  Event(Event, ["evt04", "evt05"]);
  console.log({c: Event});
  Event.event.evt04.register(f, "path01");
  Event.event.evt04.notify(["my global notification"]);
  Event.event.evt04.notify("path01", ["my path01 notification"]);
  Event.event.evt05.notify(["child - my global notification"]);
  Event.event.evt05.notify("path01", ["child - my path01 notification"]);
}

function test_Class()
{
  Class = window.Class = m.Class;
  console.log("Class", Class.toString());
  
  Test = window.Test = function(){return Test.Class.construct(this, arguments);};
  ClassTest = window.ClassTest = window.Class(Test);
  console.log("ClassTest", ClassTest);
}

function test_ClassSimple()
{
  console.log("new", new Test());
  console.log("call", Test());
}

function test_ClassInstantiation()
{
  var testInstance = function(invokeNew, invokeFunction, singletonNew, singletonFunction)
  {
    console.log("invokeNew", "invokeFunction", "singletonNew", "singletonFunction", invokeNew, invokeFunction, singletonNew, singletonFunction);
    
    ClassTest.instance(invokeNew, invokeFunction, singletonNew, singletonFunction, false);
    console.log("Test.Class.construct - after instance", Test.Class.construct.toString());
    
    var t_inst = undefined; try{t_inst = new Test();}catch(e){console.log("exception", {exception: e});};
    console.log("Test.Class.construct - after new", {construct: Test.Class.construct.toString()});
    var t_stat = undefined; try{t_stat = Test();}catch(e){console.log("exception", {exception: e});};
    console.log("Test.Class.construct - after call", {construct: Test.Class.construct.toString()});
    
    // check again inverting new/call
    ClassTest.instance(invokeNew, invokeFunction, singletonNew, singletonFunction);
    console.log("Test.Class.construct - after instance", {construct: Test.Class.construct.toString()});
    
    var t_stat = undefined; try{t_stat = Test();}catch(e){console.log("exception", {exception: e});};
    console.log("Test.Class.construct - after call", {construct: Test.Class.construct.toString()});
    var t_inst = undefined; try{t_inst = new Test();}catch(e){console.log("exception", {exception: e});};
    console.log("Test.Class.construct - after new", {construct: Test.Class.construct.toString()});
    
    console.log("new", t_inst, "call", t_stat);
    console.log("");
    console.log("");
    console.log("");
  };
  
  testInstance(false, false, false, false);
  testInstance(false, false, false, true);
  testInstance(false, false, true, false);
  testInstance(false, false, true, true);
  
  testInstance(false, true, false, false);
  testInstance(false, true, false, true);
  testInstance(false, true, true, false);
  testInstance(false, true, true, true);
  
  testInstance(true, false, false, false);
  testInstance(true, false, false, true);
  testInstance(true, false, true, false);
  testInstance(true, false, true, true);
  
  testInstance(true, true, false, false);
  testInstance(true, true, false, true);
  testInstance(true, true, true, false);
  testInstance(true, true, true, true);
  
  ClassTest.instance(true, true, true, true, false);
  ClassTest._instance = new Function();
  console.log(ClassTest._instance, ClassTest._instance instanceof Test);
  Test();
  console.log(ClassTest._instance);
  ClassTest.instance(true, true, false, false);
}

function test_ClassInheritance()
{
  function b1(){if(this instanceof b1){console.log("this instanceof b1");}else{console.log("this not instanceof b1");}};
  b1.prototype.name = "b1";
  ClassTest.inherit(b1);
  console.log(ClassTest, new Test());
  
  function b2(){if(this instanceof b2){console.log("this instanceof b2");}else{console.log("this not instanceof b2");}};
  b2.prototype.name = "b2";
  ClassTest.inherit(b2);
  console.log(ClassTest, new Test());
  
  function b3(){if(this instanceof b3){console.log("this instanceof b3");}else{console.log("this not instanceof b3");}};
  b3.prototype.name = "b3";
  ClassTest.inherit(b3);
  console.log(ClassTest, new Test());
  
  ClassTest.inherit();
  console.log(ClassTest, new Test());
  
  function b11(){return b11.Class.construct(this, arguments);};
  Class(b11).inherit(b1);
  b11.prototype.construct = function(){console.log("b11 construct", arguments);};
  b11.prototype.stateless = function(){console.log("b11 stateless", arguments);};
  ClassTest.inherit(b11);
  b11.prototype.name = "b11";
  console.log(ClassTest, Class(b11), new Test(), new b11());
  
  ClassTest.inherit().compose("test_b2", b2);
  console.log(ClassTest, new Test());
  
  ClassTest.inherit();
  
  function c1(){return c1.Class.construct(this, arguments);}
  Class(c1).instance(true,true,true,false);
  c1.prototype.construct = function(){console.log("c1 construct", arguments);};
  c1.prototype.stateless = function(){console.log("c1 stateless", arguments);};
  ClassTest.inherit(c1).inherit(b11);
//  Test.prototype.construct = function(){m.global.log.debug("Test construct", arguments);};
  Test.prototype.construct = function(){console.log("Test construct", arguments);};
  Test.prototype.stateless = function(){console.log("Test stateless", arguments);};
  console.log(ClassTest, new Test());
  console.log(ClassTest, Test());
}

function test_ClassInheritanceDynamic()
{
  ClassTest.inherit();
  ClassTest.inherit(Object);
  
  function b1(){console.log("construct b1");};
  b1.prototype.n1 = "b1_1";
  b1.prototype.n2 = "b1_2";
  b1.prototype.n3 = "b1_3";
  b1.prototype.n4 = "b1_4";
  ClassTest.inherit(b1, true);
  console.log(ClassTest, new Test());
  
  function b2(){return b2.Class.construct(this, arguments);};
  Class(b2).inherit(Object).inherit(b1, true, ["p1"]);
  b2.prototype.construct = function(){console.log("b2 construct", arguments);};
  b2.prototype.stateless = function(){console.log("b2 stateless", arguments);};
  b2.prototype.n1 = "b2_1";
  b2.prototype.n2 = "b2_2";
  ClassTest.inherit(b2, true);
  console.log(ClassTest, new Test());
  
  ClassTest.inherit(b2, true, ["p1", "p2", "p3"]);
  Test.prototype.n1 = "Test_1";
  console.log(ClassTest, new Test());
  
  var t = new Test();
  b1.prototype.n1 = "b1_1_mod_should_not_see_me";
  b2.prototype.n2 = "b2_2_mod";
  t.n3 = "t_3";
  console.log("t", t);
  console.log("Test n1", Test.prototype.n1, Object.getOwnPropertyDescriptor(Test.prototype, "n1"));
  console.log("Test n2", Test.prototype.n2, Object.getOwnPropertyDescriptor(Test.prototype, "n2"));
  console.log("Test n3", Test.prototype.n3, Object.getOwnPropertyDescriptor(Test.prototype, "n3"));
  console.log("Test n4", Test.prototype.n4, Object.getOwnPropertyDescriptor(Test.prototype, "n4"));
//  b2.prototype.n4 = "b2_4_mod_test_half_reflection_(broken)";
  b1.prototype.n4 = "b1_4_mod_test_deep_reflection";
  b1.prototype.p1 = "b1_p1_mod_test_deep_reflection";
  b2.prototype.p2 = "b2_p2_mod_test_deep_reflection";
  console.log("Test own properties", Object.getOwnPropertyNames(Test.prototype));
  console.log("t own properties", Object.getOwnPropertyNames(t));
  console.log(ClassTest, new Test());
  console.log(ClassTest, Test());
}

function test_ClassProperties()
{
  ClassTest.inherit();
  ClassTest.inherit(Object);
  
  var t = new Test();
  ClassTest.compose("c1");
  ClassTest.compose("c2", 3);
  ClassTest.compose("c3", ["test"]);
  ClassTest.property("p1");
  ClassTest.property("p2", undefined);
//  ClassTest.property("p3", 5);
//  ClassTest.property("p4", 7);
  ClassTest.property("p3", {p3_1: "test"});
  ClassTest.property("p4", ["p4_1", "p4_2"]);
  ClassTest.getter("p4", function(value){console.log(this, "p4 getter", value); return value;});
  ClassTest.setter("p4", function(value){console.log(this, "p4 setter", arguments); return value;});
  ClassTest.listener("p4", function(value, prev, args){console.log(this, "p4 listener", value, prev, args);});
  Class.property(t, "p5", {value: 9, getter: function(value){console.log(this, "p4 getter", value); return value;}, setter: function(value){console.log(this, "p4 setter", arguments); return value;}, listener: function(value, prev, args){console.log(this, "p4 listener", value, prev, args);}});
  t.p1(1);
  console.log("t.p1", t.p1());
  t.p2(3);
  console.log("t.p2", t.p2());
//  t.p3(53);
  console.log("t.p3", t.p3());
//  t.p4(74);
  console.log("t.p4", t.p4());
  t.p5(95);
  console.log("t.p5", t.p5());
  console.log("t", t);
  
  console.log("new", new Test());
  console.log("call", Test());
}

function test_ClassPrivate()
{
  ClassTest.inherit();
  ClassTest.inherit(Object);
  
  var t = new Test();
  Test.prototype.pri = function()
  {
    var _this = this;
    var f = function()
    {
      console.log(_this, this, f.caller, f.caller.caller,  f.caller.caller.caller);
      console.log(_this, this, f.caller.name, f.caller.caller.name,  f.caller.caller.caller.name, new Error(), {e: new Error()}, new Error().stack.toString().split(" "));
    };
    f();
  };
  t.pri();
  var ttt = {tt: t};
  ttt.tt.pri();
  ClassTest.internal("p1");
  ClassTest.internal("p2", undefined);
  ClassTest.internal("p3", 5);
  console.log("t.p1", t._private_p1);
  console.log("t.p2", t._private_p2);
  console.log("t.p3", t._private_p3);
  t._private_p3 = "ok";
  console.log("t.p3", t._private_p3);
  console.log("t", t);
  
  console.log("new", new Test());
  console.log("call", Test());
}

function test_ClassTrigger()
{
  ClassTest.inherit();
  ClassTest.inherit(Object);
  
  var a = {f: function(value){console.log("f - value", value);}};
  
  a.f(5);
  var t1 = function(value){console.log("trigger 1 - value", value);};
  var t2 = function(value){console.log("trigger 2 - value", value);};
  var t3 = function(value){console.log("trigger 3 - value", value);};
  Class.trigger(a, "f", t1, true);
  Class.trigger(a, "f", t2, false);
  Class.trigger(a, "f", t3);
  console.log(a, a.f.toString());
  a.f(7);
  Class.untrigger(a, "f", t1);
  console.log(a, a.f.toString());
  Class.untrigger(a, "f", t2);
  console.log(a, a.f.toString());
  Class.untrigger(a, "f", t3);
  console.log(a, a.f.toString());
  
  ClassTest.method("f", a.f);
  ClassTest.trigger("f", t1, true);
  ClassTest.trigger("f", t2, false);
  ClassTest.trigger("f", t3);
  console.log({c: Test}, Test.prototype.f.toString());
  ClassTest.untrigger("f", t1);
  ClassTest.untrigger("f", t2);
  ClassTest.untrigger("f", t3);
  console.log({c: Test}, Test.prototype.f.toString());
  ClassTest.trigger("g", t3);
  
  console.log("new", new Test());
  console.log("call", Test());
}

function test_ClassEvent()
{
  ClassTest.inherit();
  ClassTest.inherit(Object);
  ClassTest.event("e1");
  ClassTest.event(["e2", "e3"]);
  ClassTest.event("e4", true);
  ClassTest.event(["e5", "e6"], true);
  
  var t = new Test();
  console.log({c: Test}, t);
  var f = function(){console.log({c: this}, arguments);};
  t.event.e2.register(f);
  t.event.e2.notify(["my notification"]);
  var fe5p = function(){console.log("fe5_path_01", {c: this}, arguments);};
  var fe6 = function(){console.log("fe6", {c: this}, arguments);};
  var fe6p = function(){console.log("fe6_path_01", {c: this}, arguments);};
  Test.event.e5.register(fe5p, "path01");
  Test.event.e5.notify(["my global notification"]);
  Test.event.e5.notify("path01", ["my path01 notification"]);
  Test.event.e6.register(fe6p, "path01");
  Test.event.e6.register(fe6);
  Test.event.e6.notify(["my global notification"]);
  Test.event.e6.notify("path01", ["my path01 notification"]);
  console.log(t.event.e2.notify(), Test.event.e5.notify());
  
  console.log("new", new Test());
  console.log("call", Test());
}

function test_Data()
{
  //
}

function test_Configuration(m, log)
{
  var Configuration = m.conf.Configuration;
  
  var c = new Configuration();
  
  var a = 
  {
    p1: 1,
    p2: "val_2",
    p3: ["p3_1", 2, [10, 20, 30], {p3_4_p1: "val_p3_4_p1"}],
    p4:
    {
      p4_1: 41,
      p4_2: "val_p4_2",
      p4_3: ["p4_3_1", 432, [4331, 4332], {p4_3_4_p1: "val_p4_3_4_p1"}]
    }
  };
  
  var b = 
  {
    p5: 5,
    p6: "val_6",
    p7: ["p7_1", 7, [10, 20, 30], {p7_4_p1: "val_p7_4_p1"}],
    p4:
    {
      p4_1: 81,
      p4_2: "val_p8_2",
      p4_3: ["p8_3_1", 832, [8331, 8332], {p8_3_4_p1: "val_p8_3_4_p1"}]
    }
  };
  
  var f = function(){log("configuration listener", this, arguments);};
  
  c.register(f);
  
  log(c.get("p2"), c.get("p6"), c.get("p4"));
  
  c.data(a);
  log(c.get("p2"), c.get("p6"), c.get("p4"));
  c.data(b);
  log(c.get("p2"), c.get("p6"), c.get("p4"));
}

function test_UI()
{
//data.Data.prototype._provider.create("mymod", "this.a=5;b=7;var c=9;console.log('mymod', this);", undefined, true, function(){console.log("success");}, function(){console.log("error");}, this);
//new mod.Module().code("console.log(this, arguments);").parent({test: true}).exec();
//var d = new data.Data().path("mymod");

//var d = new data.Data().path("file/app/intro.js");
//d.eventDataLoad = function(path, data, meta, status)
//{
////  console.log(data);
//  new mod.Module().code(data).parent({test: true}).exec();
//};
//d.load();
//var mmm = new mod.Module().path("file/app/intro.js").parent({test: true}).load();

//var mmm = new mod.Module().path("file/app/main.js").parent({test: true}).exports(["zzz", "yyy"]).params({p1:"p1 value", p2:"p2 value", p3:"p3 value"}).prefix("a = this;\n").load();

//new sys.web.DataProviderNet().load("data/system/auth/users", {type: "json"}, true, function(){console.log("success", this, arguments);}, function(){console.log("error", this, arguments);}, this);
//new sys.web.DataProviderNet().load("data/system/auth/users", {type: "json"}, false, function(){console.log("success", this, arguments);}, function(){console.log("error", this, arguments);}, this);
//new sys.web.DataProviderNet().load("data/system/auth/users", {type: ""}, false, function(){console.log("success", this, arguments);}, function(){console.log("error", this, arguments);}, this);
//new sys.web.DataProviderNet().load("file/app/main.js", {type: ""}, true, function(){console.log("success", this, arguments);}, function(){console.log("error", this, arguments);}, this);



//  window.elem = new ui.Element();
//  window.elem.parent(0);
//  window.elem.data("http://www.ikozmik.com/Content/html-css-javascript-tricks-for-mobile-websites/html-css-javascript-featured.jpg");
//  window.e2 = new ui.Control().parent(0).meta({type: "list"}).data(["first", "2nd", "etc."]);
////  conf.data(
////  {
////    ui:
////    {
////      Select:
////      {
////        event:
////        {
////          map:
////          {
////            select: "contextmenu"
////          }
////        }
////      }
////    }
////  });
//  window.e3 = new ui.Select().parent(0).meta({type: "list"}).data(["first", "2nd", "etc."]);
//  window.e4 = new ui.Tabs().parent(0).meta({type: "table"}).data([[0, "first", new ui.Element().data("test")], [1, "2nd", "Select", {type: "table"}, [[0, "first"]]], [3, "etc."]]);
  
//  window.elem = new ui.Element();
//  window.elem.element.parent(0);
//  window.elem.element.data("http://www.ikozmik.com/Content/html-css-javascript-tricks-for-mobile-websites/html-css-javascript-featured.jpg");
//  window.e2 = new ui.Control().element.parent(0).meta({type: "list"}).data(["first", "2nd", "etc."])._classinstance._parent;
//  window.e3 = new ui.Select().element.parent(0).meta({type: "list"}).data(["first", "2nd", "etc."])._classinstance._parent;
//  window.e4 = new ui.Tabs().element.parent(0).meta({type: "table"}).data([[0, "first", new ui.Element().element.data("test")._classinstance._parent], [1, "2nd", "Select", {type: "table"}, [[0, "first"]]], [3, "etc."]])._classinstance._parent;
  
  window.elem = new ui.Element().parent(0).data("http://www.ikozmik.com/Content/html-css-javascript-tricks-for-mobile-websites/html-css-javascript-featured.jpg");
  window.e2 = new ui.Button().parent(0).meta({type: "list"}).data(["first", "2nd", "etc."]);
  window.e3 = new ui.Select().parent(0).meta({type: "list"}).data(["first", "2nd", "etc."]);
  window.e4 = new ui.Tabs().parent(0).meta({type: "table"}).data([["first", new ui.Element().data("test")], ["2nd", "Select", {type: "table"}, [[0, "first"]]], ["etc."]]);
  
//  var t1 = 0;
//  var t2 = 0;
//  var context = {};
//  function ft(){console.log("test function"); for(var i = 0; i < 1000000; i++){};}
//  
//  t1 = Date.now();
//  ft();
//  t2 = Date.now();
//  console.log(t2 - t1);
//  
//  t1 = Date.now();
//  ft.apply(context);
//  t2 = Date.now();
//  console.log(t2 - t1);
}
