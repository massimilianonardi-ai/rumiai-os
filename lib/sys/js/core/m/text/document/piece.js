// TextEdit 0.8.2 PieceDocument source, isolated for review.
// Treap functions are private implementation details of this class.
// TextEdit v0.8.2 in lib/sys/js/text-edit.lib.js remains untouched.

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
    return {nodes,maxDepth,sources:sources.size};
  }
}
