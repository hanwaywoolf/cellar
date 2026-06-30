/* screen-storage.jsx — storage map: browse by rack (fridge) or row (wine rack)
   to spot bottles stored in the wrong spot. */

const FRIDGE_CAP_PER_RACK = 180 / FRIDGE_RACKS; // 12
const RACK_CAP_PER_ROW = RACK_COLS; // 10

/* ---------- data helpers (read-only; mirror the slot logic in location-picker.jsx) ---------- */
function fridgeRackCount(wines, rackNum){
  let n = 0;
  wines.forEach(w=>{
    if(Array.isArray(w.slots) && w.slots.length){
      n += w.slots.filter(s=>s && s.area==="fridge" && s.rack===rackNum).length;
    } else if(w.location && w.location.area==="fridge" && w.location.rack===rackNum){
      n += w.qty||1;
    }
  });
  return n;
}
// per-wine entries for a rack: { w, here } where `here` is how many of THIS
// wine's bottles sit on this exact rack (vs its total qty across the cellar) —
// lets the UI show "5/6 bottles" when the rest live elsewhere.
function fridgeRackEntries(wines, rackNum){
  return wines.map(w=>{
    let here = 0;
    if(Array.isArray(w.slots) && w.slots.length){
      here = w.slots.filter(s=>s && s.area==="fridge" && s.rack===rackNum).length;
    } else if(w.location && w.location.area==="fridge" && w.location.rack===rackNum){
      here = w.qty||1;
    }
    return { w, here };
  }).filter(e=>e.here>0);
}
function fridgeUnassignedEntries(wines){
  return wines.map(w=>{
    let here = 0;
    if(Array.isArray(w.slots) && w.slots.length){
      here = w.slots.filter(s=>s && s.area==="fridge" && !s.rack).length;
    } else if(w.location && w.location.area==="fridge" && !w.location.rack){
      here = w.qty||1;
    }
    return { w, here };
  }).filter(e=>e.here>0);
}
function rackRowCount(wines, rowNum){
  let n = 0;
  wines.forEach(w=>{
    if(Array.isArray(w.slots) && w.slots.length){
      n += w.slots.filter(s=>s && s.area==="rack" && s.row===rowNum).length;
    } else if(w.location && w.location.area==="rack" && w.location.row===rowNum && w.location.col){
      n += w.qty||1;
    }
  });
  return n;
}
function rackRowEntries(wines, rowNum){
  return wines.map(w=>{
    let here = 0;
    if(Array.isArray(w.slots) && w.slots.length){
      here = w.slots.filter(s=>s && s.area==="rack" && s.row===rowNum).length;
    } else if(w.location && w.location.area==="rack" && w.location.row===rowNum && w.location.col){
      here = Math.max(1, w.qty||1);
    }
    return { w, here };
  }).filter(e=>e.here>0);
}
// col -> wine occupying that column in a given row
function rackRowOccupancy(wines, rowNum){
  const map = {};
  wines.forEach(w=>{
    if(Array.isArray(w.slots) && w.slots.length){
      w.slots.forEach(s=>{ if(s && s.area==="rack" && s.row===rowNum && s.col) map[s.col]=w; });
    } else if(w.location && w.location.area==="rack" && w.location.row===rowNum && w.location.col){
      const n = Math.max(1, w.qty||1);
      for(let i=0;i<n;i++){ const c=w.location.col+i; if(c>=1 && c<=RACK_COLS) map[c]=w; }
    }
  });
  return map;
}
function rackTopEntries(wines){
  return wines.map(w=>{
    let here = 0;
    if(Array.isArray(w.slots) && w.slots.length){
      here = w.slots.filter(s=>s && s.area==="rack" && s.section==="top").length;
    } else if(w.location && w.location.area==="rack" && w.location.section==="top"){
      here = w.qty||1;
    }
    return { w, here };
  }).filter(e=>e.here>0);
}

