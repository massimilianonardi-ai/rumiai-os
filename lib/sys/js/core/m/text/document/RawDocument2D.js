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
      () =>
      {
        const geometry =
          typeof document._getLastGeometry === 'function' ?
            document._getLastGeometry() : null;

        this.#notify('content', geometry);
      }
    );
  }

  //----------------------------------------------------------------------------

  // Internal bridge for views that need old mapping before a physical edit.
  // It does not change the public Document.subscribe notification shape.
  _subscribeBeforeGeometry(listener)
  {
    const source = this.#active();

    return typeof source._subscribeBeforeGeometry === 'function' ?
      source._subscribeBeforeGeometry(listener) : null;
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

  #notify(type, geometry = null)
  {
    if(this.#document === null)
    {
      return;
    }

    const event =
    {
      type,
      revision: this.#document.revision,
      ...(type === 'content' ? {invalidation: {all: true}} : {}),
      ...(type === 'content' && geometry &&
        geometry.revision === this.#document.revision ?
          {geometry} : {})
    };

    for(const listener of Array.from(this.#listeners))
    {
      listener(event);
    }
  }

  //----------------------------------------------------------------------------
  // Physical revision also identifies this untransformed coordinate space -----
  //----------------------------------------------------------------------------

  get revision()
  {
    return this.#active().revision;
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
  // Raw row extent and geometry-bearing region window ------------------------
  //----------------------------------------------------------------------------

  getRowWidth(row)
  {
    const source = this.#active();

    if(!Number.isSafeInteger(row) || row < 0)
    {
      throw new RangeError('invalid 2D row');
    }

    if(row >= source.lineCount)
    {
      return 0;
    }

    const info = source.lineInfo(row);
    return info.end - info.start;
  }

  //----------------------------------------------------------------------------

  getRegions(rowStart, colStart, rowEnd, colEnd)
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
      throw new RangeError('invalid 2D region window');
    }

    const rows = [];
    const end = Math.min(rowEnd, source.lineCount);

    for(let row = rowStart; row < end; row++)
    {
      const info = source.lineInfo(row);
      const width = info.end - info.start;
      const first = Math.min(colStart, width);
      const last = Math.min(colEnd, width);

      rows.push
      (
        first < last ?
        [
          {
            kind: 'text',
            start: {row, col: first},
            end: {row, col: last},
            text: source.slice(info.start + first, info.start + last)
          }
        ] : []
      );
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
  // Edit multiple source-backed 2D regions with one underlying commit ---------
  //----------------------------------------------------------------------------

  replace(edits, expectedRevision)
  {
    const source = this.#active();

    if(!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
    {
      throw new TypeError('Document2D revision required');
    }

    if(source.revision !== expectedRevision)
    {
      throw new Error('stale Document2D coordinates');
    }

    if(!Array.isArray(edits) || edits.length === 0)
    {
      throw new RangeError('nonempty Document2D edit array required');
    }

    const offset = position =>
    {
      if(!position || typeof position !== 'object')
      {
        throw new TypeError('2D edit position required');
      }

      const {row, col} = position;

      if
      (
        !Number.isSafeInteger(row) || !Number.isSafeInteger(col) ||
        row < 0 || col < 0 || row >= source.lineCount
      )
      {
        throw new RangeError('invalid 2D edit position');
      }

      const info = source.lineInfo(row);

      if(col > info.end - info.start)
      {
        // Unlike selected insert(), explicit source-backed edits never
        // silently materialize or clip a virtual position.
        throw new RangeError('edit position is beyond source EOL');
      }

      return info.start + col;
    };

    const physical = edits.map
    (
      edit =>
      {
        if(!edit || typeof edit !== 'object')
        {
          throw new TypeError('2D edit record required');
        }

        const {start, end, text} = edit;

        if(typeof text !== 'string')
        {
          throw new TypeError('replacement text must be a string');
        }

        return {start: offset(start), end: offset(end), text};
      }
    );

    // Property getters supplied by callers can mutate the source while
    // creating the batch. Never commit offsets from mixed revisions.
    if(source.revision !== expectedRevision)
    {
      throw new Error('stale Document2D coordinates');
    }

    // The established Document contract checks ALL targets and performs
    // exactly one atomic commit. The physical selection owner observes
    // that commit and rebases before this adapter notifies its listeners.
    source.replace(physical);
    return this;
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
