/* screen-cellar.jsx — collection list with search + origin drill-down + sort */

const STATUS_ORDER = { now:0, soon:1, past:2, early:3, hold:4 };
const SORTS = {
  smart:{ label:"Drink soon", fn:(a,b)=> (STATUS_ORDER[statusOf(a)]-STATUS_ORDER[statusOf(b)]) || ((a.peakTo||9999)-(b.peakTo||9999)) },
  drinkby:{ label:"Drink by (soonest)", fn:(a,b)=> ((a.peakTo||a.drinkTo||9999)-(b.peakTo||b.drinkTo||9999)) || ((a.drinkTo||9999)-(b.drinkTo||9999)) },
  rating:{ label:"Rating (highest)", fn:(a,b)=> (b.critScore||0)-(a.critScore||0) },
  valueHigh:{ label:"Value: high", fn:(a,b)=> (b.valueEst||0)*(b.qty||1) - (a.valueEst||0)*(a.qty||1) },
  valueLow:{ label:"Value: low", fn:(a,b)=> (a.valueEst||0) - (b.valueEst||0) },
  vintage:{ label:"Vintage", fn:(a,b)=> (a.vintage||0)-(b.vintage||0) },
  name:{ label:"Name A–Z", fn:(a,b)=> (a.producer||"").localeCompare(b.producer||"") },
  recent:{ label:"Recently added", fn:(a,b)=> (b.addedAt||0)-(a.addedAt||0) },
};

function uniqCounts(list, key){
  const m = new Map();
  list.forEach(w=>{ const v=w[key]; if(!v) return; m.set(v,(m.get(v)||0)+1); });
  return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(([value,count])=>({value,count}));
}

