// Physical Document -> exposed two-dimensional document adapter.
// Rows split at CR/LF/CRLF; columns address source UTF-16 code units.
// One TextEditSelections instance privately owns effective selections and
// commits: this public Document2D is its GUI-facing replacement, not a second
// independent source-edit/rebase implementation.
//
//------------------------------------------------------------------------------
// Parse flat delimited insertion values, including quoted CSV/TSV fields.
//------------------------------------------------------------------------------

function _rawDelimited(text, delimiter)
{
  const fields = [];
  let field = '';
  let state = 'plain';

  for(let i = 0; i < text.length; i++)
  {
    const char = text[i];

    if(state === 'quoted')
    {
      if(char === '"')
      {
        if(text[i + 1] === '"')
        {
          field += '"';
          i++;
        }
        else
        {
          state = 'closed';
        }
      }
      else
      {
        field += char;
      }

      continue;
    }

    if(char === delimiter || char === '\r' || char === '\n')
    {
      fields.push(field);
      field = '';
      state = 'plain';

      if(char === '\r' && text[i + 1] === '\n')
      {
        i++;
      }

      continue;
    }

    if(char === '"')
    {
      if(state !== 'plain' || field.length)
      {
        throw new SyntaxError('invalid delimited input quote');
      }

      state = 'quoted';
      continue;
    }

    if(state === 'closed')
    {
      throw new SyntaxError('unexpected text after quoted field');
    }

    field += char;
  }

  if(state === 'quoted')
  {
    throw new SyntaxError('unterminated quoted field');
  }

  fields.push(field);

  return fields;
}

//------------------------------------------------------------------------------
// RawDocument2D — physical 2D adapter, no display-cell transformation ---------
//------------------------------------------------------------------------------

class RawDocument2D extends Document2D
{
  #document;
  #physical;
  #modes;
  #selectionMode = 'line';
  #insertMode = 'raw';
  #listeners = new Set();
  #unsubscribe;
  #maxColsRevision = null;
  #maxCols = 0;

  //----------------------------------------------------------------------------
  // Construct a live view of any nominal Document, including PieceDocument.
  //----------------------------------------------------------------------------

