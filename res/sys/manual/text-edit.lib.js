TextEdit — GUI-independent text editing library
Version 0.8.1

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

  CommonJS load uses module.exports only; it does not create a globalThis.TextEdit
  property. The browser script exposes the namespace only without CommonJS.

The file is self-contained and has no npm or third-party runtime
  dependencies. Its JavaScript host MUST provide Intl.Segmenter for grapheme
  processing. Strings and document positions use UTF-16 code units.

CORE CLASSES

TextEdit
  new TextEdit(initialText = '', {document,selections} = {})
      Optional selection-compatible wrapper can be injected (for future history).
  .document               indexed PieceDocument unless supplied
  .selections             TextEditSelections
  .representation         TextEditRepresentation
  .advancedSelections     TextEditAdvancedSelections
  .replace(textOrTexts)   one selected atomic commit; returns
                          {before,after,representation:{unresolved}}
  .dispose()               idempotently closes the owned representation and
                          default selector subscriptions; the shared source
                          and an injected selection provider remain alive.
                          Editing through a disposed facade fails.

PieceDocument and FlatDocument — TextEditBase implementations
  TextEditBase is a structural interface, NOT an instantiable class.
  PieceDocument uses a balanced indexed piece treap for source-line queries and
  bounded text reads; FlatDocument is a simple flat-string reference backend.
  Both implement the complete public TextEditBase interface below.
  PieceDocument additionally exposes stats() for nonportable diagnostics:
  {nodes,maxDepth,sources} counts the current tree nodes, maximum tree depth
  and distinct retained source buffers. This is not part of TextEditBase.

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

  TextEditBase, TextEditSelections and TextEditRepresentation observe the
  same atomic document mutations. Selections and representations subscribe
  directly and independently to the document; changes from any view are
  rebased exactly once. No explicit rebase(changes) or old-text adapter is
  necessary. This component does not own history, GUI or a generic event bus.

TEXTEDITSELECTIONS PUBLIC INTERFACE

  new TextEditSelections(document)
  getSelections()
  setSelections([{start:{row,col},end:{row,col},forward},...])
  addSelections([{start:{row,col},end:{row,col},forward},...])
  replace(textOrTexts)
  dispose()

  Selection positions are SOURCE rows and UTF-16 code-unit columns within
  the row's content (NOT tab-expanded logical/display columns). start <= end
  in row/column ordering. Equal endpoints are a caret. Orientation, array
  order, independent duplicates and multiple selections are preserved.
  Inputs and returned snapshots are copied.

  A row past document.lineCount or a column past the physical end of a
  source row is a VALID VIRTUAL PHYSICAL POSITION. Setting or moving a
  selection never writes spaces, newlines or other characters to the source.
  Base lineInfo(row).end locates the insertion boundary BEFORE the actual
  CR, LF or CRLF terminator. Physical row/column carets do not expose a
  position between CR and LF; exact source UTF-16 access remains on the base.

  replace("X") writes one payload to every selection; replace(["X","Y"])
  matches selections in original order. Each scalar or array element accepts
  text, number or boolean: numbers and booleans use JavaScript String(value)
  notation ("42", "NaN", "Infinity", "true", "false"), without locale-specific
  formatting. An empty string, null or undefined deletes selected source
  content. In an array, missing entries (including sparse holes and entries
  beyond the supplied array length) also mean deletion; replace([]) deletes
  across all selected ranges. Oversized arrays, unsupported types (objects,
  nested arrays, symbols, functions, bigint) and attempts to replace with
  no selections throw before editing. A caller can trim excess source items
  and warn through an input adapter, but this library never silently drops
  them. On actual editing, TextEditSelections alone materializes needed
  spaces and missing rows. Multiple virtual
  positions mapping to the same original EOL/EOF are combined into one
  compatible source insertion before the single atomic document.replace
  commit. Conflicting writes to the same requested cell are rejected.
  Empty deletions entirely within virtual space do not create text.
  The default separator for newly materialized source rows is LF, except
  after a trailing lone CR, where CR preserves the intended number of rows.
  Inserting CR immediately before an existing LF forms CRLF; the resulting
  caret is positioned at the next row start, never inside that terminator.

  Successful source edits return {before,after}. Selected ranges become
  carets after their inserted text; orientation is retained. Existing-source
  selection anchors are updated after committed edits from other views;
  virtual anchors follow their original row where unambiguous, otherwise
  are conservatively invalidated instead of guessing. A revision gap clears
  potentially stale selections. The source remains the only editable text.


  dispose()

  This is a view-local, GUI-independent projection and coordinate translator,
  never a second source document. Logical selection access requires the
  optional physical TextEditSelections provider in its constructor; standalone
  projection/overlay instances work without one. These operations convert
  complete logical grid {row,col} endpoints to physical source {row,col}
  endpoints, without deciding clipping or virtual-retention policy.

  logicalRowWidth returns the current row's logical display-cell width
  (including tab stops and grapheme widths); future source rows have width
  zero. Invalid columns inside a tab/multicell grapheme, or endpoints crossing
  replacement overlays, reject without publishing partial selections.
  The view does not materialize text or retain an independent authoritative
  copy of the source selections.

  Source overlay substitutions and annotations retain the established
  grapheme-safe, ordered, nonoverlapping behavior. Source/view offsets and
  projected windows remain UTF-16-based, and the projection API remains
  incremental for very large documents. The representation observes every
  committed text change, rebases metadata, and reports invalidated overlays
  or anchors through unresolved. A revision discontinuity clears stale
  metadata rather than guessing. dispose() unsubscribes but does not
  dispose the shared document.

