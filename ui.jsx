/* ui.jsx — shared presentational components */

const Ico = ({ n, s=24, sw=1.8, fill=false }) => {
  const P = (d, o={}) => <path d={d} fill={fill?"currentColor":"none"} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...o} />;
  const C = (cx,cy,r) => <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={sw} />;
  const paths = {
    cellar: <>{P("M4 21V8l8-4 8 4v13")}{P("M4 21h16")}{P("M9 8v13M15 8v13")}</>,
    grape: <>{C(12,5,2.2)}{C(8.5,9.5,2.2)}{C(15.5,9.5,2.2)}{C(12,10,2.2)}{C(10,14,2.2)}{C(14,14,2.2)}{P("M12 3V1.5M12 1.5c2 0 3-1 3-1")}</>,
    glass: <>{P("M7 4h10l-1.2 7.5c-.3 2-1.9 3.3-3.8 3.3s-3.5-1.3-3.8-3.3L7 4Z")}{P("M12 14.8V20M8.5 20h7")}</>,
    spark: <>{P("M8 4h8l-.6 9c-.2 2.2-1.6 3.4-3.4 3.4S8.8 15.2 8.6 13L8 4Z")}{P("M12 16.6V21M9 21h6")}{P("M12 4V2")}</>,
    fork: <>{P("M7 3v6c0 1 .9 1.7 2 1.7s2-.7 2-1.7V3")}{P("M9 10.7V21")}{P("M16.5 3c-1.5.5-2.3 2.2-2.3 4.4 0 1.8 1 2.8 2.3 3V21")}</>,
    chart: <>{P("M4 4v16h16")}{P("M8 16v-5M12 16V7M16 16v-8")}</>,
    camera: <>{P("M3 8.5C3 7.7 3.6 7 4.5 7H7l1.2-2h7.6L17 7h2.5c.9 0 1.5.7 1.5 1.5V18c0 .9-.6 1.5-1.5 1.5h-15C3.6 19.5 3 18.9 3 18V8.5Z")}{C(12,13,3.4)}</>,
    search: <>{C(11,11,6.5)}{P("M16 16l4 4")}</>,
    filter: <>{P("M4 5h16l-6.2 7.2V19l-3.6-2v-4.8L4 5Z")}</>,
    plus: P("M12 5v14M5 12h14"),
    minus: P("M5 12h14"),
    chevR: P("M9 6l6 6-6 6"),
    chevL: P("M15 6l-6 6 6 6"),
    chevD: P("M6 9l6 6 6-6"),
    x: P("M6 6l12 12M18 6L6 18"),
    check: P("M5 12.5l4.5 4.5L19 7"),
    star: P("M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.9 7.2 19l.9-5.4L4.2 9.7l5.4-.8L12 4Z", {fill:fill?"currentColor":"none"}),
    pin: <>{P("M12 21s6.5-5.6 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.4 6.5 11 6.5 11Z")}{C(12,10,2.3)}</>,
    money: <>{C(12,12,8.5)}{P("M12 7v10M14.4 9.2c-.7-.7-4-1.3-4 .9 0 2 4 1 4 3 0 2.1-3.4 1.6-4.2.5")}</>,
    clock: <>{C(12,12,8.5)}{P("M12 7.2V12l3.2 2")}</>,
    flame: P("M12 3c1.2 3.2-2 4.3-2 7.2a2 2 0 0 0 4 0c0-.8-.3-1.4-.3-1.4 1.9 1.1 3 3 3 5.2A4.7 4.7 0 0 1 7 14c0-3.7 3.7-4.7 5-11Z"),
    users: <>{C(9,9,3)}{P("M3.5 19c.5-3.2 3-4.8 5.5-4.8s5 1.6 5.5 4.8")}{P("M16 6.3a3 3 0 0 1 0 5.7M17 14.4c2.1.5 3.5 2 3.8 4.6")}</>,
    leaf: <>{P("M5 19c0-8.5 6.3-13.5 14.5-13.5C19.5 14 13.2 19 5 19Z")}{P("M5 19c3.2-5.2 6.3-7.3 10.4-9.3")}</>,
    bottle: <>{P("M10 3h4M11 3v3.3c0 1-2.1 2.3-2.1 4.7v8.5c0 .9.6 1.5 1.4 1.5h3.4c.8 0 1.4-.6 1.4-1.5V11c0-2.4-2.1-3.7-2.1-4.7V3")}{P("M8.9 14h6.2")}</>,
    sliders: <>{P("M4 8h10M18 8h2M4 16h2M10 16h10")}{C(16,8,2)}{C(8,16,2)}</>,
    refresh: <>{P("M4 9a8 8 0 0 1 13.5-3L20 8")}{P("M20 4v4h-4")}{P("M20 15A8 8 0 0 1 6.5 18L4 16")}{P("M4 20v-4h4")}</>,
    trash: <>{P("M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12")}</>,
    edit: <>{P("M5 19h14")}{P("M14 5l4 4-9 9-4 1 1-4 8-8Z")}</>,
    image: <>{P("M4 5h16v14H4z")}{C(9,10,1.6)}{P("M4 17l5-4 4 3 3-2 4 3")}</>,
    sun: <>{C(12,12,4)}{P("M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4")}</>,
    info: <>{C(12,12,8.5)}{P("M12 11v5M12 8.2v.2")}</>,
    download: <>{P("M12 4v11M8 11l4 4 4-4")}{P("M4 19h16")}</>,
  };
  return <svg viewBox="0 0 24 24" width={s} height={s} style={{display:"block"}}>{paths[n]}</svg>;
};

