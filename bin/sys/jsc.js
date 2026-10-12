
import fs from "node:fs";

var args = process.argv.slice(2);

//------------------------------------------------------------------------------

var source_dir = args[0] + "/";
var modulesFile = args[1];

var modules;
if(typeof modulesFile !== "undefined")
{
  modules = JSON.parse(get(modulesFile));
}
else
{
  modules = getModules(source_dir);
}

var code = getModulesCode(modules);

console.log(code);

//------------------------------------------------------------------------------

function get(url)
{
  var res = fs.readFileSync(source_dir + url, "utf8");
  return res;
}

function getModule(root, dir)
{
  var res = {};
  var list = dir.listFiles();
  for(var i = 0; i < list.length; i++)
  {
    if(list[i].isDirectory())
    {
      var mod = getModule(root, list[i]);
      mod.name = list[i].getName();
      res.modules = res.modules || [];
      res.modules.push(mod);
    }
    else if(list[i].getName().substring(list[i].getName().length - 3) === ".js")
    {
      res.modules = res.modules || [];
      res.modules.push({file: list[i].getPath().substring(root.length + 1).replace(/\\/g, "/"), symbols: list[i].getName().substring(0, list[i].getName().length - 3)});
    }
  }
  return res;
}

function getModules(dir)
{
  var f = new java.io.File(dir);
  return getModule(f.getPath(), f);
}

function getModulesCode(modules)
{
  var code = "";

  if(modules.modules)
  {
    var ma = modules.modules;
    for(var i = 0; i < ma.length; i++)
    {
      code += getModulesCode(ma[i]);
    }
    if(modules.name && typeof modules.name === "string" && modules.name !== "")
    {
      var code_ns_start = "";
      var code_ns_end = "";
      code_ns_start += "\nvar " + modules.name + " = " + modules.name + "  || {};\n";
      code_ns_start += "\nthis." + modules.name + " = " + modules.name + ";\n";
      code_ns_start += "\n" + modules.name + " = (function ()\n{\n";
      code_ns_start += "\nfor(var $_sub_module_iterator in " + modules.name + "){eval(\"var \" + $_sub_module_iterator + \" = " + modules.name + "[$_sub_module_iterator];\");}\n";
      code_ns_end += "\nreturn this;\n";
      code_ns_end += "\n}.call(" + modules.name + "));\n";
//      code_ns_end += "\nthis." + modules.name + " = " + modules.name + ";\n";
      code = code_ns_start + code + code_ns_end;
    }
  }
  else if(modules.file)
  {
    code += get(modules.file);
    if(modules.symbols && typeof modules.symbols === "string" && modules.symbols !== "")
    {
      var symbolsArray = modules.symbols.split(",");
      for(var i = 0; i < symbolsArray.length; i++)
      {
        code += "this." + symbolsArray[i] + " = " + symbolsArray[i] + ";\n";
      }
    }
  }

  return code;
}