TEXTEDITREPRESENTATION SOURCE COLUMN GEOMETRY

  setColumnMetrics({tabSize=4,widthOf}={}) configures tab stops and the
  positive integer width in logical cells of non-tab Unicode graphemes.
  Omitting widthOf gives one cell per grapheme; tabs always align to the
  next tab stop. Settings belong to the representation, not an individual
  selection operation. The editor host may provide a width policy, but
  no font or DOM library is required.

  columnToSource(row,col) returns {kind:'offset',offset} at an exact
  grapheme boundary, {kind:'inside-grapheme',cell,before,after} inside a
  tab or other multi-cell grapheme, or
  {kind:'virtual',offset,virtualSpaces} past a line's source content end.
  sourceToColumn(offset) returns {kind:'column',row,col} at a valid
  boundary, otherwise an explicit inside-grapheme result. An offset
  strictly inside a CRLF terminator is not a content column.

  These functions operate on logical source rows using lineInfo(),
  including correct CR, LF and CRLF boundaries. Unicode is segmented in
  bounded source reads without materializing huge source lines.

TEXTEDITADVANCEDSELECTIONS PUBLIC INTERFACE

  new TextEditAdvancedSelections(representation,{policy='virtual'}={})
  get policy
  setPolicy('virtual'|'clipped')
  lineSelection({row,col},{row,col})
  rectangularSelection({row,col},{row,col})
  resolveRectangles({row,col},{row,col})

  This layer owns selection geometry, INCLUDING the policy applied to logical
  coordinates before conversion to physical source positions. A virtual
  selection preserves the full logical geometry even beyond source EOL/EOF.
  A clipped selection intersects the logical rectangle or source-line range
  with existing source-row logical cell extents. A selection completely
  outside source text clips to an empty selection list, not a caret at EOF.

  lineSelection covers the complete included source rows and their physical
  terminators where present; rectangularSelection emits one half-open logical
  interval per selected row, with inclusive user-supplied endpoints and
  preserved orientation. Advanced selections do not calculate grapheme/tab
  widths, inspect UTF-16 source offsets or write to the document.

  The representation supplies logical row widths and neutral coordinate
  conversion. TextEditSelections owns physical selection state and performs
  all deferred materialization during selected text edits. resolveRectangles
  reports complete policy-resolved logical targets without mutating state.
  Clipboard distribution, pixels, bidi and wrapped visual rows are outside
  this library.

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

A source edit through editor.replace(...), editor.selections.replace(...) or
document.replace(...) is one atomic document commit. Every subscribed
representation and selection instance observes it automatically. Use
representation.unresolved to inspect overlays/annotations invalidated by the
most recent edit; they are never silently reinterpreted.

There is no implicit history, undo/redo, GUI, DOM rendering, file persistence,
clipboard policy, pixel layout or distributed conflict resolution.

VALIDATION AND DISTRIBUTION

The source library is verified on the actual product checkout with permanent
Node.js tests from rumiai-tests, including TextEditBase, selections,
representation, and facade/source-mapping regression cases. The GitHub Actions
workflow pins the test revision, performs a syntax check, executes the suite
on Node.js 22, and produces the versioned standalone source archive.
Browser UI, native GUI/IME parity, arbitrary Unicode shaping and file I/O
are not established by these core tests.

SEE ALSO

rumiai-dev/specifications/rumiai-os/TEXT-EDIT.md (development contract)
