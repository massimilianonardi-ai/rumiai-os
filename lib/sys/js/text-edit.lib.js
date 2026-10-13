/* TextEdit v0.8.0 — standalone GUI-independent library; no external dependencies. */
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
function _physicalPoint(value){
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new TypeError('physical selection point');
  const {row,col}=value;
  if(!Number.isSafeInteger(row)||row<0||
     !Number.isSafeInteger(col)||col<0)
    throw new RangeError('invalid physical row/column');
  return {row,col};
}
function _physicalCompare(a,b){return a.row-b.row||a.col-b.col;}
function _physicalCopy(values){
  if(!Array.isArray(values))throw new TypeError('selection array');
  return values.map(v=>{
    if(!v||typeof v!=='object'||typeof v.forward!=='boolean')
      throw new TypeError('physical selection record');
    const start=_physicalPoint(v.start),end=_physicalPoint(v.end);
    if(_physicalCompare(start,end)>0)throw new RangeError('inverted physical range');
    return {start,end,forward:v.forward};
  });
}
function _physicalAt(doc,offset){
  const row=doc.lineAt(offset),info=doc.lineInfo(row);
  if(offset>info.end)
    throw new RangeError('source offset is inside a line terminator');
  return {row,col:offset-info.start};
}
function _physicalAfterEdit(doc,offset){
  const row=doc.lineAt(offset),info=doc.lineInfo(row);
  // Writing CR before an existing LF creates a CRLF. A cursor immediately
  // after the inserted CR is inside that terminator, so attach it to the
  // start of the following source row rather than publishing an invalid
  // physical column.
  if(offset>info.end&&offset<info.nextStart&&row+1<doc.lineCount)
    return {row:row+1,col:0};
  return _physicalAt(doc,offset);
}
function _physicalAdvance(point,text){
  let row=point.row,col=point.col;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='\r'){row++;col=0;if(text[i+1]==='\n')i++;}
    else if(ch==='\n'){row++;col=0;}
    else col++;
  }
  return {row,col};
}

