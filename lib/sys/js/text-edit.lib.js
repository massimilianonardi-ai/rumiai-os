/* TextEdit v0.1.0 — standalone GUI-independent library. MIT-compatible source; no external dependencies. */
(function(global){
'use strict';
// Experimental document representations. Offsets are UTF-16 code units.
// These are intentionally NOT public product APIs.
function check(doc, start, end) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > doc.length) {
    throw new RangeError("invalid text range " + start + ":" + end + " (length " + doc.length + ")");
  }
}
function offsetsOfNewlines(s) {
  const indexes = [];
  for (let i = s.indexOf('\n'); i !== -1; i = s.indexOf('\n', i + 1)) indexes.push(i);
  return Uint32Array.from(indexes);
}
function lowerBound(a, x) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (a[m] < x) lo = m + 1; else hi = m; }
  return lo;
}
function source(text) { return { text, newlines: offsetsOfNewlines(text) }; }
let random = 0x12345678;
function nextPriority() {
  random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
  return random >>> 0;
}
function leaf(src, from = 0, to = src.text.length) {
  if (from === to) return null;
  const newlines = lowerBound(src.newlines, to) - lowerBound(src.newlines, from);
  return { src, from, to, length: to-from, pieceLF:newlines, lf:newlines, size:to-from,
    prio:nextPriority(), left:null, right:null };
}
const size = n => n?.size ?? 0;
const lf = n => n?.lf ?? 0;
function pull(n) { if(n) { n.size = size(n.left) + n.length + size(n.right); n.lf = lf(n.left)+n.pieceLF+lf(n.right); } return n; }
function merge(a,b) {
  if (!a) return b;
  if (!b) return a;
  if (a.prio >= b.prio) { a.right = merge(a.right,b); return pull(a); }
  b.left = merge(a,b.left); return pull(b);
}
function split(root,k) {
  if (!root) return [null,null];
  const ls=size(root.left);
  if (k < ls) {const [a,b]=split(root.left,k);root.left=b;return [a,pull(root)];}
  if (k > ls+root.length) {const [a,b]=split(root.right,k-ls-root.length);root.right=a;return [pull(root),b];}
  if (k === ls) {const a=root.left;root.left=null;return [a,pull(root)];}
  if (k === ls+root.length) {const b=root.right;root.right=null;return [pull(root),b];}
  const a=leaf(root.src,root.from,root.from+k-ls);
  const b=leaf(root.src,root.from+k-ls,root.to);
  return [merge(root.left,a),merge(b,root.right)];
}
function take(node,start,end,out) {
  if (!node || end<=0 || start>=size(node)) return;
  const ls=size(node.left);
  if (start<ls) take(node.left,start,Math.min(end,ls),out);
  const pStart=Math.max(0,start-ls), pEnd=Math.min(node.length,end-ls);
  if(pStart<pEnd) out.push(node.src.text.slice(node.from+pStart,node.from+pEnd));
  if(end>ls+node.length) take(node.right,start-ls-node.length,end-ls-node.length,out);
}
function findNthLF(root,count) {
  let cur=root, acc=0, target=count;
  while(cur) {
    if(lf(cur.left)>=target) {cur=cur.left;continue;}
    acc+=size(cur.left);target-=lf(cur.left);
    if(cur.pieceLF>=target) {
      const s=cur.src.newlines;
      const newline=s[lowerBound(s,cur.from)+target-1];
      return acc + (newline-cur.from)+1;
    }
    acc+=cur.length;target-=cur.pieceLF;cur=cur.right;
  }
  throw new RangeError("newline " + count + " not found");
}
class FlatDocument {
  constructor(s='') {this.text=s;}
  get length() {return this.text.length;}
  get lineCount() {return 1+(this.text.match(/\n/g)?.length??0);}
  slice(start,end) {check(this,start,end);return this.text.slice(start,end);}
  replace(start,end,insert) {check(this,start,end);this.text=this.text.slice(0,start)+insert+this.text.slice(end);}
  lineStart(line) {
    if(!Number.isSafeInteger(line)||line<0||line>=this.lineCount)throw new RangeError('line');
    if(!line)return 0;
    let pos=-1;for(let i=0;i<line;i++)pos=this.text.indexOf('\n',pos+1);
    return pos+1;
  }
  toString() {return this.text;}
}
class PieceDocument {
  constructor(s='') {this.root=leaf(source(s));}
  get length() {return size(this.root);}
  get lineCount() {return 1+lf(this.root);}
  slice(start,end) {check(this,start,end);const parts=[];take(this.root,start,end,parts);return parts.join('');}
  replace(start,end,insert) {
    check(this,start,end);
    if(typeof insert!=='string')throw new TypeError('insert must be a string');
    const [a,right]=split(this.root,start);
    const [,b]=split(right,end-start);
    this.root=merge(merge(a,leaf(source(insert))),b);
  }
  lineStart(line) {
    if(!Number.isSafeInteger(line)||line<0||line>=this.lineCount)throw new RangeError('line');
    return line?findNthLF(this.root,line):0;
  }
  toString() {return this.slice(0,this.length);}
  stats() {let nodes=0, maxDepth=0,srcs=new Set();const walk=(n,d)=>{if(!n)return;nodes++;maxDepth=Math.max(maxDepth,d);srcs.add(n.src);walk(n.left,d+1);walk(n.right,d+1)};walk(this.root,1);return {nodes,maxDepth,sources:srcs.size};}
}


