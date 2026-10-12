TextEdit — GUI-independent text editing library
Version 0.4.0

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
  .replace(textOrTexts)   one selected atomic commit; returns
                          {before,after,representation:{unresolved}}

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

  TextEditBase, TextEditSelections and TextEditRepresentation observe the
  same atomic document mutations. Selections and representations subscribe
  directly and independently to the document; changes from any view are
  rebased exactly once. No explicit rebase(changes) or old-text adapter is
  necessary. This component does not own history, GUI or a generic event bus.

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

TEXTEDITREPRESENTATION PUBLIC INTERFACE

  new TextEditRepresentation(document)
  setReplacements([{start,end,text}, ...])
  replace(start,end,text)
  remove(start,end)
  clear()
  setAnnotations([{id,at,text,affinity?}, ...])
  get replacements                   independent overlay snapshot
  get annotations                    independent ordered annotation snapshot
  get unresolved                     last committed invalidation snapshot
  get length                         projected text UTF-16 length
  project(start=0,end=document.length,{maxSourceUnits=65536})
  sourceToView(offset)
  viewToSource(offset)
  dispose()

  The representation does not modify source text or document.revision.
  Overlay intervals use half-open UTF-16 SOURCE positions, require a nonempty
  grapheme-safe range and may not overlap. text may be empty or multiline.
  replace adds or updates one exact source interval. remove removes only
  the exact range. clear removes overlays but does not remove annotations.
  setReplacements and setAnnotations replace their respective collections
  atomically; invalid inputs preserve the old valid state.

  Annotations carry unique nonempty string id, source at, string text and
  optional insertion affinity ('before' or 'after'). Unknown affinity at an
  exact insertion is unresolved. Metadata is not projected text. Overlay
  and annotation accessors return snapshots. Unresolved records identify
  invalidated overlays/annotations from the most recent source commit.

  All external and local source edits automatically rebase the representation
  through the document's existing committed-edit notification. Inserts at
  overlay boundaries stay outside the overlay; inserts strictly inside or
  nonempty replacements intersecting an overlay invalidate that overlay.
  Invalid grapheme boundaries after an edit also invalidate the overlay.
  Annotations in deleted/replaced source become unresolved. A revision gap
  (including counter wrap) or a failed committed-notification rebase clears
  all dependent metadata rather than guessing its new source meaning.
  Each next commit resets the unresolved snapshot. No edit-derived change
  records or explicit representation.rebase API are required.

  project requests a SOURCE interval and returns {source,segments,
  annotations,readUnits}. Text segments contain source and grapheme boundaries;
  substitution segments contain their source and synthetic text. The
  maxSourceUnits budget limits projected source extraction. Small windows
  in large ASCII source lines do not require reading the complete line;
  arbitrary Unicode grapheme validation can require additional context.
  Windows must not cut overlays or grapheme clusters.

  sourceToView/viewToSource return {kind:'offset',offset} for positions with
  a unique mapping and {kind:'replaced-region',source:{start,end},
  view:{start,end}} for ambiguous substituted regions, including empty
  virtual substitutions.

  dispose() unsubscribes from the shared document and clears local metadata.
  It is idempotent, and all other methods reject use after disposal.

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
