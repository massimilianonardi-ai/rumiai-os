
//------------------------------------------------------------------------------
// Functions -------------------------------------------------------------------
//------------------------------------------------------------------------------

function changeStyle(value, prev)
{
  var css_layout = document.getElementById("css_layout");
  var css_style = document.getElementById("css_style");
  
  new m.ui.CSS().id("css_layout").path(this.root + "/style/" + value + "/layout.css");
  new m.ui.CSS().id("css_style").path(this.root + "/style/" + value + "/style.css");
  
  if(css_layout !== null)
  {
    css_layout.parentNode.removeChild(css_layout);
  }
  
  if(css_style !== null)
  {
    css_style.parentNode.removeChild(css_style);
  }
}

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

/*

var app = new m.App(this);
or
var app = m(this);
or
var app = m(); -> NO! not working in strict mode

scopes:
global: log, noti, session
app: conf, queue
both overlayed: lang -> first look into lang of app, then into global lang

m.js is the minimal prerequisite, then m allow dynamic loading of everything: libs and css by javascript-inject or java-service
NB each app is standalone, but new m.App(this) is responsible of returning correct objects (global shared if in a multi app system)
eg parent of iframe or window for multiple divs
App has internally a session manager / login shell with default handling that can be overloaded by an external auth-app

some classes like File/Store/Node depend on engine: on browser they are internally services, on nodejs/electron they are api

an auth-app overrides all Service events related to auth (challenge, qr-code, credentials, lot, pin, etc.) and must match with auth-srv
app-srv injects: m.js, proper auth-app (for specific server authn), conf.json bound to session profile
App, based on preloaded conf provided by server, initializes log level, logger and additional lang (App autoloads lang from parent app if exists)
then, main code is executed
if server can preload everything (conf and lang), then main code can start sequentially, otherwise should be enclosed into closure/function and 
called as callback, but the latter is not desirable for clarity and performance because of many async requests vs sync load

thus server must be able to provide correct lang. while conf by session-profile is easy by using a service that translates "home" path to 
specific user, lang requires specific treatment??? maybe not if using home translation plus symlinking specific lang file???
NB still App is responsible for importing parent app lang, because app containers is entirely managed by client side js

main code is plain js not enclosed into anything executed straightforward and receives: m.js lib and app object

app-conf.json by profile (still not easy): app has different confs with own unrelated names, server must translate abstract generic path to one of these
-> need srv capability to: translate paths based on profile/current-session-lot or simply current session
NB all different app-confs maybe still fully available to anyone iff: do not contain "sensitive" information and resources are filtered by authz

thus authz: translates commands (urls-path) and then authorizes -> same authz but stacked with a translator (same with map-tree)
NB translator after authz is much more easy for conf maintaining, but potentially insecure by accidental misconfiguration, 
while translator before authz, guarrantees perfect security, but requires to explicitly authorize translated path
difference is: authz+tran -> i can change tran path without changing authz path, tran+auth -> if a change tran path, then i must change authz path too

last: conf and lang loaded by init with main function callback + url translation not needed because app creates specific url with profile

authn flow:
App-class listen service events to call authn, App-class provide method to call authn-ui
app-main creates a button to call authn-ui via App-method manually, or at start, or in any other case. app can also use authn api directly
App has a default url for authn, but configurable
App initializes differently for generic app and for authn apps by autodetection
App provides every app (generic and authn) method to invoke authn app or main app to allow main and authn to give control each other
main-app and authn-app can register callbacks for event of receiving control

authn can be a menu-app that is an abstract ui-control that has events clear-all and add/remove and works on a given path, rendering is custom
while generic apps can have a common subclass of menu-app, for authn should be optimized on authn

*/

function App()
{
  return App.Class.construct(this, arguments);
}

Class(App)
.inherit(srv.App)
.compose("authn", new srv.Authentication())
.compose("root", "")
.compose("context", "")
.compose("session", {})
.compose("ui", {})
.compose("styles", [])
.compose("log", log.Log())
.compose("conf", new conf.Configuration())
.compose("lang", new conf.Language())
.compose("queue", new mod.Queue())
.compose("noti", new ui.Notifier())
//.compose("elems", {})
//.compose("list", [])
//.compose("mapStore", function()
//{
//  var _this = this;
//  var store = new store.Store();
//  Class.listener(store, "data", function(value, prev){_this.map(value);});
//  
//  return store;
//})
.event("AuthenticationChanged", function(value, prev)
{
  location.href = location.href;
//  this.rebuild();
})
.property("style", "default")
.listener("style", changeStyle)
//.property("value")
//.getter("value", function(value){return this.get(this.elems);})
//.setter("value", function(value){return this.set(value);})
//.listener("value", function(value, prev){this.update();})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

