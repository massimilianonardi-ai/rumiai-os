// TextEdit 0.8.2 FlatDocument source, isolated for review.
// TextEdit v0.8.2 in lib/sys/js/text-edit.lib.js remains untouched.

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