function Picker({ title, sub, options, current, onPick, onClose }){
  return (
    <Sheet onClose={onClose}>
      <div style={{padding:"6px 20px 26px"}}>
        <div style={{fontSize:20,fontWeight:600}}>{title}</div>
        {sub&&<div className="muted" style={{fontSize:13,marginBottom:8}}>{sub}</div>}
        <div style={{marginTop:10,display:"flex",flexDirection:"column"}}>
          {options.map(o=>(
            <button key={o.value} onClick={()=>{onPick(o.value);onClose();}}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 4px",borderBottom:"1px solid var(--line)",textAlign:"left"}}>
              <span style={{display:"flex",alignItems:"center",gap:10,fontSize:16,fontWeight:current===o.value?700:500}}>
                {o.icon}{o.label||o.value}
              </span>
              <span style={{display:"flex",alignItems:"center",gap:10}}>
                <span className="muted" style={{fontSize:13}}>{o.count}</span>
                {current===o.value&&<span className="wine-c"><Ico n="check" s={18}/></span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function DrillChip({ label, value, onTap, onClear }){
  return (
    <span className={"chip "+(value?"on":"line")} style={{paddingRight:value?6:11}} onClick={onTap}>
      {value||label}
      {value
        ? <span onClick={e=>{e.stopPropagation();onClear();}} style={{display:"grid",placeItems:"center",width:18,height:18,marginLeft:1}}><Ico n="x" s={13}/></span>
        : <Ico n="chevD" s={13}/>}
    </span>
  );
}

const LS_SLOTS = "cellar_display_slots";
const DEFAULT_SLOTS = ["status","ratings","classification"];
const SLOT_OPTIONS = [
  { id:"status", label:"Drink window" },
  { id:"ratings", label:"Critic scores" },
  { id:"classification", label:"Classification" },
  { id:"varietal", label:"Grape / varietal" },
  { id:"region", label:"Region" },
  { id:"vintage", label:"Vintage" },
  { id:"location", label:"Storage location" },
];

function renderSlot(slot, w){
  switch(slot){
    case "status": return <StatusPill key={slot} w={w}/>;
    case "ratings": return <RatingPills key={slot} w={w} max={2}/>;
    case "classification": return (w.classification && !["Estate","AOC","DOCG"].includes(w.classification)) ? <span key={slot} className="chip" style={{padding:"3px 9px",fontSize:11.5}}>{w.classification}</span> : null;
    case "varietal": return w.varietal ? <span key={slot} className="chip" style={{padding:"3px 9px",fontSize:11.5}}><ColorDot color={w.color}/>{w.varietal}</span> : null;
    case "region": return w.region ? <span key={slot} className="chip" style={{padding:"3px 9px",fontSize:11.5}}><Ico n="pin" s={12}/>{w.region}</span> : null;
    case "vintage": return w.vintage ? <span key={slot} className="chip" style={{padding:"3px 9px",fontSize:11.5}}>{w.vintage}</span> : null;
    case "location": return w.location ? <LocationChip key={slot} loc={w.location} qty={w.qty} slots={w.slots}/> : null;
    default: return null;
  }
}

function SlotSettings({ slots, onChange, onClose }){
  const toggle = id => {
    if(slots.includes(id)) onChange(slots.filter(s=>s!==id));
    else if(slots.length<3) onChange([...slots, id]);
  };
  return (
    <Sheet onClose={onClose}>
      <div style={{padding:"6px 20px 26px"}}>
        <div style={{fontSize:20,fontWeight:600}}>Card display</div>
        <div className="muted" style={{fontSize:13,marginBottom:14}}>Choose up to 3 details shown on each wine card.</div>
        {SLOT_OPTIONS.map(o=>(
          <button key={o.id} onClick={()=>toggle(o.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 4px",borderBottom:"1px solid var(--line)",width:"100%",textAlign:"left"}}>
            <span style={{width:22,height:22,borderRadius:6,border:"2px solid "+(slots.includes(o.id)?"var(--wine)":"var(--line2)"),background:slots.includes(o.id)?"var(--wine)":"transparent",display:"grid",placeItems:"center",color:"#fff",fontSize:14,flex:"0 0 auto"}}>
              {slots.includes(o.id)&&<Ico n="check" s={14}/>}
            </span>
            <span style={{fontSize:15,fontWeight:slots.includes(o.id)?700:500}}>{o.label}</span>
            {slots.length>=3 && !slots.includes(o.id) && <span className="muted" style={{marginLeft:"auto",fontSize:11}}>max 3</span>}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function BackupSheet({ onClose }){
  const [autoOn, setAutoOn] = React.useState(()=>Cellar.getAutoBackup());
  const [status, setStatus] = React.useState(null);
  const fileRef = React.useRef();

  const toggleAuto = () => {
    const next = !autoOn;
    setAutoOn(next);
    Cellar.setAutoBackup(next);
  };

  const doExport = () => {
    Cellar.exportBackup();
    setStatus({ ok:true, msg:"Backup downloading\u2026" });
  };

  const doImport = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    try {
      const count = await Cellar.importBackup(file);
      setStatus({ ok:true, msg:"Restored "+count+" wines successfully." });
    } catch(err) {
      setStatus({ ok:false, msg:err.message });
    }
    e.target.value = "";
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{padding:"6px 20px 32px"}}>
        <div style={{fontSize:20,fontWeight:600,marginBottom:4}}>Backup & Restore</div>
        <div className="muted" style={{fontSize:13,marginBottom:20}}>Your cellar is stored in this browser. Export a backup before clearing your cache or switching devices.</div>

        {status && (
          <div style={{
            padding:"10px 14px",borderRadius:10,marginBottom:14,fontSize:14,fontWeight:500,
            background:status.ok?"rgba(109,31,47,0.08)":"rgba(192,57,43,0.1)",
            color:status.ok?"var(--wine)":"#c0392b"
          }}>{status.msg}</div>
        )}

        <button onClick={doExport} className="btn primary" style={{width:"100%",justifyContent:"center",gap:8,marginBottom:10}}>
          <Ico n="download" s={17}/>Export backup (.json)
        </button>
        <button onClick={()=>fileRef.current.click()} className="btn" style={{width:"100%",justifyContent:"center",gap:8}}>
          <Ico n="refresh" s={17}/>Import backup\u2026
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{display:"none"}} onChange={doImport}/>

        <div style={{marginTop:22,paddingTop:18,borderTop:"1px solid var(--line)"}}>
          <button onClick={toggleAuto} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",textAlign:"left"}}>
            <div>
              <div style={{fontSize:15,fontWeight:600}}>Auto-backup after scan</div>
              <div className="muted" style={{fontSize:12.5,marginTop:2,maxWidth:240}}>Downloads a fresh backup 3 seconds after each new bottle is added.</div>
            </div>
            <div style={{flex:"0 0 auto",marginLeft:16,width:46,height:26,borderRadius:13,background:autoOn?"var(--wine)":"var(--line2)",position:"relative",transition:"background .2s"}}>
              <div style={{position:"absolute",top:3,left:autoOn?23:3,width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            </div>
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function CellarScreen({ onOpen, openScan, filters, setFilters }){
  const wines = useCellar();
  const [q, setQ] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false);
  const [sort, setSort] = React.useState("smart");
  const [picker, setPicker] = React.useState(null);
  const [reviewer, setReviewer] = React.useState(null);
  const [listSlots, setListSlotsRaw] = React.useState(()=>{
    try{ const v=JSON.parse(localStorage.getItem(LS_SLOTS)); if(Array.isArray(v)) return v; }catch(e){}
    return DEFAULT_SLOTS;
  });
  const setListSlots = v => { setListSlotsRaw(v); try{localStorage.setItem(LS_SLOTS,JSON.stringify(v));}catch(e){} }; // country|region|class|varietal|vintage|status|sort
  const [showBackup, setShowBackup] = React.useState(false);

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

  // apply filters progressively
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
  // A search query searches the WHOLE cellar — it overrides any active facet/drill
  // filters (which persist across tabs), so a scanned/known wine always turns up.
  const filtered = (ql? base.filter(w=>[w.producer,w.cuvee,w.varietal,w.region,w.country,w.subregion,w.classification,String(w.vintage)].join(" ").toLowerCase().includes(ql)) : byReviewer)
    .slice().sort(SORTS[sort].fn);

  const totalBottles = filtered.reduce((s,w)=>s+(w.qty||1),0);
  const totalValue = filtered.reduce((s,w)=>s+((w.valueEst||0)*(w.qty||1)),0);

  // facet options
  const countryOpts = uniqCounts(byColor, "country").map(o=>({...o, icon:<Ico n="pin" s={16}/>}));
  const regionOpts = uniqCounts(byCountry, "region");
  const classOpts = uniqCounts(byRegion, "classification");
  const varietalOpts = uniqCounts(byClass, "varietal");
  const vintageOpts = [...new Set(byVarietal.map(w=>w.vintage).filter(Boolean))].sort((a,b)=>b-a)
    .map(y=>({ value:String(y), label:String(y), count: byVarietal.filter(w=>String(w.vintage)===String(y)).length }));
  const statusOpts = [["now","Drink now"],["soon","Drink soon"],["early","Approaching"],["hold","Too young"],["past","Past window"]]
    .map(([v,l])=>({ value:v, label:l, count: byVintage.filter(w=>statusOf(w)===v).length })).filter(o=>o.count>0);
  const storageOpts = STORAGE_AREAS.map(a=>({ value:a.id, label:a.label, count: byStatus.filter(w=>w.location&&w.location.area===a.id).reduce((s,w)=>s+(w.qty||1),0) })).filter(o=>o.count>0);
  const reviewerOpts = Object.keys(RATING_SOURCES).map(k=>({ value:k, label:k+" — "+RATING_SOURCES[k], count: byStorage.filter(w=>w.ratings&&w.ratings[k]!=null&&w.ratings[k]>0).length })).filter(o=>o.count>0);

  return (
    <>
      <div className="topbar">
        <div>
          <EditableTitle/>
          <div className="sub">{totalBottles} bottles · {fmt$(totalValue)} value</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button className="icon-btn" onClick={()=>setShowBackup(true)}><Ico n="download" s={19}/></button>
          <button className="icon-btn" onClick={()=>setPicker("slots")}><Ico n="sliders" s={19}/></button>
          <button className="icon-btn" onClick={()=>setShowSearch(s=>!s)}><Ico n="search" s={20}/></button>
        </div>
      </div>

      <div className="screen-wrap">
        <div style={{padding:"0 18px"}}>
          {showSearch && (
            <div className="fade-in" style={{display:"flex",alignItems:"center",gap:9,background:"var(--card)",border:"1px solid var(--line2)",borderRadius:13,padding:"0 12px",marginBottom:12}}>
              <span className="muted"><Ico n="search" s={18}/></span>
              <input autoFocus className="field" style={{border:"none",background:"transparent",padding:"12px 0",boxShadow:"none"}} placeholder="Search producer, varietal, region…" value={q} onChange={e=>setQ(e.target.value)}/>
              {q&&<button className="muted" onClick={()=>setQ("")}><Ico n="x" s={17}/></button>}
            </div>
          )}

          {/* color quick filter */}
          <div className="chip-row" style={{marginBottom:10}}>
            {["All","Red","White","Rosé","Sparkling"].map(c=>(
              <span key={c} className={"chip "+(color===c?"on":"line")} onClick={()=>setColor(c)}>
                {c!=="All"&&<ColorDot color={c}/>}{c}
              </span>
            ))}
          </div>

          {/* facet filters */}
          <div className="chip-row" style={{marginBottom:10,alignItems:"center"}}>
            <span className="muted" style={{display:"grid",placeItems:"center"}}><Ico n="filter" s={16}/></span>
            <DrillChip label="Country" value={country} onTap={()=>setPicker("country")} onClear={clearCountry}/>
            {country && <span className="muted" style={{display:"grid",placeItems:"center"}}><Ico n="chevR" s={14}/></span>}
            {country && <DrillChip label="Region" value={region} onTap={()=>setPicker("region")} onClear={clearRegion}/>}
            {region && <span className="muted" style={{display:"grid",placeItems:"center"}}><Ico n="chevR" s={14}/></span>}
            {region && <DrillChip label="Class" value={cls} onTap={()=>setPicker("class")} onClear={()=>setCls(null)}/>}
            <DrillChip label="Grape" value={varietal} onTap={()=>setPicker("varietal")} onClear={()=>setVarietal(null)}/>
            <DrillChip label="Vintage" value={vintage} onTap={()=>setPicker("vintage")} onClear={()=>setVintage(null)}/>
            <DrillChip label="When" value={status?WHEN_LABEL[status]:null} onTap={()=>setPicker("status")} onClear={()=>setStatus(null)}/>
            <DrillChip label="Storage" value={storage?STORAGE_AREAS.find(a=>a.id===storage)?.label:null} onTap={()=>setPicker("storage")} onClear={()=>setStorage(null)}/>
            <DrillChip label="Reviewer" value={reviewer?reviewer:null} onTap={()=>setPicker("reviewer")} onClear={()=>setReviewer(null)}/>
            {anyFilter && <span className="chip line" style={{color:"var(--wine)",fontWeight:700}} onClick={clearAll}>Clear all</span>}
          </div>

          {/* sort row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span className="muted" style={{fontSize:12.5}}>{filtered.length} {filtered.length===1?"wine":"wines"}</span>
            <button onClick={()=>setPicker("sort")} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"var(--ink)",whiteSpace:"nowrap"}}>
              <Ico n="sliders" s={15}/>{SORTS[sort].label}
            </button>
          </div>
          <hr className="divider"/>

          {/* list */}
          {filtered.length===0 ? (
            <div className="empty">
              <div style={{opacity:.4,marginBottom:10,display:"grid",placeItems:"center"}}><Ico n="cellar" s={40}/></div>
              <div style={{fontSize:18,fontWeight:600,marginBottom:4}}>Nothing here yet</div>
              <div style={{fontSize:13.5}}>{wines.length?"No wines match these filters.":"Scan a label or add a bottle by hand to start your cellar."}</div>
              {wines.length===0 && (
                <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:18,flexWrap:"wrap"}}>
                  <button className="btn primary" onClick={()=>openScan("camera")}><Ico n="camera" s={16}/>Scan a label</button>
                  <button className="btn" onClick={()=>openScan("manual")}><Ico n="edit" s={16}/>Add manually</button>
                </div>
              )}
            </div>
          ) : filtered.map(w=>(
            <button key={w.id} onClick={()=>onOpen(w.id)} className="wine-row" style={{width:"100%",textAlign:"left"}}>
              <WineSwatch w={w}/>
              <div style={{flex:1,minWidth:0}}>
                <div className="wine-name" style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.producer}{w.cuvee?<span className="cuvee"> · {w.cuvee}</span>:""}</div>
                <div className="wine-meta">{w.varietal} · {w.region}, {w.country} · {w.vintage}</div>
                <div style={{display:"flex",gap:7,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                  {listSlots.map(slot=>renderSlot(slot,w))}
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
      </div>

      {picker==="country" && <Picker title="Country" sub="Filter your cellar by origin" options={countryOpts} current={country} onClose={()=>setPicker(null)} onPick={setCountry}/>}
      {picker==="region" && <Picker title={`${country} · region`} sub="Narrow to a wine region" options={regionOpts} current={region} onClose={()=>setPicker(null)} onPick={setRegion}/>}
      {picker==="class" && <Picker title={`${region} · classification`} sub="By aging / quality tier" options={classOpts} current={cls} onClose={()=>setPicker(null)} onPick={setCls}/>}
      {picker==="varietal" && <Picker title="Grape / varietal" sub="Filter by grape" options={varietalOpts} current={varietal} onClose={()=>setPicker(null)} onPick={setVarietal}/>}
      {picker==="vintage" && <Picker title="Vintage" sub="Filter by year" options={vintageOpts} current={vintage} onClose={()=>setPicker(null)} onPick={setVintage}/>}
      {picker==="status" && <Picker title="Drinking window" sub="When they're best to open" options={statusOpts} current={status} onClose={()=>setPicker(null)} onPick={setStatus}/>}
      {picker==="storage" && <Picker title="Storage location" sub="Filter by where bottles are stored" options={storageOpts} current={storage} onClose={()=>setPicker(null)} onPick={setStorage}/>}
      {picker==="reviewer" && <Picker title="Reviewed by" sub="Show wines scored by a specific critic" options={reviewerOpts} current={reviewer} onClose={()=>setPicker(null)} onPick={setReviewer}/>}
      {picker==="sort" && <Picker title="Sort by" options={Object.entries(SORTS).map(([k,v])=>({value:k,label:v.label,count:""}))} current={sort} onClose={()=>setPicker(null)} onPick={setSort}/>}
      {picker==="slots" && <SlotSettings slots={listSlots} onChange={setListSlots} onClose={()=>setPicker(null)}/>}
      {showBackup && <BackupScreen onClose={()=>setShowBackup(false)}/>}
    </>
  );
}

Object.assign(window, { CellarScreen, Picker });
