// TextEditSelections 0.8.2 — extracted for independent source review.
// Exported alongside the abstract Selections interface, but not its subclass.
// helpers.js supplies private functions in the SAME compiled namespace.
// The stable lib/sys/js/text-edit.lib.js is untouched.
//
// The selection collection belongs to this view, while the source document
// owns text, atomic commits and notifications. No GUI or history lives here.

//------------------------------------------------------------------------------
// View-local physical selections ----------------------------------------------
//------------------------------------------------------------------------------

class TextEditSelections
{
  #source;
  #physical = [];
  #anchors = [];
  #checkpoint;
  #unsubscribe;
  #pending = null;

  //----------------------------------------------------------------------------
  // Construction and lifetime -------------------------------------------------
  //----------------------------------------------------------------------------

  constructor(document)
  {
    // Require the same nominal Document base class exported by this core
    // build. The remaining checks guard state/method validity of subclasses.
    // A duck-typed object or standalone TextEdit 0.8.2 store is not accepted.
    if
    (
      !(document instanceof Document) ||
      !_selectionValid(document.length) ||
      !_selectionValid(document.revision) ||
      !_selectionValid(document.lineCount) ||
      document.lineCount < 1 ||
      typeof document.lineInfo !== 'function' ||
      typeof document.lineAt !== 'function' ||
      typeof document.replace !== 'function' ||
      typeof document.subscribe !== 'function'
    )
    {
      throw new TypeError('Document with source rows required');
    }

    this.#source = document;
    this.#checkpoint = document.revision;

    // Observe EVERY committed change, including changes from other views
    // and the edits initiated by this same instance.
    this.#unsubscribe = document.subscribe
    (
      (...args) => this.#committed(args)
    );
  }

  //----------------------------------------------------------------------------
  // Physical positions and virtual anchors ------------------------------------
  //----------------------------------------------------------------------------

  #anchor(p)
  {
    const d = this.#source;

    if(p.row >= d.lineCount)
    {
      // A row beyond EOF is a virtual future row, not allocated source.
      const future =
      {
        kind: 'future',
        beyond: p.row - (d.lineCount - 1),
        col: p.col,
        oldEOF: d.length
      };

      return future;
    }

    const info = d.lineInfo(p.row);
    const width = info.end - info.start;

    if(p.col <= width)
    {
      return {kind: 'real', offset: info.start + p.col};
    }

    // Beyond-EOL coordinates retain their displacement from this line's
    // source end. They need not materialize padding until a real edit.
    const column =
    {
      kind: 'column',
      lineStart: info.start,
      lineEnd: info.end,
      col: p.col,
      width
    };

    return column;
  }

  //----------------------------------------------------------------------------