/* ---------- small shared bits ---------- */
function FillBar({ frac, color }){
  return (
    <div style={{height:5,borderRadius:30,background:"var(--bg2)",overflow:"hidden"}}>
      <div style={{height:"100%",width:Math.round(Math.min(1,frac)*100)+"%",background:color,borderRadius:30,transition:"width .2s"}}/>
    </div>
  );
}

function PositionWineRow({ w, here, dimmed, highlighted, onOpen, onMove }){
  const total = w.qty||1;
  const partial = here!=null && here<total;
  return (
    <div className="card" style={{padding:"10px 12px",marginBottom:8,display:"flex",gap:11,alignItems:"center",
      borderColor:highlighted?"var(--gold)":"var(--line)", background:highlighted?"var(--gold-tint)":"var(--card)", opacity:dimmed?.45:1}}>
      <WineSwatch w={w} size={36}/>
      <div style={{flex:1,minWidth:0}} onClick={()=>onOpen(w.id)}>
        <div style={{fontSize:14.5,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.producer}{w.cuvee?<span className="cuvee"> · {w.cuvee}</span>:""}</div>
        <div className="muted" style={{fontSize:12,marginTop:1,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span>{w.vintage}</span>
          <span style={{fontWeight:partial?700:400,color:partial?"var(--amber, #c07a1e)":"inherit"}}>{here!=null?`· ${here}/${total} bottles`:`· ×${total}`}</span>
          {w.location&&w.location.area==="fridge"&&w.location.depth?<span>· {w.location.depth==="front"?"Front":"Back"}</span>:null}
          {partial && <span className="chip" style={{padding:"1px 7px",fontSize:10,background:"var(--gold-tint)",color:"#7a571c",fontWeight:700}}>rest elsewhere</span>}
        </div>
      </div>
      <button className="btn sm ghost" onClick={()=>onMove(w)}>Move</button>
    </div>
  );
}

/* ---------- fridge: rack grid + detail ---------- */
function FridgeMap({ wines, onOpen, onMove }){
  const [rack, setRack] = React.useState(null);
  const unassigned = fridgeUnassignedEntries(wines);

  return (
    <div>
      <div className="section-label" style={{marginBottom:8}}>Tap a rack (1–15)</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:7,marginBottom:14}}>
        {Array.from({length:FRIDGE_RACKS},(_,i)=>i+1).map(n=>{
          const cnt = fridgeRackCount(wines, n);
          const on = rack===n;
          return (
            <button key={n} onClick={()=>setRack(on?null:n)}
              style={{height:58,borderRadius:11,position:"relative",
                background:on?"#2a6fdb":"var(--card)",
                border:"1.5px solid "+(on?"#2a6fdb":cnt>0?"#2a6fdb33":"var(--line2)"),
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"4px 6px"}}>
              <span style={{fontSize:16,fontWeight:700,color:on?"#fff":"var(--ink)"}}>{n}</span>
              <span style={{width:"70%"}}><FillBar frac={cnt/FRIDGE_CAP_PER_RACK} color={on?"#fff":"#2a6fdb"}/></span>
              <span style={{fontSize:9.5,fontWeight:600,color:on?"#fff":"var(--muted)"}}>{cnt}/{FRIDGE_CAP_PER_RACK}</span>
            </button>
          );
        })}
      </div>

      {rack!=null && (()=>{
        const entries = fridgeRackEntries(wines, rack);
        const totalHere = entries.reduce((s,e)=>s+e.here,0);
        return (
          <div className="fade-in">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:15,fontWeight:700}}>Rack {rack}</div>
              <span className="muted" style={{fontSize:12.5}}>{entries.length} {entries.length===1?"wine":"wines"} · {totalHere} bottles</span>
            </div>
            {entries.length===0
              ? <div className="empty" style={{padding:"24px 10px"}}>Nothing assigned to this rack.</div>
              : entries.map(({w,here})=><PositionWineRow key={w.id} w={w} here={here} onOpen={onOpen} onMove={onMove}/>)}
          </div>
        );
      })()}

      {rack==null && unassigned.length>0 && (
        <div className="fade-in" style={{marginTop:4}}>
          <div className="section-label" style={{marginBottom:8}}>In fridge, no rack set</div>
          {unassigned.map(({w,here})=><PositionWineRow key={w.id} w={w} here={here} onOpen={onOpen} onMove={onMove}/>)}
        </div>
      )}
    </div>
  );
}

