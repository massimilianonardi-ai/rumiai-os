/* TextEdit v0.4.0 — standalone GUI-independent library; no external dependencies. */
(function(global){
'use strict';
// TextEditBase document implementations use exact UTF-16 source offsets.
// PieceDocument and FlatDocument are public; underscore-prefixed helpers are internal.
function _check(doc,start,end) {
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
     start<0||end<start||end>doc.length)throw new RangeError('invalid text range');
}
function _checkLine(doc,line) {
  if(!Number.isSafeInteger(line)||line<0||line>=doc.lineCount)
    throw new RangeError('invalid logical line');
}
function _lowerBound(a,x) {
  let lo=0,hi=a.length;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);
    if(a[mid]<x)lo=mid+1;else hi=mid;}
  return lo;
}
// Source line separator ends, measured in UTF-16 units. A CRLF contributes
// exactly one end, after its LF. A piece may start/end inside the pair.
function _source(text) {
  const ends=[];
  for(let i=0;i<text.length;i++){
    if(text[i]==='\r'){
      if(text[i+1]==='\n')i++;
      ends.push(i+1);
    }else if(text[i]==='\n')ends.push(i+1);
  }
  return {text,ends:Uint32Array.from(ends)};
}
const _emptySummary=Object.freeze({_size:0,breaks:0,first:'',last:''});
function _pieceSummary(src,from,to) {
  if(from===to)return _emptySummary;
  const text=src.text, last=text[to-1];
  // Trailing CR in a slice _split from the original CRLF is locally a break.
  const splitCR=last==='\r'&&text[to]==='\n'?1:0;
  return {_size:to-from,first:text[from],last,
    breaks:_lowerBound(src.ends,to+1)-_lowerBound(src.ends,from+1)+splitCR};
}
function _combine(a,b) {
  if(!a._size)return b;
  if(!b._size)return a;
  return {_size:a._size+b._size,first:a.first,last:b.last,
    breaks:a.breaks+b.breaks-(a.last==='\r'&&b.first==='\n'?1:0)};
}
const _size=n=>n?n._summary._size:0;
const _summary=n=>n?n._summary:_emptySummary;
let _random=0x12345678;
function _nextPriority() {
  _random^=_random<<13;_random^=_random>>>17;_random^=_random<<5;
  return _random>>>0;
}
function _leaf(src,from=0,to=src.text.length) {
  if(from===to)return null;
  const piece=_pieceSummary(src,from,to);
  return {src,from,to,piece,prio:_nextPriority(),left:null,right:null,
    _summary:piece};
}
// Stage changes in a persistent indexed treap: no published node is mutated.
function _pull(node) {
  node._summary=_combine(_combine(_summary(node.left),node.piece),_summary(node.right));
  return node;
}
function _merge(a,b) {
  if(!a)return b;
  if(!b)return a;
  if(a.prio>=b.prio)return _pull({...a,right:_merge(a.right,b)});
  return _pull({...b,left:_merge(a,b.left)});
}
function _split(root,k) {
  if(!root)return [null,null];
  const ls=_size(root.left),len=root.to-root.from;
  if(k<ls){const [a,b]=_split(root.left,k);return [a,_pull({...root,left:b})];}
  if(k>ls+len){const [a,b]=_split(root.right,k-ls-len);return [_pull({...root,right:a}),b];}
  if(k===ls)return [root.left,_pull({...root,left:null})];
  if(k===ls+len)return [_pull({...root,right:null}),root.right];
  const pivot=root.from+k-ls;
  return [_merge(root.left,_leaf(root.src,root.from,pivot)),
    _merge(_leaf(root.src,pivot,root.to),root.right)];
}
function _replaceSpan(root,start,end,text) {
  const [left,tail]=_split(root,start);
  const [,right]=_split(tail,end-start);
  return _merge(_merge(left,_leaf(_source(text))),right);
}
function _take(node,start,end,out) {
  if(!node||end<=0||start>=_size(node))return;
  const ls=_size(node.left),len=node.to-node.from;
  if(start<ls)_take(node.left,start,Math.min(end,ls),out);
  const from=Math.max(0,start-ls),to=Math.min(len,end-ls);
  if(from<to)out.push(node.src.text.slice(node.from+from,node.from+to));
  if(end>ls+len)_take(node.right,start-ls-len,end-ls-len,out);
}
function _charAt(node,index) {
  let cur=node;
  while(cur){
    const ls=_size(cur.left),len=cur.to-cur.from;
    if(index<ls)cur=cur.left;
    else if(index<ls+len)return cur.src.text[cur.from+index-ls];
    else {index-=ls+len;cur=cur.right;}
  }
  return '';
}
function _nthPieceBreak(node,target,prior) {
  const {src,from,to,piece}=node;
  let first=_lowerBound(src.ends,from+1);
  const after=_lowerBound(src.ends,to+1);
  if(prior==='\r'&&piece.first==='\n')first++;
  const ordinary=after-first;
  if(target<=ordinary)return src.ends[first+target-1]-from;
  return to-from; // trailing CR separated from its original _source LF
}
function _nthBreak(node,target,prior='',base=0) {
  const left=_summary(node.left);
  const leftCount=left.breaks-(prior==='\r'&&left.first==='\n'?1:0);
  if(target<=leftCount)return _nthBreak(node.left,target,prior,base);
  target-=leftCount;base+=left._size;
  if(left._size)prior=left.last;
  const pieceCount=node.piece.breaks-
    (prior==='\r'&&node.piece.first==='\n'?1:0);
  if(target<=pieceCount)return base+_nthPieceBreak(node,target,prior);
  return _nthBreak(node.right,target-pieceCount,node.piece.last,
    base+node.piece._size);
}
function _prefixSummary(node,count) {
  if(!node||!count)return _emptySummary;
  const ls=_size(node.left),len=node.to-node.from;
  if(count<=ls)return _prefixSummary(node.left,count);
  const left=_summary(node.left);
  if(count<=ls+len)return _combine(left,
    _pieceSummary(node.src,node.from,node.from+count-ls));
  return _combine(_combine(left,node.piece),
    _prefixSummary(node.right,count-ls-len));
}
// Multi-ranges are validated in ONE old-coordinate system and applied from
// right to left. At a shared start the replacement is processed before its
// insertion, yielding an insertion preceding the replacement's inserted text.
function _prepareEdits(length,args) {
  let inputs,arrayForm;
  if(args.length===1&&Array.isArray(args[0])){
    inputs=args[0];arrayForm=true;
    if(!inputs.length)throw new RangeError('empty edit array');
  }else if(args.length===3){
    inputs=[{start:args[0],end:args[1],text:args[2]}];arrayForm=false;
  }else throw new TypeError('replace expects three arguments or one edit array');
  const edits=inputs.map(item=>{
    if(!item||typeof item!=='object')throw new TypeError('invalid edit record');
    const {start,end,text}=item;
    if(typeof text!=='string')throw new TypeError('replacement text must be a string');
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
       start<0||end<start||end>length)throw new RangeError('invalid edit range');
    return Object.freeze({start,end,text});
  });
  const ascending=edits.slice().sort((a,b)=>a.start-b.start ||
    Number(a.start!==a.end)-Number(b.start!==b.end));
  let lastStart=-1,lastEnd=0,lastInsert=-1;
  let finalLength=length;
  for(const e of ascending){
    if(e.start===e.end){
      if(e.start===lastInsert||(e.start>lastStart&&e.start<lastEnd))
        throw new RangeError('colliding edit targets');
      lastInsert=e.start;
    }else{
      if(e.start<lastEnd)throw new RangeError('overlapping edit targets');
      lastStart=e.start;lastEnd=e.end;
    }
    finalLength+=e.text.length-(e.end-e.start);
    if(!Number.isSafeInteger(finalLength)||finalLength<0)
      throw new RangeError('document length exceeds safe integer range');
  }
  const descending=ascending.reverse().sort((a,b)=>b.start-a.start ||
    Number(a.start===a.end)-Number(b.start===b.end));
  return {descending,notification:arrayForm?[Object.freeze(edits)]:args.slice()};
}
class _DocumentStore {
  constructor(){
    this._revision=0;this._listeners=new Set();this._notifying=false;
  }
  get revision(){return this._revision;}
  _assertMutable(){
    if(this._notifying)throw new Error('reentrant document mutation during notification');
  }
  subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('listener must be a function');
    // Each subscribe call is independent, even for the same function object.
    const subscription={listener};
    this._listeners.add(subscription);
    let active=true;
    return ()=>{if(active){active=false;this._listeners.delete(subscription);}};
  }
  _snapshotListeners(){return [...this._listeners].map(s=>s.listener);}
  _publish(args,listeners){
    this._revision=this._revision===Number.MAX_SAFE_INTEGER?0:this._revision+1;
    this._notifying=true;
    try{
      for(const listener of listeners){
        try{listener(...args);}
        catch(error){
          // Committed writes cannot be undone by a faulty view.
          try{if(typeof console!=='undefined'&&console.error)
            console.error('TextEdit listener failed',error);}catch(_) {}
        }
      }
    }finally{this._notifying=false;}
  }
}
class FlatDocument extends _DocumentStore {
  #text;
  constructor(text=''){
    super();
    if(typeof text!=='string')throw new TypeError('initial text must be a string');
    this.#text=text;
  }
  get length(){return this.#text.length;}
  get lineCount(){
    let lines=1;
    for(let i=0;i<this.#text.length;i++){
      if(this.#text[i]==='\r'){lines++;if(this.#text[i+1]==='\n')i++;}
      else if(this.#text[i]==='\n')lines++;
    }
    return lines;
  }
  slice(start,end){_check(this,start,end);return this.#text.slice(start,end);}
  toString(){return this.#text;}
  lineStart(line){
    _checkLine(this,line);
    if(!line)return 0;
    let seen=0;
    for(let i=0;i<this.#text.length;i++){
      if(this.#text[i]==='\r'||this.#text[i]==='\n'){
        if(this.#text[i]==='\r'&&this.#text[i+1]==='\n')i++;
        if(++seen===line)return i+1;
      }
    }
    throw new RangeError('line not found');
  }
  lineAt(offset){
    if(!Number.isSafeInteger(offset)||offset<0||offset>this.length)
      throw new RangeError('invalid offset');
    let count=0;
    for(let i=0;i<offset;i++){
      if(this.#text[i]==='\r'&&this.#text[i+1]==='\n'){
        if(i+2<=offset){count++;i++;}
      }else if(this.#text[i]==='\r'||this.#text[i]==='\n')count++;
    }
    return count;
  }
  lineInfo(line){
    _checkLine(this,line);
    const start=this.lineStart(line),next=line+1<this.lineCount?
      this.lineStart(line+1):this.length;
    let end=next;
    if(line+1<this.lineCount)
      end-=this.#text[next-2]==='\r'&&this.#text[next-1]==='\n'?2:1;
    return {start,end,nextStart:next};
  }
  replace(...args){
    this._assertMutable();
    const {descending,notification}=_prepareEdits(this.length,args);
    const listeners=this._snapshotListeners();
    let text=this.#text;
    for(const e of descending)text=text.slice(0,e.start)+e.text+text.slice(e.end);
    this.#text=text;
    this._publish(notification,listeners);
  }
}
class PieceDocument extends _DocumentStore {
  #root;
  constructor(text=''){
    super();
    if(typeof text!=='string')throw new TypeError('initial text must be a string');
    this.#root=_leaf(_source(text));
  }
  get length(){return _size(this.#root);}
  get lineCount(){return 1+_summary(this.#root).breaks;}
  slice(start,end){
    _check(this,start,end);
    const parts=[];_take(this.#root,start,end,parts);
    return parts.join('');
  }
  toString(){return this.slice(0,this.length);}
  lineStart(line){
    _checkLine(this,line);
    if(!line)return 0;
    let end=_nthBreak(this.#root,line);
    if(end<this.length&&_charAt(this.#root,end-1)==='\r'&&
       _charAt(this.#root,end)==='\n')end++;
    return end;
  }
  lineAt(offset){
    if(!Number.isSafeInteger(offset)||offset<0||offset>this.length)
      throw new RangeError('invalid offset');
    if(!offset)return 0;
    const before=_prefixSummary(this.#root,offset);
    return before.breaks-(before.last==='\r'&&
      _charAt(this.#root,offset)==='\n'?1:0);
  }
  lineInfo(line){
    _checkLine(this,line);
    const start=this.lineStart(line),next=line+1<this.lineCount?
      this.lineStart(line+1):this.length;
    let end=next;
    if(line+1<this.lineCount)
      end-=_charAt(this.#root,next-2)==='\r'&&
        _charAt(this.#root,next-1)==='\n'?2:1;
    return {start,end,nextStart:next};
  }
  replace(...args){
    this._assertMutable();
    const {descending,notification}=_prepareEdits(this.length,args);
    const listeners=this._snapshotListeners();
    let root=this.#root;
    for(const e of descending)root=_replaceSpan(root,e.start,e.end,e.text);
    this.#root=root;
    this._publish(notification,listeners);
  }
  stats(){
    let nodes=0,maxDepth=0;
    const sources=new Set();
    const walk=(node,depth)=>{
      if(!node)return;
      nodes++;maxDepth=Math.max(maxDepth,depth);
      sources.add(node.src);
      walk(node.left,depth+1);walk(node.right,depth+1);
    };
    walk(this.#root,1);
    return {nodes,maxDepth,sources:sources._size};
  }
}

// TextEditSelections owns view-local oriented source positions. The document
// owns atomic multi-range source commits and their direct notifications.
// Selection edits prepare one batch, publish through document.replace once,
// and rebase other views from committed source coordinates. No selection-layer
// rollback, source history, GUI state or generic event bus is involved.

function _selectionValid(n){return Number.isSafeInteger(n)&&n>=0;}
function _selectionCopy(s,length){
  if(!s||typeof s!=='object'||Array.isArray(s))throw new TypeError('selection record');
  const {start,end,forward}=s;
  if(typeof forward!=='boolean')throw new TypeError('selection forward');
  if(!_selectionValid(start)||!_selectionValid(end)||start>end||end>length)
    throw new RangeError('selection offset');
  return {start,end,forward};
}
function _selectionCopyArray(input,length){
  if(!Array.isArray(input))throw new TypeError('selection array');
  return input.map(s=>_selectionCopy(s,length));
}
function _selectionOrder(commands){
  const result=commands.map((e,index)=>({...e,index}));
  result.sort((a,b)=>a.start-b.start||
    Number(a.start!==a.end)-Number(b.start!==b.end));
  let shift=0;
  for(const e of result){
    e.before=shift;
    shift+=e.text.length-(e.end-e.start);
    e.after=shift;
  }
  return result;
}
function _selectionMap(offset,right,edits){
  let lo=0,hi=edits.length;
  while(lo<hi){
    const mid=Math.floor((lo+hi)/2);
    if(edits[mid].start<offset)lo=mid+1;else hi=mid;
  }
  const previous=edits[lo-1];
  if(previous&&previous.end>offset)
    return previous.start+previous.before+(right?previous.text.length:0);
  let delta=previous?previous.after:0;
  const here=edits[lo];
  if(right&&here&&here.start===offset&&here.end===offset)
    delta+=here.text.length;
  return offset+delta;
}
function _selectionRebase(values,changes){
  const ordered=_selectionOrder(changes);
  return values.map(s=>{
    const start=_selectionMap(s.start,true,ordered);
    const end=_selectionMap(s.end,s.start===s.end,ordered);
    return {start,end:start>end?start:end,forward:s.forward};
  });
}
function _selectionPlan(values,texts,length){
  const edits=values.map((s,i)=>({start:s.start,end:s.end,text:texts[i]}));
  const sorted=_selectionOrder(edits);
  let lastStart=-1,lastEnd=0,lastInsertion=-1,resultLength=length;
  const after=new Array(values.length);
  for(const e of sorted){
    if(e.start===e.end){
      if(e.start===lastInsertion||(e.start>lastStart&&e.start<lastEnd))
        throw new RangeError('colliding insertions');
      lastInsertion=e.start;
    }else{
      if(e.start<lastEnd)throw new RangeError('overlapping replacements');
      lastStart=e.start;lastEnd=e.end;
    }
    const offset=e.start+e.before+e.text.length;
    if(!_selectionValid(offset))throw new RangeError('unsafe caret position');
    after[e.index]={start:offset,end:offset,forward:values[e.index].forward};
    resultLength+=e.text.length-(e.end-e.start);
  }
  if(!_selectionValid(resultLength))throw new RangeError('unsafe result length');
  return {edits,after};
}
class TextEditSelections {
  #document;
  #selections=[];
  #revision;
  #unsubscribe;
  #disposed=false;
  #localAfter=null;
  constructor(document){
    if(!document||!_selectionValid(document.length)||
       !_selectionValid(document.revision)||
       typeof document.replace!=='function'||typeof document.subscribe!=='function')
      throw new TypeError('TextEditBase document required');
    this.#document=document;
    this.#revision=document.revision;
    this.#unsubscribe=document.subscribe((...args)=>this.#committed(args));
  }
  #alive(){if(this.#disposed)throw new Error('TextEditSelections disposed');}
  #committed(args){
    if(this.#disposed)return;
    const revision=this.#document.revision;
    try{
      if(revision!==this.#revision+1)this.#selections=[];
      else if(this.#localAfter!==null)this.#selections=this.#localAfter;
      else {
        const changes=args.length===1?args[0]:
          [{start:args[0],end:args[1],text:args[2]}];
        this.#selections=_selectionRebase(this.#selections,changes);
      }
    }catch(error){
      this.#selections=[];
      try{if(typeof console!=='undefined'&&console.error)
        console.error('TextEditSelections committed-rebase failed',error);}
      catch(_){}
    }finally{this.#revision=revision;}
  }
  getSelections(){
    this.#alive();
    return this.#selections.map(s=>({...s}));
  }
  setSelections(values){
    this.#alive();
    const revision=this.#document.revision;
    const next=_selectionCopyArray(values,this.#document.length);
    if(this.#document.revision!==revision)
      throw new Error('document changed while reading selection inputs');
    this.#selections=next;
    this.#revision=revision;
    return this;
  }
  addSelections(values){
    this.#alive();
    const revision=this.#document.revision;
    const next=_selectionCopyArray(values,this.#document.length);
    if(this.#document.revision!==revision)
      throw new Error('document changed while reading selection inputs');
    if(this.#revision!==revision)this.#selections=[];
    this.#selections=this.#selections.concat(next);
    this.#revision=revision;
    return this;
  }
  replace(textOrTexts){
    this.#alive();
    const checkpoint=this.#revision;
    const before=this.getSelections();
    if(!before.length)throw new RangeError('no selections');
    const texts=typeof textOrTexts==='string'?
      before.map(()=>textOrTexts):textOrTexts;
    if(!Array.isArray(texts)||texts.length!==before.length)
      throw new TypeError('one string per selection');
    if(texts.some(text=>typeof text!=='string'))
      throw new TypeError('replacement text must be a string');
    const {edits,after}=_selectionPlan(before,texts,this.#document.length);
    if(this.#revision!==checkpoint||this.#document.revision!==checkpoint)
      throw new Error('document changed while preparing selection edits');
    this.#localAfter=after;
    try{this.#document.replace(edits);}
    finally{this.#localAfter=null;}
    // Another subscriber may dispose this view during commit delivery.
    return {before,after:this.#disposed?[]:this.getSelections()};
  }
  dispose(){
    if(this.#disposed)return;
    this.#disposed=true;
    this.#unsubscribe();
    this.#selections=[];
    this.#localAfter=null;
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
function _lineAt(doc,offset) {
  return doc.lineAt(offset);
}
function _boundary(doc,offset) {
  if(offset===0||offset===doc.length)return true;
  // Every ASCII code point (except LF paired with a preceding CR) starts a
  // grapheme. This O(1) fast path avoids slicing a huge ASCII source line
  // when a caller asks for a small viewport window.
  const local=doc.slice(offset-1,offset+1);
  if(local.length===2&&local.charCodeAt(1)<=0x7f)
    return local!=='\r\n';
  const line=_lineAt(doc,offset),start=doc.lineStart(line);
  const end=line+1<doc.lineCount?doc.lineStart(line+1):doc.length;
  for(const part of _graphemes.segment(doc.slice(start,end))) {
    if(start+part.index===offset)return true;
    if(start+part.index>offset)return false;
  }
  return offset===end;
}
// Normalize the original source-coordinate mutation for one synchronous
// notification. Prefix displacement makes all later rebases independent of
// the incoming array order and of whether edits are inserted or replaced.
function _representationEdits(args,oldLength) {
  const values=args.length===1&&Array.isArray(args[0])?args[0]:
    args.length===3?[{start:args[0],end:args[1],text:args[2]}]:null;
  if(!values||!values.length)throw new TypeError('invalid committed edit notification');
  const edits=values.map(e=>{
    if(!e||!_index(e.start)||!_index(e.end)||e.start>e.end||
      e.end>oldLength||typeof e.text!=='string')
      throw new RangeError('invalid committed source range');
    return {start:e.start,end:e.end,text:e.text};
  }).sort((a,b)=>a.start-b.start||
    Number(a.start!==a.end)-Number(b.start!==b.end));
  let shift=0,lastEnd=0,lastInsertion=-1,lastStart=-1;
  for(const e of edits){
    if(e.start===e.end) {
      if(e.start===lastInsertion||(e.start>lastStart&&e.start<lastEnd))
        throw new RangeError('colliding committed insertion');
      lastInsertion=e.start;
    } else {
      if(e.start<lastEnd)throw new RangeError('overlapping committed edits');
      lastStart=e.start;lastEnd=e.end;
    }
    e.before=shift;
    shift+=e.text.length-(e.end-e.start);
    e.after=shift;
  }
  return {edits,delta:shift};
}
function _representationLowerBound(edits,offset) {
  let low=0,high=edits.length;
  while(low<high){
    const middle=Math.floor((low+high)/2);
    if(edits[middle].start<offset)low=middle+1;
    else high=middle;
  }
  return low;
}
function _representationAnchor(offset,affinity,edits) {
  const at=_representationLowerBound(edits,offset);
  const prev=edits[at-1];
  if(prev&&prev.end>offset)
    return {kind:'unresolved',reason:'source-anchor-replaced'};
  const next=edits[at];
  if(next&&next.start===offset&&next.start!==next.end)
    return {kind:'unresolved',reason:'source-anchor-replaced'};
  if(next&&next.start===offset&&next.end===offset){
    // A simultaneous insertion and replacement at this start still remove
    // the original anchor. Only insertion-alone permits affinity mapping.
    const following=edits[at+1];
    if(following&&following.start===offset&&following.end>offset)
      return {kind:'unresolved',reason:'source-anchor-replaced'};
    if(!affinity)return {kind:'unresolved',reason:'insertion-affinity-required'};
    return {kind:'offset',offset:offset+next.before+
      (affinity==='after'?next.text.length:0)};
  }
  return {kind:'offset',offset:offset+(prev?prev.after:0)};
}
// Boundaries survive touching source edits. At insertion positions, overlay
// starts attach AFTER new text and ends attach BEFORE it.
function _representationBoundary(offset,right,edits) {
  const at=_representationLowerBound(edits,offset);
  const prev=edits[at-1];
  if(prev&&prev.end>offset)return null;
  const next=edits[at];
  let delta=prev?prev.after:0;
  if(right&&next&&next.start===offset&&next.start===next.end)
    delta+=next.text.length;
  return offset+delta;
}
function _representationTouches(region,edits) {
  const at=_representationLowerBound(edits,region.start);
  for(let i=Math.max(0,at-1);i<edits.length;i++){
    const e=edits[i];
    if(e.start>=region.end)break;
    if(e.start===e.end) {
      if(e.start>region.start&&e.start<region.end)return true;
    } else if(e.start<region.end&&e.end>region.start)return true;
  }
  return false;
}
class TextEditRepresentation {
  #source;
  #length;
  #revision;
  #replacements=[];
  #annotations=[];
  #unresolved=[];
  #unsubscribe;
  #disposed=false;

  constructor(source){
    if(!source||!_index(source.length)||!_index(source.revision)||
      !_index(source.lineCount)||source.lineCount<1||
      typeof source.slice!=='function'||typeof source.lineStart!=='function'||
      typeof source.lineAt!=='function'||typeof source.subscribe!=='function')
      throw new TypeError('TextEditBase document required');
    this.#source=source;
    this.#length=source.length;
    this.#revision=source.revision;
    this.#unsubscribe=source.subscribe((...args)=>this.#committed(args));
    if(source.revision!==this.#revision)this.#invalidate(source.revision);
  }
  #current() {
    if(this.#disposed)throw new Error('TextEditRepresentation disposed');
    if(this.#source.revision!==this.#revision)
      throw new Error('representation revision is stale; awaiting source notification');
  }
  #invalidate(revision,reason='revision-discontinuity') {
    this.#unresolved=[
      ...this.#replacements.map(r=>({kind:'replacement',
        source:{start:r.start,end:r.end},reason})),
      ...this.#annotations.map(a=>({kind:'annotation',id:a.id,reason}))
    ];
    this.#replacements=[];
    this.#annotations=[];
    this.#length=this.#source.length;
    this.#revision=revision;
  }
  #committed(args) {
    if(this.#disposed)return;
    const current=this.#source.revision;
    if(current!==this.#revision+1) {
      this.#invalidate(current);
      return;
    }
    try{
      const {edits,delta}=_representationEdits(args,this.#length);
      if(this.#source.length!==this.#length+delta)
        throw new Error('committed source size mismatch');
      const unresolved=[],replacements=[],annotations=[];
      for(const r of this.#replacements){
        if(_representationTouches(r,edits)){
          unresolved.push({kind:'replacement',
            source:{start:r.start,end:r.end},reason:'source-region-edited'});
          continue;
        }
        const start=_representationBoundary(r.start,true,edits);
        const end=_representationBoundary(r.end,false,edits);
        if(start===null||end===null||start>=end||
          !_boundary(this.#source,start)||!_boundary(this.#source,end)){
          unresolved.push({kind:'replacement',
            source:{start:r.start,end:r.end},
            reason:'replacement-boundary-not-preserved'});
          continue;
        }
        replacements.push({start,end,text:r.text});
      }
      for(const a of this.#annotations){
        const mapped=_representationAnchor(a.at,a.affinity,edits);
        if(mapped.kind!=='offset'){
          unresolved.push({kind:'annotation',id:a.id,reason:mapped.reason});
        } else {
          annotations.push({...a,at:mapped.offset});
        }
      }
      this.#replacements=replacements;
      this.#annotations=annotations;
      this.#unresolved=unresolved;
      this.#length=this.#source.length;
      this.#revision=current;
    } catch(error){
      this.#invalidate(current,'notification-processing-failed');
      try{
        if(typeof console!=='undefined'&&console.error)
          console.error('TextEditRepresentation source rebase failed',error);
      }catch(_) {}
    }
  }
  get replacements(){
    this.#current();
    return this.#replacements.map(x=>({...x}));
  }
  get annotations(){
    this.#current();
    return this.#annotations.map(x=>({...x}));
  }
  get unresolved(){
    this.#current();
    return this.#unresolved.map(x=>({...x,
      ...(x.source?{source:{...x.source}}:{})}));
  }
  setAnnotations(items){
    this.#current();
    const revision=this.#revision;
    if(!Array.isArray(items))throw new TypeError('annotations must be an array');
    const notes=items.map(a=>{
      if(!a||typeof a.id!=='string'||!a.id||
        typeof a.text!=='string'||!_index(a.at)||a.at>this.#length||
        (a.affinity!==undefined&&a.affinity!=='before'&&a.affinity!=='after'))
        throw new RangeError('invalid annotation');
      return {...a};
    });
    notes.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
    if(new Set(notes.map(x=>x.id)).size!==notes.length)
      throw new RangeError('duplicate annotation id');
    if(this.#source.revision!==revision)
      throw new Error('document changed while preparing annotations');
    this.#annotations=notes;
    return this;
  }
  setReplacements(items){
    this.#current();
    if(!Array.isArray(items))throw new TypeError('replacements must be an array');
    const result=items.map(r=>{
      if(!r||!_index(r.start)||!_index(r.end)||r.start>=r.end||
        r.end>this.#length||typeof r.text!=='string')
        throw new RangeError('invalid representation replacement');
      if(!_boundary(this.#source,r.start)||!_boundary(this.#source,r.end))
        throw new RangeError('replacement splits a grapheme');
      return {start:r.start,end:r.end,text:r.text};
    }).sort((a,b)=>a.start-b.start);
    for(let i=1;i<result.length;i++)
      if(result[i].start<result[i-1].end)
        throw new RangeError('overlapping representation replacements');
    if(this.#revision!==this.#source.revision)
      throw new Error('document changed while preparing representation');
    this.#replacements=result;
    return this;
  }
  replace(start,end,text){
    return this.setReplacements([
      ...this.#replacements.filter(r=>r.start!==start||r.end!==end),
      {start,end,text}
    ]);
  }
  remove(start,end){
    this.#current();
    this.#replacements=this.#replacements.filter(r=>r.start!==start||r.end!==end);
    return this;
  }
  clear(){
    this.#current();
    this.#replacements=[];
    return this;
  }
  get length(){
    this.#current();
    let count=this.#length;
    for(const r of this.#replacements)count+=r.text.length-(r.end-r.start);
    return count;
  }
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
      const original=r.start-src;
      if(r.text.length===0&&offset===view+original)
        return {kind:'replaced-region',
          source:{start:r.start,end:r.end},
          view:{start:view+original,end:view+original}};
      if(offset<=view+original)
        return {kind:'offset',offset:src+offset-view};
      view+=original;
      const area={start:view,end:view+r.text.length};
      if(offset<area.end)return {kind:'replaced-region',
        source:{start:r.start,end:r.end},view:area};
      src=r.end;view=area.end;
    }
    return {kind:'offset',offset:src+offset-view};
  }
  project(start=0,end=this.#length,{maxSourceUnits=65536}={}){
    this.#current();
    if(!_index(start)||!_index(end)||start>end||end>this.#length||
      !_index(maxSourceUnits)||!maxSourceUnits)
      throw new RangeError('projection bounds');
    for(const r of this.#replacements)
      if((r.start<start&&start<r.end)||(r.start<end&&end<r.end))
        throw new RangeError('window cuts representation replacement');
    if(!_boundary(this.#source,start)||!_boundary(this.#source,end))
      throw new RangeError('projection window splits a grapheme');
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
      segments.push({kind:'replacement',source:{start:r.start,end:r.end},text:r.text});
      cursor=r.end;
    }
    textPart(cursor,end,this.#source);
    const annotations=this.#annotations.filter(a=>a.at>=start&&a.at<=end)
      .map(a=>({...a,position:this.sourceToView(a.at)}));
    this.#current(); // custom source adapters must not produce stale snapshots
    return {source:{start,end},segments,annotations,readUnits};
  }
  dispose(){
    if(this.#disposed)return;
    this.#disposed=true;
    this.#unsubscribe();
    this.#replacements=[];
    this.#annotations=[];
    this.#unresolved=[];
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
      const crosses=this.#representation.replacements.some(r=>
        item.start===item.end?
          item.start>r.start&&item.start<r.end:
          item.start<r.end&&item.end>r.start);
      if(crosses||start.kind!=='offset'||end.kind!=='offset')
        throw new RangeError('rectangle intersects representation replacement');
    }
    return this.#selections.setSelections(out.targets.map(r=>({
      start:r.start,end:r.end,forward:true
    })));
  }
}
class TextEdit {
  constructor(value='',{document,selections}={}){
    this.document=document??new PieceDocument(value);
    this.selections=selections??new TextEditSelections(this.document);
    if(typeof this.selections.setSelections!=='function'||
       typeof this.selections.getSelections!=='function'||
       typeof this.selections.replace!=='function')
      throw new TypeError('selection-compatible editor required');
    this.representation=new TextEditRepresentation(this.document);
    this.advancedSelections=new TextEditAdvancedSelections(
      this.document,this.selections,this.representation);
  }
  replace(textOrTexts){
    const result=this.selections.replace(textOrTexts);
    return {...result,representation:{unresolved:this.representation.unresolved}};
  }
}
const publicAPI=Object.freeze({
  VERSION:'0.4.0',
  TextEdit,PieceDocument,FlatDocument,TextEditSelections,
  TextEditRepresentation,TextEditAdvancedSelections
});
if(typeof module==='object'&&module.exports)module.exports=publicAPI;
if(global)global.TextEdit=publicAPI;

})(typeof globalThis==='object'?globalThis:this);
