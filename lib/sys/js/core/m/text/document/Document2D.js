// Abstract interface for interactive text in an exposed two-dimensional space.
// GUI callers must not depend on whether the backing document is raw, logical,
// virtual or produced by another Document2D implementation.
// This interface neither owns a document nor implements a rendering engine.
// It does not change the standalone TextEdit 0.8.2 distribution.

//------------------------------------------------------------------------------
// Document2D — abstract GUI-facing text document ------------------------------
//------------------------------------------------------------------------------

class Document2D
{
  //----------------------------------------------------------------------------
  // Abstract class guard ------------------------------------------------------
  //----------------------------------------------------------------------------

  constructor()
  {
    if(new.target === Document2D)
    {
      throw new TypeError('Document2D is abstract');
    }
  }

  //----------------------------------------------------------------------------
  // Exposed two-dimensional extent -------------------------------------------
  //----------------------------------------------------------------------------

  get rowCount()
  {
    throw new Error('Document2D.rowCount must be implemented');
  }

  //----------------------------------------------------------------------------

  get colCount()
  {
    // Maximum occupied text column in the exposed 2D space.
    throw new Error('Document2D.colCount must be implemented');
  }

  //----------------------------------------------------------------------------
  // Bounded view reads --------------------------------------------------------
  //----------------------------------------------------------------------------

  getRect(rowStart, colStart, rowEnd, colEnd)
  {
    // Read a bounded row/column window of the displayed document, not source.
    throw new Error('Document2D.getRect must be implemented');
  }

  //----------------------------------------------------------------------------
  // Read the current selections for transfer to an external consumer ----------
  //----------------------------------------------------------------------------

  read()
  {
    // The consumer (not this interface) manages clipboard or other transport.
    throw new Error('Document2D.read must be implemented');
  }

  //----------------------------------------------------------------------------
  // Effective selections ------------------------------------------------------
  //----------------------------------------------------------------------------

  getSelections()
  {
    throw new Error('Document2D.getSelections must be implemented');
  }

  //----------------------------------------------------------------------------

  setSelections(selections)
  {
    throw new Error('Document2D.setSelections must be implemented');
  }

  //----------------------------------------------------------------------------

  addSelection(position)
  {
    throw new Error('Document2D.addSelection must be implemented');
  }

  //----------------------------------------------------------------------------

  remSelection(position)
  {
    throw new Error('Document2D.remSelection must be implemented');
  }

  //----------------------------------------------------------------------------
  // Current selection interpretation mode ------------------------------------
  //----------------------------------------------------------------------------

  get selectionMode()
  {
    throw new Error('Document2D.selectionMode must be implemented');
  }

  //----------------------------------------------------------------------------

  set selectionMode(mode)
  {
    throw new Error('Document2D.selectionMode must be implemented');
  }

  //----------------------------------------------------------------------------
  // Input interpretation and selected editing --------------------------------
  //----------------------------------------------------------------------------

  get insertMode()
  {
    throw new Error('Document2D.insertMode must be implemented');
  }

  //----------------------------------------------------------------------------

  set insertMode(mode)
  {
    throw new Error('Document2D.insertMode must be implemented');
  }

  //----------------------------------------------------------------------------

  insert(content)
  {
    throw new Error('Document2D.insert must be implemented');
  }

  //----------------------------------------------------------------------------
  // Observable changes and view lifetime -------------------------------------
  //----------------------------------------------------------------------------

  subscribe(listener)
  {
    throw new Error('Document2D.subscribe must be implemented');
  }

  //----------------------------------------------------------------------------

  destroy()
  {
    throw new Error('Document2D.destroy must be implemented');
  }
}
