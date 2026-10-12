TextEdit — GUI-independent text editing library
Version 0.3.0

PURPOSE

The TextEdit component provides an indexed text document, oriented multiple
selections and a source-mapped editable representation for browser-based and
local text editors. No DOM, rendering, generic event bus or history.

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
  new TextEdit(initialText = '', {document,selections} = {})
      Optional selection-compatible wrapper can be injected (for future history).
  .document               indexed PieceDocument unless supplied
  .selections             TextEditSelections
  .representation         TextEditRepresentation
  .advancedSelections     TextEditAdvancedSelections
  .replace(textOrTexts)   perform selection replacement and rebase representation;
                          returns {changes,before,after,representation}

PieceDocument and FlatDocument — TextEditBase implementations
  TextEditBase is a structural interface, NOT an instantiable class.
  PieceDocument uses a balanced indexed piece treap for source-line queries and
  bounded text reads; FlatDocument is a simple flat-string reference backend.
  Both implement the complete public TextEditBase interface below.

TEXTEDITBASE PUBLIC INTERFACE

  .length                           read-only source UTF-16 code unit count
  .revision                         read-only Number commit counter
  .lineCount                        read-only logical source-line count
  .slice(start,end)                 read source units in [start,end)
  .lineStart(line)                  zero-based line start source offset
  .lineAt(offset)                   source offset -> zero-based logical line
  .lineInfo(line)                   {start,end,nextStart} source offsets
  .toString()                       materialize complete exact source text
  .replace(start,end,text)          atomic one-range replacement
  .replace([{start,end,text},...])   atomic batch, all ranges in old coordinates
  .subscribe(listener)              subscribe; returns idempotent unsubscribe()

  Source text is literal: no line-ending setting or normalization. Lines are
  separated by CR, LF or one adjacent CRLF, including across piece boundaries.
  lineCount is 1 for an empty document; trailing separators add an empty line.
  lineInfo excludes the terminating CR, LF or CRLF from its content end.
  An offset ON a separator belongs to the previous line; the position just
  AFTER the full separator starts the next line. Source positions are UTF-16
  code units, including both code units of CRLF and possible surrogate halves.

  Valid read and edit ranges are half-open, zero-based, safe-integer offsets
  satisfying 0 <= start <= end <= length. Empty ranges and EOF insertion work.
  No grapheme rounding is performed in the base.

  An array replace is one indivisible mutation. Records can be unsorted.
  Spans may touch but not overlap; insertions cannot share a position or lie
  inside a replaced span. An insertion at a replacement start goes before the
  new text, and an insertion at its end goes after the new text. No-change
  successful edits still count as committed mutations.

  Successful replace returns undefined. Invalid types throw TypeError; invalid
  ranges and collisions throw RangeError. Failed edits do not publish partial
  source, increment revision or notify subscribers. Uncertain backends fail
  closed rather than reporting a confirmed edit.

  revision starts at zero, increments once per accepted replace, and wraps to
  zero when its prior value is Number.MAX_SAFE_INTEGER. The wrap never blocks
  an edit. An incremental view checks that each post-commit revision equals its
  own last successfully processed revision + 1; otherwise, including wrap,
  the view reloads from the CURRENT source (possibly with bounded slice reads).

  Listeners fire synchronously, in registration order, AFTER source publication
  and revision update. They receive ONLY the original replace arguments, with
  the same three-argument or one-array shape. Array-form payload records are
  immutable copies in original order. Subscriptions changed during notification
  affect later commits; reentrant writes to the same document are rejected.
  Listener exceptions do not roll back the edit or prevent other listeners
  from receiving it, and are diagnosable through the host console.

  This base does not include undo, history, selections, transport, conflict
  resolution, generic event bus or line-ending conversion.

INTEGRATION STATUS

  TextEditBase document stores and TextEditSelections are now separately
  implemented. TextEditSelections uses one atomic document commit for any
  nonempty multi-selection action and automatically follows other source
  editors through document.subscribe(). TextEdit still bridges its selection
  edits to the older explicit TextEditRepresentation.rebase(changes) interface.
  The full representation subscription and shared-view integration are a
  separate remaining work unit. No history or generic event bus is included.

TEXTEDITSELECTIONS PUBLIC INTERFACE

  new TextEditSelections(document)
  getSelections()
  setSelections([{start,end,forward}, ...])
  addSelections([{start,end,forward}, ...])
  replace(textOrTexts)
  dispose()

  All selection offsets refer to the shared document's UTF-16 source.
  start <= end; equal endpoints represent a caret. forward is a boolean
  orientation preserved also for carets. setSelections atomically replaces;
  addSelections atomically appends; either accepts [] and returns this.
  getSelections returns independent copies, in original collection order.
  Duplicate, overlapping and unsorted selections are allowed as state and
  are not implicitly merged or reordered.

  replace("X") applies one payload to every selection. replace(["A","B"])
  pairs strings to selections in collection order. The operation rejects
  an empty selection collection or incompatible edit targets before making
  changes. One successful invocation produces exactly ONE atomic document
  replace([...]) call and one source revision increment/notification.
  On success it returns {before,after}, with independent snapshots in
  original selection order. Edited selections become carets at the ends
  of their inserted text, retaining forward orientation. It does not return
  change records, old text, history entries or a rollback journal.

  Instances subscribe to their shared document automatically. Edits made by
  other views rebase selections using deterministic source-offset geometry:
  insertion at a selection start or end is excluded; insertion strictly
  inside is included; a caret moves after inserted text. External replacements
  retain surviving portions and attach overwritten endpoints to their
  respective replacement boundaries. If both selection boundaries are lost,
  the selection collapses to the replacement end. Orientation, collection
  order and duplicates are preserved. On an unexpected revision step or a
  Number wrap, stale selections are CLEARED, never silently guessed.
  A failed edit leaves document and selections unchanged.

  dispose() unsubscribes and clears state. It is idempotent; other operations
  on a disposed instance throw. The shared document is not disposed.

  No selection layer owns GUI, clipboard policy, keyboard handling, source
  persistence, undo/redo, representation folding or history.

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
      A window may not split a Unicode grapheme or cut through an overlay.
      Excessive source extraction
      fails; use smaller source windows. This does not decide pixel geometry.
  sourceToView(offset)
  viewToSource(offset)
      Translate UTF-16 positions. Exact unmapped source/view positions return
      {kind:'offset',offset}. Positions inside substituted text return
      {kind:'replaced-region',source:{start,end},view:{start,end}};
      no imaginary character-level mapping is invented. A replacement with an
      empty displayed string remains a replaced-region, not a unique source
      caret position.
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
