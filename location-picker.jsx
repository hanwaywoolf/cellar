/* location-picker.jsx — storage location picker, display chips, edit sheet */

const STORAGE_AREAS = [
  { id:"fridge", label:"Wine Fridge", sub:"Polar · 180 bottles", color:"#2a6fdb" },
  { id:"rack",   label:"Wine Rack",   sub:"Wooden · 77 bottles", color:"#8b5e34" },
  { id:"bar",    label:"Bar Cooler",   sub:"Built into bar",      color:"#a8782f" },
  { id:"drinks", label:"Drinks Fridge",sub:"Quick-serve",         color:"#3d8b5e" },
];
const AREA_ICON = { fridge:"bottle", rack:"cellar", bar:"glass", drinks:"spark" };

const FRIDGE_RACKS = 15;
const RACK_ROWS = 7;   // A–G
const RACK_COLS = 11;   // 1–11

/* ---------- helpers ---------- */
function locationLabel(loc){
  if(!loc||!loc.area) return null;
  switch(loc.area){
    case "fridge":{ let s="Wine Fridge · Rack "+(loc.rack||"?"); if(loc.depth) s+=" · "+(loc.depth==="front"?"Front":"Back"); return s; }
    case "rack":{ return "Wine Rack · "+String.fromCharCode(64+(loc.row||1))+(loc.col||"?"); }
    case "bar": return "Bar Cooler";
    case "drinks": return "Drinks Fridge";
    default: return null;
  }
}
function locationShort(loc){
  if(!loc||!loc.area) return null;
  switch(loc.area){
    case "fridge": return "Fridge R"+(loc.rack||"?")+(loc.depth?(loc.depth==="front"?"F":"B"):"");
    case "rack": return "Rack "+String.fromCharCode(64+(loc.row||1))+(loc.col||"?");
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
function LocationChip({ loc, size }){
  if(!loc||!loc.area) return null;
  const color = locationColor(loc);
  const fs = size==="md" ? 12.5 : 11;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"14",color:color,borderRadius:6,padding:"3px 8px",fontSize:fs,fontWeight:600,whiteSpace:"nowrap"}}>
      <Ico n="pin" s={fs-1}/>{locationShort(loc)}
    </span>
  );
}

