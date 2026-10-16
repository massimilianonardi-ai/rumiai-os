// Traverse object identities once; preserve enumerable own and inherited properties.
function _traverse(object, fAnte, fPost, fRecurse, advanced)
{
  const nodes = [];
  const paths = [];
  const calcs = [];
  const calcsPost = [];
  const visited = new WeakSet();

  function* _properties(value)
  {
    for(const key in value)
    {
      yield key;
    }
  }

  const stack =
  [
    {
      value: object,
      path: "",
      pathArray: [],
      parents: [],
      parentsPaths: [],
      entered: false
    }
  ];

  while(stack.length > 0)
  {
    const frame = stack[stack.length - 1];
    const value = frame.value;

    if(!frame.entered)
    {
      frame.entered = true;
      const isObject = value !== null && typeof value === "object";

      if(isObject)
      {
        if(visited.has(value))
        {
          stack.pop();
          continue;
        }

        visited.add(value);
      }

      frame.calcAnte = typeof fAnte === "function"
        ? fAnte(value, frame.path, frame.pathArray, frame.parents, frame.parentsPaths)
        : undefined;

      if(!advanced)
      {
        nodes.push(value);
        paths.push(frame.path);
        calcs.push(frame.calcAnte);
      }

      const recurse = isObject &&
      (
        !advanced || typeof fRecurse !== "function" ||
        fRecurse(value, frame.path, frame.pathArray, frame.parents, frame.parentsPaths)
      );

      if(recurse)
      {
        frame.properties = _properties(value);
      }
    }

    if(frame.properties)
    {
      const next = frame.properties.next();

      if(!next.done)
      {
        const key = next.value;
        const numeric = /^(0|[1-9][0-9]*)$/.test(key) && Number.isSafeInteger(Number(key));
        const segment = numeric ? "[" + key + "]" : "[" + JSON.stringify(key) + "]";

        stack.push
        (
          {
            value: value[key],
            path: frame.path + segment,
            pathArray: [...frame.pathArray, key],
            parents: [value, ...frame.parents],
            parentsPaths: [frame.path, ...frame.parentsPaths],
            entered: false
          }
        );

        continue;
      }
    }

    if(advanced)
    {
      const calcPost = typeof fPost === "function"
        ? fPost(value, frame.path, frame.pathArray, frame.parents, frame.parentsPaths)
        : undefined;

      nodes.push(value);
      paths.push(frame.path);
      calcs.push(frame.calcAnte);
      calcsPost.push(calcPost);
    }

    stack.pop();
  }

  return advanced ? {nodes, paths, calcs, calcsPost} : {nodes, paths, calcs};
}

function traverse(object, callback)
{
  return _traverse(object, callback, undefined, undefined, false);
}

traverse.advanced = function(object, fAnte, fPost, fRecurse)
{
  return _traverse(object, fAnte, fPost, fRecurse, true);
};