  #capture(values)
  {
    return values.map
    (
      s => ({start: this.#anchor(s.start), end: this.#anchor(s.end)})
    );
  }

  //----------------------------------------------------------------------------
  // Rebase one previously captured source anchor ------------------------------
  //----------------------------------------------------------------------------

  #rebaseAnchor(a, ordered, changes, right = true)
  {
    const d = this.#source;

    if(a.kind === 'real')
    {
      const at = _selectionMap(a.offset, right, ordered);
      return _physicalAt(d, at);
    }

    if(a.kind === 'future')
    {
      // A change touching the original EOF would make the old future-row
      // anchor ambiguous. Clear rather than silently attach elsewhere.
      if(changes.some(e => e.start <= a.oldEOF && e.end >= a.oldEOF))
      {
        throw new RangeError('external edit touches virtual EOF anchor');
      }

      const row = d.lineCount - 1 + a.beyond;

      if(!Number.isSafeInteger(row))
      {
        throw new RangeError('unsafe future row');
      }

      return {row, col: a.col};
    }

    // Track the original line EOL after changes to preserve a virtual
    // column's distance beyond that line's actual content width.
    const at = _selectionMap(a.lineEnd, true, ordered);
    const row = d.lineAt(at);
    const info = d.lineInfo(row);

    if(at !== info.end)
    {
      throw new RangeError('virtual column source anchor is no longer EOL');
    }

    return {row, col: info.end - info.start + (a.col - a.width)};
  }

  //----------------------------------------------------------------------------
  // Post-commit synchronization -----------------------------------------------
  //----------------------------------------------------------------------------

  #committed(args)
  {
    // A callback may already be in a document notification snapshot when
    // destroy() unsubscribes. Late delivery must have no side effects.
    if(this.#source === null)
    {
      return;
    }

    const revision = this.#source.revision;

    try
    {
      if(revision !== this.#checkpoint + 1)
      {
        // A missed revision or cyclic wrap invalidates our old anchors.
        this.#physical = [];
        this.#anchors = [];
      }
      else if(this.#pending !== null)
      {
        // Our own replace() staged resulting carets before document.replace.
        // The notification is authoritative: consume it exactly ONCE.
        const prior = this.#physical;

        this.#physical = this.#pending.map
        (
          (x, i) => x.noChange ?
            prior[i] :
            {
              start: _physicalAfterEdit(this.#source, x.offset),
              end: _physicalAfterEdit(this.#source, x.offset),
              forward: x.forward
            }
        );

        this.#anchors = this.#capture(this.#physical);
      }
      else
      {
        // Other views are editing the same source. Rebase the old physical
        // selection anchors using source-coordinate committed edits.
        const changes = args.length === 1 ?
          args[0] :
          [{start: args[0], end: args[1], text: args[2]}];

        const ordered = _selectionOrder(changes);

        const next = this.#physical.map
        (
          (s, i) =>
          {
            const a = this.#anchors[i];

            const start = this.#rebaseAnchor(a.start, ordered, changes);
            const end = this.#rebaseAnchor
            (
              a.end,
              ordered,
              changes,
              _physicalCompare(s.start, s.end) === 0
            );

            // Preserve the original orientation even when rebase collapses
            // an end boundary into the start.
            return _physicalCompare(start, end) > 0 ?
              {start, end: start, forward: s.forward} :
              {start, end, forward: s.forward};
          }
        );

        this.#physical = next;
        this.#anchors = this.#capture(next);
      }
    }
    catch(error)
    {
      // On ambiguous rebase, never expose a guessed physical selection.
      this.#physical = [];
      this.#anchors = [];

      try
      {
        if(typeof console !== 'undefined' && console.error)
        {
          console.error('TextEditSelections physical rebase invalidated', error);
        }
      }
      catch(_)
      {
        // Reporting failure must not turn a committed source edit into failure.
      }
    }
    finally
    {
      this.#checkpoint = revision;
    }
  }

  //----------------------------------------------------------------------------
  // Public selection collection ------------------------------------------------
  //----------------------------------------------------------------------------

  getSelections()
  {
    return _physicalCopy(this.#physical);
  }

  //----------------------------------------------------------------------------

  setSelections(values)
  {
    const revision = this.#source.revision;
    const next = _physicalCopy(values);
    const anchors = this.#capture(next);

    // Check against concurrent/reentrant mutation during capture.
    if(this.#source.revision !== revision)
    {
      throw new Error('document changed while setting physical selections');
    }

    this.#physical = next;
    this.#anchors = anchors;
    this.#checkpoint = revision;

    return this;
  }

  //----------------------------------------------------------------------------

  addSelections(values)
  {
    const revision = this.#source.revision;
    const next = _physicalCopy(values);
    const joined = this.#physical.concat(next);
    const anchors = this.#capture(joined);

    if(this.#source.revision !== revision)
    {
      throw new Error('document changed while adding physical selections');
    }

    this.#physical = joined;
    this.#anchors = anchors;
    this.#checkpoint = revision;

    return this;
  }

  //----------------------------------------------------------------------------
  // Physical editing plan -----------------------------------------------------
  //----------------------------------------------------------------------------

  #planPhysical(texts)
  {
    const d = this.#source;
    const values = this.#physical;
    const edits = [];
    const markers = [];

    // Separate physical source edits from the virtual positions that
    // materialize at a shared existing EOL or EOF source offset.
    const groups = new Map();
    const lastRow = d.lineCount - 1;
    const lastInfo = d.lineInfo(lastRow);

    const rowGroup = (at, baseRow, baseCol) =>
    {
      let g = groups.get(at);

      if(!g)
      {
        g = {at, baseRow, baseCol, items: []};
        groups.set(at, g);
      }

      return g;
    };

    //--------------------------------------------------------------------------
    // Translate selected source positions into tentative edit targets.
    //--------------------------------------------------------------------------

    for(let i = 0; i < values.length; i++)
    {
      const s = values[i];
      const text = texts[i];
      const a = this.#anchor(s.start);
      const b = this.#anchor(s.end);

      const begin = a.kind === 'real' ? a.offset :
        a.kind === 'column' ? a.lineEnd : d.length;

      const end = b.kind === 'real' ? b.offset :
        b.kind === 'column' ? b.lineEnd : d.length;

      if(a.kind !== 'real')
      {
        if(s.start.row !== s.end.row && a.kind !== 'future')
        {
          throw new RangeError('virtual replacement spanning existing rows is unresolved');
        }

        // Deleting nonexistent virtual space must not modify the document.
        if(!text.length)
        {
          markers[i] = {noChange: true};
          continue;
        }

        const g = a.kind === 'column' ?
          rowGroup(a.lineEnd, s.start.row, a.width) :
          rowGroup(d.length, lastRow, lastInfo.end - lastInfo.start);

        g.items.push({row: s.start.row, col: s.start.col, text, index: i});
      }
      else
      {
        if(end < begin)
        {
          throw new RangeError('invalid physical replacement');
        }

        edits.push
        (
          {
            start: begin,
            end,
            text,
            targets: [{index: i, relative: s.forward ? text.length : 0}]
          }
        );
      }
    }

    //--------------------------------------------------------------------------
    // Materialize virtual targets that share one source insertion position.
    //--------------------------------------------------------------------------

    for(const g of groups.values())
    {
      // Existing EOL carets and virtual cursors must share ONE source edit
      // when their effective insertion offset is the same.
      for(let j = edits.length - 1; j >= 0; j--)
      {
        const e = edits[j];

        if(e.start === g.at && e.end === g.at)
        {
          const i = e.targets[0].index;
          const p = values[i].start;

          g.items.push({row: p.row, col: p.col, text: e.text, index: i});
          edits.splice(j, 1);
        }
      }

      g.items.sort
      (
        (a, b) => a.row - b.row || a.col - b.col
      );

      let row = g.baseRow;
      let col = g.baseCol;
      let output = '';
      let previous = null;

      const targets = [];

      for(const item of g.items)
      {
        if
        (
          previous && previous.row === item.row &&
          previous.col === item.col
        )
        {
          throw new RangeError('multiple insertions target one physical cell');
        }

        if(item.row < row || (item.row === row && item.col < col))
        {
          throw new RangeError('virtual insertion payloads overlap');
        }

        if(item.row > row)
        {
          // When the old document ends with lone CR, append CR rather
          // than LF to avoid unintentionally merging them into CRLF.
          const separator = g.at === d.length && d.length &&
            d.slice(d.length - 1, d.length) === '\r' ? '\r' : '\n';

          output += separator.repeat(item.row - row);
          row = item.row;
          col = 0;
        }

        if(item.col > col)
        {
          output += ' '.repeat(item.col - col);
          col = item.col;
        }

        const beforeText = output.length;
        output += item.text;

        ({row, col} = _physicalAdvance({row, col}, item.text));

        targets.push
        (
          {
            index: item.index,
            relative: values[item.index].forward ?
              output.length : beforeText
          }
        );

        previous = item;
      }

      edits.push({start: g.at, end: g.at, text: output, targets});
    }

    //--------------------------------------------------------------------------
    // Validate the ONE atomic batch and locate resulting oriented carets.
    //--------------------------------------------------------------------------

    if(!edits.length)
    {
      return {edits: [], after: markers};
    }

    // Existing source planner enforces collision and final-length rules.
    _selectionPlan
    (
      edits.map(e => ({start: e.start, end: e.end, forward: true})),
      edits.map(e => e.text),
      d.length
    );

    const ordered = _selectionOrder(edits);

    for(const e of ordered)
    {
      for(const target of e.targets)
      {
        markers[target.index] =
        {
          offset: e.start + e.before + target.relative,
          forward: values[target.index].forward
        };
      }
    }

    const plan =
    {
      edits: edits.map(({start, end, text}) => ({start, end, text})),
      after: markers
    };

    return plan;
  }

  //----------------------------------------------------------------------------
  // Public one-action replacement --------------------------------------------
  //----------------------------------------------------------------------------

  replace(textOrTexts)
  {
    const checkpoint = this.#source.revision;
    const before = this.getSelections();

    if(!before.length)
    {
      throw new RangeError('no selections');
    }

    let texts;

    // Arrays map by ORIGINAL collection order. Missing entries are deletion.
    if(Array.isArray(textOrTexts))
    {
      if(textOrTexts.length > before.length)
      {
        throw new TypeError('more replacement values than selections');
      }

      texts = Array.from
      (
        {length: before.length},
        (_, i) => _selectionText(textOrTexts[i])
      );
    }
    else
    {
      const text = _selectionText(textOrTexts);
      texts = before.map(() => text);
    }

    const {edits, after} = this.#planPhysical(texts);

    if
    (
      this.#source.revision !== checkpoint ||
      this.#checkpoint !== checkpoint
    )
    {
      throw new Error('document changed while planning physical edits');
    }

    if(!edits.length)
    {
      return {before, after: this.getSelections()};
    }

    // A single source transaction causes the synchronous subscription above
    // to consume #pending and publish resulting physical caret positions.
    this.#pending = after;

    try
    {
      this.#source.replace(edits);
    }
    finally
    {
      this.#pending = null;
    }

    const result =
    {
      before,
      // An earlier listener may destroy this instance during synchronous
      // source publication. Its just-committed document must remain valid.
      after: this.#source === null ? [] : this.getSelections()
    };

    return result;
  }

  //----------------------------------------------------------------------------
  // Explicit destruction ------------------------------------------------------
  //----------------------------------------------------------------------------

  destroy()
  {
    if(this.#source === null)
    {
      return;
    }

    const unsubscribe = this.#unsubscribe;

    // Invalidate before calling outside code: an unsubscribe implementation
    // may invoke callbacks or cause reentrant code to observe this instance.
    // The document itself remains alive and unchanged.
    this.#source = null;
    this.#unsubscribe = null;
    this.#physical = null;
    this.#anchors = null;
    this.#pending = null;
    this.#checkpoint = null;

    // Remove the listener; dropping the stored unsubscribe closure above
    // releases any reference to the document retained through this selector.
    unsubscribe();
  }
}
