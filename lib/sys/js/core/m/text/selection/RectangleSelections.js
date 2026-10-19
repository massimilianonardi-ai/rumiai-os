// Rectangle in the caller's exposed 2D cell space, inclusive endpoints.
// Each visited row is represented by an ordinary oriented selection.

class RectangleSelections extends _ModeSelections
{
  _build(path)
  {
    const first = path[0];
    const last = path[path.length - 1];
    const left = Math.min(first.col, last.col);
    const right = Math.max(first.col, last.col);

    if(right === Number.MAX_SAFE_INTEGER)
    {
      throw new RangeError('selection end column is not representable');
    }

    const forward = first.col <= last.col;
    const step = first.row <= last.row ? 1 : -1;
    const selections = [];

    for(let row = first.row; ; row += step)
    {
      selections.push
      (
        {start:{row, col:left}, end:{row, col:right + 1}, forward}
      );

      if(row === last.row)
      {
        break;
      }
    }

    return selections;
  }
}
