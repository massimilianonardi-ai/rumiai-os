// View-local grapheme and tab-cell projection of any Document2D.
// Source storage and effective selections remain owned by the input view.
// A region is a whole indivisible displayed unit in this view's coordinates.
// All back-projection happens before an atomic input.replace() transaction.
//
// The incremental scanner follows the established TextEditRepresentation
// trailing-grapheme strategy, avoiding whole-row materialization for
// bounded viewport and coordinate operations.

class CellDocument2D extends Document2D
{
  #input;
  #inputRevision;
  #revision = 0;
  #tabSize;
  #segmenter;
  #selectionMode = 'line';
  #modes;
  #listeners = new Set();
  #unsubscribe;
  #unsubscribePreparing = null;
  #preparedGeometry = null;
  #geometrySubscribers = new Set();
  #maxColsRevision = null;
  #maxCols = 0;

  constructor(input, tabSize = 4)
  {
    super();

    if(!(input instanceof Document2D))
    {
      throw new TypeError('Document2D input required');
    }

    if(!Number.isSafeInteger(tabSize) || tabSize < 1)
    {
      throw new RangeError('positive tab size required');
    }

    if(typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function')
    {
      throw new Error('Intl.Segmenter is required for grapheme cells');
    }

    this.#input = input;
    this.#inputRevision = input.revision;
    this.#tabSize = tabSize;
    this.#segmenter = new Intl.Segmenter(undefined, {granularity:'grapheme'});

    // Observe the immediate input's old points only when its existing
    // private bridge can certify them: Raw, directly composed Cell, or a
    // zero-width annotation chain retaining Raw coordinate identity.
    // A Cell input supplies CELL points (never physical UTF-16 offsets).
    const certifiedInput =
      input instanceof RawDocument2D ||
      input instanceof CellDocument2D ||
      (
        input instanceof AnnotationDocument2D &&
        input._hasRawCoordinateIdentity()
      );

    if
    (
      certifiedInput &&
      typeof input._subscribeBeforeGeometry === 'function'
    )
    {
      this.#unsubscribePreparing = input._subscribeBeforeGeometry
      (
        captured =>
        {
          this.#preparedGeometry = null;

          if
          (
            this.#input === null ||
            !captured ||
            this.#inputRevision !== captured.previousRevision ||
            input.revision !== captured.previousRevision
          )
          {
            return;
          }

          try
          {
            if
            (
              !Number.isSafeInteger(captured.oldRowCount) ||
              captured.oldRowCount !== input.rowCount ||
              !Array.isArray(captured.edits) ||
              captured.edits.length === 0
            )
            {
              return;
            }

            this.#preparedGeometry =
            {
              inputRevision:captured.previousRevision,
              viewRevision:this.#revision,
              oldRowCount:captured.oldRowCount,
              edits:captured.edits.map
              (
                edit =>
                {
                  const start=this.#projectInputPoint(edit.old.start);
                  const end=this.#projectInputPoint(edit.old.end);
                  const withOffset=input instanceof RawDocument2D;

                  if
                  (
                    ('offset' in edit.old.start) !== withOffset ||
                    ('offset' in edit.old.end) !== withOffset
                  )
                  {
                    throw new RangeError('inconsistent old input offsets');
                  }

                  return {
                    old:{start,end},
                    inputOld:
                    {
                      start:{...edit.old.start},
                      end:{...edit.old.end}
                    }
                  };
                }
              )
            };
            // Publish ONLY old cell points. The physical offsets remain
            // private to this layer's own post-commit verification.
            if(this.#geometrySubscribers.size)
            {
              const geometry = Object.freeze
              (
                {
                  previousRevision:this.#revision,
                  oldRowCount:input.rowCount,
                  edits:Object.freeze
                  (
                    this.#preparedGeometry.edits.map
                    (
                      edit => Object.freeze
                      (
                        {
                          old:Object.freeze
                          (
                            {
                              start:Object.freeze({...edit.old.start}),
                              end:Object.freeze({...edit.old.end})
                            }
                          )
                        }
                      )
                    )
                  )
                }
              );

              for(const listener of Array.from(this.#geometrySubscribers))
              {
                try
                {
                  listener(geometry);
                }
                catch(error)
                {
                  try
                  {
                    if(typeof console !== 'undefined' && console.error)
                    {
                      console.error
                      (
                        'TextEdit cell pre-commit geometry observer failed',
                        error
                      );
                    }
                  }
                  catch(_)
                  {
                    // Diagnostics cannot reject the physical edit.
                  }
                }
              }
            }
          }
          catch(_)
          {
            // Non-representable source boundary: invalidate the entire view.
          }
        }
      );
    }

    // Strategies interpret positions in THIS view's cells. Their shared
    // owner is an adapter into the one effective collection in the input.
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
          const previousRevision = this.#revision;
          const prepared = this.#preparedGeometry;
          this.#preparedGeometry = null;
          this.#inputRevision = input.revision;
          this.#revision = this.#revision === Number.MAX_SAFE_INTEGER ?
            0 : this.#revision + 1;
          this.#maxColsRevision = null;

          const geometry = this.#projectGeometry
          (
            event.geometry, prepared, previousRevision
          );

          this.#notify('content',
          {
            invalidation:{all:true},
            ...(geometry ? {geometry} : {})
          });
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

  // Private immediate-view observation. Callbacks run while the OLD cell
  // layout is available and never expose raw source offsets.
  _subscribeBeforeGeometry(listener)
  {
    this.#active();

    if(typeof listener !== 'function')
    {
      throw new TypeError('cell geometry observer must be a function');
    }

    this.#geometrySubscribers.add(listener);
    let active=true;

    return () =>
    {
      if(active)
      {
        active=false;
        this.#geometrySubscribers.delete(listener);
      }
    };
  }

  #active()
  {
    if(this.#input === null)
    {
      throw new Error('CellDocument2D is destroyed');
    }

    if(this.#input.revision !== this.#inputRevision)
    {
      throw new Error('input Document2D revision is stale');
    }

    return this.#input;
  }

  #notify(type, extra = null)
  {
    const event = {type, revision:this.#revision, ...extra};

    for(const listener of Array.from(this.#listeners))
    {
      listener(event);
    }
  }

  // Each input endpoint must be a real EOL-bounded caret position.
  // Raw CRLF interiors are not virtual cells.
  #projectInputPoint(position)
  {
    const input = this.#active();

    if
    (
      position.row >= input.rowCount ||
      position.col > input.getRowWidth(position.row)
    )
    {
      throw new RangeError('source endpoint has no cell boundary');
    }

    return this.#fromInput(position);
  }

  // Project only a verified immediate-input batch, never inferred old
  // geometry. TAB stops/graphemes still require whole-view invalidation.
  #projectGeometry(committed, prepared, previousRevision)
  {
    if
    (
      !committed || !prepared ||
      committed.previousRevision !== prepared.inputRevision ||
      committed.revision !== this.#inputRevision ||
      committed.previousRevision === Number.MAX_SAFE_INTEGER ||
      committed.revision !== committed.previousRevision + 1 ||
      prepared.viewRevision !== previousRevision ||
      previousRevision === Number.MAX_SAFE_INTEGER ||
      prepared.oldRowCount !== committed.oldRowCount ||
      !Number.isSafeInteger(committed.oldRowCount) ||
      !Number.isSafeInteger(committed.newRowCount) ||
      committed.newRowCount !== this.#input.rowCount ||
      !Array.isArray(committed.edits) ||
      committed.edits.length !== prepared.edits.length
    )
    {
      return null;
    }

    try
    {
      const edits = committed.edits.map
      (
        (edit, index) =>
        {
          const old = prepared.edits[index];

          for(const side of ['start','end'])
          {
            const before=old.inputOld[side];
            const after=edit.old[side];

            if
            (
              before.row !== after.row ||
              before.col !== after.col ||
              ('offset' in before) !== ('offset' in after) ||
              (
                'offset' in before &&
                before.offset !== after.offset
              )
            )
            {
              throw new Error('pre/post input geometry does not match');
            }
          }

          const mapped = Object.freeze
          (
            {
              old:Object.freeze
              (
                {
                  start:Object.freeze(old.old.start),
                  end:Object.freeze(old.old.end)
                }
              ),
              new:Object.freeze
              (
                {
                  start:Object.freeze(this.#projectInputPoint(edit.new.start)),
                  end:Object.freeze(this.#projectInputPoint(edit.new.end))
                }
              )
            }
          );

          return mapped;
        }
      );

      return Object.freeze
      (
        {
          previousRevision,
          revision:this.#revision,
          oldRowCount:committed.oldRowCount,
          newRowCount:committed.newRowCount,
          edits:Object.freeze(edits)
        }
      );
    }
    catch(_)
    {
      // A cut inside a changed grapheme or source terminator is not a cell
      // coordinate. Do not infer it from the new state or report an edit error.
      return null;
    }
  }

  get revision()
  {
    this.#active();
    return this.#revision;
  }

  get rowCount()
  {
    return this.#active().rowCount;
  }

  // Scan a row in bounded input-space windows. Ordinary text regions have
  // one input cell per UTF-16 unit and may be segmented across chunks.
  // A region whose width does not equal its text length, or whose kind is
  // not text, remains indivisible; this permits nesting over another view.
  #scanRow(row, visitor)
  {
    const input = this.#active();

    if(!Number.isSafeInteger(row) || row < 0 || row >= input.rowCount)
    {
      throw new RangeError('invalid Document2D row');
    }

    const sourceWidth = input.getRowWidth(row);
    const inputRevision = input.revision;
    let offset = 0;
    let column = 0;
    let carry = '';
    let carryStart = 0;
    let stopped = false;
    const annotations = [];
    let nextAnnotation = 0;

    const publishNotes = at =>
    {
      while
      (
        nextAnnotation < annotations.length &&
        annotations[nextAnnotation].start.col <= at &&
        !stopped
      )
      {
        const note = annotations[nextAnnotation++];

        if(note.start.col !== at)
        {
          throw new RangeError('annotation anchor splits an indivisible grapheme');
        }

        const point = {row, col:column};
        const inputPoint = {row, col:at};
        const cell =
        {
          kind:'annotation',
          id:note.id,
          text:note.text,
          start:point,
          end:{...point},
          inputStart:inputPoint,
          inputEnd:{...inputPoint}
        };

        if(visitor(cell) === false)
        {
          stopped = true;
        }
      }
    };

    const emit = (text, kind, from, to, fixedWidth = null, id) =>
    {
      publishNotes(from);

      if(stopped)
      {
        return;
      }

      if(nextAnnotation < annotations.length &&
         annotations[nextAnnotation].start.col < to)
      {
        throw new RangeError('annotation anchor splits an indivisible grapheme');
      }

      const width = fixedWidth === null ?
        (kind === 'tab' ? this.#tabSize - column % this.#tabSize : 1) :
        fixedWidth;
      const end = column + width;

      if(!Number.isSafeInteger(end))
      {
        throw new RangeError('display cell extent exceeds safe integer');
      }

      const cell =
      {
        kind,
        text,
        start: {row, col:column},
        end: {row, col:end},
        inputStart: {row, col:from},
        inputEnd: {row, col:to}
      };

      if(id !== undefined)
      {
        cell.id = id;
      }

      column = end;

      if(visitor(cell) === false)
      {
        stopped = true;
      }

      if(!stopped)
      {
        publishNotes(to);
      }
    };

    const flush = final =>
    {
      if(!carry.length || stopped)
      {
        return;
      }

      const parts = [...this.#segmenter.segment(carry)];
      const count = final ? parts.length : Math.max(0, parts.length - 1);

      for(let i = 0; i < count && !stopped; i++)
      {
        const item = parts[i];
        const from = carryStart + item.index;
        const to = from + item.segment.length;

        emit(item.segment, item.segment === '\t' ? 'tab' : 'text', from, to);
      }

      if(final)
      {
        carry = '';
      }
      else
      {
        const tail = parts[count];

        if(tail)
        {
          carry = carry.slice(tail.index);
          carryStart += tail.index;
        }
        else
        {
          carryStart += carry.length;
          carry = '';
        }
      }
    };

    while(offset < sourceWidth && !stopped)
    {
      const until = Math.min(sourceWidth, offset + 2048);
      const rows = input.getRegions(row, offset, row + 1, until);
      const regions = rows[0];

      if(!Array.isArray(regions) || regions.length === 0)
      {
        throw new Error('input Document2D has a region gap');
      }

      const consuming = [];

      // Drop already-published annotations once per bounded input chunk;
      // an index avoids repeated O(n) array shifts within a dense chunk.
      if(nextAnnotation)
      {
        annotations.splice(0, nextAnnotation);
        nextAnnotation = 0;
      }

      for(const region of regions)
      {
        if
        (
          region && region.kind === 'annotation' &&
          region.start && region.end &&
          region.start.row === row && region.end.row === row &&
          region.start.col === region.end.col &&
          Number.isSafeInteger(region.start.col) &&
          region.start.col >= offset &&
          region.start.col < until &&
          typeof region.text === 'string'
        )
        {
          annotations.push(region);
        }
        else
        {
          consuming.push(region);
        }
      }

      if(!consuming.length)
      {
        throw new Error('input Document2D has a region gap');
      }

      annotations.sort((a, b) => a.start.col - b.start.col);

      for(const region of consuming)
      {
        if(stopped)
        {
          break;
        }

        if
        (
          !region || !region.start || !region.end ||
          region.start.row !== row || region.end.row !== row ||
          region.start.col !== offset ||
          !Number.isSafeInteger(region.end.col) ||
          region.end.col <= offset || region.end.col > sourceWidth ||
          typeof region.text !== 'string'
        )
        {
          throw new Error('invalid input Document2D region');
        }

        const width = region.end.col - offset;
        const from = offset;
        offset = region.end.col;

        if(region.kind === 'text' && region.text.length === width)
        {
          if(!carry.length)
          {
            carryStart = from;
          }

          carry += region.text;
          flush(offset === sourceWidth);
        }
        else
        {
          flush(true);

          if(!stopped)
          {
            emit(region.text, region.kind, from, offset, width, region.id);
          }
        }
      }
    }

    flush(true);

    if(!stopped)
    {
      // An annotation at EOL is not inside the preceding half-open chunk.
      // Empty rows can also have a zero-width annotation at column zero.
      const terminal = input.getRegions
      (
        row, sourceWidth, row + 1, sourceWidth + 1
      )[0];

      for(const note of terminal)
      {
        if(note.kind === 'annotation' &&
           note.start.col === sourceWidth &&
           note.end.col === sourceWidth)
        {
          annotations.push(note);
        }
      }

      annotations.sort((a, b) => a.start.col - b.start.col);
      publishNotes(sourceWidth);
    }

    if(input.revision !== inputRevision || input.revision !== this.#inputRevision)
    {
      throw new Error('input Document2D changed during cell scan');
    }

    return {columns:column, stopped};
  }

  getRowWidth(row)
  {
    const input = this.#active();

    if(!Number.isSafeInteger(row) || row < 0)
    {
      throw new RangeError('invalid Document2D row');
    }

    return row >= input.rowCount ? 0 :
      this.#scanRow(row, () => {}).columns;
  }

  get colCount()
  {
    const input = this.#active();

    if(this.#maxColsRevision !== this.#revision)
    {
      let width = 0;

      for(let row = 0; row < input.rowCount; row++)
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

    if
    (
      ![rowStart, colStart, rowEnd, colEnd].every
      (
        n => Number.isSafeInteger(n) && n >= 0
      ) ||
      rowEnd < rowStart || colEnd < colStart
    )
    {
      throw new RangeError('invalid Document2D region window');
    }

    const rows = [];
    const end = Math.min(rowEnd, input.rowCount);

    for(let row = rowStart; row < end; row++)
    {
      const regions = [];

      if(colStart < colEnd)
      {
        this.#scanRow
        (
          row,
          cell =>
          {
            const overlay = cell.kind === 'annotation';

            if
            (
              overlay ?
                cell.start.col >= colStart && cell.start.col < colEnd :
                cell.end.col > colStart
            )
            {
              // Never expose the privately owned input coordinate mapping.
              const record =
              {
                kind:cell.kind,
                text:cell.text,
                start:{...cell.start},
                end:{...cell.end}
              };

              if(cell.id !== undefined)
              {
                record.id = cell.id;
              }

              regions.push(record);
            }

            return (overlay ? cell.start.col : cell.end.col) < colEnd;
          }
        );
      }

      rows.push(regions);
    }

    return rows;
  }

  getRect(rowStart, colStart, rowEnd, colEnd)
  {
    return this.getRegions(rowStart, colStart, rowEnd, colEnd).map
    (
      regions => regions.map
      (
        region =>
        {
          if(region.kind === 'annotation')
          {
            return '';
          }

          if(region.kind === 'tab')
          {
            const start = Math.max(colStart, region.start.col);
            const end = Math.min(colEnd, region.end.col);
            return ' '.repeat(end - start);
          }

          return region.text;
        }
      ).join('')
    );
  }

  #point(point)
  {
    if(!point || typeof point !== 'object' || Array.isArray(point) ||
       !Number.isSafeInteger(point.row) || point.row < 0 ||
       !Number.isSafeInteger(point.col) || point.col < 0)
    {
      throw new RangeError('invalid cell position');
    }

    return {row:point.row, col:point.col};
  }

  // The only permitted edit/selection boundaries are exact grapheme/tab
  // boundaries. Columns beyond EOL retain their virtual displacement.
  #toInput(value)
  {
    const {row, col} = this.#point(value);
    const input = this.#active();

    if(row >= input.rowCount)
    {
      return {row, col};
    }

    let found = null;
    const result = this.#scanRow
    (
      row,
      cell =>
      {
        if(col === cell.start.col)
        {
          found = {...cell.inputStart};
          return false;
        }

        if(col === cell.end.col)
        {
          found = {...cell.inputEnd};
          return false;
        }

        if(col < cell.end.col)
        {
          throw new RangeError('cell boundary splits an indivisible region');
        }
      }
    );

    if(found)
    {
      return found;
    }

    const remaining = col - result.columns;
    return {row, col: input.getRowWidth(row) + remaining};
  }

  #fromInput(value)
  {
    const {row, col} = this.#point(value);
    const input = this.#active();

    if(row >= input.rowCount)
    {
      return {row, col};
    }

    let found = null;
    const result = this.#scanRow
    (
      row,
      cell =>
      {
        if(col === cell.inputStart.col)
        {
          found = {...cell.start};
          return false;
        }

        if(col === cell.inputEnd.col)
        {
          found = {...cell.end};
          return false;
        }

        if(col < cell.inputEnd.col)
        {
          throw new RangeError('input point splits an indivisible region');
        }
      }
    );

    if(found)
    {
      return found;
    }

    return {row, col:result.columns + col - input.getRowWidth(row)};
  }

  getSelections()
  {
    return this.#active().getSelections().map
    (
      selection =>
      (
        {
          start:this.#fromInput(selection.start),
          end:this.#fromInput(selection.end),
          forward:selection.forward
        }
      )
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
    const mapped = selections.map
    (
      selection =>
      {
        if(!selection || typeof selection.forward !== 'boolean')
        {
          throw new TypeError('invalid selection');
        }

        return {
          start:this.#toInput(selection.start),
          end:this.#toInput(selection.end),
          forward:selection.forward
        };
      }
    );

    if(this.#revision !== revision)
    {
      throw new Error('stale Document2D selection coordinates');
    }

    input.setSelections(mapped);
    return this;
  }

  addSelection(point)
  {
    this.#active();
    this.#modes[this.#selectionMode].addSelection(point);
    return this;
  }

  remSelection(point)
  {
    this.#active();
    this.#modes[this.#selectionMode].remSelection(point);
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
    // A separate input consumer may have installed a caret inside a
    // grapheme. Never leak or edit a partial logical cell through this view.
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
    return this._replaceMapped
    (
      this.#active(),
      edits,
      expectedRevision,
      edit =>
      (
        {
          start:this.#toInput(edit.start),
          end:this.#toInput(edit.end),
          text:edit.text
        }
      )
    );
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
    if(this.#unsubscribePreparing)
    {
      this.#unsubscribePreparing();
    }
    this.#preparedGeometry = null;
    this.#geometrySubscribers.clear();
    this.#listeners.clear();
    this.#modes = null;
    this.#unsubscribe = null;
    this.#segmenter = null;
  }
}
