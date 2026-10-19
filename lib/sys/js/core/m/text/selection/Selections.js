// Public abstract interface for mode-dependent selection interpreters.
// Part of the NEW m.text.selection core, not standalone TextEdit 0.8.2.
//
// Each method operates in its caller's exposed 2D coordinate space.
// addSelection/remSelection express selection operations, not literal array
// append/removal: a concrete mode may rebuild all effective selections.
// This interface owns no selection state, document text, input or GUI events.

//------------------------------------------------------------------------------
// Selections — abstract public interface -------------------------------------
//------------------------------------------------------------------------------

class Selections
{
  //----------------------------------------------------------------------------
  // Abstract class guard ------------------------------------------------------
  //----------------------------------------------------------------------------

  constructor()
  {
    if(new.target === Selections)
    {
      throw new TypeError('Selections is abstract');
    }
  }

  //----------------------------------------------------------------------------
  // Effective selection snapshot ---------------------------------------------
  //----------------------------------------------------------------------------

  getSelections()
  {
    throw new Error('Selections.getSelections must be implemented');
  }

  //----------------------------------------------------------------------------
  // Set effective selections --------------------------------------------------
  //----------------------------------------------------------------------------

  setSelections(selections)
  {
    throw new Error('Selections.setSelections must be implemented');
  }

  //----------------------------------------------------------------------------
  // Mode-dependent selection operations --------------------------------------
  //----------------------------------------------------------------------------

  addSelection(position)
  {
    throw new Error('Selections.addSelection must be implemented');
  }

  //----------------------------------------------------------------------------

  remSelection(position)
  {
    throw new Error('Selections.remSelection must be implemented');
  }
}