  constructor(document)
  {
    super();

    if(!(document instanceof Document))
    {
      throw new TypeError('Document required');
    }

    this.#document = document;
    this.#physical = new TextEditSelections(document);
    this.#modes =
    {
      line: new LineSelections(this.#physical),
      rectangle: new RectangleSelections(this.#physical),
      'free-form': new FreeFormSelections(this.#physical)
    };

    // Subscribe AFTER the physical selector so external edits rebase its
    // selections before listeners query this 2D view.
    this.#unsubscribe = document.subscribe
    (
      () => this.#notify('content')
    );
  }

  //----------------------------------------------------------------------------

  #active()
  {
    if(this.#document === null)
    {
      throw new Error('RawDocument2D is destroyed');
    }

    return this.#document;
  }

  //----------------------------------------------------------------------------

  #notify(type)
  {
    if(this.#document === null)
    {
      return;
    }

    const event =
    {
      type,
      revision: this.#document.revision
    };

    for(const listener of Array.from(this.#listeners))
    {
      listener(event);
    }
  }

  //----------------------------------------------------------------------------
  // Exposed physical row/UTF-16 column space ----------------------------------
  //----------------------------------------------------------------------------

  get rowCount()
  {
    return this.#active().lineCount;
  }

  //----------------------------------------------------------------------------

  get colCount()
  {
    const source = this.#active();

    if(source.revision !== this.#maxColsRevision)
    {
      let width = 0;

      for(let row = 0; row < source.lineCount; row++)
      {
        const info = source.lineInfo(row);
        width = Math.max(width, info.end - info.start);
      }

      this.#maxCols = width;
      this.#maxColsRevision = source.revision;
    }

    return this.#maxCols;
  }

  //----------------------------------------------------------------------------

  getRect(rowStart, colStart, rowEnd, colEnd)
  {
    const source = this.#active();

    if
    (
      ![rowStart, colStart, rowEnd, colEnd].every
      (
        value => Number.isSafeInteger(value) && value >= 0
      ) ||
      rowEnd < rowStart || colEnd < colStart
    )
    {
      throw new RangeError('invalid 2D text rectangle');
    }

    const rows = [];
    const end = Math.min(rowEnd, source.lineCount);

    for(let row = rowStart; row < end; row++)
    {
      const info = source.lineInfo(row);
      const width = info.end - info.start;
      const start = Math.min(colStart, width);
      const finish = Math.min(colEnd, width);
      rows.push(source.slice(info.start + start, info.start + Math.max(start, finish)));
    }

    return rows;
  }

  //----------------------------------------------------------------------------
  // Read ONLY effective selections for an external consumer ------------------
  //----------------------------------------------------------------------------

  #offset(position)
  {
    const source = this.#active();

    if(position.row >= source.lineCount)
    {
      return source.length;
    }

    const info = source.lineInfo(position.row);
    return info.start + Math.min(position.col, info.end - info.start);
  }

  //----------------------------------------------------------------------------

  read()
  {
    const source = this.#active();

    return this.#physical.getSelections().map
    (
      selection => source.slice
      (
        this.#offset(selection.start),
        this.#offset(selection.end)
      )
    );
  }

  //----------------------------------------------------------------------------
  // Mode-selected interpretation of GUI selection coordinates ----------------
  //----------------------------------------------------------------------------

  getSelections()
  {
    this.#active();
    return this.#physical.getSelections();
  }

  //----------------------------------------------------------------------------

  setSelections(selections)
  {
    this.#active();
    this.#modes[this.#selectionMode].setSelections(selections);
    this.#notify('selections');
    return this;
  }

  //----------------------------------------------------------------------------

  addSelection(position)
  {
    this.#active();
    this.#modes[this.#selectionMode].addSelection(position);
    this.#notify('selections');
    return this;
  }

  //----------------------------------------------------------------------------

  remSelection(position)
  {
    this.#active();
    this.#modes[this.#selectionMode].remSelection(position);
    this.#notify('selections');
    return this;
  }

  //----------------------------------------------------------------------------

  get selectionMode()
  {
    this.#active();
    return this.#selectionMode;
  }

  //----------------------------------------------------------------------------

  set selectionMode(mode)
  {
    this.#active();

    if(!Object.hasOwn(this.#modes, mode))
    {
      throw new RangeError('unknown selection mode');
    }

    this.#selectionMode = mode;
    this.#notify('selectionMode');
  }

  //----------------------------------------------------------------------------
  // Interpret and atomically commit selected text -----------------------------
  //----------------------------------------------------------------------------

  get insertMode()
  {
    this.#active();
    return this.#insertMode;
  }

  //----------------------------------------------------------------------------

  set insertMode(mode)
  {
    this.#active();

    if(!['raw', 'lines', 'csv', 'tsv'].includes(mode))
    {
      throw new RangeError('unknown insert mode');
    }

    this.#insertMode = mode;
    this.#notify('insertMode');
  }

  //----------------------------------------------------------------------------

  insert(content)
  {
    this.#active();
    let values = content;

    // Explicit arrays always distribute by original selection order.
    if(!Array.isArray(content) && this.#insertMode !== 'raw')
    {
      if(typeof content !== 'string')
      {
        throw new TypeError('structured insertion requires text');
      }

      if(this.#insertMode === 'lines')
      {
        values = content.split(/\r\n|\r|\n/);
      }
      else
      {
        values = _rawDelimited
        (
          content,
          this.#insertMode === 'csv' ? ',' : '\t'
        );
      }
    }

    // The physical selector plans and commits exactly one atomic source
    // replacement, including virtual padding and multiple selections.
    return this.#physical.replace(values);
  }

  //----------------------------------------------------------------------------
  // Notifications and lifetime ------------------------------------------------
  //----------------------------------------------------------------------------

  subscribe(listener)
  {
    this.#active();

    if(typeof listener !== 'function')
    {
      throw new TypeError('listener required');
    }

    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  //----------------------------------------------------------------------------

  destroy()
  {
    if(this.#document === null)
    {
      return;
    }

    // The caller-supplied source remains owned by its caller.
    this.#document = null;
    this.#unsubscribe();
    this.#physical.destroy();
    this.#listeners.clear();
    this.#modes = null;
    this.#physical = null;
    this.#unsubscribe = null;
  }
}
