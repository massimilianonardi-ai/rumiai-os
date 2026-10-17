// TextEditSelections 0.8.2 — private helpers extracted for source review.
// These functions are internal to the m.text.selection compilation scope.
// All positions are source UTF-16 offsets or explicit {row,col} coordinates.
// The standalone TextEdit 0.8.2 implementation is unchanged.

//------------------------------------------------------------------------------
// Source edit ordering and offset rebasing ------------------------------------
//------------------------------------------------------------------------------

function _selectionValid(n)
{
  return Number.isSafeInteger(n) && n >= 0;
}

//------------------------------------------------------------------------------

// Make a sorted working COPY of source edits without changing caller order.
// "before" and "after" are cumulative UTF-16 displacement at each edit.
function _selectionOrder(commands)
{
  const result = commands.map
  (
    (e, index) => ({...e, index})
  );

  // At a shared start, insertion comes first in this ordering.
  result.sort
  (
    (a, b) => a.start - b.start ||
      Number(a.start !== a.end) - Number(b.start !== b.end)
  );

  let shift = 0;

  for(const e of result)
  {
    e.before = shift;
    shift += e.text.length - (e.end - e.start);
    e.after = shift;
  }

  return result;
}

//------------------------------------------------------------------------------

// Map a pre-edit offset into the new source. The "right" parameter selects
// insertion affinity; overlapping replacement interiors map to a boundary.
function _selectionMap(offset, right, edits)
{
  let lo = 0;
  let hi = edits.length;

  // First edit whose start is NOT strictly less than the queried offset.
  while(lo < hi)
  {
    const mid = Math.floor((lo + hi) / 2);

    if(edits[mid].start < offset)
    {
      lo = mid + 1;
    }
    else
    {
      hi = mid;
    }
  }

  const previous = edits[lo - 1];

  if(previous && previous.end > offset)
  {
    return previous.start + previous.before +
      (right ? previous.text.length : 0);
  }

  let delta = previous ? previous.after : 0;
  const here = edits[lo];

  if(right && here && here.start === offset && here.end === offset)
  {
    delta += here.text.length;
  }

  return offset + delta;
}

//------------------------------------------------------------------------------

// Validate incompatible source-edit targets, calculate final length, and map
// each source edit's result to the ORIGINAL selection collection index.
function _selectionPlan(values, texts, length)
{
  const edits = values.map
  (
    (s, i) => ({start: s.start, end: s.end, text: texts[i]})
  );

  const sorted = _selectionOrder(edits);

  let lastStart = -1;
  let lastEnd = 0;
  let lastInsertion = -1;
  let resultLength = length;

  const after = new Array(values.length);

  for(const e of sorted)
  {
    if(e.start === e.end)
    {
      if
      (
        e.start === lastInsertion ||
        (e.start > lastStart && e.start < lastEnd)
      )
      {
        throw new RangeError('colliding insertions');
      }

      lastInsertion = e.start;
    }
    else
    {
      if(e.start < lastEnd)
      {
        throw new RangeError('overlapping replacements');
      }

      lastStart = e.start;
      lastEnd = e.end;
    }

    const offset = e.start + e.before + e.text.length;

    if(!_selectionValid(offset))
    {
      throw new RangeError('unsafe caret position');
    }

    after[e.index] =
    {
      start: offset,
      end: offset,
      forward: values[e.index].forward
    };

    resultLength += e.text.length - (e.end - e.start);
  }

  if(!_selectionValid(resultLength))
  {
    throw new RangeError('unsafe result length');
  }

  return {edits, after};
}

//------------------------------------------------------------------------------
// Physical selection records --------------------------------------------------
//------------------------------------------------------------------------------

function _physicalPoint(value)
{
  if(!value || typeof value !== 'object' || Array.isArray(value))
  {
    throw new TypeError('physical selection point');
  }

  const {row, col} = value;

  if
  (
    !Number.isSafeInteger(row) || row < 0 ||
    !Number.isSafeInteger(col) || col < 0
  )
  {
    throw new RangeError('invalid physical row/column');
  }

  return {row, col};
}

//------------------------------------------------------------------------------

function _physicalCompare(a, b)
{
  return a.row - b.row || a.col - b.col;
}

//------------------------------------------------------------------------------

// Do not sort, merge or deduplicate input selections: collection order and
// individual orientation must survive all public read/write operations.
function _physicalCopy(values)
{
  if(!Array.isArray(values))
  {
    throw new TypeError('selection array');
  }

  return values.map
  (
    v =>
    {
      if(!v || typeof v !== 'object' || typeof v.forward !== 'boolean')
      {
        throw new TypeError('physical selection record');
      }

      const start = _physicalPoint(v.start);
      const end = _physicalPoint(v.end);

      if(_physicalCompare(start, end) > 0)
      {
        throw new RangeError('inverted physical range');
      }

      return {start, end, forward: v.forward};
    }
  );
}

//------------------------------------------------------------------------------

// Convert an offset to a physical position. Positions INSIDE a line
// terminator cannot be represented by the physical {row,col} contract.
function _physicalAt(doc, offset)
{
  const row = doc.lineAt(offset);
  const info = doc.lineInfo(row);

  if(offset > info.end)
  {
    throw new RangeError('source offset is inside a line terminator');
  }

  return {row, col: offset - info.start};
}

//------------------------------------------------------------------------------

// When inserted CR meets existing LF, a resulting caret must land AFTER
// CRLF rather than in the middle of a two-unit line terminator.
function _physicalAfterEdit(doc, offset)
{
  const row = doc.lineAt(offset);
  const info = doc.lineInfo(row);

  if
  (
    offset > info.end && offset < info.nextStart &&
    row + 1 < doc.lineCount
  )
  {
    return {row: row + 1, col: 0};
  }

  return _physicalAt(doc, offset);
}

//------------------------------------------------------------------------------

// Advance a physical point through newly inserted text; CR, LF and CRLF
// are logical line breaks and do not advance the column in the next row.
function _physicalAdvance(point, text)
{
  let row = point.row;
  let col = point.col;

  for(let i = 0; i < text.length; i++)
  {
    const ch = text[i];

    if(ch === '\r')
    {
      row++;
      col = 0;

      if(text[i + 1] === '\n')
      {
        i++;
      }
    }
    else if(ch === '\n')
    {
      row++;
      col = 0;
    }
    else
    {
      col++;
    }
  }

  return {row, col};
}

//------------------------------------------------------------------------------
// Replacement payload normalization -------------------------------------------
//------------------------------------------------------------------------------

// Missing values, undefined and null mean deletion; otherwise accept only
// the established string/number/boolean scalar input kinds.
function _selectionText(value)
{
  if(value == null)
  {
    return '';
  }

  if(typeof value === 'string')
  {
    return value;
  }

  if(typeof value === 'number' || typeof value === 'boolean')
  {
    return String(value);
  }

  throw new TypeError('replacement value must be text, number, boolean or nullish');
}