/* ---------- wine rack: row grid + column detail ---------- */
function RackMap({ wines, onOpen, onMove }){
  const [row, setRow] = React.useState(null);
  const [selCol, setSelCol] = React.useState(null);
  const topWines = rackTopEntries(wines);
  const [showTop, setShowTop] = React.useState(false);

  function pickRow(r){ setRow(row===r?null:r); setSelCol(null); setShowTop(false); }

  return (
    <div>
      <button onClick={()=>{ setShowTop(s=>!s); setRow(null); setSelCol(null); }}
        style={{width:"100%",marginBottom:10,padding:"11px 14px",borderRadius:10,
          border:"1.5px solid "+(showTop?"#8b5e34":"var(--line2)"),
          background:showTop?"#8b5e34":"var(--card)", color:showTop?"#fff":"var(--ink)",
          display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:13.5,fontWeight:showTop?700:600}}>
        <span style={{display:"flex",alignItems:"center",gap:8}}><Ico n="cellar" s={15}/>Top of rack</span>
        <span style={{fontSize:11,fontWeight:600,opacity:.85}}>{topWines.length} {topWines.length===1?"wine":"wines"}</span>
      </button>

      {showTop ? (
        <div className="fade-in">
          {topWines.length===0
            ? <div className="empty" style={{padding:"24px 10px"}}>Nothing on the top shelf.</div>
            : topWines.map(({w,here})=><PositionWineRow key={w.id} w={w} here={here} onOpen={onOpen} onMove={onMove}/>)}
        </div>
      ) : (<>
        <div className="section-label" style={{marginBottom:8}}>Tap a row (A–L)</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:14}}>
          {Array.from({length:RACK_ROWS},(_,i)=>i+1).map(r=>{
            const letter = String.fromCharCode(64+r);
            const cnt = rackRowCount(wines, r);
            const on = row===r;
            return (
              <button key={r} onClick={()=>pickRow(r)}
                style={{height:54,borderRadius:11,
                  background:on?"#8b5e34":"var(--card)",
                  border:"1.5px solid "+(on?"#8b5e34":cnt>0?"#8b5e3433":"var(--line2)"),
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"4px 6px"}}>
                <span style={{fontSize:15,fontWeight:700,color:on?"#fff":"var(--ink)"}}>{letter}</span>
                <span style={{width:"75%"}}><FillBar frac={cnt/RACK_CAP_PER_ROW} color={on?"#fff":"#8b5e34"}/></span>
                <span style={{fontSize:9,fontWeight:600,color:on?"#fff":"var(--muted)"}}>{cnt}/{RACK_CAP_PER_ROW}</span>
              </button>
            );
          })}
        </div>

        {row!=null && (()=>{
          const letter = String.fromCharCode(64+row);
          const occ = rackRowOccupancy(wines, row);
          const entries = rackRowEntries(wines, row);
          return (
            <div className="fade-in">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:15,fontWeight:700}}>Row {letter}</div>
                <span className="muted" style={{fontSize:12.5}}>{entries.length} {entries.length===1?"wine":"wines"} · {rackRowCount(wines,row)}/{RACK_CAP_PER_ROW} bottles</span>
              </div>
              {/* column slot grid — tap a slot to see exactly what's stored there */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4,marginBottom:12}}>
                {Array.from({length:RACK_COLS},(_,i)=>i+1).map(c=>{
                  const occW = occ[c];
                  const on = selCol===c;
                  return (
                    <button key={c} onClick={()=>setSelCol(on?null:c)} disabled={!occW}
                      style={{height:38,borderRadius:7,position:"relative",
                        border:"1.5px solid "+(on?"#8b5e34":occW?"#8b5e3455":"var(--line2)"),
                        background:on?"#8b5e34":occW?"#8b5e340c":"var(--card)",
                        color:on?"#fff":"var(--faint)",fontSize:10,fontWeight:700,
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:occW?"pointer":"default"}}>
                      <span style={{fontSize:9,opacity:.75}}>{c}</span>
                      {occW && <span style={{width:5,height:5,borderRadius:"50%",background:on?"#fff":"#8b5e34",marginTop:1}}/>}
                    </button>
                  );
                })}
              </div>
              {selCol!=null && occ[selCol] && (()=>{
                const selW = occ[selCol];
                const selEntry = entries.find(e=>e.w.id===selW.id);
                return (
                  <div style={{marginBottom:4}}>
                    <PositionWineRow w={selW} here={selEntry?selEntry.here:1} highlighted onOpen={onOpen} onMove={onMove}/>
                  </div>
                );
              })()}
              {entries.length===0
                ? <div className="empty" style={{padding:"24px 10px"}}>Nothing assigned to this row.</div>
                : entries.map(({w,here})=>(
                    <PositionWineRow key={w.id} w={w} here={here} onOpen={onOpen} onMove={onMove}
                      highlighted={selCol!=null && occ[selCol]===w} dimmed={selCol!=null && occ[selCol]!==w}/>
                  ))}
            </div>
          );
        })()}
      </>)}
    </div>
  );
}

