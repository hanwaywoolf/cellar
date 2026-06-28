/* screen-stats.jsx — collection value & composition */

function Donut({ segs, size=92 }){
  const R=size/2-9, C=2*Math.PI*R; let acc=0;
  const total = segs.reduce((s,x)=>s+x.v,0)||1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="var(--bg2)" strokeWidth="11"/>
      {segs.map((s,i)=>{
        const len=(s.v/total)*C, off=-acc/total*C; acc+=s.v;
        return <circle key={i} cx={size/2} cy={size/2} r={R} fill="none" stroke={s.color} strokeWidth="11"
          strokeDasharray={`${len} ${C-len}`} strokeDashoffset={off} transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="butt"/>;
      })}
    </svg>
  );
}

function StatsScreen({ onDrill }){
  const wines = useCellar();
  const bottles = wines.reduce((s,w)=>s+(w.qty||1),0);
  const value = wines.reduce((s,w)=>s+((w.valueEst||0)*(w.qty||1)),0);
  const cost = wines.reduce((s,w)=>s+((w.paid||0)*(w.qty||1)),0);
  const gain = cost? Math.round(((value-cost)/cost)*100):null;
  const avg = bottles? value/bottles : 0;

  const byStatus = { peak:0, now:0, soon:0, early:0, hold:0, past:0 };
  wines.forEach(w=> byStatus[statusOf(w)] += (w.qty||1));
  const ready = byStatus.now + byStatus.soon + byStatus.peak;

  function agg(key, byValue=false){
    const m=new Map();
    wines.forEach(w=>{ const k=w[key]; if(!k) return; m.set(k,(m.get(k)||0)+(byValue? (w.valueEst||0)*(w.qty||1) : (w.qty||1))); });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
  }
  const varietals = agg("varietal").slice(0,6);
  const vmax = Math.max(1,...varietals.map(v=>v[1]));
  const countries = agg("country");
  const cmax = Math.max(1,...countries.map(v=>v[1]));

  const colorSeg = [["Red","#7a2233"],["White","#c8a93f"],["Sparkling","#b88a2a"],["Rosé","#d98a8f"]]
    .map(([c,col])=>({ label:c, color:col, v: wines.filter(w=>w.color===c).reduce((s,w)=>s+((w.valueEst||0)*(w.qty||1)),0) }))
    .filter(s=>s.v>0);

  const Stat = ({big, label, sub, color, onClick}) => {
    const inner = <>
      <div className="num" style={{fontSize:26, color:color||"var(--ink)"}}>{big}</div>
      <div style={{fontSize:12.5,fontWeight:600,marginTop:1}}>{label}</div>
      {sub&&<div className="muted" style={{fontSize:11.5,marginTop:1}}>{sub}</div>}
    </>;
    return onClick
      ? <button className="card" onClick={onClick} style={{padding:"14px 14px",textAlign:"left",width:"100%"}}>{inner}</button>
      : <div className="card" style={{padding:"14px 14px"}}>{inner}</div>;
  };

  return (
    <>
      <div className="topbar"><div><h1>Collection</h1><div className="sub">{wines.length} labels · {bottles} bottles</div></div></div>
      <div className="screen-wrap">
        <div style={{padding:"0 18px"}}>
          {/* hero value */}
          <div className="card" style={{padding:"18px 18px",marginBottom:14,background:"linear-gradient(160deg,var(--wine),var(--wine2))",color:"#f5ece1",borderColor:"transparent"}}>
            <div style={{fontSize:11.5,letterSpacing:1.4,textTransform:"uppercase",opacity:.8,fontWeight:700}}>Estimated value</div>
            <div className="num" style={{fontSize:44,lineHeight:1,marginTop:5}}>{fmt$(value)}</div>
            {gain!=null && <div style={{fontSize:13,fontWeight:700,marginTop:7,opacity:.95}}>{gain>=0?"▲":"▼"} {Math.abs(gain)}% vs {fmt$(cost)} paid</div>}
            <svg width="100%" height="40" viewBox="0 0 300 40" style={{marginTop:8,opacity:.9}}>
              <path d="M2 36 C 60 32, 110 22, 160 17 S 250 6, 298 4" fill="none" stroke="#f3e1b8" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
            <Stat big={fmt$(avg)} label="Avg / bottle"/>
            <Stat big={ready} label="Ready now" sub="drink / soon" color="var(--green)" onClick={ready?()=>onDrill({status:"ready"}):undefined}/>
            <Stat big={byStatus.hold} label="Aging" sub="holding" onClick={byStatus.hold?()=>onDrill({status:"hold"}):undefined}/>
          </div>

          {byStatus.past>0 && (
            <button className="card" onClick={()=>onDrill({status:"past"})} style={{padding:"12px 14px",marginBottom:18,display:"flex",gap:10,alignItems:"center",background:"#f6dfe3",borderColor:"transparent",width:"100%",textAlign:"left"}}>
              <span style={{color:"var(--red)"}}><Ico n="clock" s={20}/></span>
              <span style={{fontSize:13,color:"#7d2438",fontWeight:600,flex:1}}>{byStatus.past} bottle{byStatus.past>1?"s":""} past peak — drink up soon.</span>
              <span style={{color:"#7d2438"}}><Ico n="chevR" s={16}/></span>
            </button>
          )}

          {/* by varietal */}
          <div className="section-label" style={{marginBottom:11}}>By varietal</div>
          <div className="card" style={{padding:"15px 15px",marginBottom:18,display:"flex",flexDirection:"column",gap:4}}>
            {varietals.map(([name,n])=>(
              <button key={name} onClick={()=>onDrill({varietal:name})} style={{display:"grid",gridTemplateColumns:"96px 1fr 24px 14px",alignItems:"center",gap:10,width:"100%",background:"none",textAlign:"left",padding:"6px 0"}}>
                <span style={{fontSize:12.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</span>
                <div style={{height:8,background:"var(--bg2)",borderRadius:30,overflow:"hidden"}}><div style={{height:"100%",width:(n/vmax*100)+"%",background:"var(--wine)",borderRadius:30}}/></div>
                <span className="num" style={{fontSize:13,textAlign:"right"}}>{n}</span>
                <span className="muted" style={{display:"grid",placeItems:"center"}}><Ico n="chevR" s={13}/></span>
              </button>
            ))}
          </div>

          {/* color split + country */}
          <div className="section-label" style={{marginBottom:11}}>By value</div>
          <div className="card" style={{padding:"15px 15px",marginBottom:18,display:"flex",gap:16,alignItems:"center"}}>
            <Donut segs={colorSeg}/>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
              {colorSeg.map(s=>(
                <button key={s.label} onClick={()=>onDrill({color:s.label})} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:13,width:"100%",background:"none",textAlign:"left",padding:"5px 0"}}>
                  <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:10,height:10,borderRadius:3,background:s.color}}/>{s.label}</span>
                  <span style={{display:"flex",alignItems:"center",gap:8}}><span className="num">{fmt$(s.v)}</span><span className="muted"><Ico n="chevR" s={13}/></span></span>
                </button>
              ))}
            </div>
          </div>

          <div className="section-label" style={{marginBottom:11}}>By country</div>
          <div className="card" style={{padding:"15px 15px",marginBottom:26,display:"flex",flexDirection:"column",gap:4}}>
            {countries.map(([name,n])=>(
              <button key={name} onClick={()=>onDrill({country:name})} style={{display:"grid",gridTemplateColumns:"96px 1fr 24px 14px",alignItems:"center",gap:10,width:"100%",background:"none",textAlign:"left",padding:"6px 0"}}>
                <span style={{fontSize:12.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</span>
                <div style={{height:8,background:"var(--bg2)",borderRadius:30,overflow:"hidden"}}><div style={{height:"100%",width:(n/cmax*100)+"%",background:"var(--gold)",borderRadius:30}}/></div>
                <span className="num" style={{fontSize:13,textAlign:"right"}}>{n}</span>
                <span className="muted" style={{display:"grid",placeItems:"center"}}><Ico n="chevR" s={13}/></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { StatsScreen });