// Normalize before planning: incomplete arrays mean deletion at missing slots.
function _selectionText(value){
  if(value==null)return '';
  if(typeof value==='string')return value;
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  throw new TypeError('replacement value must be text, number, boolean or nullish');
}
class TextEditSelections {
  #source;
  #physical=[];
  #anchors=[];
  #checkpoint;
  #unsubscribe;
  #pending=null;
  #disposed=false;
  constructor(document){
    if(!document||!_selectionValid(document.length)||
       !_selectionValid(document.revision)||
       !_selectionValid(document.lineCount)||document.lineCount<1||
       typeof document.lineInfo!=='function'||typeof document.lineAt!=='function'||
       typeof document.replace!=='function'||typeof document.subscribe!=='function')
      throw new TypeError('TextEditBase document with source rows required');
    this.#source=document;
    this.#checkpoint=document.revision;
    this.#unsubscribe=document.subscribe((...args)=>this.#committed(args));
  }
  #alive(){
    if(this.#disposed)throw new Error('TextEditSelections disposed');
  }
  #anchor(p){
    const d=this.#source;
    if(p.row>=d.lineCount)
      return {kind:'future',beyond:p.row-(d.lineCount-1),col:p.col,oldEOF:d.length};
    const info=d.lineInfo(p.row),width=info.end-info.start;
    if(p.col<=width)return {kind:'real',offset:info.start+p.col};
    return {kind:'column',lineStart:info.start,lineEnd:info.end,
      col:p.col,width};
  }
  #capture(values){
    return values.map(s=>({start:this.#anchor(s.start),end:this.#anchor(s.end)}));
  }
  #rebaseAnchor(a,ordered,changes,right=true){
    const d=this.#source;
    if(a.kind==='real'){
      const at=_selectionMap(a.offset,right,ordered);
      return _physicalAt(d,at);
    }
    if(a.kind==='future'){
      if(changes.some(e=>e.start<=a.oldEOF&&e.end>=a.oldEOF))
        throw new RangeError('external edit touches virtual EOF anchor');
      const row=d.lineCount-1+a.beyond;
      if(!Number.isSafeInteger(row))throw new RangeError('unsafe future row');
      return {row,col:a.col};
    }
    // Track the original line's end boundary through source changes.
    // This keeps virtual displacement after text inserted into that line.
    const at=_selectionMap(a.lineEnd,true,ordered);
    const row=d.lineAt(at),info=d.lineInfo(row);
    if(at!==info.end)
      throw new RangeError('virtual column source anchor is no longer EOL');
    return {row,col:info.end-info.start+(a.col-a.width)};
  }
  #committed(args){
    if(this.#disposed)return;
    const revision=this.#source.revision;
    try{
      if(revision!==this.#checkpoint+1){this.#physical=[];this.#anchors=[];}
      else if(this.#pending!==null){
        const prior=this.#physical;
        this.#physical=this.#pending.map((x,i)=>x.noChange?
          prior[i]:{
            start:_physicalAfterEdit(this.#source,x.offset),
            end:_physicalAfterEdit(this.#source,x.offset),
            forward:x.forward
          });
        this.#anchors=this.#capture(this.#physical);
      }else {
        const changes=args.length===1?args[0]:
          [{start:args[0],end:args[1],text:args[2]}];
        const ordered=_selectionOrder(changes);
        const next=this.#physical.map((s,i)=>{
          const a=this.#anchors[i],start=this.#rebaseAnchor(a.start,ordered,changes);
          const end=this.#rebaseAnchor(a.end,ordered,changes,
            _physicalCompare(s.start,s.end)===0);
          return _physicalCompare(start,end)>0?
            {start,end:start,forward:s.forward}:{start,end,forward:s.forward};
        });
        this.#physical=next;this.#anchors=this.#capture(next);
      }
    }catch(error){
      this.#physical=[];
      this.#anchors=[];
      try{if(typeof console!=='undefined'&&console.error)
        console.error('TextEditSelections physical rebase invalidated',error);}
      catch(_){}
    }finally{this.#checkpoint=revision;}
  }
  getSelections(){
    this.#alive();
    return _physicalCopy(this.#physical);
  }
  setSelections(values){
    this.#alive();
    const revision=this.#source.revision;
    const next=_physicalCopy(values),anchors=this.#capture(next);
    if(this.#source.revision!==revision)
      throw new Error('document changed while setting physical selections');
    this.#physical=next;this.#anchors=anchors;this.#checkpoint=revision;
    return this;
  }
  addSelections(values){
    this.#alive();
    const revision=this.#source.revision;
    const next=_physicalCopy(values);
    const joined=this.#physical.concat(next),anchors=this.#capture(joined);
    if(this.#source.revision!==revision)
      throw new Error('document changed while adding physical selections');
    this.#physical=joined;this.#anchors=anchors;this.#checkpoint=revision;
    return this;
  }
  #planPhysical(texts){
    const d=this.#source,values=this.#physical,edits=[],markers=[];
    const groups=new Map();
    const lastRow=d.lineCount-1,lastInfo=d.lineInfo(lastRow);
    const rowGroup=(at,baseRow,baseCol)=>{
      let g=groups.get(at);
      if(!g){g={at,baseRow,baseCol,items:[]};groups.set(at,g);}
      return g;
    };
    for(let i=0;i<values.length;i++){
      const s=values[i],text=texts[i],a=this.#anchor(s.start),b=this.#anchor(s.end);
      const begin=a.kind==='real'?a.offset:
        a.kind==='column'?a.lineEnd:d.length;
      const end=b.kind==='real'?b.offset:
        b.kind==='column'?b.lineEnd:d.length;
      if(a.kind!=='real'){
        if(s.start.row!==s.end.row&&a.kind!=='future')
          throw new RangeError('virtual replacement spanning existing rows is unresolved');
        if(!text.length){markers[i]={noChange:true};continue;}
        const g=a.kind==='column'?
          rowGroup(a.lineEnd,s.start.row,a.width):
          rowGroup(d.length,lastRow,lastInfo.end-lastInfo.start);
        g.items.push({row:s.start.row,col:s.start.col,text,index:i});
      }else{
        if(end<begin)throw new RangeError('invalid physical replacement');
        edits.push({start:begin,end,text,targets:[{index:i,relative:text.length}]});
      }
    }
    for(const g of groups.values()){
      // Existing EOL carets and virtual cursors must share a single source
      // insertion when they map to the same physical insertion position.
      for(let j=edits.length-1;j>=0;j--){
        const e=edits[j];
        if(e.start===g.at&&e.end===g.at){
          const i=e.targets[0].index,p=values[i].start;
          g.items.push({row:p.row,col:p.col,text:e.text,index:i});
          edits.splice(j,1);
        }
      }
      g.items.sort((a,b)=>a.row-b.row||a.col-b.col);
      let row=g.baseRow,col=g.baseCol,output='',previous=null;
      const targets=[];
      for(const item of g.items){
        if(previous&&previous.row===item.row&&previous.col===item.col)
          throw new RangeError('multiple insertions target one physical cell');
        if(item.row<row||(item.row===row&&item.col<col))
          throw new RangeError('virtual insertion payloads overlap');
        if(item.row>row){
          // A lone CR at old EOF must not fuse with the new first LF.
          const separator=g.at===d.length&&d.length&&
            d.slice(d.length-1,d.length)==='\r'?'\r':'\n';
          output+=separator.repeat(item.row-row);row=item.row;col=0;
        }
        if(item.col>col){output+=' '.repeat(item.col-col);col=item.col;}
        output+=item.text;
        ({row,col}=_physicalAdvance({row,col},item.text));
        targets.push({index:item.index,relative:output.length});
        previous=item;
      }
      edits.push({start:g.at,end:g.at,text:output,targets});
    }
    if(!edits.length)return {edits:[],after:markers};
    // All final physical edits refer to one pre-edit revision. Existing
    // planner enforces the base collision and final-length invariants.
    _selectionPlan(edits.map(e=>({start:e.start,end:e.end,forward:true})),
      edits.map(e=>e.text),d.length);
    const ordered=_selectionOrder(edits);
    for(const e of ordered)
      for(const target of e.targets)
        markers[target.index]={offset:e.start+e.before+target.relative,
          forward:values[target.index].forward};
    return {edits:edits.map(({start,end,text})=>({start,end,text})),after:markers};
  }
  replace(textOrTexts){
    this.#alive();
    const checkpoint=this.#source.revision,before=this.getSelections();
    if(!before.length)throw new RangeError('no selections');
    let texts;
    if(Array.isArray(textOrTexts)){
      if(textOrTexts.length>before.length)
        throw new TypeError('more replacement values than selections');
      texts=Array.from({length:before.length},(_,i)=>
        _selectionText(textOrTexts[i]));
    }else{
      const text=_selectionText(textOrTexts);
      texts=before.map(()=>text);
    }
    const {edits,after}=this.#planPhysical(texts);
    if(this.#source.revision!==checkpoint||this.#checkpoint!==checkpoint)
      throw new Error('document changed while planning physical edits');
    if(!edits.length)return {before,after:this.getSelections()};
    this.#pending=after;
    try{this.#source.replace(edits);}
    finally{this.#pending=null;}
    return {before,after:this.#disposed?[]:this.getSelections()};
  }
  dispose(){
    if(this.#disposed)return;
    this.#disposed=true;
    this.#unsubscribe();
    this.#physical=[];this.#anchors=[];this.#pending=null;
  }
}

// PoC 063: logical UTF-16 positions and visual-cell geometry are distinct.
// DOM independent. A caller supplies grapheme-cell widths; this module never
// assumes all fonts/locales have a single universal visual-width policy.
// Range geometry and column-paste *semantics* are different responsibilities.
const _graphemes = new Intl.Segmenter(undefined, {granularity:'grapheme'});
function _columnDefaultWidth(){return 1;}
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
  #geometry=[];
  #viewLength=0;
  #tabSize=4;
  #widthOf=_columnDefaultWidth;
  #selectionProvider;
  #unsubscribe;
  #disposed=false;

  constructor(source,selections=null){
    if(!source||!_index(source.length)||!_index(source.revision)||
      !_index(source.lineCount)||source.lineCount<1||
      typeof source.slice!=='function'||typeof source.lineStart!=='function'||
      typeof source.lineAt!=='function'||typeof source.lineInfo!=='function'||
      typeof source.subscribe!=='function')
      throw new TypeError('TextEditBase document required');
    if(selections!==null&&(!selections||
      typeof selections.setSelections!=='function'||
      typeof selections.addSelections!=='function'||
      typeof selections.getSelections!=='function'))
      throw new TypeError('physical selection provider required');
    this.#selectionProvider=selections;
    this.#source=source;
    this.#length=source.length;
    this.#revision=source.revision;
    this.#viewLength=this.#length;
    this.#unsubscribe=source.subscribe((...args)=>this.#committed(args));
    if(source.revision!==this.#revision)this.#invalidate(source.revision);
  }
  #index() {
    let delta=0;
    this.#geometry=this.#replacements.map(r=>{
      const viewStart=r.start+delta;
      const viewEnd=viewStart+r.text.length;
      delta+=r.text.length-(r.end-r.start);
      return {start:r.start,end:r.end,viewStart,viewEnd,deltaAfter:delta};
    });
    this.#viewLength=this.#length+delta;
  }
  #firstSourceStart(offset){
    let lo=0,hi=this.#geometry.length;
    while(lo<hi){const mid=Math.floor((lo+hi)/2);
      if(this.#geometry[mid].start<offset)lo=mid+1;else hi=mid;}
    return lo;
  }
  #firstViewStart(offset){
    let lo=0,hi=this.#geometry.length;
    while(lo<hi){const mid=Math.floor((lo+hi)/2);
      if(this.#geometry[mid].viewStart<offset)lo=mid+1;else hi=mid;}
    return lo;
  }
  #firstAnnotation(offset){
    let lo=0,hi=this.#annotations.length;
    while(lo<hi){const mid=Math.floor((lo+hi)/2);
      if(this.#annotations[mid].at<offset)lo=mid+1;else hi=mid;}
    return lo;
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
    this.#index();
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
      this.#index();
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
    const notes=items.map(input=>{
      if(!input||typeof input!=='object')
        throw new TypeError('annotation must be an object');
      // Snapshot once: caller-owned getters may mutate the document and
      // must not be read again while validating the same annotation.
      const a={...input};
      if(typeof a.id!=='string'||!a.id||
        typeof a.text!=='string'||!_index(a.at)||a.at>this.#length||
        (a.affinity!==undefined&&a.affinity!=='before'&&a.affinity!=='after'))
        throw new RangeError('invalid annotation');
      return a;
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
    this.#index();
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
    this.#index();
    return this;
  }
  clear(){
    this.#current();
    this.#replacements=[];
    this.#index();
    return this;
  }
  get length(){
    this.#current();
    return this.#viewLength;
  }
  sourceToView(offset){
    this.#current();
    if(!_index(offset)||offset>this.#length)throw new RangeError('source offset');
    const at=this.#firstSourceStart(offset),prev=this.#geometry[at-1];
    if(prev&&offset<prev.end)
      return {kind:'replaced-region',
        source:{start:prev.start,end:prev.end},
        view:{start:prev.viewStart,end:prev.viewEnd}};
    return {kind:'offset',offset:offset+(prev?prev.deltaAfter:0)};
  }
  viewToSource(offset){
    this.#current();
    if(!_index(offset)||offset>this.#viewLength)
      throw new RangeError('view offset');
    const at=this.#firstViewStart(offset),current=this.#geometry[at];
    if(current&&current.viewStart===offset){
      if(current.viewEnd===offset)
        return {kind:'replaced-region',
          source:{start:current.start,end:current.end},
          view:{start:current.viewStart,end:current.viewEnd}};
      return {kind:'offset',offset:current.start};
    }
    const prev=this.#geometry[at-1];
    if(prev&&offset<prev.viewEnd)
      return {kind:'replaced-region',
        source:{start:prev.start,end:prev.end},
        view:{start:prev.viewStart,end:prev.viewEnd}};
    return {kind:'offset',offset:offset-(prev?prev.deltaAfter:0)};
  }
  project(start=0,end=this.#length,{maxSourceUnits=65536}={}){
    this.#current();
    if(!_index(start)||!_index(end)||start>end||end>this.#length||
      !_index(maxSourceUnits)||!maxSourceUnits)
      throw new RangeError('projection bounds');
    const first=this.#firstSourceStart(start);
    if(first>0&&this.#geometry[first-1].end>start)
      throw new RangeError('window cuts representation replacement');
    let unmodifiedUnits=end-start,last=first;
    while(last<this.#geometry.length&&this.#geometry[last].start<end){
      const r=this.#geometry[last];
      if(r.end>end)throw new RangeError('window cuts representation replacement');
      unmodifiedUnits-=r.end-r.start;
      last++;
    }
    // Check the window budget before Unicode boundary validation: rejecting
    // a too-large source window must never require extracting that window.
    if(unmodifiedUnits>maxSourceUnits)
      throw new RangeError('projection source budget');
    if(!_boundary(this.#source,start)||!_boundary(this.#source,end))
      throw new RangeError('projection window splits a grapheme');
    const segments=[];
    let cursor=start,readUnits=0;
    function textPart(a,b,doc){
      if(a===b)return;
      readUnits+=b-a;
      const value=doc.slice(a,b);
      const boundaries=[..._graphemes.segment(value)].map(g=>a+g.index);
      boundaries.push(b);
      segments.push({kind:'text',source:{start:a,end:b},
        text:value,graphemeBoundaries:boundaries});
    }
    for(let i=first;i<last;i++){
      const r=this.#replacements[i];
      textPart(cursor,r.start,this.#source);
      segments.push({kind:'replacement',
        source:{start:r.start,end:r.end},text:r.text});
      cursor=r.end;
    }
    textPart(cursor,end,this.#source);
    const annotations=[];
    for(let i=this.#firstAnnotation(start);i<this.#annotations.length;i++){
      const a=this.#annotations[i];
      if(a.at>end)break;
      annotations.push({...a,position:this.sourceToView(a.at)});
    }
    this.#current();
    return {source:{start,end},segments,annotations,readUnits};
  }
  setColumnMetrics(options={}) {
    this.#current();
    if(!options||typeof options!=='object'||Array.isArray(options))
      throw new TypeError('column metrics must be an object');
    const revision=this.#source.revision;
    const {tabSize=4,widthOf=_columnDefaultWidth}=options;
    if(!Number.isSafeInteger(tabSize)||tabSize<1)
      throw new RangeError('invalid tabSize');
    if(typeof widthOf!=='function')throw new TypeError('widthOf must be a function');
    if(this.#source.revision!==revision)
      throw new Error('document changed while setting column metrics');
    this.#tabSize=tabSize;this.#widthOf=widthOf;
    return this;
  }
  // Retain the trailing grapheme across source chunks, protecting surrogate
  // pairs, combining sequences and emoji ZWJ clusters without whole-line reads.
  #scanLine(row,visitor){
    if(!Number.isSafeInteger(row)||row<0||row>=this.#source.lineCount)
      throw new RangeError('invalid logical row');
    const revision=this.#source.revision;
    const {start,end}=this.#source.lineInfo(row);
    let next=start,col=0,carry='',base=start;
    while(next<end||carry.length){
      const until=Math.min(end,next+2048),text=carry+this.#source.slice(next,until);
      const fromBase=base;
      next=until;
      const final=next===end,parts=[..._graphemes.segment(text)];
      const count=final?parts.length:Math.max(0,parts.length-1);
      for(let i=0;i<count;i++){
        const part=parts[i],from=fromBase+part.index,to=from+part.segment.length;
        const width=part.segment==='\t'?this.#tabSize-col%this.#tabSize:
          this.#widthOf(part.segment,col,row);
        if(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(col+width))
          throw new RangeError('invalid grapheme width');
        const cell={start:from,end:to,text:part.segment,columnStart:col,columnEnd:col+width};
        col+=width;
        if(visitor(cell)===false){
          if(this.#source.revision!==revision)
            throw new Error('document changed while measuring columns');
          return {end,columns:col,stopped:true};
        }
      }
      const tail=parts[count];
      carry=tail?text.slice(tail.index):'';
      base=tail?fromBase+tail.index:until;
      if(final)break;
    }
    if(this.#source.revision!==revision)
      throw new Error('document changed while measuring columns');
    return {end,columns:col,stopped:false};
  }
  columnToSource(row,col){
    this.#current();
    if(!Number.isSafeInteger(col)||col<0)throw new RangeError('invalid column');
    let result=null;
    const info=this.#scanLine(row,cell=>{
      if(col===cell.columnStart){
        result={kind:'offset',offset:cell.start};return false;
      }
      if(col<cell.columnEnd){
        result={kind:'inside-grapheme',cell,before:cell.start,after:cell.end};
        return false;
      }
    });
    if(result)return result;
    return col===info.columns?{kind:'offset',offset:info.end}:
      {kind:'virtual',offset:info.end,virtualSpaces:col-info.columns};
  }
  sourceToColumn(offset){
    this.#current();
    if(!Number.isSafeInteger(offset)||offset<0||offset>this.#source.length)
      throw new RangeError('invalid offset');
    const row=this.#source.lineAt(offset),info=this.#source.lineInfo(row);
    if(offset>info.end)throw new RangeError('offset is inside a line separator');
    let result=null;
    const value=this.#scanLine(row,cell=>{
      if(offset===cell.start){
        result={kind:'column',row,col:cell.columnStart};return false;
      }
      if(offset<cell.end){
        result={kind:'inside-grapheme',row,cell,before:cell.start,after:cell.end};
        return false;
      }
    });
    return result||{kind:'column',row,col:value.columns};
  }
  // Source-grid widths are logical cells, not UTF-16 code units.
  logicalRowWidth(row){
    this.#current();
    if(!_index(row))throw new RangeError('invalid logical row');
    return row<this.#source.lineCount?this.#scanLine(row,()=>{}).columns:0;
  }
  get rowCount(){this.#current();return this.#source.lineCount;}
  #physicalPoint(point){
    if(!point||!_index(point.row)||!_index(point.col))
      throw new RangeError('invalid logical selection point');
    const {row,col}=point;
    if(row>=this.#source.lineCount)return {row,col};
    const match=this.columnToSource(row,col),info=this.#source.lineInfo(row);
    if(match.kind==='inside-grapheme')
      throw new RangeError('selection intersects an indivisible grapheme or tab');
    if(match.kind==='virtual')
      return {row,col:info.end-info.start+match.virtualSpaces};
    if(this.sourceToView(match.offset).kind!=='offset')
      throw new RangeError('logical selection boundary intersects an overlay');
    return {row,col:match.offset-info.start};
  }
  #logicalPoint(point){
    if(point.row>=this.#source.lineCount)return {...point};
    const info=this.#source.lineInfo(point.row),width=info.end-info.start;
    if(point.col>width)return {
      row:point.row,col:this.logicalRowWidth(point.row)+point.col-width
    };
    const resolved=this.sourceToColumn(info.start+point.col);
    if(resolved.kind!=='column')
      throw new RangeError('physical selection splits a grapheme');
    return {row:resolved.row,col:resolved.col};
  }
  #selectionBatch(values){
    this.#current();
    if(!Array.isArray(values))throw new TypeError('logical selection array');
    const revision=this.#source.revision;
    const physical=values.map(s=>{
      if(!s||typeof s.forward!=='boolean')
        throw new TypeError('logical selection record');
      const start=this.#physicalPoint(s.start),end=this.#physicalPoint(s.end);
      if(_physicalCompare(start,end)>0)
        throw new RangeError('inverted logical selection');
      const oldStart=start.row<this.#source.lineCount?
        Math.min(this.#source.lineInfo(start.row).start+start.col,
          this.#source.lineInfo(start.row).end):this.#source.length;
      const oldEnd=end.row<this.#source.lineCount?
        Math.min(this.#source.lineInfo(end.row).start+end.col,
          this.#source.lineInfo(end.row).end):this.#source.length;
      if(oldStart<oldEnd&&_advancedOverlayIntersects(this.#replacements,oldStart,oldEnd))
        throw new RangeError('selection crosses a representation overlay');
      return {start,end,forward:s.forward};
    });
    if(revision!==this.#source.revision)
      throw new Error('document changed while translating logical selections');
    return physical;
  }
  setSelections(values){
    this.#current();
    if(!this.#selectionProvider)throw new Error('representation has no selection provider');
    return this.#selectionProvider.setSelections(this.#selectionBatch(values));
  }
  addSelections(values){
    this.#current();
    if(!this.#selectionProvider)throw new Error('representation has no selection provider');
    return this.#selectionProvider.addSelections(this.#selectionBatch(values));
  }
  getSelections(){
    this.#current();
    if(!this.#selectionProvider)throw new Error('representation has no selection provider');
    return this.#selectionProvider.getSelections().map(s=>{
      return {start:this.#logicalPoint(s.start),
        end:this.#logicalPoint(s.end),forward:s.forward};
    });
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

function _advancedPoint(input){
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw new TypeError('row/column endpoint must be an object');
  const {row,col}=input;
  if(!Number.isSafeInteger(row)||row<0||
     !Number.isSafeInteger(col)||col<0)
    throw new RangeError('invalid row/column endpoint');
  return {row,col};
}
// Substitution intervals are source-sorted and non-overlapping. Find the
// last overlay starting before the rectangle's right edge in O(log N).
function _advancedOverlayIntersects(overlays,start,end){
  const edge=start===end?start:end;
  let lo=0,hi=overlays.length;
  while(lo<hi){
    const mid=Math.floor((lo+hi)/2);
    if(overlays[mid].start<edge)lo=mid+1;else hi=mid;
  }
  const previous=overlays[lo-1];
  return !!previous && previous.end>start;
}
class TextEditAdvancedSelections {
  #representation;
  #policy='virtual';
  constructor(representation,{policy='virtual'}={}){
    if(!representation||typeof representation.logicalRowWidth!=='function'||
       typeof representation.setSelections!=='function')
      throw new TypeError('logical selection representation required');
    this.#representation=representation;
    this.setPolicy(policy);
  }
  get policy(){return this.#policy;}
  setPolicy(value){
    if(value!=='virtual'&&value!=='clipped')
      throw new RangeError('selection policy must be virtual or clipped');
    this.#policy=value;
    return this;
  }
  #range(start,end,forward){return {start,end,forward};}
  lineSelection(start,end){
    const a=_advancedPoint(start),b=_advancedPoint(end);
    const first=Math.min(a.row,b.row),last=Math.max(a.row,b.row);
    const count=this.#representation.rowCount;
    if(this.#policy==='clipped'&&first>=count)
      return this.#representation.setSelections([]);
    const bounded=this.#policy==='clipped'?Math.min(last,count-1):last;
    const finish=bounded+1<count||bounded>=count?
      {row:bounded+1,col:0}:
      {row:bounded,col:this.#representation.logicalRowWidth(bounded)};
    const forward=a.row===b.row?a.col<=b.col:a.row<b.row;
    return this.#representation.setSelections([
      this.#range({row:first,col:0},finish,forward)
    ]);
  }
  resolveRectangles(start,end){
    const a=_advancedPoint(start),b=_advancedPoint(end);
    const left=Math.min(a.col,b.col),right=Math.max(a.col,b.col);
    if(right===Number.MAX_SAFE_INTEGER)
      throw new RangeError('inclusive end column is not representable');
    const direction=a.row<=b.row?1:-1,targets=[];
    for(let row=a.row;direction>0?row<=b.row:row>=b.row;row+=direction){
      if(this.#policy==='clipped'&&row>=this.#representation.rowCount)continue;
      const width=this.#policy==='clipped'?
        this.#representation.logicalRowWidth(row):null;
      if(width!==null&&left>=width)continue;
      const limit=width===null?right+1:Math.min(right+1,width);
      targets.push(this.#range(
        {row,col:left},{row,col:limit},a.col<=b.col
      ));
      if(row===b.row)break;
    }
    return {targets,requestedRows:Math.abs(a.row-b.row)+1,unresolved:[]};
  }
  rectangularSelection(start,end){
    const result=this.resolveRectangles(start,end);
    return this.#representation.setSelections(result.targets);
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
    this.representation=new TextEditRepresentation(this.document,this.selections);
    this.advancedSelections=new TextEditAdvancedSelections(this.representation);
  }
  replace(textOrTexts){
    const result=this.selections.replace(textOrTexts);
    return {...result,representation:{unresolved:this.representation.unresolved}};
  }
}
const publicAPI=Object.freeze({
  VERSION:'0.8.0',
  TextEdit,PieceDocument,FlatDocument,TextEditSelections,
  TextEditRepresentation,TextEditAdvancedSelections
});
if(typeof module==='object'&&module.exports)module.exports=publicAPI;
if(global)global.TextEdit=publicAPI;

})(typeof globalThis==='object'?globalThis:this);
