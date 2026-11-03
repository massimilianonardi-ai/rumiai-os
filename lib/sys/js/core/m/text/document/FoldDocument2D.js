// Whole-row folding over an arbitrary Document2D.
// A folded [startRow,endRow) input interval becomes a single synthetic row.
// Text, selection state and atomic editing remain owned by the input.
// Folds are conservatively cleared on every input geometry revision.

class FoldDocument2D extends Document2D
{
  #input;
  #inputRevision;
  #revision = 0;
  #folds = [];
  #hidden = 0;
  #selectionMode = 'line';
  #modes;
  #listeners = new Set();
  #unsubscribe;
  #maxColsRevision = null;
  #maxCols = 0;

  constructor(input)
  {
    super();

    if(!(input instanceof Document2D))
    {
      throw new TypeError('Document2D input required');
    }

    this.#input = input;
    this.#inputRevision = input.revision;

    // Local gesture interpretation projects into the input's one
    // effective collection rather than creating another owner.
    const owner =
    {
      getSelections: () => this.getSelections(),
      setSelections: selections => this.setSelections(selections)
    };

    this.#modes =
    {
      line: new LineSelections(owner),
      rectangle: new RectangleSelections(owner),
      'free-form': new FreeFormSelections(owner)
    };

    this.#unsubscribe = input.subscribe
    (
      event =>
      {
        if(this.#input === null)
        {
          return;
        }

        if(input.revision !== this.#inputRevision)
        {
          this.#inputRevision = input.revision;
          this.#folds = [];
          this.#hidden = 0;
          this.#advance();
          this.#notify('content', {invalidation:{all:true}});
        }
        else
        {
          this.#notify(event.type);
        }
      }
    );

    if(input.revision !== this.#inputRevision)
    {
      this.destroy();
      throw new Error('input Document2D changed during construction');
    }
  }

  #active()
  {
    if(this.#input === null)
    {
      throw new Error('FoldDocument2D is destroyed');
    }

    if(this.#input.revision !== this.#inputRevision)
    {
      throw new Error('input Document2D revision is stale');
    }

    return this.#input;
  }

  #advance()
  {
    this.#revision = this.#revision === Number.MAX_SAFE_INTEGER ?
      0 : this.#revision + 1;
    this.#maxColsRevision = null;
  }

  #notify(type, extra = null)
  {
    const event = {type, revision:this.#revision, ...extra};

    for(const listener of Array.from(this.#listeners))
    {
      listener(event);
    }
  }

  get revision()
  {
    this.#active();
    return this.#revision;
  }

  get rowCount()
  {
    return this.#active().rowCount - this.#hidden;
  }

  get folds()
  {
    this.#active();
    return this.#folds.map(f => ({startRow:f.startRow, endRow:f.endRow}));
  }

  setFolds(ranges)
  {
    const input = this.#active();
    const revision = input.revision;

    if(!Array.isArray(ranges))
    {
      throw new TypeError('fold range array required');
    }

    const folds = ranges.map
    (
      item =>
      {
        if(!item || typeof item !== 'object' || Array.isArray(item))
        {
          throw new TypeError('fold range record required');
        }

        const {startRow, endRow} = item;

        if
        (
          !Number.isSafeInteger(startRow) ||
          !Number.isSafeInteger(endRow) ||
          startRow < 0 || endRow <= startRow || endRow > input.rowCount
        )
        {
          throw new RangeError('invalid fold row interval');
        }

        return {startRow, endRow};
      }
    );

    folds.sort((a, b) => a.startRow - b.startRow);
    let hidden = 0;
    let lastEnd = 0;

    for(const fold of folds)
    {
      if(fold.startRow < lastEnd)
      {
        throw new RangeError('overlapping fold row intervals');
      }

      fold.displayRow = fold.startRow - hidden;
      hidden += fold.endRow - fold.startRow - 1;
      lastEnd = fold.endRow;
    }

    if(input.revision !== revision || this.#inputRevision !== revision)
    {
      throw new Error('input Document2D changed during fold configuration');
    }

    if
    (
      folds.length === this.#folds.length && folds.every
      (
        (fold, index) =>
          fold.startRow === this.#folds[index].startRow &&
          fold.endRow === this.#folds[index].endRow
      )
    )
    {
      return this;
    }

    this.#folds = folds;
    this.#hidden = hidden;
    this.#advance();
    this.#notify('content', {invalidation:{all:true}});
    return this;
  }

  // Translate an exposed row; null denotes a synthetic fold row.
  #inputRow(row)
  {
    let hidden = 0;

    for(const fold of this.#folds)
    {
      if(row < fold.displayRow)
      {
        break;
      }

      if(row === fold.displayRow)
      {
        return null;
      }

      hidden += fold.endRow - fold.startRow - 1;
    }

    return row + hidden;
  }

  #viewRow(row)
  {
    let hidden = 0;

    for(const fold of this.#folds)
    {
      if(row < fold.startRow)
      {
        break;
      }

      if(row < fold.endRow)
      {
        throw new RangeError('coordinate belongs to folded source rows');
      }

      hidden += fold.endRow - fold.startRow - 1;
    }

    return row - hidden;
  }

  #point(value)
  {
    if
    (
      !value || typeof value !== 'object' || Array.isArray(value) ||
      !Number.isSafeInteger(value.row) || value.row < 0 ||
      !Number.isSafeInteger(value.col) || value.col < 0
    )
    {
      throw new RangeError('invalid fold-view position');
    }

    return {row:value.row, col:value.col};
  }

  #toInput(value)
  {
    const point = this.#point(value);
    const row = this.#inputRow(point.row);

    if(row === null)
    {
      throw new RangeError('fold marker has no editable source position');
    }

    return {row, col:point.col};
  }

  #fromInput(value)
  {
    const point = this.#point(value);
    return {row:this.#viewRow(point.row), col:point.col};
  }

  // A normal interval with endpoints on opposite sides of a hidden
  // region would silently include hidden text. Never forward that.
  #checkSpan(start, end)
  {
    if
    (
      start.row > end.row ||
      (start.row === end.row && start.col > end.col)
    )
    {
      throw new RangeError('invalid ordered fold-view range');
    }

    for(const fold of this.#folds)
    {
      if(start.row < fold.startRow && end.row >= fold.endRow)
      {
        throw new RangeError('selection or edit crosses folded source rows');
      }
    }
  }

  #window(rowStart, colStart, rowEnd, colEnd)
  {
    if
    (
      ![rowStart, colStart, rowEnd, colEnd].every
      (
        value => Number.isSafeInteger(value) && value >= 0
      ) ||
      rowEnd < rowStart || colEnd < colStart
    )
    {
      throw new RangeError('invalid folded 2D window');
    }

    return Math.min(rowEnd, this.rowCount);
  }

  getRowWidth(row)
  {
    const input = this.#active();

    if(!Number.isSafeInteger(row) || row < 0)
    {
      throw new RangeError('invalid fold-view row');
    }

    if(row >= this.rowCount)
    {
      return 0;
    }

    const sourceRow = this.#inputRow(row);
    return sourceRow === null ? 1 : input.getRowWidth(sourceRow);
  }

  get colCount()
  {
    this.#active();

    if(this.#maxColsRevision !== this.#revision)
    {
      let width = 0;

      for(let row = 0; row < this.rowCount; row++)
      {
        width = Math.max(width, this.getRowWidth(row));
      }

      this.#maxCols = width;
      this.#maxColsRevision = this.#revision;
    }

    return this.#maxCols;
  }

  getRegions(rowStart, colStart, rowEnd, colEnd)
  {
    const input = this.#active();
    const revision = input.revision;
    const end = this.#window(rowStart, colStart, rowEnd, colEnd);
    const rows = [];

    for(let row = rowStart; row < end; row++)
    {
      const sourceRow = this.#inputRow(row);

      if(sourceRow === null)
      {
        rows.push
        (
          colStart < 1 && colEnd > 0 ?
          [{kind:'fold', text:'…', start:{row, col:0}, end:{row, col:1}}] :
          []
        );
      }
      else
      {
        const regions = input.getRegions
        (
          sourceRow, colStart, sourceRow + 1, colEnd
        )[0];

        rows.push
        (
          regions.map
          (
            region =>
            (
              {
                kind:region.kind,
                text:region.text,
                start:{row, col:region.start.col},
                end:{row, col:region.end.col}
              }
            )
          )
        );
      }
    }

    if(input.revision !== revision || this.#inputRevision !== revision)
    {
      throw new Error('input Document2D changed during folded read');
    }

    return rows;
  }

  getRect(rowStart, colStart, rowEnd, colEnd)
  {
    const input = this.#active();
    const revision = input.revision;
    const end = this.#window(rowStart, colStart, rowEnd, colEnd);
    const rows = [];

    for(let row = rowStart; row < end; row++)
    {
      const sourceRow = this.#inputRow(row);

      rows.push
      (
        sourceRow === null ?
          (colStart < 1 && colEnd > 0 ? '…' : '') :
          input.getRect(sourceRow, colStart, sourceRow + 1, colEnd)[0]
      );
    }

    if(input.revision !== revision || this.#inputRevision !== revision)
    {
      throw new Error('input Document2D changed during folded read');
    }

    return rows;
  }

  getSelections()
  {
    const selections = this.#active().getSelections();

    return selections.map
    (
      selection =>
      {
        const start = this.#point(selection.start);
        const end = this.#point(selection.end);
        this.#checkSpan(start, end);

        return {
          start:this.#fromInput(start),
          end:this.#fromInput(end),
          forward:selection.forward
        };
      }
    );
  }

  setSelections(selections)
  {
    const input = this.#active();

    if(!Array.isArray(selections))
    {
      throw new TypeError('selection array required');
    }

    const revision = this.#revision;
    const inputRevision = input.revision;
    const mapped = selections.map
    (
      selection =>
      {
        if(!selection || typeof selection.forward !== 'boolean')
        {
          throw new TypeError('invalid fold-view selection');
        }

        const start = this.#toInput(selection.start);
        const end = this.#toInput(selection.end);
        this.#checkSpan(start, end);

        return {start, end, forward:selection.forward};
      }
    );

    if(this.#revision !== revision || input.revision !== inputRevision)
    {
      throw new Error('stale folded selection coordinates');
    }

    input.setSelections(mapped);
    return this;
  }

  addSelection(position)
  {
    this.#active();
    this.#modes[this.#selectionMode].addSelection(position);
    return this;
  }

  remSelection(position)
  {
    this.#active();
    this.#modes[this.#selectionMode].remSelection(position);
    return this;
  }

  get selectionMode()
  {
    this.#active();
    return this.#selectionMode;
  }

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

  get insertMode()
  {
    return this.#active().insertMode;
  }

  set insertMode(mode)
  {
    this.#active().insertMode = mode;
  }

  read()
  {
    this.getSelections();
    return this.#active().read();
  }

  insert(content)
  {
    this.getSelections();
    return this.#active().insert(content);
  }

  replace(edits, expectedRevision)
  {
    const input = this.#active();

    if(!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
    {
      throw new TypeError('Document2D revision required');
    }

    if(expectedRevision !== this.#revision)
    {
      throw new Error('stale Document2D coordinates');
    }

    if(!Array.isArray(edits) || edits.length === 0)
    {
      throw new RangeError('nonempty Document2D edit array required');
    }

    const inputRevision = input.revision;
    const mapped = edits.map
    (
      edit =>
      {
        if(!edit || typeof edit !== 'object' || typeof edit.text !== 'string')
        {
          throw new TypeError('invalid folded edit record');
        }

        const start = this.#toInput(edit.start);
        const end = this.#toInput(edit.end);
        this.#checkSpan(start, end);

        return {start, end, text:edit.text};
      }
    );

    if(this.#revision !== expectedRevision || input.revision !== inputRevision)
    {
      throw new Error('stale Document2D coordinates');
    }

    input.replace(mapped, inputRevision);
    return this;
  }

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

  destroy()
  {
    if(this.#input === null)
    {
      return;
    }

    this.#input = null;
    this.#unsubscribe();
    this.#listeners.clear();
    this.#modes = null;
    this.#unsubscribe = null;
    this.#folds = [];
    this.#hidden = 0;
  }
}
