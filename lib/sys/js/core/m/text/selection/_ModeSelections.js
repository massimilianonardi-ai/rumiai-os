// Private, view-coordinate-neutral support for concrete Selections modes.
// All three strategies use one external owner of the effective selections.
// Their gesture positions are only transient interpretation state.

function _modePoint(value)
{
  if(!value || typeof value !== 'object' || Array.isArray(value))
  {
    throw new TypeError('selection position required');
  }

  const {row, col} = value;

  if
  (
    !Number.isSafeInteger(row) || row < 0 ||
    !Number.isSafeInteger(col) || col < 0
  )
  {
    throw new RangeError('invalid selection position');
  }

  return {row, col};
}

//------------------------------------------------------------------------------

function _modeCompare(a, b)
{
  return a.row - b.row || a.col - b.col;
}

//------------------------------------------------------------------------------

function _modeCopy(values)
{
  if(!Array.isArray(values))
  {
    throw new TypeError('selection array required');
  }

  return values.map
  (
    value =>
    {
      if(!value || typeof value !== 'object' || typeof value.forward !== 'boolean')
      {
        throw new TypeError('invalid selection');
      }

      const start = _modePoint(value.start);
      const end = _modePoint(value.end);

      if(_modeCompare(start, end) > 0)
      {
        throw new RangeError('selection start after end');
      }

      return {start, end, forward:value.forward};
    }
  );
}

//------------------------------------------------------------------------------

function _modeSame(a, b)
{
  if(a.length !== b.length)
  {
    return false;
  }

  return a.every
  (
    (value, i) =>
    {
      const other = b[i];

      return value.forward === other.forward &&
        _modeCompare(value.start, other.start) === 0 &&
        _modeCompare(value.end, other.end) === 0;
    }
  );
}

//------------------------------------------------------------------------------
// Common strategy mechanics, not an additional public interface ---------------
//------------------------------------------------------------------------------

class _ModeSelections extends Selections
{
  #owner;
  #path = [];
  #prefix = null;
  #expected = null;

  constructor(owner)
  {
    super();

    if
    (
      !owner ||
      typeof owner.getSelections !== 'function' ||
      typeof owner.setSelections !== 'function'
    )
    {
      throw new TypeError('shared selections owner required');
    }

    this.#owner = owner;
  }

  //----------------------------------------------------------------------------

  getSelections()
  {
    return _modeCopy(this.#owner.getSelections());
  }

  //----------------------------------------------------------------------------

  setSelections(selections)
  {
    this.#owner.setSelections(_modeCopy(selections));
    this.#path = [];
    this.#prefix = null;
    this.#expected = null;

    return this;
  }

  //----------------------------------------------------------------------------

  addSelection(position)
  {
    const point = _modePoint(position);
    const current = this.getSelections();
    const fresh = this.#expected === null || !_modeSame(current, this.#expected);
    const prefix = fresh ? current : this.#prefix;
    const path = (fresh ? [] : this.#path).concat([point]);
    const result = prefix.concat(this._build(path));

    this.#owner.setSelections(result);
    this.#path = path;
    this.#prefix = prefix;
    this.#expected = this.getSelections();

    return this;
  }

  //----------------------------------------------------------------------------

  remSelection(position)
  {
    const point = _modePoint(position);
    const current = this.getSelections();

    // Another strategy or direct setSelections may have changed the owner.
    // Never erase or reconstruct a gesture that no longer belongs to us.
    if(this.#expected === null || !_modeSame(current, this.#expected))
    {
      this.#path = [];
      this.#prefix = null;
      this.#expected = null;
      return this;
    }

    const index = this.#path.findLastIndex
    (
      p => _modeCompare(p, point) === 0
    );

    if(index < 0)
    {
      return this;
    }

    const path = this.#path.slice();
    path.splice(index, 1);
    const result = this.#prefix.concat(path.length ? this._build(path) : []);

    this.#owner.setSelections(result);
    this.#path = path;
    this.#expected = path.length ? this.getSelections() : null;

    if(!path.length)
    {
      this.#prefix = null;
    }

    return this;
  }

  //----------------------------------------------------------------------------

  _build(path)
  {
    throw new Error('selection shape must be implemented');
  }
}
