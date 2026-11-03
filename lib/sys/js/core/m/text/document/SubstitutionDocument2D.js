// Read-only inline substitutions in the exposed space of any Document2D.
// Multiple disjoint input intervals on one or more rows become occupied,
// synthetic regions. Hidden source text is never selected or modified.
// Effective selections remain in the input's single selection owner.

class SubstitutionDocument2D extends Document2D
{
  #input;
  #inputRevision;
  #revision = 0;
  #segmenter;
  #substitutions = [];
  #byRow = new Map();
  #selectionMode = 'line';
  #modes;
  #listeners = new Set();
  #unsubscribe;
  #unsubscribePreparing = null;
  #preparedGeometry = null;
  #maxColsRevision = null;
  #maxCols = 0;

  constructor(input)
  {
    super();

    if(!(input instanceof Document2D))
    {
      throw new TypeError('Document2D input required');
    }

    if(typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function')
    {
      throw new Error('Intl.Segmenter is required for substitutions');
    }

    this.#input = input;
    this.#inputRevision = input.revision;
    this.#segmenter = new Intl.Segmenter(undefined,{granularity:'grapheme'});

    // The raw input's existing private hook can prove old nonzero cuts
    // while both source text and the old occupied region map still exist.
    if(typeof input._subscribeBeforeGeometry === 'function')
    {
      this.#unsubscribePreparing = input._subscribeBeforeGeometry
      (
        captured =>
        {
          this.#preparedGeometry = null;

          if
          (
            this.#input === null ||
            !captured ||
            this.#inputRevision !== captured.previousRevision ||
            input.revision !== captured.previousRevision
          )
          {
            return;
          }

          try
          {
            if(captured.oldRowCount !== input.rowCount)
            {
              return;
            }

            const edits = captured.edits.map
            (
              edit =>
              {
                const start = this.#point(edit.old.start);
                const end = this.#point(edit.old.end);
                this.#checkSpan(start,end);

                const project = point =>
                {
                  if
                  (
                    point.row >= input.rowCount ||
                    point.col > input.getRowWidth(point.row) ||
                    this.#sharedBoundary(point)
                  )
                  {
                    throw new RangeError('unverified old substitution cut');
                  }

                  return this.#fromInput(point);
                };

                return {
                  raw:
                  {
                    start:{...edit.old.start},
                    end:{...edit.old.end}
                  },
                  old:
                  {
                    start:project(start),
                    end:project(end)
                  }
                };
              }
            );

            this.#preparedGeometry =
            {
              inputRevision:this.#inputRevision,
              viewRevision:this.#revision,
              oldRowCount:captured.oldRowCount,
              edits
            };
          }
          catch(_)
          {
            // Hidden/ambiguous cuts and CRLF interiors have no old map.
          }
        }
      );
    }

    const owner =
    {
      getSelections: () => this.getSelections(),
      setSelections: selections => this.setSelections(selections)
    };

    this.#modes =
    {
      line:new LineSelections(owner),
      rectangle:new RectangleSelections(owner),
      'free-form':new FreeFormSelections(owner)
    };

    this.#unsubscribe = input.subscribe
    (
      event =>
      {
        if(this.#input === null)
        {
          return;
        }

        if(input.revision !== this.#inputRevision)
        {
          // Capture old coordinates while the original substitution map
          // still exists. New coordinates belong to the cleared view.
          const prepared = this.#preparedGeometry;
          this.#preparedGeometry = null;
          const geometry=this.#projectGeometry
          (
            event.geometry,input,prepared
          );

          this.#inputRevision = input.revision;
          this.#substitutions = [];
          this.#byRow.clear();
          this.#advance();
          this.#notify
          (
            'content',
            {
              invalidation:{all:true},
              ...(geometry ? {geometry} : {})
            }
          );
        }
        else
        {
          this.#notify(event.type);
        }
      }
    );

    if(input.revision !== this.#inputRevision)
    {
      this.destroy();
      throw new Error('input Document2D changed during construction');
    }
  }

  #active()
  {
    if(this.#input === null)
    {
      throw new Error('SubstitutionDocument2D is destroyed');
    }

    if(this.#input.revision !== this.#inputRevision)
    {
      throw new Error('input Document2D revision is stale');
    }

    return this.#input;
  }

  #advance()
  {
    if(this.#revision === Number.MAX_SAFE_INTEGER)
    {
      throw new RangeError('Document2D substitution revision exhausted');
    }

    this.#revision++;
    this.#maxColsRevision = null;
  }

  #notify(type,extra=null)
  {
    const event={type,revision:this.#revision,...extra};

    for(const listener of Array.from(this.#listeners))
    {
      listener(event);
    }
  }

  // A cut on two adjacent synthetic interval boundaries has distinct
  // exposed positions and cannot be selected by scanning order.
  #sharedBoundary(point)
  {
    let count=0;

    for(const item of this.#byRow.get(point.row)||[])
    {
      if(item.start.col===point.col)
      {
        count++;
      }

      if(item.end.col===point.col)
      {
        count++;
      }

      if(count>1)
      {
        return true;
      }
    }

    return false;
  }

  // Prefer a precommit raw snapshot for arbitrary real old caret cuts.
  // Without that evidence, only recorded, unique old boundaries and
  // physical row starts are provable after the source has changed.
  #projectGeometry(change,input,prepared)
  {
    try
    {
      if
      (
        !change ||
        change.previousRevision!==this.#inputRevision ||
        change.revision!==input.revision ||
        this.#inputRevision===Number.MAX_SAFE_INTEGER ||
        input.revision!==this.#inputRevision+1 ||
        this.#revision===Number.MAX_SAFE_INTEGER ||
        !Number.isSafeInteger(change.oldRowCount) ||
        !Number.isSafeInteger(change.newRowCount) ||
        change.oldRowCount<1 || change.newRowCount<1 ||
        change.newRowCount!==input.rowCount ||
        !Array.isArray(change.edits) || change.edits.length===0
      )
      {
        return null;
      }

      const captured =
        prepared &&
        prepared.inputRevision===this.#inputRevision &&
        prepared.viewRevision===this.#revision &&
        prepared.oldRowCount===change.oldRowCount &&
        prepared.edits.length===change.edits.length ?
          prepared : null;

      const oldPoint=(value,index,side)=>
      {
        const point=this.#point(value);

        if(point.row>=change.oldRowCount)
        {
          throw new RangeError('old substitution row outside source');
        }

        if(captured)
        {
          const prior=captured.edits[index];
          const raw=prior.raw[side];

          // Raw input checks original offsets here; Cell input exposes
          // cell points only and authenticates the source offsets below.
          if
          (
            raw.row!==point.row ||
            raw.col!==point.col ||
            ('offset' in raw)!==('offset' in value) ||
            raw.offset!==value.offset
          )
          {
            throw new RangeError('pre/post substitution cuts do not match');
          }

          return Object.freeze({...prior.old[side]});
        }

        if(point.col!==0)
        {
          const group=this.#byRow.get(point.row)||[];
          let matches=0;

          for(const item of group)
          {
            if(item.start.col===point.col)
            {
              matches++;
            }

            if(item.end.col===point.col)
            {
              matches++;
            }
          }

          if(matches!==1)
          {
            throw new RangeError('unverified old substitution boundary');
          }
        }

        return Object.freeze(this.#fromInput(point));
      };

      const newPoint=value=>
      {
        const point=this.#point(value);

        if
        (
          point.row>=change.newRowCount ||
          point.col>input.getRowWidth(point.row)
        )
        {
          throw new RangeError('invalid committed substitution boundary');
        }

        return Object.freeze(point);
      };

      const edits=change.edits.map
      (
        (edit,index)=>
        {
          const start=this.#point(edit.old.start);
          const end=this.#point(edit.old.end);
          const nextStart=this.#point(edit.new.start);
          const nextEnd=this.#point(edit.new.end);

          if
          (
            this.#compare(start,end)>0 ||
            this.#compare(nextStart,nextEnd)>0
          )
          {
            throw new RangeError('unordered substitution edit span');
          }

          // This is the OLD source space, not a copied-label destination.
          this.#checkSpan(start,end);

          return Object.freeze
          (
            {
              old:Object.freeze
              (
                {
                  start:oldPoint(edit.old.start,index,'start'),
                  end:oldPoint(edit.old.end,index,'end')
                }
              ),
              new:Object.freeze
              (
                {
                  start:newPoint(nextStart),
                  end:newPoint(nextEnd)
                }
              )
            }
          );
        }
      );

      return Object.freeze
      (
        {
          previousRevision:this.#revision,
          revision:this.#revision+1,
          oldRowCount:change.oldRowCount,
          newRowCount:change.newRowCount,
          edits:Object.freeze(edits)
        }
      );
    }
    catch(_)
    {
      // A completed source edit cannot fail because projection is unsafe.
      return null;
    }
  }

  #point(value)
  {
    if
    (
      !value || typeof value !== 'object' || Array.isArray(value) ||
      !Number.isSafeInteger(value.row) || value.row < 0 ||
      !Number.isSafeInteger(value.col) || value.col < 0
    )
    {
      throw new RangeError('invalid substitution position');
    }

    return {row:value.row,col:value.col};
  }

  #compare(a,b)
  {
    return a.row - b.row || a.col - b.col;
  }

  // Verify that a substitution never cuts through an indivisible input
  // region or conceals already protected/synthetic input content.
  #checkInputSpan(input,row,start,end)
  {
    for(let left=start;left<end;)
    {
      const right=Math.min(end,left+2048);
      const regions=input.getRegions(row,left,row+1,right)[0];

      if(!Array.isArray(regions) || !regions.length)
      {
        throw new Error('input Document2D has a region gap');
      }

      let covered=left;

      for(const region of regions)
      {
        if(region.kind === 'annotation')
        {
          continue;
        }

        if
        (
          region.kind !== 'text' ||
          region.start.row !== row || region.end.row !== row ||
          region.start.col !== covered ||
          region.end.col <= covered ||
          region.end.col > end
        )
        {
          throw new RangeError('substitution crosses an indivisible input region');
        }

        covered=region.end.col;
      }

      if(covered<right)
      {
        throw new Error('input Document2D has a region gap');
      }

      left=covered;
    }
  }

  get revision()
  {
    this.#active();
    return this.#revision;
  }

  get rowCount()
  {
    return this.#active().rowCount;
  }

  get substitutions()
  {
    this.#active();

    return this.#substitutions.map
    (
      item =>
      {
        const record =
        {
          id:item.id,
          start:{...item.start},
          end:{...item.end}
        };

        if(item.sources===null)
        {
          record.text=item.text;
        }
        else
        {
          record.sources=item.sources.map
          (
            part=>({start:{...part.start},end:{...part.end}})
          );
        }

        return record;
      }
    );
  }

  setSubstitutions(values)
  {
    const input=this.#active();
    const inputRevision=input.revision;

    if(!Array.isArray(values))
    {
      throw new TypeError('substitution array required');
    }

    const ids=new Set();
    const prepared=values.map
    (
      value =>
      {
        if(!value || typeof value !== 'object' || Array.isArray(value))
        {
          throw new TypeError('invalid substitution record');
        }

        const id=value.id;
        const start=this.#point(value.start);
        const end=this.#point(value.end);
        const hasText=Object.hasOwn(value,'text');
        const hasSources=Object.hasOwn(value,'sources');

        if
        (
          typeof id !== 'string' || !id.length ||
          ids.has(id) || hasText===hasSources
        )
        {
          throw new RangeError('invalid or duplicate substitution');
        }

        if
        (
          start.row !== end.row ||
          start.row >= input.rowCount ||
          start.col >= end.col ||
          end.col > input.getRowWidth(start.row)
        )
        {
          throw new RangeError('invalid substitution input interval');
        }

        // A derived label is assembled once at the captured input revision.
        // Its source relation is retained privately and is invalidated on
        // any upstream change; a view user cannot edit through the copies.
        let text=hasText ? value.text : null;
        let sources=null;

        if(hasSources)
        {
          // Read caller-provided source lists once; getters can be stateful.
          const sourceValues=value.sources;

          if(!Array.isArray(sourceValues) || sourceValues.length===0)
          {
            throw new RangeError('nonempty substitution sources required');
          }

          sources=sourceValues.map
          (
            part =>
            {
              if(!part || typeof part!=='object' || Array.isArray(part))
              {
                throw new TypeError('invalid substitution source part');
              }

              const partStart=this.#point(part.start);
              const partEnd=this.#point(part.end);

              if
              (
                partStart.row!==partEnd.row ||
                partStart.row>=input.rowCount ||
                partStart.col>=partEnd.col ||
                partEnd.col>input.getRowWidth(partStart.row)
              )
              {
                throw new RangeError('invalid substitution source interval');
              }

              this.#checkInputSpan
              (
                input,partStart.row,partStart.col,partEnd.col
              );

              return {start:partStart,end:partEnd};
            }
          );

          text=sources.map
          (
            part=>input.getRect
            (
              part.start.row,part.start.col,
              part.end.row+1,part.end.col
            )[0]
          ).join('');
        }

        if
        (
          typeof text!=='string' || !text.length ||
          /[\r\n\t]/u.test(text)
        )
        {
          throw new RangeError('invalid substitution display text');
        }

        const cells=Array.from(this.#segmenter.segment(text),x=>x.segment);
        const width=cells.length;

        if(!Number.isSafeInteger(width) || width===0)
        {
          throw new RangeError('invalid substitution display width');
        }

        ids.add(id);
        return {id,text,sources,start,end,cells,width};
      }
    );

    prepared.sort
    (
      (a,b) => this.#compare(a.start,b.start) ||
        this.#compare(a.end,b.end)
    );

    const byRow=new Map();
    let prior=null;

    for(const item of prepared)
    {
      if
      (
        prior && prior.start.row===item.start.row &&
        item.start.col<prior.end.col
      )
      {
        throw new RangeError('overlapping substitution intervals');
      }

      this.#checkInputSpan
      (
        input,item.start.row,item.start.col,item.end.col
      );

      let group=byRow.get(item.start.row);

      if(!group)
      {
        group=[];
        byRow.set(item.start.row,group);
      }

      const delta=group.length ? group[group.length-1].deltaAfter : 0;
      item.viewStart=item.start.col+delta;
      item.viewEnd=item.viewStart+item.width;
      item.deltaAfter=delta+item.width-(item.end.col-item.start.col);

      if
      (
        !Number.isSafeInteger(item.viewStart) ||
        !Number.isSafeInteger(item.viewEnd) ||
        !Number.isSafeInteger(item.deltaAfter)
      )
      {
        throw new RangeError('substitution width exceeds safe integer');
      }

      group.push(item);
      prior=item;
    }

    for(const [row,group] of byRow)
    {
      const width=input.getRowWidth(row)+group[group.length-1].deltaAfter;

      if(!Number.isSafeInteger(width) || width<0)
      {
        throw new RangeError('substituted row width exceeds safe integer');
      }
    }

    if(input.revision!==inputRevision || this.#inputRevision!==inputRevision)
    {
      throw new Error('input Document2D changed during substitutions');
    }

    const same=prepared.length===this.#substitutions.length && prepared.every
    (
      (item,i) =>
      {
        const old=this.#substitutions[i];
        const sameSources =
          (item.sources===null && old.sources===null) ||
          (item.sources!==null && old.sources!==null &&
           item.sources.length===old.sources.length &&
           item.sources.every
           (
             (part,index) =>
               this.#compare(part.start,old.sources[index].start)===0 &&
               this.#compare(part.end,old.sources[index].end)===0
           ));

        return item.id===old.id && item.text===old.text &&
          sameSources &&
          this.#compare(item.start,old.start)===0 &&
          this.#compare(item.end,old.end)===0;
      }
    );

    if(same)
    {
      return this;
    }

    if(this.#revision===Number.MAX_SAFE_INTEGER)
    {
      throw new RangeError('substitution revision exhausted');
    }

    this.#substitutions=prepared;
    this.#byRow=byRow;
    this.#advance();
    this.#notify('content',{invalidation:{all:true}});
    return this;
  }

  getRowWidth(row)
  {
    const input=this.#active();

    if(!Number.isSafeInteger(row) || row<0)
    {
      throw new RangeError('invalid substitution row');
    }

    if(row>=input.rowCount)
    {
      return 0;
    }

    const group=this.#byRow.get(row);
    return input.getRowWidth(row)+
      (group ? group[group.length-1].deltaAfter : 0);
  }

  get colCount()
  {
    const input=this.#active();

    if(this.#maxColsRevision!==this.#revision)
    {
      let maximum=0;

      for(let row=0;row<input.rowCount;row++)
      {
        maximum=Math.max(maximum,this.getRowWidth(row));
      }

      this.#maxCols=maximum;
      this.#maxColsRevision=this.#revision;
    }

    return this.#maxCols;
  }

  #toInput(value)
  {
    const point=this.#point(value);
    const group=this.#byRow.get(point.row)||[];
    let delta=0;

    for(const item of group)
    {
      if(point.col<item.viewStart)
      {
        break;
      }

      if(point.col===item.viewStart)
      {
        return {row:point.row,col:item.start.col};
      }

      if(point.col<item.viewEnd)
      {
        throw new RangeError('position splits synthetic substitution');
      }

      if(point.col===item.viewEnd)
      {
        return {row:point.row,col:item.end.col};
      }

      delta=item.deltaAfter;
    }

    return {row:point.row,col:point.col-delta};
  }

  #fromInput(value)
  {
    const point=this.#point(value);
    const group=this.#byRow.get(point.row)||[];
    let delta=0;

    for(const item of group)
    {
      if(point.col<item.start.col)
      {
        break;
      }

      if(point.col===item.start.col)
      {
        return {row:point.row,col:item.viewStart};
      }

      if(point.col<item.end.col)
      {
        throw new RangeError('position belongs to substituted source content');
      }

      if(point.col===item.end.col)
      {
        return {row:point.row,col:item.viewEnd};
      }

      delta=item.deltaAfter;
    }

    return {row:point.row,col:point.col+delta};
  }

  #checkSpan(start,end)
  {
    if(this.#compare(start,end)>0)
    {
      throw new RangeError('invalid ordered substitution range');
    }

    for(const item of this.#substitutions)
    {
      if
      (
        this.#compare(start,item.end)<0 &&
        this.#compare(item.start,end)<0
      )
      {
        throw new RangeError('selection or edit crosses substituted source');
      }
    }
  }

  #window(rowStart,colStart,rowEnd,colEnd)
  {
    if
    (
      ![rowStart,colStart,rowEnd,colEnd].every
      (
        n=>Number.isSafeInteger(n) && n>=0
      ) ||
      rowEnd<rowStart || colEnd<colStart
    )
    {
      throw new RangeError('invalid substitution region window');
    }

    return Math.min(rowEnd,this.rowCount);
  }

  // A bounded window touches only visible input pieces and occupied
  // synthetic regions; hidden input intervals are never materialized.
  #project(row,colStart,colEnd,structured)
  {
    const input=this.#active();
    const group=this.#byRow.get(row)||[];
    const regions=[];
    let text='';
    let sourceCursor=0;
    let delta=0;

    const addSource=(left,right,shift) =>
    {
      if(colStart>=colEnd || left>=right)
      {
        return;
      }

      const viewLeft=left+shift;
      const viewRight=right+shift;
      const from=Math.max(colStart,viewLeft);
      const to=Math.min(colEnd,viewRight);

      if(from>=to)
      {
        return;
      }

      const inputLeft=from-shift;
      const inputRight=to-shift;

      if(!structured)
      {
        text+=input.getRect(row,inputLeft,row+1,inputRight)[0];
      }
      else
      {
        const parts=input.getRegions(row,inputLeft,row+1,inputRight)[0];

        for(const part of parts)
        {
          regions.push
          (
            {
              ...part,
              start:{row,col:part.start.col+shift},
              end:{row,col:part.end.col+shift}
            }
          );
        }
      }
    };

    for(const item of group)
    {
      addSource(sourceCursor,item.start.col,delta);

      if(structured && colStart<=item.viewStart && item.viewStart<colEnd)
      {
        // Preserve zero-width source annotations at the left cut.
        for(const part of input.getRegions
          (row,item.start.col,row+1,item.start.col+1)[0])
        {
          if
          (
            part.kind==='annotation' &&
            part.start.col===item.start.col &&
            part.end.col===item.start.col
          )
          {
            const at={row,col:item.viewStart};
            regions.push({...part,start:at,end:{...at}});
          }
        }
      }

      if(item.viewEnd>colStart && item.viewStart<colEnd)
      {
        if(structured)
        {
          regions.push
          (
            {
              kind:'substitution',
              id:item.id,
              text:item.text,
              start:{row,col:item.viewStart},
              end:{row,col:item.viewEnd}
            }
          );
        }
        else
        {
          const first=Math.max(0,colStart-item.viewStart);
          const last=Math.min(item.width,colEnd-item.viewStart);
          text+=item.cells.slice(first,last).join('');
        }
      }

      sourceCursor=item.end.col;
      delta=item.deltaAfter;
    }

    const sourceWidth=input.getRowWidth(row);
    addSource(sourceCursor,sourceWidth,delta);

    if(structured && colStart<=sourceWidth+delta &&
       sourceWidth+delta<colEnd)
    {
      // Including EOL on an empty row is part of the region contract.
      const tail=input.getRegions
      (
        row,sourceWidth,row+1,sourceWidth+1
      )[0];

      for(const part of tail)
      {
        if
        (
          part.kind==='annotation' &&
          part.start.col===sourceWidth &&
          part.end.col===sourceWidth
        )
        {
          const at={row,col:sourceWidth+delta};
          regions.push({...part,start:at,end:{...at}});
        }
      }
    }

    if(structured)
    {
      regions.sort
      (
        (a,b)=>a.start.col-b.start.col ||
          (a.kind==='annotation' ? -1 : 0) -
          (b.kind==='annotation' ? -1 : 0)
      );
      return regions;
    }

    return text;
  }

  getRegions(rowStart,colStart,rowEnd,colEnd)
  {
    const input=this.#active();
    const revision=input.revision;
    const end=this.#window(rowStart,colStart,rowEnd,colEnd);
    const rows=[];

    for(let row=rowStart;row<end;row++)
    {
      rows.push
      (
        this.#byRow.has(row) ?
          this.#project(row,colStart,colEnd,true) :
          input.getRegions(row,colStart,row+1,colEnd)[0].map
          (
            part=>({...part,start:{...part.start},end:{...part.end}})
          )
      );
    }

    if(input.revision!==revision || this.#inputRevision!==revision)
    {
      throw new Error('input Document2D changed during substituted read');
    }

    return rows;
  }

  getRect(rowStart,colStart,rowEnd,colEnd)
  {
    const input=this.#active();
    const revision=input.revision;
    const end=this.#window(rowStart,colStart,rowEnd,colEnd);
    const rows=[];

    for(let row=rowStart;row<end;row++)
    {
      rows.push
      (
        this.#byRow.has(row) ?
          this.#project(row,colStart,colEnd,false) :
          input.getRect(row,colStart,row+1,colEnd)[0]
      );
    }

    if(input.revision!==revision || this.#inputRevision!==revision)
    {
      throw new Error('input Document2D changed during substituted read');
    }

    return rows;
  }

  getSelections()
  {
    return this.#active().getSelections().map
    (
      selection =>
      {
        this.#checkSpan(selection.start,selection.end);
        return {
          start:this.#fromInput(selection.start),
          end:this.#fromInput(selection.end),
          forward:selection.forward
        };
      }
    );
  }

  setSelections(selections)
  {
    const input=this.#active();

    if(!Array.isArray(selections))
    {
      throw new TypeError('selection array required');
    }

    const revision=this.#revision;
    const inputRevision=input.revision;
    const mapped=selections.map
    (
      selection =>
      {
        if(!selection || typeof selection.forward!=='boolean')
        {
          throw new TypeError('invalid substitution selection');
        }

        const start=this.#toInput(selection.start);
        const end=this.#toInput(selection.end);
        this.#checkSpan(start,end);
        return {start,end,forward:selection.forward};
      }
    );

    if(this.#revision!==revision || input.revision!==inputRevision)
    {
      throw new Error('stale substituted selection coordinates');
    }

    input.setSelections(mapped);
    return this;
  }

  addSelection(position)
  {
    this.#active();
    this.#modes[this.#selectionMode].addSelection(position);
    return this;
  }

  remSelection(position)
  {
    this.#active();
    this.#modes[this.#selectionMode].remSelection(position);
    return this;
  }

  get selectionMode()
  {
    this.#active();
    return this.#selectionMode;
  }

  set selectionMode(mode)
  {
    this.#active();

    if(!Object.hasOwn(this.#modes,mode))
    {
      throw new RangeError('unknown selection mode');
    }

    this.#selectionMode=mode;
    this.#notify('selectionMode');
  }

  get insertMode()
  {
    return this.#active().insertMode;
  }

  set insertMode(mode)
  {
    this.#active().insertMode=mode;
  }

  read()
  {
    this.getSelections();
    return this.#active().read();
  }

  insert(content)
  {
    this.getSelections();
    this.#active().insert(content);
    return this;
  }

  replace(edits,expectedRevision)
  {
    return this._replaceMapped
    (
      this.#active(),
      edits,
      expectedRevision,
      edit=>
      {
        const start=this.#toInput(edit.start);
        const end=this.#toInput(edit.end);
        this.#checkSpan(start,end);
        return {start,end,text:edit.text};
      }
    );
  }

  subscribe(listener)
  {
    this.#active();

    if(typeof listener!=='function')
    {
      throw new TypeError('listener required');
    }

    this.#listeners.add(listener);
    return ()=>this.#listeners.delete(listener);
  }

  destroy()
  {
    if(this.#input===null)
    {
      return;
    }

    this.#input=null;
    this.#unsubscribe();
    if(this.#unsubscribePreparing)
    {
      this.#unsubscribePreparing();
    }
    this.#listeners.clear();
    this.#modes=null;
    this.#byRow.clear();
    this.#substitutions=[];
    this.#segmenter=null;
    this.#unsubscribe=null;
    this.#unsubscribePreparing=null;
    this.#preparedGeometry=null;
  }
}