/* ---------- main picker ---------- */
function LocationPicker({ value, onChange, wines }){
  const area = value?.area || null;

  function pickArea(id){
    if(id===area){ onChange(null); return; }
    if(id==="bar"||id==="drinks"){ onChange({area:id}); return; }
    onChange({area:id});
  }
  function setRack(n){ onChange({...value, area:"fridge", rack:n}); }
  function setDepth(d){ onChange({...value, area:"fridge", depth:value?.depth===d?null:d}); }
  function setSlot(r,c){ onChange({area:"rack", row:r, col:c}); }

  /* occupied-position counts for visual hints */
  const occ = React.useMemo(()=>{
    const f={}, r={};
    (wines||[]).forEach(w=>{
      if(!w.location) return;
      if(w.location.area==="fridge"&&w.location.rack){
        const k="r"+w.location.rack;
        f[k]=(f[k]||0)+(w.qty||1);
      }
      if(w.location.area==="rack"&&w.location.row&&w.location.col){
        r[w.location.row+"-"+w.location.col]=true;
      }
    });
    return {f,r};
  },[wines]);

  return (
    <div>
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
              {(a.id==="bar"||a.id==="drinks")&&on&&<div style={{marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:a.color}}>✓ Selected</span></div>}
            </button>
          );
        })}
      </div>

      {/* fridge sub-picker */}
      {area==="fridge"&&(
        <div className="fade-in">
          <div className="section-label" style={{marginBottom:8}}>Select rack (1–15)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
            {Array.from({length:FRIDGE_RACKS},(_,i)=>i+1).map(n=>{
              const on=value?.rack===n;
              const cnt=occ.f["r"+n]||0;
              return (
                <button key={n} onClick={()=>setRack(n)}
                  style={{height:46,borderRadius:10,fontSize:16,fontWeight:700,
                    background:on?"#2a6fdb":"var(--card)",color:on?"#fff":"var(--ink)",
                    border:"1.5px solid "+(on?"#2a6fdb":"var(--line2)"),
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  {n}
                  {cnt>0&&!on&&<span style={{fontSize:8.5,color:"var(--muted)",marginTop:-2}}>{cnt}</span>}
                </button>
              );
            })}
          </div>
          {value?.rack&&(
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
        </div>
      )}

      {/* wine rack grid */}
      {area==="rack"&&(
        <div className="fade-in">
          <div className="section-label" style={{marginBottom:8}}>Tap a slot  ·  row A–G, column 1–11</div>
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
                        const on=value?.row===r&&value?.col===c;
                        const taken=occ.r[r+"-"+c];
                        return (
                          <td key={c} style={{padding:1.5}}>
                            <button onClick={()=>setSlot(r,c)}
                              style={{width:30,height:28,borderRadius:6,
                                border:"1.5px solid "+(on?"#8b5e34":taken?"#8b5e3440":"var(--line2)"),
                                background:on?"#8b5e34":taken?"#8b5e340c":"var(--card)",
                                color:on?"#fff":taken?"#8b5e34":"transparent",
                                fontSize:8,fontWeight:700,display:"grid",placeItems:"center",cursor:"pointer"}}>
                              {on?"✓":taken?"●":""}
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
          {value?.row&&value?.col&&(
            <div style={{marginTop:8,fontSize:13,fontWeight:600,color:"#8b5e34"}}>
              Selected: {String.fromCharCode(64+value.row)}{value.col}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- location card for detail views ---------- */
function LocationCard({ wine, onEdit }){
  const loc=wine?.location;
  if(!loc){
    return (
      <button onClick={onEdit} className="card" style={{padding:"14px 15px",marginBottom:14,width:"100%",textAlign:"left",display:"flex",gap:12,alignItems:"center",border:"1.5px dashed var(--line2)",background:"transparent"}}>
        <span style={{width:36,height:36,borderRadius:10,background:"var(--bg2)",display:"grid",placeItems:"center",color:"var(--muted)"}}><Ico n="pin" s={18}/></span>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:"var(--muted)"}}>Set storage location</div>
          <div style={{fontSize:12,color:"var(--faint)"}}>Tap to record where this bottle lives</div>
        </div>
        <span className="muted"><Ico n="chevR" s={16}/></span>
      </button>
    );
  }
  const color=locationColor(loc);
  return (
    <button onClick={onEdit} className="card" style={{padding:"14px 15px",marginBottom:14,width:"100%",textAlign:"left",display:"flex",gap:12,alignItems:"center",borderColor:color+"30",background:color+"08"}}>
      <span style={{width:36,height:36,borderRadius:10,background:color+"18",display:"grid",placeItems:"center",color:color}}><Ico n="pin" s={18}/></span>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600}}>{locationLabel(loc)}</div>
        <div style={{fontSize:12,color:"var(--muted)"}}>Tap to change</div>
      </div>
      <span className="muted"><Ico n="chevR" s={16}/></span>
    </button>
  );
}

/* ---------- edit sheet ---------- */
function LocationSheet({ wine, onClose }){
  const wines = useCellar();
  const [loc, setLoc] = React.useState(wine?.location||null);
  function save(){ Cellar.update(wine.id,{location:loc}); onClose(); }
  function clear(){ Cellar.update(wine.id,{location:null}); onClose(); }
  return (
    <Sheet onClose={onClose}>
      <div style={{padding:"6px 20px 26px"}}>
        <div style={{fontSize:20,fontWeight:600,marginBottom:4}}>Storage location</div>
        <div className="muted" style={{fontSize:13,marginBottom:14}}>Where is this bottle stored?</div>
        <LocationPicker value={loc} onChange={setLoc} wines={wines}/>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          {wine?.location&&<button className="btn ghost" style={{flex:0}} onClick={clear}>Clear</button>}
          <button className="btn primary block" style={{flex:1}} onClick={save}>Save location</button>
        </div>
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  STORAGE_AREAS, AREA_ICON, FRIDGE_RACKS, RACK_ROWS, RACK_COLS,
  locationLabel, locationShort, locationColor,
  LocationPicker, LocationChip, LocationCard, LocationSheet,
});