App.prototype.construct = function()
{
  var _this = this;
//  m.srv.Service.prototype.eventServiceUnauthorized = App.prototype.eventServiceUnauthorized;
//  m.srv.Service.prototype.eventServiceForbidden = App.prototype.eventServiceForbidden;
  srv.Service.prototype.eventServiceUnauthorized = function(){_this.eventServiceUnauthorized.apply(_this, arguments)};
  srv.Service.prototype.eventServiceForbidden = function(){_this.eventServiceForbidden.apply(_this, arguments)};
  
  window.app = this;
  
//  this.log = m.log.Log();
  this.log.add(new m.log.LoggerConsoleSimple());
  
//  this.queue = new mod.Queue();
  
//  this.conf = new conf.Configuration();
  
//  this.lang = new conf.Language();
  
  this.context = root;
  
  if(document.currentScript === null)
//  if(document.currentScript === null || (parent !== null && parent.document.getElementById("authn") !== null))
  {
    this.root = location.pathname.replace("/m/app", "");
  }
  else
  {
    this.root = document.currentScript.src.replace(location.origin, "").replace("/m/app", "").replace(new RegExp("\/([^/]+)$"), "");
  }
  this.root = this.root.substring(1);
  
  if(!(parent !== null && parent.document.getElementById("authn") !== null))
  {
    this.ui.authn = new m.ui.Element("iframe").id("authn");
    this.ui.authn.node.addEventListener("load", this.queue.add(function(event)
    {
      _this.ui.authn.node.contentWindow.location.href = "/m/app/pub/auth";
    }));
    var container = this.ui.authn;
    container.style.zIndex = "2147483647";
    container.style.display = "block";
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.border = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
  //  container.style.overflow = "hidden";
    container.style.overflow = "auto";
    container.style.backgroundColor = "transparent";
  //  this.ui.authn.node.addEventListener("keydown", function(event)
  //  {
  //    console.log("blur");
  //    if(event.keyCode === 27 || event.key === "Escape")
  //    {
  //      _this.ui.authn.visible(false);
  //      _this.show();
  //      return false;
  //    }
  //    
  //    return true;
  //  });
  //  this.ui.authn.node.addEventListener("load", this.queue.add(function(event){location.href = "/m/app/pub/auth";}));
  //  this.ui.authn.node.contentWindow.location.href = "/m/app/pub/auth";
    this.ui.authn.classes.add("auth_container");
    this.ui.authn.visible(false);
    this.ui.authn.parent(0);
    
    this.authn.success(function(){_this.eventAuthenticationChanged();});
  }
  else
  {
    this.ui.authn = parent.document.getElementById("authn").Element;
  }
  
  this.style(this.style());
  
  //m.global.environment = m.util.environment();
  //m.sys[m.global.environment].init();
  
  this.queue.add(function()
  {
    _this
    .success(function(styles)
    {
      console.log("style", styles);
    })
    .error(function()
    {
      console.log("style error");
    })
    .dir(_this.root + "/style")
    ;
  })();
  
  console.log("App", this);
};

//------------------------------------------------------------------------------

