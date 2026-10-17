// Unmodified TextEdit 0.8.2 document semantics, extracted for review.
// Shared private machinery for m.text.document.FlatDocument / PieceDocument.
// TextEditBase is a structural interface, not an instantiable class.

function _check(doc,start,end) {
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
     start<0||end<start||end>doc.length)throw new RangeError('invalid text range');
}
function _checkLine(doc,line) {
  if(!Number.isSafeInteger(line)||line<0||line>=doc.lineCount)
    throw new RangeError('invalid logical line');
}
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
