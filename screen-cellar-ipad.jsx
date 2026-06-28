/* screen-cellar-ipad.jsx — table view for iPad with sortable columns */

function CellarScreenIPad({ onOpen, selectedId, openScan, filters, setFilters }){
  const wines = useCellar();
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState("smart");
  const [picker, setPicker] = React.useState(null);
  const [reviewer, setReviewer] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("table"); // table | list

  const { color, country, region, cls, varietal, vintage, status, storage } = filters;
  const patch = p => setFilters(f=>({ ...f, ...p }));
  const setColor=v=>patch({color:v});
  const setCountry=v=>patch({country:v,region:null,cls:null});
  const setRegion=v=>patch({region:v,cls:null});
  const setCls=v=>patch({cls:v});
  const setVarietal=v=>patch({varietal:v});
  const setVintage=v=>patch({vintage:v});
  const setStatus=v=>patch({status:v});
  const setStorage=v=>patch({storage:v});
  function clearCountry(){ patch({country:null,region:null,cls:null}); }
  function clearRegion(){ patch({region:null,cls:null}); }
  function clearAll(){ setFilters({ color:"All", country:null, region:null, cls:null, varietal:null, vintage:null, status:null, storage:null }); setReviewer(null); }
  const anyFilter = color!=="All"||country||region||cls||varietal||vintage||status||storage||reviewer;
  const WHEN_LABEL = { ...STATUS_LABEL, ready:"Ready to drink" };

  const base = wines;
  const byColor = color==="All"? base : base.filter(w=>w.color===color);
  const byCountry = country? byColor.filter(w=>w.country===country) : byColor;
  const byRegion = region? byCountry.filter(w=>w.region===region) : byCountry;
  const byClass = cls? byRegion.filter(w=>w.classification===cls) : byRegion;
  const byVarietal = varietal? byClass.filter(w=>w.varietal===varietal) : byClass;
  const byVintage = vintage? byVarietal.filter(w=>String(w.vintage)===String(vintage)) : byVarietal;
  const byStatus = status? byVintage.filter(w=>{ const s=statusOf(w); return status==="ready" ? (s==="now"||s==="soon") : s===status; }) : byVintage;
  const byStorage = storage? byStatus.filter(w=>w.location&&w.location.area===storage) : byStatus;
  const byReviewer = reviewer? byStorage.filter(w=>w.ratings&&w.ratings[reviewer]!=null&&w.ratings[reviewer]>0) : byStorage;
  const ql = q.trim().toLowerCase();
  const filtered = (ql? byReviewer.filter(w=>[w.producer,w.cuvee,w.varietal,w.region,w.country,w.subregion,w.classification,String(w.vintage)].join(" ").toLowerCase().includes(ql)) : byReviewer)
    .slice().sort(SORTS[sort].fn);

  const totalBottles = filtered.reduce((s,w)=>s+(w.qty||1),0);
  const totalValue = filtered.reduce((s,w)=>s+((w.valueEst||0)*(w.qty||1)),0);

  const countryOpts = uniqCounts(byColor, "country").map(o=>({...o, icon:<Ico n="pin" s={16}/>}));
  const regionOpts = uniqCounts(byCountry, "region");
  const classOpts = uniqCounts(byRegion, "classification");
  const varietalOpts = uniqCounts(byClass, "varietal");
  const vintageOpts = [...new Set(byVarietal.map(w=>w.vintage).filter(Boolean))].sort((a,b)=>b-a)
    .map(y=>({ value:String(y), label:String(y), count: byVarietal.filter(w=>String(w.vintage)===String(y)).length }));
  const statusOpts = [["now","Drink now"],["soon","Drink soon"],["early","Almost ready"],["hold","Too young"],["past","Past window"]]
    .map(([v,l])=>({ value:v, label:l, count: byVintage.filter(w=>statusOf(w)===v).length })).filter(o=>o.count>0);
  const storageOpts = STORAGE_AREAS.map(a=>({ value:a.id, label:a.label, count: byStatus.filter(w=>w.location&&w.location.area===a.id).reduce((s,w)=>s+(w.qty||1),0) })).filter(o=>o.count>0);
  const reviewerOpts = Object.keys(RATING_SOURCES).map(k=>({ value:k, label:k+" — "+RATING_SOURCES[k], count: byStorage.filter(w=>w.ratings&&w.ratings[k]!=null&&w.ratings[k]>0).length })).filter(o=>o.count>0);

  /* column sort helper */
  const COL_SORTS = {
    name: (a,b)=>(a.producer||"").localeCompare(b.producer||""),
    varietal: (a,b)=>(a.varietal||"").localeCompare(b.varietal||""),
    region: (a,b)=>(a.region||"").localeCompare(b.region||""),
    vintage: (a,b)=>(a.vintage||0)-(b.vintage||0),
    status: (a,b)=>(STATUS_ORDER[statusOf(a)]||0)-(STATUS_ORDER[statusOf(b)]||0),
    score: (a,b)=>(b.critScore||0)-(a.critScore||0),
    value: (a,b)=>(b.valueEst||0)-(a.valueEst||0),
    qty: (a,b)=>(b.qty||1)-(a.qty||1),
  };
  const [colSort, setColSort] = React.useState(null);
  const [colDir, setColDir] = React.useState(1);
  function toggleCol(col){
    if(colSort===col){ setColDir(d=>d*-1); }
    else { setColSort(col); setColDir(1); }
  }
  const sortedList = colSort
    ? filtered.slice().sort((a,b)=>COL_SORTS[colSort](a,b)*colDir)
    : filtered;

  const SortHead = ({col, children, align}) => (
    <th style={{cursor:"pointer",userSelect:"none",textAlign:align||"left"}} onClick={()=>toggleCol(col)}>
      <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
        {children}
        {colSort===col && <span style={{fontSize:9,opacity:.7}}>{colDir===1?"▲":"▼"}</span>}
      </span>
    </th>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <h1>CoChez Cellar</h1>
          <div className="sub">{totalBottles} bottles · {fmt$(totalValue)} value</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* view toggle */}
          <div style={{display:"flex",border:"1px solid var(--line2)",borderRadius:10,overflow:"hidden"}}>
            <button onClick={()=>{setViewMode("table");setColSort(null);}} style={{padding:"8px 11px",background:viewMode==="table"?"var(--wine)":"var(--card)",color:viewMode==="table"?"#fff":"var(--muted)",display:"grid",placeItems:"center"}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
            </button>
            <button onClick={()=>setViewMode("list")} style={{padding:"8px 11px",background:viewMode==="list"?"var(--wine)":"var(--card)",color:viewMode==="list"?"#fff":"var(--muted)",display:"grid",placeItems:"center"}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
            </button>
          </div>
          <button className="icon-btn" onClick={()=>setPicker("sort")}><Ico n="sliders" s={19}/></button>
        </div>
      </div>

      <div className="screen-wrap">
        <div style={{padding:"0 28px"}}>
          {/* search */}
          <div style={{display:"flex",alignItems:"center",gap:10,background:"var(--card)",border:"1px solid var(--line2)",borderRadius:13,padding:"0 14px",marginBottom:12}}>
            <span className="muted"><Ico n="search" s={18}/></span>
            <input className="field" style={{border:"none",background:"transparent",padding:"12px 0",boxShadow:"none",fontSize:15}} placeholder="Search wines…" value={q} onChange={e=>setQ(e.target.value)}/>
            {q&&<button className="muted" onClick={()=>setQ("")}><Ico n="x" s={17}/></button>}
          </div>

          {/* color + filters */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
            {["All","Red","White","Rosé","Sparkling"].map(c=>(
              <span key={c} className={"chip "+(color===c?"on":"line")} onClick={()=>setColor(c)}>
                {c!=="All"&&<ColorDot color={c}/>}{c}
              </span>
            ))}
            <span style={{width:1,height:20,background:"var(--line2)",margin:"0 4px"}}/>
            <span className="muted" style={{display:"grid",placeItems:"center"}}><Ico n="filter" s={15}/></span>
            <DrillChip label="Country" value={country} onTap={()=>setPicker("country")} onClear={clearCountry}/>
            {country && <DrillChip label="Region" value={region} onTap={()=>setPicker("region")} onClear={clearRegion}/>}
            {region && <DrillChip label="Class" value={cls} onTap={()=>setPicker("class")} onClear={()=>setCls(null)}/>}
            <DrillChip label="Grape" value={varietal} onTap={()=>setPicker("varietal")} onClear={()=>setVarietal(null)}/>
            <DrillChip label="Vintage" value={vintage} onTap={()=>setPicker("vintage")} onClear={()=>setVintage(null)}/>
            <DrillChip label="When" value={status?WHEN_LABEL[status]:null} onTap={()=>setPicker("status")} onClear={()=>setStatus(null)}/>
            <DrillChip label="Storage" value={storage?STORAGE_AREAS.find(a=>a.id===storage)?.label:null} onTap={()=>setPicker("storage")} onClear={()=>setStorage(null)}/>
            <DrillChip label="Reviewer" value={reviewer?reviewer:null} onTap={()=>setPicker("reviewer")} onClear={()=>setReviewer(null)}/>
            {anyFilter && <span className="chip line" style={{color:"var(--wine)",fontWeight:700}} onClick={clearAll}>Clear all</span>}
          </div>

          {/* count + sort label */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span className="muted" style={{fontSize:13}}>{filtered.length} {filtered.length===1?"wine":"wines"}</span>
            <button onClick={()=>setPicker("sort")} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"var(--ink)"}}>
              <Ico n="sliders" s={14}/>{SORTS[sort].label}
            </button>
          </div>
          <hr className="divider" style={{marginBottom:4}}/>

          {filtered.length===0 ? (
            <div className="empty">
              <div style={{opacity:.4,marginBottom:12,display:"grid",placeItems:"center"}}><Ico n="cellar" s={44}/></div>
              <div style={{fontSize:20,fontWeight:600,marginBottom:6}}>Nothing here yet</div>
              <div style={{fontSize:14}}>{wines.length?"No wines match these filters.":"Scan a label or add manually to start."}</div>
              {wines.length===0 && (
                <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:20}}>
                  <button className="btn primary" onClick={()=>openScan("camera")}><Ico n="camera" s={16}/>Scan a label</button>
                  <button className="btn" onClick={()=>openScan("manual")}><Ico n="edit" s={16}/>Add manually</button>
                </div>
              )}
            </div>
          ) : viewMode==="table" ? (
            /* ---- TABLE VIEW ---- */
            <table className="wine-table">
              <thead>
                <tr>
                  <th style={{width:42}}></th>
                  <SortHead col="name">Wine</SortHead>
                  <SortHead col="varietal">Grape</SortHead>
                  <SortHead col="region">Region</SortHead>
                  <SortHead col="vintage">Year</SortHead>
                  <SortHead col="status">Status</SortHead>
                  <SortHead col="score">Score</SortHead>
                  <SortHead col="value" align="right">Value</SortHead>
                  <th style={{width:100}}>Location</th>
                  <SortHead col="qty" align="right">Qty</SortHead>
                </tr>
              </thead>
              <tbody>
                {sortedList.map(w=>(
                  <tr key={w.id} onClick={()=>onOpen(w.id)} className={selectedId===w.id?"selected":""}>
                    <td><WineSwatch w={w} size={34}/></td>
                    <td>
                      <div className="td-name">{w.producer}{w.cuvee?<span className="cuvee"> · {w.cuvee}</span>:""}</div>
                    </td>
                    <td style={{fontSize:13,color:"var(--muted)",whiteSpace:"nowrap"}}>{w.varietal}</td>
                    <td style={{fontSize:13,color:"var(--muted)",whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{w.region}</td>
                    <td style={{fontSize:13.5,fontWeight:600,fontFamily:"var(--mono)"}}>{w.vintage}</td>
                    <td><StatusPill w={w}/></td>
                    <td>
                      <RatingPills w={w} max={2}/>
                    </td>
                    <td style={{textAlign:"right",fontWeight:600,fontSize:14,whiteSpace:"nowrap"}}>{fmt$(w.valueEst)}</td>
                    <td>{w.location ? <LocationChip loc={w.location}/> : <span className="muted" style={{fontSize:11}}>—</span>}</td>
                    <td style={{textAlign:"right",color:"var(--muted)",fontSize:13}}>×{w.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ---- LIST / CARD VIEW ---- */
            <div className="ipad-list">
              {sortedList.map(w=>(
                <button key={w.id} onClick={()=>onOpen(w.id)} className={"wine-row"+(selectedId===w.id?" selected":"")} style={{width:"100%",textAlign:"left"}}>
                  <WineSwatch w={w}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="wine-name" style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.producer}{w.cuvee?<span className="cuvee"> · {w.cuvee}</span>:""}</div>
                    <div className="wine-meta">{w.varietal} · {w.region}, {w.country} · {w.vintage}</div>
                    <div style={{display:"flex",gap:7,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                      <StatusPill w={w}/>
                      <RatingPills w={w} max={2}/>
                      {w.location && <LocationChip loc={w.location}/>}
                      {coravinInfo(w) && <span className="chip gold" style={{padding:"3px 9px",fontSize:11.5}}><Ico n="clock" s={12}/>{coravinText(w)}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flex:"0 0 auto"}}>
                    <div className="num" style={{fontSize:17}}>{fmt$(w.valueEst)}</div>
                    <div className="muted" style={{fontSize:12,marginTop:2}}>×{w.qty}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {picker==="country" && <Picker title="Country" sub="Filter by origin" options={countryOpts} current={country} onClose={()=>setPicker(null)} onPick={setCountry}/>}
      {picker==="region" && <Picker title={`${country} · region`} sub="Narrow to a wine region" options={regionOpts} current={region} onClose={()=>setPicker(null)} onPick={setRegion}/>}
      {picker==="class" && <Picker title={`${region} · classification`} options={classOpts} current={cls} onClose={()=>setPicker(null)} onPick={setCls}/>}
      {picker==="varietal" && <Picker title="Grape / varietal" options={varietalOpts} current={varietal} onClose={()=>setPicker(null)} onPick={setVarietal}/>}
      {picker==="vintage" && <Picker title="Vintage" options={vintageOpts} current={vintage} onClose={()=>setPicker(null)} onPick={setVintage}/>}
      {picker==="status" && <Picker title="Drinking window" options={statusOpts} current={status} onClose={()=>setPicker(null)} onPick={setStatus}/>}
      {picker==="storage" && <Picker title="Storage location" sub="Filter by where bottles are stored" options={storageOpts} current={storage} onClose={()=>setPicker(null)} onPick={setStorage}/>}
      {picker==="reviewer" && <Picker title="Reviewed by" options={reviewerOpts} current={reviewer} onClose={()=>setPicker(null)} onPick={setReviewer}/>}
      {picker==="sort" && <Picker title="Sort by" options={Object.entries(SORTS).map(([k,v])=>({value:k,label:v.label,count:""}))} current={sort} onClose={()=>setPicker(null)} onPick={setSort}/>}
    </>
  );
}

Object.assign(window, { CellarScreenIPad });