App.prototype.init = function(main)
{
  // todo look for parent container-app to integrate environment
  
  var _this = this;
  
  var completed = this.queue.add();
  var _main;
  if(typeof main === "undefined" || main === null)
  {
    _main = completed;
  }
  else if(typeof main !== "function")
  {
    throw new TypeError();
  }
  else
  {
    _main = function()
    {
      main.apply(this, arguments);
      completed();
    };
  }
  
  var eventProfileLoad = function(data)
  {
    console.log("session", data);
    
    data = data || {};
    for(var k in data)
    {
      _this.session[k] = data[k];
    }
//    _this.session.id = data.id;
//    _this.session.profile = data.profile;
//    _this.session.profiles = data.profiles;
    
    if(_this.session.id === null && !(frameElement && frameElement.id === "authn"))
    {
      _this.interrupted = true;
      _this.interrupted = function()
      {
        _this.conf.path(_this.root + "/conf/" + _this.session.profile + ".json")
        .success(eventConfLoad)
        .error(eventConfError)
        .read();
      };
      _this.authentication();
      return;
    }
//    _this.conf.path("conf/conf.json").success(initConfLoad).read();
//    _this.conf.path("conf/${profile}.json").success(initConfLoad).read();
    _this.conf.path(_this.root + "/conf/" + _this.session.profile + ".json")
    .success(eventConfLoad)
    .error(eventConfError)
    .read();
  };
  
  var eventProfileError = function()
  {
    _this.session.id = null;
    _this.session.profile = null;
    _this.session.profiles = null;
    
    eventConfError();
  };
  
  var eventConfLoad = function(data)
  {
    console.log(data);
    var logLevel = m.log.Log.level[_this.conf.get("log.level", "all").toUpperCase()];
    _this.log.level(logLevel);
    var loggers = _this.conf.get("log.loggers", []);
    for(var i = 0; i < loggers.length; i++)
    {
      // todo fix jsonToObject to properly find m references
  //    m.global.log.add(m.util.jsonToObject(loggers[i], {"m.ui.Logger": m.ui.Logger}));
    }
    
//    var theme = _this.conf.get("theme", "default");
//    var cssLayout = cssPath + theme + "/layout.css";
//    var cssStyle = cssPath + theme + "/style.css";
//    new m.ui.CSS().id("css_layout").path(cssLayout);
//    new m.ui.CSS().id("css_style").path(cssStyle);
    
    var lang = _this.conf.get("lang", "en-US");
//    _this.lang.path("lang/" + lang + ".json").success(main).error(main).read();
    _this.lang.path(_this.root + "/lang/" + lang + ".json")
    .success(_main)
    .error(_main)
    .read();
  };
  
  var eventConfError = function()
  {
    _this.conf.path(_this.root + "/conf/default.json")
    .success(eventConfLoad)
    .error(eventDefaultConfError)
    .read();
  };
  
  var eventDefaultConfLoad = eventConfLoad;
  
  var eventDefaultConfError = function()
  {
    _main();
  };
  
  this.authn
  .success(eventProfileLoad)
  .error(eventProfileError)
  .session()
  ;
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.menu = function(menuFunction, menuPath, menuParent)
{
//  var completed = this.queue.add();
  var _main;
  if(typeof menuFunction === "undefined" || menuFunction === null)
  {
//    _main = completed;
    _main = function(){};
  }
  else if(typeof menuFunction !== "function")
  {
    throw new TypeError();
  }
  else
  {
    _main = menuFunction;
//    _main = function()
//    {
//      menuFunction.apply(this, arguments);
//      completed();
//    };
  }
  
  var _this = this;
  
  menuPath = menuPath || _this.root;
  menuParent = menuParent || 0;
  
  var eventAppListChanged = function(apps)
  {
    if(typeof apps !== "object")
    {
      eventAppListError();
      
      return;
    }
    
    var frames = document.getElementsByClassName("task_container");
    console.log("deleting frames", frames);
    for(var i = 0; i < frames.length; i++)
    {
      frames[i].Element.visible(false);
      frames[i].Element.parent(null);
      delete frames[i];
    }

    _this.apps = apps;
    _this.appTree = {};
    console.log("app list", menuPath, apps);
    for(var k in apps)
    {
      var a = apps[k];
      if(a !== null && a !== "" && a !== _this.root)
      {
//        console.log(k, a);
        task_create(k, a);
        task_tree_create(k, a);
      }
    }
    console.log("app tree", _this.appTree);
    
    _main(apps, _this.appTree);
  };
  
  var eventAppListError = function()
  {
    console.log("app-list error");
  };
  
  var task_create = function(path, info)
  {
  //  var container = new m.ui.Module().visible(false);
    var container = new m.ui.Element("iframe").visible(false);
    container.classes.add("task_container");
  //  container.style.height = "calc(100% - " + window.getComputedStyle(app.ui.taskbar.node).getPropertyValue("height") + ")";
    
    info.path = path;
    info.container = container;
//    var _document = document;
    info.show = function()
    {
      console.log("task_show", info);
      
//      var frames = _document.getElementsByClassName("task_container");
      var frames = document.getElementsByClassName("task_container");
      for(var i = 0; i < frames.length; i++)
      {
        frames[i].Element.visible(false);
      }
      
      container.visible(true);
      
      if(info.initialized !== true)
      {
        container.node.contentWindow.location.href = "/" + _this.service() + info.path;
        info.initialized = true;
      }
    };
    
    info.hide = function()
    {
      console.log("task_hide", info);
      
      container.visible(false);
    };
    
    info.hideAll = function()
    {
      console.log("task_hide_all", info);
      
      var frames = document.getElementsByClassName("task_container");
      for(var i = 0; i < frames.length; i++)
      {
        frames[i].Element.visible(false);
      }
    };
    
    container.parent(menuParent);
  };
  
  var task_tree_create = function(path, info)
  {
    var data = _this.appTree;
    var branch = path.split("/");
//    for(var i = 1; i < branch.length - 1; i++)
//    {
//      if(typeof data[branch[i]] === "undefined")
//      {
//        data[branch[i]] = {};
//      }
//      data = data[branch[i]];
//    }
//    data[branch[branch.length - 1]] = info;
    for(var i = 1; i < branch.length; i++)
    {
      if(typeof data[branch[i]] === "undefined")
      {
        data[branch[i]] = {};
      }
      data = data[branch[i]];
    }
    data.$app = info;
  };
  
  this.queue.add(function()
  {
    _this
    .success(eventAppListChanged)
    .error(eventAppListError)
    .info(menuPath)
    ;
  })();
//  this
//  .success(eventAppListChanged)
//  .error(eventAppListError)
//  .completed(completed)
//  .info(menuPath)
//  ;
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.eventServiceUnauthorized = function()
{
  this.authentication();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.eventServiceForbidden = function()
{
  // todo service architecture change to better distinguish 401 and 403
  console.log("App.eventServiceForbidden");
  
  this.authentication();
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.authentication = function()
{
//  this.hide();
  
  this.ui.authn.visible(true);
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.authenticationEnd = function()
{
  this.ui.authn.visible(false);
  
//  this.show();
  
  console.log(parent.app.interrupted, this);
  if(typeof parent.app.interrupted === "function")
  {
    parent.app.interrupted();
  }
  
  return this;
};

//------------------------------------------------------------------------------

App.prototype.show = function()
{
};

//------------------------------------------------------------------------------

App.prototype.hide = function()
{
};
