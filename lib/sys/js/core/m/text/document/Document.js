// Public abstract base of the m.text.document class hierarchy.
// This is the nominal runtime identity of a document in the NEW core library.
// It does not modify or extend the standalone TextEdit 0.8.2 distribution.
//
// All source offsets and lengths are UTF-16 code units. Source rows count
// CR, LF and CRLF logical separators without normalizing the source text.
//
// Document describes the established interface; concrete subclasses provide
// storage and edits. _DocumentStore implements shared revision/notification
// mechanics, while FlatDocument and PieceDocument implement source access.

//------------------------------------------------------------------------------
// Document — abstract public interface ---------------------------------------
//------------------------------------------------------------------------------

class Document
{
  //----------------------------------------------------------------------------
  // Abstract class guard ------------------------------------------------------
  //----------------------------------------------------------------------------

  constructor()
  {
    if(new.target === Document)
    {
      throw new TypeError('Document is abstract');
    }
  }

  //----------------------------------------------------------------------------
  // Read-only document state --------------------------------------------------
  //----------------------------------------------------------------------------

  get length()
  {
    // Exact number of UTF-16 code units in the unmodified source encoding.
    throw new Error('Document.length must be implemented');
  }

  //----------------------------------------------------------------------------

  get revision()
  {
    // Cyclic safe-integer counter; increments once per committed operation.
    throw new Error('Document.revision must be implemented');
  }

  //----------------------------------------------------------------------------

  get lineCount()
  {
    // Always at least one logical source line, including an empty document.
    throw new Error('Document.lineCount must be implemented');
  }

  //----------------------------------------------------------------------------
  // Bounded source reads ------------------------------------------------------
  //----------------------------------------------------------------------------

  slice(start, end)
  {
    // Half-open interval [start, end) in original UTF-16 source offsets.
    throw new Error('Document.slice must be implemented');
  }

  //----------------------------------------------------------------------------
  // Logical source line mapping ----------------------------------------------
  //----------------------------------------------------------------------------

  lineStart(line)
  {
    throw new Error('Document.lineStart must be implemented');
  }

  //----------------------------------------------------------------------------

  lineAt(offset)
  {
    throw new Error('Document.lineAt must be implemented');
  }

  //----------------------------------------------------------------------------

  lineInfo(line)
  {
    // {start, end, nextStart}; end excludes any line terminator.
    throw new Error('Document.lineInfo must be implemented');
  }

  //----------------------------------------------------------------------------
  // Complete source materialization ------------------------------------------
  //----------------------------------------------------------------------------

  toString()
  {
    // Explicitly materializes the whole source; prefer slice for large files.
    throw new Error('Document.toString must be implemented');
  }

  //----------------------------------------------------------------------------
  // Atomic mutation and committed notifications -------------------------------
  //----------------------------------------------------------------------------

  replace(...args)
  {
    // One (start,end,text) or a complete array of edits against OLD offsets.
    // Exactly one successful document commit and notification.
    throw new Error('Document.replace must be implemented');
  }

  //----------------------------------------------------------------------------

  subscribe(listener)
  {
    // Synchronous notifications after commit; return an unsubscribe callback.
    throw new Error('Document.subscribe must be implemented');
  }
}
