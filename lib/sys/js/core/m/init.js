
m.global = {};
m.g = m.global;

//global = m.g;
g = m.g;

m.global.log = m.log.Log();
m.global.log.add(new m.log.LoggerConsoleSimple());
//m.global.log.add(new m.log.LoggerConsoleTrace());
//m.global.log.level(m.log.Log.level.ALL);
//m.global.log.level(m.log.Log.level.OFF);
m.global.log.level(m.log.Log.level.WARN);
//m.global.log.level(m.env.log.level);

//m.global.queue = new mod.Queue();
//m.global.conf = new conf.Configuration();
//m.global.lang = new conf.Language();

//m.global.environment = m.util.environment();
//m.sys[m.global.environment].init();

if(typeof this.root === "undefined" || this.root === null)
{
//  if(document.currentScript === null || (document.currentScript !== null && document.currentScript.src === ""))
  if(document.currentScript === null)
  {
    this.root = location.pathname;
  }
  else
  {
    this.root = document.currentScript.src.replace(location.origin, "").replace(new RegExp("\/([^/]+)$"), "");
    this.path = document.currentScript.src.replace(location.origin, "");
  }
}
