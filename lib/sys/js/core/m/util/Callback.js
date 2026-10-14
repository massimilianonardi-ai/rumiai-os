
function bind(f, ctx, p2, p4)
{
  return function(p1,p3)
  {
    f.call(ctx, p1, p2, p3, p4);
  };
}