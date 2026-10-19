// Free-form drawing: each distinct visited coordinate becomes a caret.
// Repeated visits are retained in the gesture path for symmetric removal.

class FreeFormSelections extends _ModeSelections
{
  _build(path)
  {
    const seen = new Set();
    const selections = [];

    for(const point of path)
    {
      const key = point.row + ':' + point.col;

      if(seen.has(key))
      {
        continue;
      }

      seen.add(key);
      selections.push({start:point, end:point, forward:true});
    }

    return selections;
  }
}