/* ---------- top-level screen ---------- */
function StorageMapScreen({ onClose, onOpenWine }){
  const wines = useCellar();
  const [env, setEnv] = React.useState("fridge");
  const [moveWine, setMoveWine] = React.useState(null);

  const fridgeTotal = wines.reduce((s,w)=>{
    if(Array.isArray(w.slots)&&w.slots.length) return s + w.slots.filter(x=>x&&x.area==="fridge").length;
    return s + ((w.location&&w.location.area==="fridge")?(w.qty||1):0);
  },0);
  const rackTotal = wines.reduce((s,w)=>{
    if(Array.isArray(w.slots)&&w.slots.length) return s + w.slots.filter(x=>x&&x.area==="rack").length;
    return s + ((w.location&&w.location.area==="rack")?(w.qty||1):0);
  },0);

  function openWine(id){ onOpenWine(id); }

  return (
    <div className="full-screen" style={{overflow:"hidden"}}>
      <div className="topbar">
        <div>
          <h1 style={{fontSize:22}}>Storage Map</h1>
          <div className="sub">Browse what's actually stored, by position</div>
        </div>
        <button className="icon-btn" onClick={onClose}><Ico n="x" s={19}/></button>
      </div>

      <div className="screen-wrap">
        <div style={{padding:"0 18px"}}>
          <div className="chip-row" style={{marginBottom:14}}>
            <span className={"chip "+(env==="fridge"?"on":"line")} onClick={()=>setEnv("fridge")}>
              <Ico n={AREA_ICON.fridge} s={14}/>Wine Fridge<span className="muted" style={{marginLeft:4,opacity:.8}}>({fridgeTotal})</span>
            </span>
            <span className={"chip "+(env==="rack"?"on":"line")} onClick={()=>setEnv("rack")}>
              <Ico n={AREA_ICON.rack} s={14}/>Wine Rack<span className="muted" style={{marginLeft:4,opacity:.8}}>({rackTotal})</span>
            </span>
          </div>

          {env==="fridge"
            ? <FridgeMap wines={wines} onOpen={openWine} onMove={setMoveWine}/>
            : <RackMap wines={wines} onOpen={openWine} onMove={setMoveWine}/>}
        </div>
      </div>

      {moveWine && <LocationSheet wine={moveWine} onClose={()=>setMoveWine(null)}/>}
    </div>
  );
}

Object.assign(window, { StorageMapScreen });
