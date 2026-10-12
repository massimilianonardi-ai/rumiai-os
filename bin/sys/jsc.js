
import fs from "node:fs";
import path from "node:path";

var args = process.argv.slice(2);

//------------------------------------------------------------------------------

var source_dir = args[0] + "/";
var modulesFile = args[1];

try
{
  var modules;
  if(typeof modulesFile !== "undefined")
  {
    try
    {
      modules = JSON.parse(get(modulesFile));
    }
    catch(error)
    {
      if(error instanceof SyntaxError)
      {
        throw new Error("invalid JSON in " + modulesFile + ": " + error.message);
      }
      throw error;
    }
  }
  else
  {
    modules = getModules(source_dir);
  }

  var code = getModulesCode(modules);
  console.log(code);
}
catch(error)
{
  console.error("jsc: " + error.message);
  process.exitCode = 1;
}

//------------------------------------------------------------------------------

function get(url)
{
  var res = fs.readFileSync(path.join(source_dir, url), "utf8");
  return res;
}

function getModule(root, dir)
{
  var res = {};
  var list = fs.readdirSync(dir, {withFileTypes: true});
  for(var i = 0; i < list.length; i++)
  {
    var entry = list[i];
    var entryPath = path.join(dir, entry.name);
    if(entry.isDirectory())
    {
      var mod = getModule(root, entryPath);
      mod.name = entry.name;
      res.modules = res.modules || [];
      res.modules.push(mod);
    }
    else if(entry.isFile() && entry.name.endsWith(".js"))
    {
      res.modules = res.modules || [];
      res.modules.push({
        file: path.relative(root, entryPath).split(path.sep).join("/"),
        symbols: entry.name.slice(0, -3)
      });
    }
  }
  return res;
}

function getModules(dir)
{
  var root = path.resolve(dir);
  return getModule(root, root);
}

function identifier(value)
{
  return typeof value === "string" &&
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) &&
    !/^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|let|static|implements|interface|package|private|protected|public)$/.test(value);
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
      if(!identifier(modules.name)) throw new Error("invalid namespace: " + modules.name);
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
    code += get(modules.file) + "\n";
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
