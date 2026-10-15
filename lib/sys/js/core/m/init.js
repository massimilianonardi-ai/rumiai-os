m.global = {};
m.g = m.global;
var g = m.g;

m.global.log = new m.log.Log();
m.global.log.add(new m.log.LoggerConsoleSimple());
m.global.log.level(m.log.Log.level.WARN);

if(typeof document !== "undefined" &&
  typeof location !== "undefined" &&
  (typeof this.root === "undefined" || this.root === null))
{
  const currentScript = document.currentScript;
  if(currentScript === null || typeof currentScript === "undefined")
  {
    this.root = location.pathname;
  }
  else if(typeof currentScript.src === "string")
  {
    const scriptPath = currentScript.src.replace(location.origin, "");
    this.root = scriptPath.replace(/\/[^/]+$/, "");
    this.path = scriptPath;
  }
}
