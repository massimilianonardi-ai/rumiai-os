// Ordinary linear selection between the first and latest visited cells.
// Points denote included cells. Effective intervals remain half-open.

class LineSelections extends _ModeSelections
{
  _build(path)
  {
    const first = path[0];
    const last = path[path.length - 1];
    const forward = _modeCompare(first, last) <= 0;
    const start = forward ? first : last;
    const tail = forward ? last : first;

    if(tail.col === Number.MAX_SAFE_INTEGER)
    {
      throw new RangeError('selection end column is not representable');
    }

    return
    [
      {start, end:{row:tail.row, col:tail.col + 1}, forward}
    ];
  }
}
