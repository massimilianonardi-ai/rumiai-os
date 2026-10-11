TextEdit — GUI-independent text editing library
Version 0.1.0

PURPOSE

The TextEdit component provides an indexed text document, oriented multiple
selections and a source-mapped editable representation for browser-based and
local text editors. No DOM, rendering, implicit listeners or history.

LOADING

CommonJS (Node.js):
  const {TextEdit, TextEditRepresentation, PieceDocument} =
    require('./lib/sys/js/text-edit.lib.js');

Classic browser script:
  <script src="text-edit.lib.js"></script>
  const {TextEdit, TextEditRepresentation} = globalThis.TextEdit;

The file is self-contained and has no npm/runtime dependencies. JavaScript
strings and document positions are UTF-16 code units.

CORE CLASSES

TextEdit
  new TextEdit(initialText = '', {document} = {})
  .document               indexed PieceDocument unless supplied
  .selections             TextEditSelections
  .representation         TextEditRepresentation
  .advancedSelections     TextEditAdvancedSelections
  .replace(textOrTexts)   perform selection replacement and rebase representation;
                          returns {changes,before,after,representation}

PieceDocument and FlatDocument
  length, slice(start,end), replace(start,end,text)
  indexed backends additionally expose lineCount and lineStart(line)
  TextEditBase is the structural length/slice/replace contract, not a class.

TextEditSelections
  new TextEditSelections(document)
  getSelections()
  setSelections([{start,end,forward}, ...])
  replace(singleTextOrArray)
  Each selected replacement is one primitive edit; arrays preserve caller
  selection order. Multicaret rollback compensation is conservative when an
  underlying document replacement fails. No history is included.

TextEditRepresentation
  new TextEditRepresentation(indexedDocument)
  replace(start,end,text)
      Replace the SOURCE interval [start,end) in the REPRESENTATION ONLY.
      start < end. text can be any string, including an empty or multiline
      string. This never modifies the original source document. The new text
      is displayed in place of the original interval. An exact matching range
      updates its placeholder; intersecting ranges are rejected. Endpoints
      must lie on Unicode grapheme boundaries (including CRLF integrity).
      These endpoints are source offsets, NOT previous view coordinates.

  setReplacements([{start,end,text}, ...])
      Atomically set the overlay collection after range and overlap checks.
  remove(start,end)
      Remove a particular overlay.
  clear()
      Remove all overlays (not annotations).
  get replacements
      Snapshot of source-to-representation substitutions.
  get length
      Virtual text length, counting overlay text UTF-16 units.
  project(start=0,end=source.length,{maxSourceUnits=65536})
      Project a bounded SOURCE interval into segments of kind 'text' or
      'replacement', each carrying its source {start,end} and displayed text.
      Original text segments also carry graphemeBoundaries. Returns annotation
      metadata separately, with source anchors and projected positions.
      A window may not cut through an overlay. Excessive source extraction
      fails; use smaller source windows. This does not decide pixel geometry.
  sourceToView(offset)
  viewToSource(offset)
      Translate UTF-16 positions. Exact unmapped source/view positions return
      {kind:'offset',offset}. Positions inside substituted text return
      {kind:'replaced-region',source:{start,end},view:{start,end}};
      no imaginary character-level mapping is invented.
      Non-text annotations do not count as virtual characters.
  setAnnotations([{id,at,text,affinity?}, ...])
      A note is anchored in source UTF-16 units, but is not inserted as text.
      affinity may be 'before' or 'after' for text insertion exactly at at.
  rebase(changes)
      After an independently completed edit, explicitly consume the returned
      TextEditSelections.replace(...).changes array. Returns {unresolved}.
      Replaced source regions touched by the edit are invalidated instead
      of silently moving the overlay. Annotations overlapping deleted text,
      or inserted exactly at their anchor without explicit affinity, become
      unresolved. No low-level observer is required.

TextEditAdvancedSelections
  new TextEditAdvancedSelections(document,selections,representation)
  lineSelection(firstLogicalLine,lastLogicalLine)
  rectangularSelection(rectangles,{tabSize=4,widthOf})
      Convert a logical-line rectangle using grapheme-aware visual columns,
      with a caller-supplied positive-integer widthOf(grapheme,column,row).
      Reject ambiguous cell boundaries or colliding ranges; do not guess.
      These methods operate on document LOGICAL lines, not wrapped pixel rows.

SAMPLE

  const editor = new TextEdit('function f() {\n  return 1;\n}\n');
  const start = editor.document.lineStart(1);
  const end = editor.document.lineStart(3);
  editor.representation.replace(start,end,'{...}');
  const shown = editor.representation.project(0,editor.document.length);
  // shown.segments includes a placeholder; the document remains unchanged.
  const hit = editor.representation.sourceToView(start+2);
  // hit.kind === 'replaced-region'

DOCUMENT CHANGES, HISTORY AND LIMITS

Edits made through editor.replace(...) automatically call the representation
rebase once the selection operation succeeds. If edits are performed directly
through editor.selections.replace(...) or document.replace(...), callers must
supply the exact change records to representation.rebase(...) before further
projecting/mapping. Document changes that keep both length and newline count
unchanged cannot be detected by this minimal contract. Do not silently edit
outside the agreed coordination boundary.

The representation is demand-driven: it never stores a duplicate full-document
string, and accepts bounded source projection windows. It is NOT a DOM layout
engine, and it does not implement text wrapping, bidi shaping, font metrics,
IME, semantic folding detection or virtual display-row numbering. Overlapping
substitutions/nested folding are not silently inferred. Rendering can be
implemented by a separate GUI.

No undo/redo, event listeners, persistent journal or automatic history exist.
If added later, history will be a transparent wrapper around
TextEditSelections. This release makes no GUI behavior/parity claim.

SCOPE / VALIDATION

First standalone source-library release, UTF-16, Node.js/CommonJS and classic
browser-script loading. Current validation uses permanent tests from
rumiai-tests and the text-edit GitHub Actions workflow. This initial release
is a baseline for subsequent GUI work, not a performance certification for
gigantic selected lines or arbitrary rendering policies.
