/* location-picker.jsx — storage location picker, display chips, edit sheet */

const STORAGE_AREAS = [
  { id:"fridge", label:"Wine Fridge", sub:"Polar · 180 bottles", color:"#2a6fdb" },
  { id:"rack",   label:"Wine Rack",   sub:"Wooden · 120 bottles", color:"#8b5e34" },
  { id:"bar",    label:"Bar Cooler",   sub:"Built into bar",      color:"#a8782f" },
  { id:"drinks", label:"Drinks Fridge",sub:"Quick-serve",         color:"#3d8b5e" },
];
const AREA_ICON = { fridge:"bottle", rack:"cellar", bar:"glass", drinks:"spark" };

const FRIDGE_RACKS = 15;
const RACK_ROWS = 12;   // A–L  (12 deep)
const RACK_COLS = 10;   // 1–10 (10 wide)  → 120-bottle capacity, plus a "Top" shelf

/* ---------- helpers ---------- */
// A rack-stored wine occupies `qty` consecutive columns from its starting column,
// e.g. 4 bottles placed at row A col 1 fill A1–A4. Clamp the end to the rack width.
function rackRange(loc, qty){
  const letter = String.fromCharCode(64+(loc.row||1));
  const start = loc.col||1;
  const n = Math.max(1, qty||1);
  const end = Math.min(start + n - 1, RACK_COLS);
  return end>start ? (letter+start+"–"+letter+end) : (letter+start);
}

// Every wine resolves to a list of explicit slots. New multi-bottle scans store
// `w.slots` (one entry per chosen spot). Legacy wines only have `w.location`.
function getSlots(w){
  if(!w) return [];
  if(Array.isArray(w.slots) && w.slots.length) return w.slots.filter(Boolean);
  if(w.location) return [w.location];
  return [];
}
// compress a list of column numbers into contiguous runs: [1,2,3,5] → [[1,3],[5,5]]
function colRuns(cols){
  const u=[...new Set(cols)].sort((a,b)=>a-b); const out=[]; let i=0;
  while(i<u.length){ let j=i; while(j+1<u.length && u[j+1]===u[j]+1) j++; out.push([u[i],u[j]]); i=j+1; }
  return out;
}
// summarize an array of slots into a chip (short) or card (long) string
function summarizeSlots(slots, long){
  slots = (slots||[]).filter(Boolean);
  if(!slots.length) return null;
  const area = slots[0].area;
  if(!slots.every(s=>s.area===area)) return slots.length+" spots";
  switch(area){
    case "rack":{
      const tops = slots.some(s=>s.section==="top");
      const cells = slots.filter(s=>s.row&&s.col);
      const byRow={}; cells.forEach(s=>{ (byRow[s.row]=byRow[s.row]||[]).push(s.col); });
      const parts=[];
      Object.keys(byRow).map(Number).sort((a,b)=>a-b).forEach(r=>{
        const L=String.fromCharCode(64+r);
        colRuns(byRow[r]).forEach(([a,b])=> parts.push(a===b ? L+a : L+a+"–"+L+b));
      });
      if(tops) parts.push("Top");
      const body = parts.join(", ");
      return long ? "Wine Rack · "+body : "Rack "+body;
    }
    case "fridge":{
      const racks=[...new Set(slots.map(s=>s.rack).filter(Boolean))].sort((a,b)=>a-b);
      if(!racks.length) return long ? "Wine Fridge" : "Fridge";
      return long ? "Wine Fridge · "+(racks.length>1?"Racks ":"Rack ")+racks.join(", ")
                  : "Fridge "+racks.map(r=>"R"+r).join(",");
    }
    case "bar": return long ? "Bar Cooler" : "Bar";
    case "drinks": return long ? "Drinks Fridge" : "Drinks";
    default: return null;
  }
}
function locationLabel(loc, qty){
  if(!loc||!loc.area) return null;
  switch(loc.area){
    case "fridge":{ let s="Wine Fridge · Rack "+(loc.rack||"?"); if(loc.depth) s+=" · "+(loc.depth==="front"?"Front":"Back"); return s; }
    case "rack":{ if(loc.section==="top") return "Wine Rack · Top"; return "Wine Rack · "+rackRange(loc, qty); }
    case "bar": return "Bar Cooler";
    case "drinks": return "Drinks Fridge";
    default: return null;
  }
}
function locationShort(loc, qty){
  if(!loc||!loc.area) return null;
  switch(loc.area){
    case "fridge": return "Fridge R"+(loc.rack||"?")+(loc.depth?(loc.depth==="front"?"F":"B"):"");
    case "rack": return loc.section==="top" ? "Rack Top" : "Rack "+rackRange(loc, qty);
    case "bar": return "Bar";
    case "drinks": return "Drinks";
    default: return "?";
  }
}
function locationColor(loc){
  if(!loc||!loc.area) return "var(--muted)";
  const a = STORAGE_AREAS.find(x=>x.id===loc.area);
  return a ? a.color : "var(--muted)";
}

