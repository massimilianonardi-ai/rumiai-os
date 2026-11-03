// Whole-row folding over an arbitrary Document2D.
// Whole-row folds use a synthetic row; an optional inline fold joins two
// visible row fragments around one protected marker.
// Text, selection state and atomic editing remain owned by the input.
// Folds are conservatively cleared on every input geometry revision.

class FoldDocument2D extends Document2D
{
  #input;
  #inputRevision;
  #revision = 0;
  #folds = [];
  #inline = null;
  #hidden = 0;
  #selectionMode = 'line';
  #modes;
  #listeners = new Set();
  #unsubscribe;
  #unsubscribePreparing = null;
  #preparedGeometry = null;
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

    // Raw physical geometry can be checked while the OLD source still
    // exists. The hook is private and cannot change a successful edit.
    if(typeof input._subscribeBeforeGeometry === 'function')
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
            const oldRowCount = input.rowCount - this.#hidden;
            const edits = captured.edits.map
            (
              edit =>
              {
                const start = this.#point(edit.old.start);
                const end = this.#point(edit.old.end);
                this.#checkSpan(start, end);

                const project = point =>
                {
                  if
                  (
                    point.row >= input.rowCount ||
                    point.col > input.getRowWidth(point.row)
                  )
                  {
                    throw new RangeError('old fold cut is not a real caret');
                  }

                  return this.#fromInput(point);
                };

                return {
                  raw:
                  {
                    start:{...edit.old.start},
                    end:{...edit.old.end}
                  },
                  old:
                  {
                    start:project(start),
                    end:project(end)
                  }
                };
              }
            );

            if
            (
              captured.oldRowCount !== input.rowCount ||
              !Number.isSafeInteger(oldRowCount) ||
              oldRowCount < 1
            )
            {
              return;
            }

