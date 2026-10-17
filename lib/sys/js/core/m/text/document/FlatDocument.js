// TextEdit 0.8.2 FlatDocument, extracted as a readable reference backend.
// The authoritative standalone text-edit.lib.js is not modified.
// All positions and lengths are literal UTF-16 code units.

//------------------------------------------------------------------------------
// FlatDocument ----------------------------------------------------------------
//------------------------------------------------------------------------------

// One JavaScript string holds the entire current source. Editing replaces
// that string atomically; logical line queries scan it without a line index.

class FlatDocument extends _DocumentStore
{
  #text;

  //----------------------------------------------------------------------------
  // Construction --------------------------------------------------------------
  //----------------------------------------------------------------------------

  constructor(text = '')
  {
    super();

    if(typeof text !== 'string')
    {
      throw new TypeError('initial text must be a string');
    }

    this.#text = text;
  }

  //----------------------------------------------------------------------------
  // Basic source access -------------------------------------------------------
  //----------------------------------------------------------------------------

  get length()
  {
    return this.#text.length;
  }

  //----------------------------------------------------------------------------

  get lineCount()
  {
    let lines = 1;

    for(let i = 0; i < this.#text.length; i++)
    {
      if(this.#text[i] === '\r')
      {
        lines++;

        // CRLF is one logical separator even though it occupies two units.
        if(this.#text[i + 1] === '\n')
        {
          i++;
        }
      }
      else if(this.#text[i] === '\n')
      {
        lines++;
      }
    }

    return lines;
  }

  //----------------------------------------------------------------------------

  slice(start, end)
  {
    _check(this, start, end);
    return this.#text.slice(start, end);
  }

  //----------------------------------------------------------------------------

  toString()
  {
    // Deliberately materializes (returns) the whole source.
    return this.#text;
  }

  //----------------------------------------------------------------------------
  // Logical source lines ------------------------------------------------------
  //----------------------------------------------------------------------------

  lineStart(line)
  {
    _checkLine(this, line);

    if(!line)
    {
      return 0;
    }

    let seen = 0;

    for(let i = 0; i < this.#text.length; i++)
    {
      if(this.#text[i] === '\r' || this.#text[i] === '\n')
      {
        if(this.#text[i] === '\r' && this.#text[i + 1] === '\n')
        {
          i++;
        }

        if(++seen === line)
        {
          return i + 1;
        }
      }
    }

    throw new RangeError('line not found');
  }

  //----------------------------------------------------------------------------

  lineAt(offset)
  {
    if(!Number.isSafeInteger(offset) || offset < 0 || offset > this.length)
    {
      throw new RangeError('invalid offset');
    }

    let count = 0;

    for(let i = 0; i < offset; i++)
    {
      if(this.#text[i] === '\r' && this.#text[i + 1] === '\n')
      {
        // Both units of CRLF belong to the preceding logical line.
        // Count the break only after the full pair is behind the offset.
        if(i + 2 <= offset)
        {
          count++;
          i++;
        }
      }
      else if(this.#text[i] === '\r' || this.#text[i] === '\n')
      {
        count++;
      }
    }

    return count;
  }

  //----------------------------------------------------------------------------

  lineInfo(line)
  {
    _checkLine(this, line);

    const start = this.lineStart(line);
    const next = line + 1 < this.lineCount ?
      this.lineStart(line + 1) : this.length;

    let end = next;

    if(line + 1 < this.lineCount)
    {
      // Exclude the separator, but leave the original source unchanged.
      end -= this.#text[next - 2] === '\r' && this.#text[next - 1] === '\n' ?
        2 : 1;
    }

    return {start, end, nextStart: next};
  }

  //----------------------------------------------------------------------------
  // Atomic source editing -----------------------------------------------------
  //----------------------------------------------------------------------------

  replace(...args)
  {
    this._assertMutable();

    // The entire command batch is checked against the old source first.
    const {descending, notification} = _prepareEdits(this.length, args);
    const listeners = this._snapshotListeners();

    // Stage the new string locally. No intermediate result is published.
    let text = this.#text;

    for(const e of descending)
    {
      text = text.slice(0, e.start) + e.text + text.slice(e.end);
    }

    this.#text = text;

    // Exactly one revision and one synchronous delivery per successful call.
    this._publish(notification, listeners);
  }
}