/* ---------- display chip ---------- */
function LocationChip({ loc, qty, slots, size, w }){
  const arr = (slots && slots.length) ? slots.filter(Boolean) : (w ? getSlots(w) : null);
  const fs = size==="md" ? 12.5 : 11;
  if(arr && arr.length>1){
    const color = locationColor(arr[0]);
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"14",color:color,borderRadius:6,padding:"3px 8px",fontSize:fs,fontWeight:600,whiteSpace:"nowrap"}}>
        <Ico n="pin" s={fs-1}/>{summarizeSlots(arr)}
      </span>
    );
  }
  const single = loc || (arr && arr[0]);
  if(!single||!single.area) return null;
  const color = locationColor(single);
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"14",color:color,borderRadius:6,padding:"3px 8px",fontSize:fs,fontWeight:600,whiteSpace:"nowrap"}}>
      <Ico n="pin" s={fs-1}/>{locationShort(single, qty)}
    </span>
  );
}

/* ---------- main picker ---------- */
function LocationPicker({ value, onChange, wines, qty=1, highlightSlots }){
  const multi = (qty||1) > 1;
  // normalize incoming value → slot array
  const slots = React.useMemo(()=> Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []), [value]);
  // remember the chosen area even before any slot is picked
  const [areaState, setAreaState] = React.useState(slots[0]?.area || null);
  const area = slots[0]?.area || areaState;
  const remaining = Math.max(0, qty - slots.length);

  // single mode emits an object|null; multi mode emits an array
  function emit(nextArr){ onChange(multi ? nextArr : (nextArr[0]||null)); }
  const cur = slots[0] || null; // single-mode working slot

  function pickArea(id){
    if(id===area){ setAreaState(null); emit([]); return; }
    setAreaState(id);
    if(id==="bar"||id==="drinks"){ emit([{area:id}]); }
    else emit([]); // wait for slot selection in fridge / rack
  }

  /* ----- fridge ----- */
  function setRackSingle(n){ emit([{...cur, area:"fridge", rack:n}]); }
  function setDepth(d){ emit([{...cur, area:"fridge", depth:cur?.depth===d?undefined:d}]); }
  // Multi-bottle fridge: a rack holds many bottles, so tapping a rack assigns one
  // more bottle to it (tap 3× to put all three on the same rack). Tapping once the
  // count would overflow `qty` clears that rack so you can re-allocate.
  function bumpRack(n){
    const count = slots.filter(s=>s.area==="fridge"&&s.rack===n).length;
    const others = slots.filter(s=>!(s.area==="fridge"&&s.rack===n));
    const newCount = count + 1;
    if(others.length + newCount <= qty){
      const add = Array.from({length:newCount},()=>({area:"fridge", rack:n}));
      emit([...others, ...add]);
    } else {
      emit(others); // would exceed → clear this rack's bottles
    }
  }

  /* ----- rack grid ----- */
  function setSlotSingle(r,c){ emit([{area:"rack", row:r, col:c}]); }
  function toggleSlot(r,c){
    const i = slots.findIndex(s=>s.area==="rack"&&s.row===r&&s.col===c);
    if(i>=0){ emit(slots.filter((_,k)=>k!==i)); return; }
    if(slots.length>=qty) return;
    emit([...slots, {area:"rack", row:r, col:c}]);
  }
  function setTop(){
    if(!multi){ emit(cur?.section==="top" ? [] : [{area:"rack", section:"top"}]); return; }
    const i = slots.findIndex(s=>s.area==="rack"&&s.section==="top");
    if(i>=0){ emit(slots.filter((_,k)=>k!==i)); return; }
    if(slots.length>=qty) return;
    emit([...slots, {area:"rack", section:"top"}]);
  }
  const slotIndex = (r,c)=> slots.findIndex(s=>s.area==="rack"&&s.row===r&&s.col===c);
  const rackSelected = (r,c)=> multi ? slotIndex(r,c)>=0 : (cur?.row===r&&cur?.col===c);
  const topSelected = multi ? slots.some(s=>s.section==="top") : cur?.section==="top";

  /* occupied-position counts for visual hints (across the whole cellar) */
  const occ = React.useMemo(()=>{
    const f={}, r={};
    (wines||[]).forEach(w=>{
      const ws = getSlots(w);
      if(Array.isArray(w.slots) && w.slots.length){
        // explicit slots — mark each one
        ws.forEach(loc=>{
          if(loc.area==="fridge"&&loc.rack){ const k="r"+loc.rack; f[k]=(f[k]||0)+1; }
          if(loc.area==="rack"&&loc.row&&loc.col){ r[loc.row+"-"+loc.col]=true; }
        });
      } else if(w.location){
        const loc=w.location;
        if(loc.area==="fridge"&&loc.rack){ const k="r"+loc.rack; f[k]=(f[k]||0)+(w.qty||1); }
        if(loc.area==="rack"&&loc.row&&loc.col){
          const n=Math.max(1, w.qty||1);
          for(let i=0;i<n;i++){ const c=loc.col+i; if(c>=1&&c<=RACK_COLS) r[loc.row+"-"+c]=true; }
        }
      }
    });
    return {f,r};
  },[wines]);

  /* spots where this SAME wine's other bottles already live — drawn in gold so
     the user can place the new bottles right next to them. */
  const hl = React.useMemo(()=>{
    const f={}, r={};
    (highlightSlots||[]).forEach(s=>{
      if(!s||!s.area) return;
      if(s.area==="fridge"&&s.rack){ const k="r"+s.rack; f[k]=(f[k]||0)+1; }
      if(s.area==="rack"&&s.row&&s.col){ r[s.row+"-"+s.col]=true; }
    });
    return {f,r};
  },[highlightSlots]);
  const hasHl = (highlightSlots||[]).some(s=>s&&s.area);

  /* progress banner for multi-bottle scans */
  const ProgressNote = ({verb})=> multi ? (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--gold-tint)",border:"1px solid transparent",borderRadius:10,padding:"8px 11px",marginBottom:10}}>
      <span className="gold" style={{flex:"0 0 auto"}}><Ico n="pin" s={15}/></span>
      <span style={{fontSize:12,color:"#7a571c",fontWeight:600,lineHeight:1.3}}>
        {remaining>0
          ? `${verb} ${qty} spots — ${slots.length} of ${qty} chosen, ${remaining} to go`
          : `All ${qty} spots chosen ✓`}
      </span>
    </div>
  ) : null;

  return (
    <div>
      {hasHl && (
        <div style={{display:"flex",alignItems:"center",gap:8,background:"#8b5e340e",border:"1px solid #8b5e3433",borderRadius:10,padding:"8px 11px",marginBottom:10}}>
          <span style={{width:12,height:12,borderRadius:4,background:"#fff",border:"2px solid #c9962f",flex:"0 0 auto"}}/>
          <span style={{fontSize:12,color:"#7a571c",fontWeight:600,lineHeight:1.3}}>Gold-ringed spots hold your other bottles of this wine — place these alongside them.</span>
        </div>
      )}
      {/* area cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:area?14:0}}>
        {STORAGE_AREAS.map(a=>{
          const on=area===a.id;
          return (
            <button key={a.id} onClick={()=>pickArea(a.id)} className="card"
              style={{padding:"12px 13px",textAlign:"left",borderColor:on?a.color:"var(--line2)",background:on?a.color+"0c":"var(--card)",transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:28,height:28,borderRadius:8,background:a.color+(on?"22":"12"),color:a.color,display:"grid",placeItems:"center",flex:"0 0 auto"}}>
                  <Ico n={AREA_ICON[a.id]} s={15}/>
                </span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:on?700:600,color:on?a.color:"var(--ink)"}}>{a.label}</div>
                  <div className="muted" style={{fontSize:10.5}}>{a.sub}</div>
                </div>
              </div>
              {(a.id==="bar"||a.id==="drinks")&&on&&<div style={{marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:a.color}}>✓ All {qty>1?qty+" bottles":"bottle"} here</span></div>}
            </button>
          );
        })}
      </div>

      {/* fridge sub-picker */}
      {area==="fridge"&&(
        <div className="fade-in">
          <ProgressNote verb="Pick"/>
          <div className="section-label" style={{marginBottom:8}}>{multi?"Tap a rack once per bottle (1–15)":"Select rack (1–15)"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
            {Array.from({length:FRIDGE_RACKS},(_,i)=>i+1).map(n=>{
              const here = multi ? slots.filter(s=>s.area==="fridge"&&s.rack===n).length : (value?.rack===n?1:0);
              const on = here>0;
              const cnt=occ.f["r"+n]||0;
              const gold=hl.f["r"+n]||0;
              const full = multi && !on && slots.length>=qty;
              return (
                <button key={n} onClick={()=>multi?bumpRack(n):setRackSingle(n)} disabled={full}
                  style={{height:46,borderRadius:10,fontSize:16,fontWeight:700,position:"relative",
                    background:on?"#2a6fdb":"var(--card)",color:on?"#fff":full?"var(--faint)":"var(--ink)",
                    border:"1.5px solid "+(on?"#2a6fdb":gold?"#c9962f":"var(--line2)"),opacity:full?.5:1,
                    boxShadow:gold&&!on?"0 0 0 2px #c9962f55 inset":"none",
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  {n}
                  {cnt>0&&!on&&<span style={{fontSize:8.5,color:gold?"#9a6f1c":"var(--muted)",marginTop:-2}}>{cnt}</span>}
                  {multi&&here>0&&<span style={{position:"absolute",top:3,right:5,fontSize:9.5,fontWeight:800}}>×{here}</span>}
                </button>
              );
            })}
          </div>
          {multi && (
            <div className="muted" style={{fontSize:11.5,marginTop:-2,marginBottom:8}}>
              All on one rack? Tap it {qty} times. Over-tap a rack to clear it.
            </div>
          )}
          {!multi && value?.rack&&(
            <div className="fade-in">
              <div className="section-label" style={{marginBottom:7}}>Depth (optional)</div>
              <div style={{display:"flex",gap:8}}>
                {["front","back"].map(d=>{
                  const on=value?.depth===d;
                  return (
                    <button key={d} onClick={()=>setDepth(d)} className="chip"
                      style={{padding:"8px 16px",fontSize:13,fontWeight:on?700:500,
                        background:on?"#2a6fdb":"transparent",color:on?"#fff":"var(--ink)",
                        borderColor:on?"#2a6fdb":"var(--line2)"}}>
                      {d==="front"?"Front row":"Back row"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {multi && slots.length>0 && (
            <div style={{marginTop:8,fontSize:13,fontWeight:600,color:"#2a6fdb"}}>
              Selected: {summarizeSlots(slots)}
            </div>
          )}
        </div>
      )}

      {/* wine rack grid */}
      {area==="rack"&&(
        <div className="fade-in">
          <ProgressNote verb="Tap"/>
          <button onClick={setTop}
            style={{width:"100%",marginBottom:10,padding:"11px 14px",borderRadius:10,
              border:"1.5px solid "+(topSelected?"#8b5e34":"var(--line2)"),
              background:topSelected?"#8b5e34":"var(--card)",
              color:topSelected?"#fff":"var(--ink)",
              display:"flex",alignItems:"center",justifyContent:"space-between",
              fontSize:13.5,fontWeight:topSelected?700:600}}>
            <span style={{display:"flex",alignItems:"center",gap:8}}><Ico n="cellar" s={15}/>Top of rack</span>
            <span style={{fontSize:11,fontWeight:600,opacity:.85}}>{topSelected?"✓ Selected":"upper storage shelf"}</span>
          </button>
          <div className="section-label" style={{marginBottom:8}}>{multi?`Tap ${qty} slots`:"Tap a slot"}  ·  row A–L, column 1–10</div>
          <div style={{overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
            <table style={{borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{width:22}}></th>
                  {Array.from({length:RACK_COLS},(_,i)=>i+1).map(c=>(
                    <th key={c} style={{fontSize:10,fontWeight:600,color:"var(--muted)",textAlign:"center",padding:"0 0 4px",width:30}}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({length:RACK_ROWS},(_,i)=>i+1).map(r=>{
                  const letter=String.fromCharCode(64+r);
                  return (
                    <tr key={r}>
                      <td style={{fontSize:11,fontWeight:700,color:"var(--muted)",textAlign:"center",padding:"2px 4px 2px 0"}}>{letter}</td>
                      {Array.from({length:RACK_COLS},(_,j)=>j+1).map(c=>{
                        const on=rackSelected(r,c);
                        const idx=multi?slotIndex(r,c):-1;
                        const taken=occ.r[r+"-"+c];
                        const gold=hl.r[r+"-"+c];
                        const full=multi&&!on&&slots.length>=qty;
                        return (
                          <td key={c} style={{padding:1.5}}>
                            <button onClick={()=>multi?toggleSlot(r,c):setSlotSingle(r,c)} disabled={full}
                              style={{width:30,height:28,borderRadius:6,
                                border:"1.5px solid "+(on?"#8b5e34":gold?"#c9962f":taken?"#8b5e3440":"var(--line2)"),
                                background:on?"#8b5e34":gold?"#f6e4bd":taken?"#8b5e340c":"var(--card)",
                                color:on?"#fff":gold?"#9a6f1c":taken?"#8b5e34":"transparent",opacity:full?.45:1,
                                boxShadow:gold&&!on?"0 0 0 2px #c9962f66 inset":"none",
                                fontSize:on&&multi?10:8,fontWeight:700,display:"grid",placeItems:"center",cursor:full?"default":"pointer"}}>
                              {on?(multi?(idx+1):"✓"):gold?"●":taken?"●":""}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(multi ? slots.length>0 : (cur?.row&&cur?.col)) && (
            <div style={{marginTop:8,fontSize:13,fontWeight:600,color:"#8b5e34"}}>
              Selected: {multi ? summarizeSlots(slots) : (String.fromCharCode(64+cur.row)+cur.col)}
            </div>
          )}
          {!multi && topSelected && (
            <div style={{marginTop:8,fontSize:13,fontWeight:600,color:"#8b5e34"}}>
              Selected: Top of rack
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- location card for detail views ---------- */
function LocationCard({ wine, onEdit }){
  const slots=getSlots(wine);
  if(!slots.length){
    return (
      <button onClick={onEdit} className="card" style={{padding:"14px 15px",marginBottom:14,width:"100%",textAlign:"left",display:"flex",gap:12,alignItems:"center",border:"1.5px dashed var(--line2)",background:"transparent"}}>
        <span style={{width:36,height:36,borderRadius:10,background:"var(--bg2)",display:"grid",placeItems:"center",color:"var(--muted)"}}><Ico n="pin" s={18}/></span>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:"var(--muted)"}}>Set storage location</div>
          <div style={{fontSize:12,color:"var(--faint)"}}>Tap to record where {wine.qty>1?"these bottles live":"this bottle lives"}</div>
        </div>
        <span className="muted"><Ico n="chevR" s={16}/></span>
      </button>
    );
  }
  const primary=slots[0];
  const color=locationColor(primary);
  const labelText = slots.length>1 ? summarizeSlots(slots, true) : locationLabel(primary, wine.qty);
  return (
    <button onClick={onEdit} className="card" style={{padding:"14px 15px",marginBottom:14,width:"100%",textAlign:"left",display:"flex",gap:12,alignItems:"center",borderColor:color+"30",background:color+"08"}}>
      <span style={{width:36,height:36,borderRadius:10,background:color+"18",display:"grid",placeItems:"center",color:color}}><Ico n="pin" s={18}/></span>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600}}>{labelText}</div>
        <div style={{fontSize:12,color:"var(--muted)"}}>{slots.length>1?`${slots.length} spots · tap to change`:"Tap to change"}</div>
      </div>
      <span className="muted"><Ico n="chevR" s={16}/></span>
    </button>
  );
}

/* ---------- edit sheet ---------- */
function LocationSheet({ wine, onClose }){
  const wines = useCellar();
  const qty = Math.max(1, wine?.qty||1);
  const multi = qty>1;
  const init = getSlots(wine);
  const [loc, setLoc] = React.useState(multi ? init : (init[0]||null));
  function save(){
    let patch;
    if(multi){
      const arr = Array.isArray(loc) ? loc.filter(Boolean) : (loc?[loc]:[]);
      patch = { slots: arr.length?arr:null, location: arr[0]||null };
    } else {
      patch = { location: loc, slots: null };
    }
    Cellar.update(wine.id, patch); onClose();
  }
  function clear(){ Cellar.update(wine.id,{location:null, slots:null}); onClose(); }
  const hasLoc = init.length>0;
  return (
    <Sheet onClose={onClose}>
      <div style={{padding:"6px 20px 26px"}}>
        <div style={{fontSize:20,fontWeight:600,marginBottom:4}}>Storage location</div>
        <div className="muted" style={{fontSize:13,marginBottom:14}}>{multi?`Where are these ${qty} bottles stored?`:"Where is this bottle stored?"}</div>
        <LocationPicker value={loc} onChange={setLoc} wines={wines} qty={qty}/>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          {hasLoc&&<button className="btn ghost" style={{flex:0}} onClick={clear}>Clear</button>}
          <button className="btn primary block" style={{flex:1}} onClick={save}>Save location</button>
        </div>
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  STORAGE_AREAS, AREA_ICON, FRIDGE_RACKS, RACK_ROWS, RACK_COLS,
  locationLabel, locationShort, locationColor, getSlots, summarizeSlots,
  LocationPicker, LocationChip, LocationCard, LocationSheet,
});