            this.#preparedGeometry =
            {
              inputRevision:this.#inputRevision,
              viewRevision:this.#revision,
              oldRowCount,
              edits
            };
          }
          catch(_)
          {
            // A hidden span, CRLF interior or invalid cut has no map.
          }
        }
      );
    }

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
          // The old fold map still exists when the input commits.
          // Prefer captured precommit points, or safe row-start fallback,
          // before clearing the fold and exposing the committed input.
          const prepared = this.#preparedGeometry;
          this.#preparedGeometry = null;
          const geometry = this.#projectGeometry
          (
            event.geometry, input, prepared
          );

          this.#inputRevision = input.revision;
          this.#folds = [];
          this.#inline = null;
          this.#hidden = 0;
          this.#advance();
          this.#notify
          (
            'content',
            {
              invalidation:{all:true},
              ...(geometry ? {geometry} : {})
            }
          );
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

  // Prefer exact precommit cuts when the immediate input is raw. Without
  // old-source observation, only visible whole-row starts are provable.
  // The postcommit input has already cleared its own old text geometry.
  #projectGeometry(change, input, prepared)
  {
    try
    {
      if
      (
        !change ||
        change.previousRevision !== this.#inputRevision ||
        change.revision !== input.revision ||
        this.#inputRevision === Number.MAX_SAFE_INTEGER ||
        input.revision !== this.#inputRevision + 1 ||
        this.#revision === Number.MAX_SAFE_INTEGER ||
        !Number.isSafeInteger(change.oldRowCount) ||
        !Number.isSafeInteger(change.newRowCount) ||
        change.newRowCount < 1 ||
        !Array.isArray(change.edits) ||
        change.edits.length === 0
      )
      {
        return null;
      }

      const captured =
        prepared &&
        prepared.inputRevision === this.#inputRevision &&
        prepared.viewRevision === this.#revision &&
        prepared.edits.length === change.edits.length &&
        prepared.oldRowCount === change.oldRowCount - this.#hidden ?
          prepared : null;

      if(this.#inline !== null && !captured)
      {
        return null;
      }

      const oldRowCount = captured ?
        captured.oldRowCount : change.oldRowCount - this.#hidden;

      if
      (
        !Number.isSafeInteger(oldRowCount) || oldRowCount < 1 ||
        change.newRowCount !== input.rowCount
      )
      {
        return null;
      }

      const oldPoint = (value, index, side) =>
      {
        const point = this.#point(value);

        if(point.row >= change.oldRowCount)
        {
          throw new RangeError('old fold row outside source');
        }

        if(captured)
        {
          const prior = captured.edits[index];
          const raw = prior.raw[side];

          // Raw input verifies matching physical offsets; Cell input has
          // no offsets on either side and verifies them in its own layer.
          if
          (
            raw.row !== point.row ||
            raw.col !== point.col ||
            ('offset' in raw) !== ('offset' in value) ||
            raw.offset !== value.offset
          )
          {
            throw new RangeError('pre/post fold cuts do not match');
          }

          return Object.freeze({...prior.old[side]});
        }

        if(point.col !== 0)
        {
          throw new RangeError('unverified old fold boundary');
        }

        return Object.freeze(this.#fromInput(point));
      };

      const newPoint = value =>
      {
        const point = this.#point(value);

        if
        (
          point.row >= change.newRowCount ||
          point.col > input.getRowWidth(point.row)
        )
        {
          throw new RangeError('invalid committed fold boundary');
        }

        return Object.freeze(point);
      };

      const edits = change.edits.map
      (
        (edit, index) =>
        {
          const start = this.#point(edit.old.start);
          const end = this.#point(edit.old.end);
          const nextStart = this.#point(edit.new.start);
          const nextEnd = this.#point(edit.new.end);
          this.#checkSpan(start, end);

          if
          (
            nextStart.row > nextEnd.row ||
            (nextStart.row === nextEnd.row && nextStart.col > nextEnd.col)
          )
          {
            throw new RangeError('invalid committed fold edit span');
          }

          return Object.freeze
          (
            {
              old:Object.freeze
              (
                {
                  start:oldPoint(edit.old.start, index, 'start'),
                  end:oldPoint(edit.old.end, index, 'end')
                }
              ),
              new:Object.freeze
              (
                {
                  start:newPoint(edit.new.start),
                  end:newPoint(edit.new.end)
                }
              )
            }
          );
        }
      );

      return Object.freeze
      (
        {
          previousRevision:this.#revision,
          revision:this.#revision + 1,
          oldRowCount,
          newRowCount:change.newRowCount,
          edits:Object.freeze(edits)
        }
      );
    }
    catch(_)
    {
      // A completed source edit must still invalidate the complete view.
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
      this.#inline === null &&
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
    this.#inline = null;
    this.#hidden = hidden;
    this.#advance();
    this.#notify('content', {invalidation:{all:true}});
    return this;
  }

  //----------------------------------------------------------------------------
  // Optional cross-row inline fold in INPUT coordinates -----------------------
  //----------------------------------------------------------------------------

  get inlineFold()
  {
    this.#active();

    if(this.#inline === null)
    {
      return null;
    }

    return {
      start:{...this.#inline.start},
      end:{...this.#inline.end}
    };
  }

  #comparePoints(a, b)
  {
    if(a.row !== b.row)
    {
      return a.row < b.row ? -1 : 1;
    }

    return a.col === b.col ? 0 : (a.col < b.col ? -1 : 1);
  }

  #checkCut(input, point)
  {
    const row = point.row, col = point.col;
    const left = Math.max(0, col - 1);
    const regions = input.getRegions(row, left, row + 1, col + 1)[0];

    for(const region of regions)
    {
      const start = region.start.col;
      const end = region.end.col;
      const width = end - start;

      if(region.kind === 'fold' && start <= col && col <= end)
      {
        throw new RangeError('inline fold cut touches source-less fold');
      }

      if
      (
        start < col && col < end &&
        (region.kind !== 'text' || width !== region.text.length)
      )
      {
        throw new RangeError('inline fold cut splits an indivisible region');
      }
    }
  }

  setInlineFold(value)
  {
    const input = this.#active();
    const inputRevision = input.revision;
    let fold = null;

    if(value !== null)
    {
      if
      (
        !value || typeof value !== 'object' || Array.isArray(value) ||
        !value.start || !value.end
      )
      {
        throw new TypeError('inline fold endpoints required');
      }

      const start = this.#point(value.start);
      const end = this.#point(value.end);

      if
      (
        start.row >= end.row || end.row >= input.rowCount ||
        start.col > input.getRowWidth(start.row) ||
        end.col > input.getRowWidth(end.row)
      )
      {
        throw new RangeError('invalid cross-row inline fold');
      }

      this.#checkCut(input, start);
      this.#checkCut(input, end);

      const width =
        start.col + 1 + input.getRowWidth(end.row) - end.col;

      if(!Number.isSafeInteger(width))
      {
        throw new RangeError('inline fold display width exceeds safe integer');
      }

      fold = {start, end};
    }

    if(input.revision !== inputRevision || this.#inputRevision !== inputRevision)
    {
      throw new Error('input Document2D changed during inline fold configuration');
    }

    const same =
      this.#folds.length === 0 &&
      (fold === null && this.#inline === null ||
       fold !== null && this.#inline !== null &&
       this.#comparePoints(fold.start, this.#inline.start) === 0 &&
       this.#comparePoints(fold.end, this.#inline.end) === 0);

    if(same)
    {
      return this;
    }

    this.#inline = fold;
    this.#folds = [];
    this.#hidden = fold === null ? 0 : fold.end.row - fold.start.row;
    this.#advance();
    this.#notify('content', {invalidation:{all:true}});
    return this;
  }

  // Translate an exposed row; null denotes a synthetic fold row.
  #inputRow(row)
  {
    if(this.#inline !== null)
    {
      if(row < this.#inline.start.row)
      {
        return row;
      }

      if(row === this.#inline.start.row)
      {
        return null;
      }

      return row + this.#hidden;
    }

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
    if(this.#inline !== null)
    {
      if(row < this.#inline.start.row)
      {
        return row;
      }

      if(row <= this.#inline.end.row)
      {
        throw new RangeError('coordinate belongs to folded source rows');
      }

      return row - this.#hidden;
    }

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

    if(this.#inline !== null && point.row === this.#inline.start.row)
    {
      const {start, end} = this.#inline;

      if(point.col <= start.col)
      {
        return {row:start.row, col:point.col};
      }

      return {
        row:end.row,
        col:end.col + point.col - start.col - 1
      };
    }

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

    if(this.#inline !== null)
    {
      const {start, end} = this.#inline;

      if(this.#comparePoints(point, start) <= 0)
      {
        return point;
      }

      if(this.#comparePoints(point, end) < 0)
      {
        throw new RangeError('coordinate belongs to folded source interval');
      }

      if(point.row === end.row)
      {
        return {
          row:start.row,
          col:start.col + 1 + point.col - end.col
        };
      }

      return {row:point.row - this.#hidden, col:point.col};
    }

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

    if(this.#inline !== null)
    {
      const fold = this.#inline;

      if
      (
        this.#comparePoints(start, fold.end) < 0 &&
        this.#comparePoints(fold.start, end) < 0
      )
      {
        throw new RangeError('selection or edit crosses inline folded source');
      }
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

    if(this.#inline !== null && row === this.#inline.start.row)
    {
      const {start, end} = this.#inline;
      return start.col + 1 + input.getRowWidth(end.row) - end.col;
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

  //----------------------------------------------------------------------------
  // Bounded two-fragment projection of the joined display row ----------------
  //----------------------------------------------------------------------------

  #inlineRegions(row, colStart, colEnd)
  {
    const input = this.#active();
    const {start, end} = this.#inline;
    const result = [];

    if(colStart < start.col && colStart < colEnd)
    {
      const fragments = input.getRegions
      (
        start.row, colStart, start.row + 1, Math.min(colEnd, start.col)
      )[0];

      for(const fragment of fragments)
      {
        result.push
        (
          {
            ...fragment,
            start:{row, col:fragment.start.col},
            end:{row, col:fragment.end.col}
          }
        );
      }
    }

    if(colStart <= start.col && start.col < colEnd)
    {
      // Source-less overlays anchored exactly at the visible prefix end
      // remain visible. Ordinary text after that cut stays hidden.
      const boundary = input.getRegions
      (
        start.row, start.col, start.row + 1, start.col + 1
      )[0];

      for(const region of boundary)
      {
        if
        (
          region.kind === 'annotation' &&
          region.start.col === start.col &&
          region.end.col === start.col
        )
        {
          result.push
          (
            {
              ...region,
              start:{row, col:start.col},
              end:{row, col:start.col}
            }
          );
        }
      }

      result.push
      (
        {
          kind:'fold',
          text:'…',
          start:{row, col:start.col},
          end:{row, col:start.col + 1}
        }
      );
    }

    if(colEnd > start.col + 1)
    {
      const sourceLeft = end.col +
        Math.max(0, colStart - start.col - 1);
      const sourceRight = end.col +
        colEnd - start.col - 1;
      const fragments = input.getRegions
      (
        end.row, sourceLeft, end.row + 1, sourceRight
      )[0];

      for(const fragment of fragments)
      {
        result.push
        (
          {
            ...fragment,
            start:{
              row,
              col:start.col + 1 + fragment.start.col - end.col
            },
            end:{
              row,
              col:start.col + 1 + fragment.end.col - end.col
            }
          }
        );
      }
    }

    return result;
  }

  #inlineRect(colStart, colEnd)
  {
    const input = this.#active();
    const {start, end} = this.#inline;
    let text = '';

    if(colStart < start.col && colStart < colEnd)
    {
      text += input.getRect
      (
        start.row, colStart, start.row + 1, Math.min(colEnd, start.col)
      )[0];
    }

    if(colStart <= start.col && start.col < colEnd)
    {
      text += '…';
    }

    if(colEnd > start.col + 1)
    {
      text += input.getRect
      (
        end.row,
        end.col + Math.max(0, colStart - start.col - 1),
        end.row + 1,
        end.col + colEnd - start.col - 1
      )[0];
    }

    return text;
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

      if(this.#inline !== null && row === this.#inline.start.row)
      {
        rows.push(this.#inlineRegions(row, colStart, colEnd));
      }
      else if(sourceRow === null)
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
                ...region,
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
        this.#inline !== null && row === this.#inline.start.row ?
          this.#inlineRect(colStart, colEnd) :
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
    return this._replaceMapped
    (
      this.#active(),
      edits,
      expectedRevision,
      edit =>
      {
        const start = this.#toInput(edit.start);
        const end = this.#toInput(edit.end);
        this.#checkSpan(start, end);

        return {start, end, text:edit.text};
      }
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
    this.#listeners.clear();
    this.#modes = null;
    this.#unsubscribe = null;
    this.#unsubscribePreparing = null;
    this.#preparedGeometry = null;
    this.#folds = [];
    this.#inline = null;
    this.#hidden = 0;
  }
}
