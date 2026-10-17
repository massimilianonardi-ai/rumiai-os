// Extracted from TextEdit 0.8.2 for independent review in m.text.document.
// This file supplies PRIVATE document mechanics shared by the two backends.
// The original standalone TextEdit library remains the reference implementation.
// TextEditBase is a structural contract, not an instantiable class.

//------------------------------------------------------------------------------
// Source-position validation ---------------------------------------------------
//------------------------------------------------------------------------------

function _check(doc, start, end)
{
  if
  (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    end > doc.length
  )
  {
    throw new RangeError('invalid text range');
  }
}

//------------------------------------------------------------------------------

function _checkLine(doc, line)
{
  if(!Number.isSafeInteger(line) || line < 0 || line >= doc.lineCount)
  {
    throw new RangeError('invalid logical line');
  }
}

//------------------------------------------------------------------------------
// Atomic-edit preparation ------------------------------------------------------
//------------------------------------------------------------------------------

// All edits refer to the document BEFORE the action. Validate the complete
// batch before either backend stages a change. Preserve the caller's original
// argument order for notifications; execution order is a separate concern.

function _prepareEdits(length, args)
{
  let inputs;
  let arrayForm;

  if(args.length === 1 && Array.isArray(args[0]))
  {
    inputs = args[0];
    arrayForm = true;

    if(!inputs.length)
    {
      throw new RangeError('empty edit array');
    }
  }
  else if(args.length === 3)
  {
    inputs =
    [
      {start: args[0], end: args[1], text: args[2]}
    ];
    arrayForm = false;
  }
  else
  {
    throw new TypeError('replace expects three arguments or one edit array');
  }

  // Copy and freeze accepted edit records. Caller mutation must not change
  // the committed commands or any subsequent notification arguments.
  const edits = inputs.map
  (
    item =>
    {
      if(!item || typeof item !== 'object')
      {
        throw new TypeError('invalid edit record');
      }

      const {start, end, text} = item;

      if(typeof text !== 'string')
      {
        throw new TypeError('replacement text must be a string');
      }

      if
      (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end < start ||
        end > length
      )
      {
        throw new RangeError('invalid edit range');
      }

      return Object.freeze({start, end, text});
    }
  );

  // A nonempty replacement precedes an insertion at the same start
  // during collision checks. Disjoint replacements may meet at a boundary.
  const ascending = edits.slice().sort
  (
    (a, b) => a.start - b.start ||
      Number(a.start !== a.end) - Number(b.start !== b.end)
  );

  let lastStart = -1;
  let lastEnd = 0;
  let lastInsert = -1;
  let finalLength = length;

  for(const e of ascending)
  {
    if(e.start === e.end)
    {
      if(e.start === lastInsert || (e.start > lastStart && e.start < lastEnd))
      {
        throw new RangeError('colliding edit targets');
      }

      lastInsert = e.start;
    }
    else
    {
      if(e.start < lastEnd)
      {
        throw new RangeError('overlapping edit targets');
      }

      lastStart = e.start;
      lastEnd = e.end;
    }

    finalLength += e.text.length - (e.end - e.start);

    if(!Number.isSafeInteger(finalLength) || finalLength < 0)
    {
      throw new RangeError('document length exceeds safe integer range');
    }
  }

  // Apply from right to left so all offsets still refer to the old source.
  // At a shared start, an insertion is processed after its replacement.
  const descending = ascending.reverse().sort
  (
    (a, b) => b.start - a.start ||
      Number(a.start === a.end) - Number(b.start === b.end)
  );

  const prepared =
  {
    descending,
    notification: arrayForm ? [Object.freeze(edits)] : args.slice()
  };

  return prepared;
}

//------------------------------------------------------------------------------
// Shared document lifecycle ----------------------------------------------------
//------------------------------------------------------------------------------

class _DocumentStore
{
  //----------------------------------------------------------------------------
  // Construction and revision ------------------------------------------------
  //----------------------------------------------------------------------------

  constructor()
  {
    this._revision = 0;
    this._listeners = new Set();
    this._notifying = false;
  }

  //----------------------------------------------------------------------------

  get revision()
  {
    return this._revision;
  }

  //----------------------------------------------------------------------------
  // Mutation guard -----------------------------------------------------------
  //----------------------------------------------------------------------------

  _assertMutable()
  {
    // A listener sees a complete committed state. It cannot start another
    // commit on the same document while that notification is being delivered.
    if(this._notifying)
    {
      throw new Error('reentrant document mutation during notification');
    }
  }

  //----------------------------------------------------------------------------
  // Subscriptions ------------------------------------------------------------
  //----------------------------------------------------------------------------

  subscribe(listener)
  {
    if(typeof listener !== 'function')
    {
      throw new TypeError('listener must be a function');
    }

    // Registrations remain distinct even if they use the same callback.
    const subscription = {listener};
    this._listeners.add(subscription);

    let active = true;

    return () =>
    {
      if(active)
      {
        active = false;
        this._listeners.delete(subscription);
      }
    };
  }

  //----------------------------------------------------------------------------

  _snapshotListeners()
  {
    return [...this._listeners].map(s => s.listener);
  }

  //----------------------------------------------------------------------------
  // Post-commit publication --------------------------------------------------
  //----------------------------------------------------------------------------

  _publish(args, listeners)
  {
    // One revision per successful public replace, including no-op edits.
    // Wrap to zero at the safe-integer limit; consumers detect discontinuity.
    this._revision = this._revision === Number.MAX_SAFE_INTEGER ?
      0 : this._revision + 1;

    this._notifying = true;

    try
    {
      // A listener failure cannot roll back a committed document or prevent
      // the remaining listeners from receiving that same commit.
      for(const listener of listeners)
      {
        try
        {
          listener(...args);
        }
        catch(error)
        {
          try
          {
            if(typeof console !== 'undefined' && console.error)
            {
              console.error('TextEdit listener failed', error);
            }
          }
          catch(_)
          {
            // Diagnostic transport failures must not escape publication.
          }
        }
      }
    }
    finally
    {
      this._notifying = false;
    }
  }
}
