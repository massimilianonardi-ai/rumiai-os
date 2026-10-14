function path(pathString, object)
{
  if(typeof pathString === "undefined" || pathString === null || pathString === "")
  {
    return object;
  }

  // The original API evaluates JavaScript property-path expressions. Preserve
  // that behavior for existing callers; strict-mode eval cannot expose a var
  // declared inside its own scope to the enclosing function.
  return eval("object" + pathString);
}