// PoC 063: structural TextEditBase contract + selection editing, not a product API.
// TextEditBase is a SINGLE-INTERVAL text store: length, slice(from,to),
// replace(from,to,text). It has no selection, batch, undo or observer concepts.
// TextEditSelections alone owns selections; direction is injected by the caller.
// A failed multi-range action restores completed writes in reverse order.
// If a backend cannot be restored reliably, the editor instance fails closed.

function validIndex(n) { return Number.isSafeInteger(n) && n >= 0; }
function copySelection(r, length) {
  if (!r || !validIndex(r.start) || !validIndex(r.end) || r.end < r.start ||
      r.end > length || typeof r.forward !== 'boolean')
    throw new RangeError('invalid oriented selection');
  return {start:r.start, end:r.end, forward:r.forward};
}
function validateBase(store) {
  if (!store || !validIndex(store.length) || typeof store.slice !== 'function' ||
      typeof store.replace !== 'function') throw new TypeError('invalid TextEditBase contract');
}
const sameRange = ({selection, text}) =>
  ({start:selection.start, end:selection.end, insert:text});

class TextEditSelections {
  #store;
  #selections=[];
  #orderedIds=[];
  #onBackward;
  #unrecoverable=false;
  constructor(store, {onBackward=sameRange}={}) {
    validateBase(store);
    if (typeof onBackward !== 'function') throw new TypeError('onBackward');
    this.#store=store;
    this.#onBackward=onBackward;
  }
  get length() { return this.#store.length; }
  slice(from,to) { return this.#store.slice(from,to); }
  getSelections() { return this.#selections.map(s=>({...s})); }
  setSelections(ranges) {
    if (this.#unrecoverable) throw new Error('text store state is uncertain; discard this editor instance');
    if (!Array.isArray(ranges)) throw new TypeError('selections must be an array');
    const selections=ranges.map(r=>copySelection(r,this.length));
    // Selection identity/order is unchanged. Cache only physical execution
    // order, since normal typing can reuse it for successive keystrokes.
    this.#orderedIds=selections.map((_,id)=>id).sort((i,j)=>
      selections[i].start-selections[j].start ||
      selections[i].end-selections[j].end || i-j);
    this.#selections=selections;
    return this;
  }
  // A single string is copied to all selections. An array is paired in the
  // USER'S SELECTION ORDER, not sorted text order. No clipboard policy.
  replace(textOrTexts) {
    if (this.#unrecoverable) throw new Error('text store state is uncertain; discard this editor instance');
    const before=this.getSelections(), count=before.length;
    if (!count) throw new RangeError('no selections');
    const texts=typeof textOrTexts==='string'?
      Array.from({length:count},()=>textOrTexts):textOrTexts;
    if (!Array.isArray(texts) || texts.length!==count ||
        texts.some(t=>typeof t!=='string'))
      throw new RangeError('one string per selection required');
    // Convert oriented selections to primitive one-range commands. The
    // direction-specific behavior is an implementation-supplied callback;
    // the base store cannot see it.
    const ordered=this.#orderedIds.map(id=>{
      const s=before[id];
      const payload=texts[id];
      const plan=s.forward?
        sameRange({selection:s,text:payload}):
        this.#onBackward({selection:{...s},text:payload});
      if (!plan || !validIndex(plan.start) || !validIndex(plan.end) ||
          plan.end<plan.start || plan.end>this.length || typeof plan.insert!=='string')
        throw new RangeError('invalid direction-specific edit');
      return {id, start:plan.start, end:plan.end, insert:plan.insert, forward:s.forward};
    });
    // A direction policy may move the edit target beyond the selection.
    // Usually cached physical order remains valid; verify cheaply and fall
    // back to sort only if the positions have actually changed order.
    const byPosition=(a,b)=>a.start-b.start || a.end-b.end || a.id-b.id;
    for(let i=1;i<ordered.length;i++){
      if(byPosition(ordered[i-1],ordered[i])>0){
        ordered.sort(byPosition);
        break;
      }
    }
    let lastEnd=0,lastStart=-1;
    for(const op of ordered) {
      if(op.start<lastEnd || op.start===lastStart)
        throw new RangeError('overlapping/duplicate edit targets');
      lastEnd=op.end; lastStart=op.start;
    }
    // Every original span is captured before mutation; the wrapper can build
    // inversion records from the result without subscribing to the base.
    const originals=ordered.map(op=>this.#store.slice(op.start,op.end));
    // All original text is captured before the first write, so compensation
    // never needs to reconstruct deleted content from a partially edited tree.
    // Apply from right to left: original offsets remain valid while editing.
    const originalLength=this.#store.length;
    // Prepare every result allocation while the text is still unchanged.
    const after=new Array(count);
    const changes=[];
    let displacement=0;
    for(let i=0;i<ordered.length;i++){
      const op=ordered[i], position=op.start+displacement+op.insert.length;
      after[op.id]={start:position,end:position,forward:op.forward};
      changes.push({
        selectionId:op.id, start:op.start, end:op.end,
        removed:originals[i], inserted:op.insert,
        inverseStart:op.start+displacement,
        inverseEnd:position
      });
      displacement+=op.insert.length-(op.end-op.start);
    }
    if(!Number.isSafeInteger(originalLength+displacement) ||
       originalLength+displacement<0 ||
       after.some(r=>!Number.isSafeInteger(r.start)))
      throw new RangeError('resulting text offsets are not representable');
    const newOrder=ordered.map(op=>op.id);
    const result={changes,before,after:after.map(r=>({...r}))};
    const completed=[];
    let expectedLength=originalLength;
    for(let i=ordered.length-1;i>=0;i--){
      const op=ordered[i];
      const lengthBefore=expectedLength;
      try {
        this.#store.replace(op.start,op.end,op.insert);
        completed.push(i);
        expectedLength+=op.insert.length-(op.end-op.start);
      } catch(error) {
        // A custom backend can throw either before or AFTER completing a
        // replacement. Detect both using the local range and length. If its
        // effects cannot be identified, never guess or silently continue.
        try {
          const currentLength=this.#store.length;
          const unchanged=currentLength===lengthBefore &&
            this.#store.slice(op.start,op.end)===originals[i];
          const applied=currentLength===lengthBefore+
              op.insert.length-(op.end-op.start) &&
            this.#store.slice(op.start,op.start+op.insert.length)===op.insert;
          if(!unchanged && !applied)
            throw new Error('failed replacement left an unrecognizable text state');
          if(!unchanged) completed.push(i);
          // Undo in the exact reverse order of successful primitive writes.
          for(let j=completed.length-1;j>=0;j--){
            const index=completed[j],done=ordered[index];
            this.#store.replace(done.start,done.start+done.insert.length,
              originals[index]);
          }
          // Validate the complete set of affected spans and document length.
          if(this.#store.length!==originalLength)
            throw new Error('rollback did not restore document length');
          for(let j=0;j<ordered.length;j++){
            const candidate=ordered[j];
            if(this.#store.slice(candidate.start,candidate.end)!==originals[j])
              throw new Error('rollback did not restore edited text');
          }
        } catch(rollbackError) {
          this.#unrecoverable=true;
          throw new AggregateError([error,rollbackError],
            'text edit failed and recovery could not be verified',
            {cause:error});
        }
        // The original error remains the reported failure after recovery.
        throw error;
      }
    }
    this.#selections=after;
    this.#orderedIds=newOrder;
    return result;
  }
}

// PoC 063: logical UTF-16 positions and visual-cell geometry are distinct.
// DOM independent. A caller supplies grapheme-cell widths; this module never
// assumes all fonts/locales have a single universal visual-width policy.
// Range geometry and column-paste *semantics* are different responsibilities.
const graphemes = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
const natural = n => Number.isSafeInteger(n) && n >= 0;

function probeLine(document, row, {tabSize = 4, widthOf} = {}) {
  if (!natural(row) || row >= document.lineCount) throw new RangeError('line');
  if (!Number.isSafeInteger(tabSize) || tabSize < 1) throw new RangeError('tabSize');
  if (typeof widthOf !== 'function') throw new TypeError('widthOf must be provided by the view');
  const start = document.lineStart(row);
  const next = row + 1 < document.lineCount ? document.lineStart(row + 1) : document.length;
  // lineStart() points after LF. CR is part of a CRLF terminator, not a cell.
  let textEnd = next;
  if (textEnd > start && document.slice(textEnd - 1, textEnd) === '\n') textEnd--;
  if (textEnd > start && next > textEnd && document.slice(textEnd - 1, textEnd) === '\r') textEnd--;
  const lineText = document.slice(start, textEnd);
  const cells = [];
  let col = 0;
  for (const item of graphemes.segment(lineText)) {
    const from = start + item.index, to = from + item.segment.length;
    const width = item.segment === '\t' ? tabSize - col % tabSize : widthOf(item.segment, col, row);
    if (!Number.isSafeInteger(width) || width <= 0) throw new RangeError('invalid grapheme width');
    cells.push({text: item.segment, start: from, end: to, columnStart: col, columnEnd: col + width});
    col += width;
  }
  return {line: row, start, textEnd, end: next, columns: col, cells};
}

function locateColumn(geometry, column) {
  if (!natural(column)) throw new RangeError('visual column');
  for (const cell of geometry.cells) {
    if (column === cell.columnStart) return {kind:'exact',offset:cell.start,virtualSpaces:0};
    if (column < cell.columnEnd) {
      return {kind:'inside-grapheme',cell, before:cell.start, after:cell.end};
    }
  }
  if (column <= geometry.columns) return {kind:'exact',offset:geometry.textEnd,virtualSpaces:0};
  return {kind:'virtual',offset:geometry.textEnd,virtualSpaces:column-geometry.columns};
}

// Only translate requested rectangles into exact document-coordinate targets.
// No silent snapping inside a tab, wide glyph or composed grapheme. No special
// policy for source/destination clipboard shape, font or hit-test pixel width.
// Rows are inclusive; rectangles may be disjoint and unordered by the caller.
function probeRectangles(document, rectangles, options) {
  if (!Array.isArray(rectangles)) throw new TypeError('rectangles');
  const targets = [], unresolved = [], collisions = [];
  let rowCount = 0;
  for (let id = 0; id < rectangles.length; id++) {
    const r = rectangles[id];
    if (!r || ![r.lineFrom,r.lineTo,r.columnFrom,r.columnTo].every(natural)) throw new RangeError('rectangle coordinates');
    const firstLine = Math.min(r.lineFrom,r.lineTo), lastLine = Math.max(r.lineFrom,r.lineTo);
    if (lastLine >= document.lineCount) throw new RangeError('rectangle line outside document');
    const firstColumn = Math.min(r.columnFrom,r.columnTo), lastColumn = Math.max(r.columnFrom,r.columnTo);
    for (let line = firstLine; line <= lastLine; line++) {
      const g = probeLine(document, line, options);
      const first = locateColumn(g,firstColumn), last = locateColumn(g,lastColumn);
      rowCount++;
      if (first.kind === 'inside-grapheme' || last.kind === 'inside-grapheme') {
        unresolved.push({rectangle:id,line,first,last,reason:'inside-grapheme'});
        continue;
      }
      targets.push({rectangle:id,line,start:first.offset,end:last.offset,
        virtualSpaces:first.virtualSpaces,virtualEndSpaces:last.virtualSpaces,
        columnFrom:firstColumn,columnTo:lastColumn});
    }
  }
  targets.sort((a,b)=>a.start-b.start || a.end-b.end || a.rectangle-b.rectangle);
  let furthest = null;
  for (const next of targets) {
    // Compare against the furthest active interval, not merely the preceding
    // target: nested rectangles otherwise hide collisions further down.
    if (furthest && (next.start < furthest.end || next.start === furthest.start))
      collisions.push({first:furthest,second:next});
    if (!furthest || next.end > furthest.end) furthest = next;
  }
  return {targets,unresolved,collisions,requestedRows:rowCount};
}


const _graphemes = new Intl.Segmenter(undefined, {granularity:'grapheme'});
const _index=n=>Number.isSafeInteger(n)&&n>=0;
const _countLF=s=>(s.match(/\n/g)||[]).length;
function _lineAt(doc,offset){
  let lo=0,hi=doc.lineCount;
  while(lo+1<hi){const mid=Math.floor((lo+hi)/2);
    if(doc.lineStart(mid)<=offset)lo=mid;else hi=mid;}
  return lo;
}
function _boundary(doc,offset) {
  if(offset===0||offset===doc.length)return true;
  const line=_lineAt(doc,offset),start=doc.lineStart(line);
  const end=line+1<doc.lineCount?doc.lineStart(line+1):doc.length;
  for(const part of _graphemes.segment(doc.slice(start,end))){
    if(start+part.index===offset)return true;
    if(start+part.index>offset)return false;
  }
  return offset===end;
}
function _mapOffset(offset,affinity,changes) {
  let displacement=0;
  for(const c of changes){
    if(offset<c.start)break;
    if(c.start===c.end&&offset===c.start){
      if(!affinity)return {kind:'unresolved',reason:'insertion-affinity-required'};
      return {kind:'offset',offset:offset+displacement+
        (affinity==='after'?c.inserted.length:0)};
    }
    if(offset>=c.start&&offset<c.end)
      return {kind:'unresolved',reason:'source-anchor-replaced'};
    displacement+=c.inserted.length-(c.end-c.start);
  }
  return {kind:'offset',offset:offset+displacement};
}
class TextEditRepresentation {
  #source; #length; #lines; #replacements=[]; #annotations=[];
  constructor(source){
    if(!source||!_index(source.length)||!_index(source.lineCount)||
      source.lineCount<1||typeof source.slice!=='function'||
      typeof source.lineStart!=='function')
      throw new TypeError('indexed source required');
    this.#source=source;
    this.#length=source.length;
    this.#lines=source.lineCount;
  }
  #current(){
    if(this.#source.length!==this.#length||
       this.#source.lineCount!==this.#lines)
      throw new Error('representation is stale; rebase after a text edit');
  }
  get replacements(){return this.#replacements.map(x=>({...x}));}
  get annotations(){return this.#annotations.map(x=>({...x}));}
  setAnnotations(items) {
    this.#current();
    if(!Array.isArray(items))throw new TypeError('annotations');
    const notes=items.map(a=>{
      if(!a||typeof a.id!=='string'||!a.id||typeof a.text!=='string'||
        !_index(a.at)||a.at>this.#length||
        (a.affinity!==undefined&&!['before','after'].includes(a.affinity)))
        throw new RangeError('invalid annotation');
      return {...a};
    });
    notes.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
    if(new Set(notes.map(x=>x.id)).size!==notes.length)
      throw new RangeError('duplicate annotation id');
    this.#annotations=notes;
    return this;
  }
  setReplacements(items){
    this.#current();
    if(!Array.isArray(items))throw new TypeError('replacements');
    const result=items.map(r=>{
      if(!r||!_index(r.start)||!_index(r.end)||r.start>=r.end||
        r.end>this.#length||typeof r.text!=='string')
        throw new RangeError('invalid replacement');
      if(!_boundary(this.#source,r.start)||!_boundary(this.#source,r.end))
        throw new RangeError('replacement splits a grapheme');
      return {start:r.start,end:r.end,text:r.text};
    }).sort((a,b)=>a.start-b.start);
    for(let i=1;i<result.length;i++)
      if(result[i].start<result[i-1].end)
        throw new RangeError('overlapping representation replacements');
    this.#replacements=result;
    return this;
  }
  // Source offsets, not existing display offsets. Exact same range updates its
  // text; overlaps with another replacement are rejected, never guessed.
  replace(start,end,text){
    return this.setReplacements([
      ...this.#replacements.filter(r=>r.start!==start||r.end!==end),
      {start,end,text}
    ]);
  }
  remove(start,end){
    this.#current();
    this.#replacements=this.#replacements.filter(r=>
      r.start!==start||r.end!==end);
    return this;
  }
  clear(){this.#current();this.#replacements=[];return this;}
  get length(){
    this.#current();
    let n=this.#length;
    for(const r of this.#replacements)n+=r.text.length-(r.end-r.start);
    return n;
  }
  // Total representation coordinates count UTF-16 text and substitution
  // strings, but NOT metadata annotations (which are non-textual).
  sourceToView(offset){
    this.#current();
    if(!_index(offset)||offset>this.#length)throw new RangeError('source offset');
    let delta=0;
    for(const r of this.#replacements){
      if(offset<=r.start)break;
      if(offset<r.end)return {kind:'replaced-region',
        source:{start:r.start,end:r.end},
        view:{start:r.start+delta,end:r.start+delta+r.text.length}};
      delta+=r.text.length-(r.end-r.start);
    }
    return {kind:'offset',offset:offset+delta};
  }
  viewToSource(offset){
    this.#current();
    if(!_index(offset)||offset>this.length)throw new RangeError('view offset');
    let src=0,view=0;
    for(const r of this.#replacements){
      const rawLength=r.start-src;
      if(offset<=view+rawLength)
        return {kind:'offset',offset:src+offset-view};
      view+=rawLength;
      const area={start:view,end:view+r.text.length};
      if(offset<area.end)return {kind:'replaced-region',
        source:{start:r.start,end:r.end},view:area};
      src=r.end;view=area.end;
    }
    return {kind:'offset',offset:src+offset-view};
  }
  // The caller requests a SOURCE interval. It may not cut across an overlay.
  // Bounds avoid copying all visible source text by accident. The renderer can
  // request successive bounded segments. Text is never stored a second time.
  project(start=0,end=this.#length,{maxSourceUnits=65536}={}){
    this.#current();
    if(!_index(start)||!_index(end)||start>end||end>this.#length||
      !_index(maxSourceUnits)||!maxSourceUnits)
      throw new RangeError('projection bounds');
    for(const r of this.#replacements)
      if((r.start<start&&start<r.end)||(r.start<end&&end<r.end))
        throw new RangeError('window cuts representation replacement');
    const segments=[];let cursor=start,readUnits=0;
    function textPart(a,b,doc){
      if(a===b)return;
      readUnits+=b-a;
      if(readUnits>maxSourceUnits)throw new RangeError('projection source budget');
      const value=doc.slice(a,b);
      const boundaries=[..._graphemes.segment(value)].map(g=>a+g.index);
      boundaries.push(b);
      segments.push({kind:'text',source:{start:a,end:b},
        text:value,graphemeBoundaries:boundaries});
    }
    for(const r of this.#replacements){
      if(r.end<=start)continue;
      if(r.start>=end)break;
      textPart(cursor,r.start,this.#source);
      segments.push({kind:'replacement',source:{start:r.start,end:r.end},
        text:r.text});
      cursor=r.end;
    }
    textPart(cursor,end,this.#source);
    const annotations=this.#annotations.filter(a=>a.at>=start&&a.at<=end)
      .map(a=>({...a,position:this.sourceToView(a.at)}));
    return {source:{start,end},segments,annotations,readUnits};
  }
  // Explicit caller-driven rebase after TextEditSelections.replace has
  // succeeded. No listeners or hidden source hooks. Conservative fail-closed
  // behaviour when a replaced overlay was edited or an anchor is ambiguous.
  rebase(changes){
    if(!Array.isArray(changes))throw new TypeError('edit results required');
    const sorted=changes.map(c=>{
      if(!c||!_index(c.start)||!_index(c.end)||c.start>c.end||
        c.end>this.#length||typeof c.removed!=='string'||
        typeof c.inserted!=='string'||c.removed.length!==c.end-c.start)
        throw new RangeError('invalid change');
      return c;
    }).sort((a,b)=>a.start-b.start||a.end-b.end);
    let delta=0,lines=0,lastEnd=-1,lastStart=-1;
    for(const c of sorted){
      if(c.start<lastEnd||c.start===lastStart)
        throw new RangeError('overlapping/duplicate changes');
      lastEnd=c.end;lastStart=c.start;
      delta+=c.inserted.length-c.removed.length;
      lines+=_countLF(c.inserted)-_countLF(c.removed);
    }
    if(this.#source.length!==this.#length+delta||
      this.#source.lineCount!==this.#lines+lines)
      throw new Error('source change record does not match document');
    const unresolved=[],replacements=[],annotations=[];
    for(const r of this.#replacements){
      const touched=sorted.some(c=>c.start===c.end?
        c.start>r.start&&c.start<r.end:
        c.start<r.end&&c.end>r.start);
      if(touched){
        unresolved.push({kind:'replacement',source:{start:r.start,end:r.end},
          reason:'source-region-edited'});
        continue;
      }
      const a=_mapOffset(r.start,'after',sorted);
      const b=_mapOffset(r.end,'before',sorted);
      if(a.kind!=='offset'||b.kind!=='offset'||a.offset>=b.offset||
         !_boundary(this.#source,a.offset)||!_boundary(this.#source,b.offset)){
        unresolved.push({kind:'replacement',source:{start:r.start,end:r.end},
          reason:'replacement-boundary-not-preserved'});
        continue;
      }
      replacements.push({start:a.offset,end:b.offset,text:r.text});
    }
    for(const note of this.#annotations){
      const mapped=_mapOffset(note.at,note.affinity,sorted);
      if(mapped.kind!=='offset'){
        unresolved.push({kind:'annotation',id:note.id,reason:mapped.reason});
        continue;
      }
      annotations.push({...note,at:mapped.offset});
    }
    this.#length=this.#source.length;
    this.#lines=this.#source.lineCount;
    this.#replacements=replacements;
    this.#annotations=annotations;
    return {unresolved};
  }
}
class TextEditAdvancedSelections {
  #document;#selections;#representation;
  constructor(document,selections,representation){
    if(!document||typeof document.lineStart!=='function'||
      !selections||typeof selections.setSelections!=='function'||
      !representation||typeof representation.sourceToView!=='function')
      throw new TypeError('advanced selection composition');
    this.#document=document;this.#selections=selections;
    this.#representation=representation;
  }
  lineSelection(first,last){
    if(!_index(first)||!_index(last)||last<first||
      last>=this.#document.lineCount)
      throw new RangeError('logical lines');
    const end=last+1<this.#document.lineCount?
      this.#document.lineStart(last+1):this.#document.length;
    return this.#selections.setSelections([{
      start:this.#document.lineStart(first),end,forward:true
    }]);
  }
  rectangularSelection(rectangles,{tabSize=4,widthOf}={}){
    const out=probeRectangles(this.#document,rectangles,{tabSize,widthOf});
    if(out.unresolved.length||out.collisions.length)
      throw new RangeError('ambiguous/colliding rectangular selections');
    for(const item of out.targets){
      const start=this.#representation.sourceToView(item.start);
      const end=this.#representation.sourceToView(item.end);
      if(start.kind!=='offset'||end.kind!=='offset')
        throw new RangeError('rectangle intersects representation replacement');
    }
    return this.#selections.setSelections(out.targets.map(r=>({
      start:r.start,end:r.end,forward:true
    })));
  }
}
class TextEdit {
  constructor(value='',{document}={}){
    this.document=document??new PieceDocument(value);
    this.selections=new TextEditSelections(this.document);
    this.representation=new TextEditRepresentation(this.document);
    this.advancedSelections=new TextEditAdvancedSelections(
      this.document,this.selections,this.representation);
  }
  replace(textOrTexts){
    const result=this.selections.replace(textOrTexts);
    const representation=this.representation.rebase(result.changes);
    return {...result,representation};
  }
}
const publicAPI=Object.freeze({
  VERSION:'0.1.0',
  TextEdit,PieceDocument,FlatDocument,TextEditSelections,
  TextEditRepresentation,TextEditAdvancedSelections
});
if(typeof module==='object'&&module.exports)module.exports=publicAPI;
if(global)global.TextEdit=publicAPI;

})(typeof globalThis==='object'?globalThis:this);
