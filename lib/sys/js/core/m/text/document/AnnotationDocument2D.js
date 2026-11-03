// Additive, source-less zero-width annotations on any Document2D.
// Annotation text belongs to the view: it never occupies source cells,
// participates in selected text, or becomes an edit target.
// The underlying Document2D retains the sole effective selection owner.

class AnnotationDocument2D extends Document2D
{
  #input;
  #inputRevision;
  #revision = 0;
  #annotations = [];
  #listeners = new Set();
  #unsubscribe;

  constructor(input)
  {
    super();

    if(!(input instanceof Document2D))
    {
      throw new TypeError('Document2D input required');
    }

    this.#input = input;
    this.#inputRevision = input.revision;

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
          this.#annotations = [];
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
      throw new Error('AnnotationDocument2D is destroyed');
    }

    if(this.#input.revision !== this.#inputRevision)
    {
      throw new Error('input Document2D revision is stale');
    }

    return this.#input;
  }

  #advance()
  {
    if(this.#revision === Number.MAX_SAFE_INTEGER)
    {
      throw new RangeError('Document2D annotation revision exhausted');
    }

    this.#revision++;
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
    return this.#active().rowCount;
  }

  get colCount()
  {
    return this.#active().colCount;
  }

  getRowWidth(row)
  {
    return this.#active().getRowWidth(row);
  }

  get annotations()
  {
    this.#active();
    return this.#annotations.map
    (
      annotation =>
      (
        {id:annotation.id, text:annotation.text, at:{...annotation.at}}
      )
    );
  }

  setAnnotations(values)
  {
    const input = this.#active();
    const revision = input.revision;

    if(!Array.isArray(values))
    {
      throw new TypeError('annotation array required');
    }

    const ids = new Set();
    const prepared = values.map
    (
      value =>
      {
        if
        (
          !value || typeof value !== 'object' || Array.isArray(value) ||
          typeof value.id !== 'string' || !value.id.length ||
          typeof value.text !== 'string' || !value.text.length ||
          !value.at || typeof value.at !== 'object' ||
          Array.isArray(value.at)
        )
        {
          throw new TypeError('invalid annotation record');
        }

        if(ids.has(value.id))
        {
          throw new RangeError('duplicate annotation id');
        }

        ids.add(value.id);
        const {row, col} = value.at;

        if
        (
          !Number.isSafeInteger(row) || row < 0 ||
          !Number.isSafeInteger(col) || col < 0 ||
          row >= input.rowCount || col > input.getRowWidth(row)
        )
        {
          throw new RangeError('invalid annotation anchor');
        }

        // An overlay cannot be anchored inside an indivisible token,
        // nor on a synthetic fold marker that has no editable source.
        // Raw one-code-unit-per-cell text spans are freely splittable.
        const regions = input.getRegions
        (
          row, Math.max(0, col - 1), row + 1, col + 1
        )[0];

        for(const region of regions)
        {
          const width = region.end.col - region.start.col;

          if
          (
            region.kind === 'fold' &&
            col >= region.start.col && col <= region.end.col
          )
          {
            throw new RangeError('annotation on source-less fold marker');
          }

          if
          (
            region.start.col < col && col < region.end.col &&
            (region.kind !== 'text' || region.text.length !== width)
          )
          {
            throw new RangeError('annotation splits indivisible region');
          }
        }

        return {id:value.id, text:value.text, at:{row, col}};
      }
    );

    prepared.sort
    (
      (a, b) => a.at.row - b.at.row ||
        a.at.col - b.at.col ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );

    if(input.revision !== revision || this.#inputRevision !== revision)
    {
      throw new Error('input Document2D changed during annotation configuration');
    }

    const same =
      prepared.length === this.#annotations.length &&
      prepared.every
      (
        (value, i) =>
        {
          const old = this.#annotations[i];
          return value.id === old.id && value.text === old.text &&
            value.at.row === old.at.row && value.at.col === old.at.col;
        }
      );

    if(same)
    {
      return this;
    }

    if(this.#revision === Number.MAX_SAFE_INTEGER)
    {
      throw new RangeError('Document2D annotation revision exhausted');
    }

    this.#annotations = prepared;
    this.#advance();
    this.#notify('content', {invalidation:{all:true}});
    return this;
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
      throw new RangeError('invalid annotation region window');
    }

    const revision = input.revision;
    const rows = input.getRegions(rowStart, colStart, rowEnd, colEnd);
    const overlays = this.#annotations;
    let lo = 0, hi = overlays.length;

    while(lo < hi)
    {
      const mid = Math.floor((lo + hi) / 2);

      if(overlays[mid].at.row < rowStart)
      {
        lo = mid + 1;
      }
      else
      {
        hi = mid;
      }
    }

    let cursor = lo;

    for(let i = 0; i < rows.length; i++)
    {
      const row = rowStart + i;
      const regions = rows[i].map
      (
        value => ({...value, start:{...value.start}, end:{...value.end}})
      );

      while(cursor < overlays.length && overlays[cursor].at.row < row)
      {
        cursor++;
      }

      let match = cursor;

      while(match < overlays.length && overlays[match].at.row === row)
      {
        const note = overlays[match];

        if(colStart <= note.at.col && note.at.col < colEnd)
        {
          const point = {...note.at};
          regions.push
          (
            {
              kind:'annotation',
              id:note.id,
              text:note.text,
              start:point,
              end:{...point}
            }
          );
        }

        match++;
      }

      cursor = match;
      regions.sort
      (
        (a, b) => a.start.col - b.start.col ||
          ((a.kind === 'annotation') ? -1 : 0) -
          ((b.kind === 'annotation') ? -1 : 0)
      );
      rows[i] = regions;
    }

    if(input.revision !== revision || this.#inputRevision !== revision)
    {
      throw new Error('input Document2D changed during annotation read');
    }

    return rows;
  }

  // Overlay labels are intentionally NOT in the ordinary text projection.
  getRect(rowStart, colStart, rowEnd, colEnd)
  {
    return this.#active().getRect(rowStart, colStart, rowEnd, colEnd);
  }

  read()
  {
    return this.#active().read();
  }

  getSelections()
  {
    return this.#active().getSelections();
  }

  setSelections(selections)
  {
    this.#active().setSelections(selections);
    return this;
  }

  addSelection(position)
  {
    this.#active().addSelection(position);
    return this;
  }

  remSelection(position)
  {
    this.#active().remSelection(position);
    return this;
  }

  get selectionMode()
  {
    return this.#active().selectionMode;
  }

  set selectionMode(mode)
  {
    this.#active().selectionMode = mode;
  }

  get insertMode()
  {
    return this.#active().insertMode;
  }

  set insertMode(mode)
  {
    this.#active().insertMode = mode;
  }

  insert(content)
  {
    this.#active().insert(content);
    return this;
  }

  replace(edits, expectedRevision)
  {
    return this._replaceMapped
    (
      this.#active(),
      edits,
      expectedRevision,
      edit => ({start:edit.start, end:edit.end, text:edit.text})
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
    this.#listeners.clear();
    this.#annotations = [];
    this.#unsubscribe = null;
  }
}