// Color swatch for list rows; full bottle art kept for detail/scan
const WineSwatch = ({ w, size=42 }) => {
  const tint = (COLOR_HEX[w?.color] || "#7a2233");
  return (
    <div className="wine-swatch" style={{width:size,height:size,background:`${tint}14`}}>
      <div className="dot-inner" style={{background:tint}}/>
    </div>
  );
};

// Full bottle artwork for detail/scan screens
const Bottle = ({ w, size=54, h }) => {
  const H = h || Math.round(size*1.55);
  const tint = (COLOR_HEX[w?.color] || "#7a2233");
  if(w?.photo){
    return <div className="bottle-art" style={{width:size,height:H}}><img src={w.photo} alt="" /></div>;
  }
  return (
    <div className="bottle-art" style={{width:size,height:H, background:`linear-gradient(150deg, ${tint}22, ${tint}10)`}}>
      <div className="glass" style={{background:`linear-gradient(105deg, ${tint}, ${tint}cc)`}}>
        <div className="label-band"><i style={{width:"70%"}}/><i style={{width:"90%"}}/><i style={{width:"50%"}}/></div>
      </div>
    </div>
  );
};

const StatusPill = ({ w }) => {
  const s = statusOf(w);
  return <span className={"stat-pill st-"+s}><span className={"dot "+s}/>{statusLabel(w)}</span>;
};

const DrinkMeter = ({ w }) => {
  const g = meterGeom(w);
  if(!g) return null;
  return (
    <div>
      <div className="meter">
        <div className="peak" style={{left:(g.peakL*100)+"%", width:((g.peakR-g.peakL)*100)+"%"}}/>
        <div className="now" style={{left:`calc(${g.now*100}% - 1.5px)`}}/>
      </div>
      <div className="meter-axis"><span>{w.drinkFrom}</span><span className="gold" style={{fontWeight:700}}>peak {w.peakFrom}–{w.peakTo}</span><span>{w.drinkTo}</span></div>
    </div>
  );
};

const Trait = ({ label, v }) => (
  <div className="trait"><span className="muted">{label}</span><div className="bar"><i style={{width:Math.max(4,v)+"%"}}/></div></div>
);

const ColorDot = ({ color, size=9 }) => <span style={{width:size,height:size,borderRadius:"50%",background:COLOR_HEX[color]||"#7a2233",display:"inline-block",flex:"0 0 auto"}}/>;

// compact rating pills — "RP 97 · JS 95", falls back to critScore
const RatingPills = ({ w, max=3, size="sm" }) => {
  const list = ratingsList(w);
  const fs = size==="sm" ? 10.5 : 12;
  if(!list.length){
    if(!w || !w.critScore) return null;
    return <span style={{display:"inline-flex",gap:4}}><span style={{display:"inline-flex",alignItems:"center",gap:2,background:"var(--bg2)",borderRadius:6,padding:"2px 6px",fontSize:fs,fontWeight:700,lineHeight:1.3}}><span style={{opacity:.6,fontWeight:600}}>★</span>{Math.round(w.critScore)}</span></span>;
  }
  const shown = list.slice(0, max);
  return (
    <span style={{display:"inline-flex",gap:4,flexWrap:"wrap"}}>
      {shown.map(([k,v])=>(
        <span key={k} style={{display:"inline-flex",alignItems:"center",gap:2,background:"var(--bg2)",borderRadius:6,padding:"2px 6px",fontSize:fs,fontWeight:700,lineHeight:1.3}}>
          <span style={{opacity:.6,fontWeight:600}}>{k}</span>{Math.round(v)}
        </span>
      ))}
    </span>
  );
};

// quantity stepper
const QtyStepper = ({ value, onChange, min=0 }) => (
  <div style={{display:"inline-flex",alignItems:"center",background:"var(--card)",border:"1px solid var(--line2)",borderRadius:12,overflow:"hidden"}}>
    <button onClick={()=>onChange(Math.max(min,value-1))} style={{width:40,height:40,display:"grid",placeItems:"center"}}><Ico n="minus" s={18}/></button>
    <span className="num" style={{minWidth:34,textAlign:"center",fontSize:19}}>{value}</span>
    <button onClick={()=>onChange(value+1)} style={{width:40,height:40,display:"grid",placeItems:"center"}}><Ico n="plus" s={18}/></button>
  </div>
);

// bottom sheet wrapper — portaled to <body> so position:fixed always resolves
// against the viewport (never a transformed ancestor like the page-fade wrapper)
const Sheet = ({ onClose, children }) => {
  React.useEffect(()=>{ const k=e=>e.key==="Escape"&&onClose(); window.addEventListener("keydown",k); return ()=>window.removeEventListener("keydown",k); },[]);
  return ReactDOM.createPortal(
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="grab"/>
        {children}
      </div>
    </div>,
    document.body
  );
};

Object.assign(window, { Ico, WineSwatch, Bottle, StatusPill, DrinkMeter, Trait, ColorDot, RatingPills, QtyStepper, Sheet });
