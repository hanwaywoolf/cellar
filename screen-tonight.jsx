/* screen-tonight.jsx — smart "what should I drink tonight?" */

const FOOD_PREF = {
  "Steak":["Red"], "Fish":["White","Sparkling"], "Pasta":["Red","White"],
  "Cheese":["Red","Sparkling"], "Veg":["White","Red"], "Spicy":["White","Sparkling"], "Poultry":["White","Red"],
};
const FOODS = Object.keys(FOOD_PREF);

function scoreWine(w, ctx){
  const s = statusOf(w);
  let score = ({peak:56, now:55, soon:40, early:22, past:14, hold:-12})[s] || 0;
  const reasons = [];
  if(s==="peak"){ reasons.push("at its peak"); }
  else if(s==="now"){ reasons.push("at its peak now"); }
  else if(s==="soon"){ reasons.push("drink-soon window"); }
  else if(s==="early"){ reasons.push("drinking well already"); }
  else if(s==="past"){ reasons.push("use it up"); }

  // food
  if(ctx.food){
    const pref = FOOD_PREF[ctx.food]||[];
    const pairHit = (w.pairings||[]).some(p=>p.toLowerCase().includes(ctx.food.toLowerCase()));
    if(pairHit){ score+=26; reasons.push(`pairs with ${ctx.food.toLowerCase()}`); }
    else if(pref.includes(w.color)){ score+=14; reasons.push(`${w.color.toLowerCase()} suits ${ctx.food.toLowerCase()}`); }
    else { score-=10; }
  }
  // feel
  if(ctx.feel==="Everyday"){ score += Math.min(w.qty||1,6)*3 - (w.valueEst||0)*0.12; if((w.valueEst||0)<30) reasons.push("easy weeknight pour"); }
  if(ctx.feel==="Treat"){ score += (w.valueEst||0)*0.05; }
  if(ctx.feel==="Impress"){ score += (w.critScore||85)*0.5 + (w.valueEst||0)*0.06; if((w.critScore||0)>=93) reasons.push(`${w.critScore} pts — a showpiece`); }
  // who
  if(ctx.who==="Crowd"){ score += Math.min(w.qty||1,8)*4; if((w.qty||1)>=4) reasons.push(`you have ${w.qty}`); }
  if(ctx.who==="Friends"){ score += Math.min(w.qty||1,4)*2; }
  // abundance baseline
  score += Math.min(w.qty||1,6);
  return { score, reasons:reasons.slice(0,2) };
}

function TonightScreen({ onOpen }){
  const wines = useCellar();
  const [food, setFood] = React.useState(null);
  const [who, setWho] = React.useState(null);
  const [feel, setFeel] = React.useState(null);
  const [somm, setSomm] = React.useState(null);
  const [loadingSomm, setLoadingSomm] = React.useState(false);
  const ctx = { food, who, feel };

  const ranked = wines.map(w=>({ w, ...scoreWine(w,ctx) })).sort((a,b)=>b.score-a.score);
  const top = ranked[0];
  const rest = ranked.slice(1,4);

  async function askSomm(){
    setLoadingSomm(true); setSomm(null);
    try{
      const list = wines.map(w=>`${w.producer} ${w.cuvee||""} ${w.vintage} (${w.color}, ${w.varietal}, ${w.region}, status:${statusLabel(w)}, qty:${w.qty}, ~$${w.valueEst})`).join("\n");
      const c = [food&&`cooking ${food}`, who&&`for ${who}`, feel&&`mood: ${feel}`].filter(Boolean).join(", ") || "no specific occasion";
      const prompt = `You are a warm, concise sommelier. From ONLY this cellar, recommend the single best bottle to open tonight given: ${c}. Reply in 2 sentences max, name the wine exactly, and say why. Cellar:\n${list}`;
      const r = await window.claude.complete(prompt);
      setSomm(r.trim());
    }catch(e){ setSomm("Couldn’t reach the sommelier just now — try again."); }
    setLoadingSomm(false);
  }

  const Selector = ({ label, opts, val, set }) => (
    <div style={{marginBottom:12}}>
      <div className="section-label" style={{marginBottom:7,fontSize:10}}>{label}</div>
      <div className="chip-row">
        {opts.map(o=><span key={o} className={"chip "+(val===o?"on":"line")} onClick={()=>set(val===o?null:o)}>{o}</span>)}
      </div>
    </div>
  );

  return (
    <>
      <div className="topbar">
        <div><h1>Tonight</h1><div className="sub">What to open, from what’s ready</div></div>
      </div>
      <div className="screen-wrap">
        <div style={{padding:"0 18px"}}>
          {/* context */}
          <div className="card" style={{padding:"15px 15px 5px",marginBottom:16}}>
            <Selector label="Cooking" opts={FOODS} val={food} set={setFood}/>
            <Selector label="Who’s here" opts={["Just us","Friends","Crowd"]} val={who} set={setWho}/>
            <Selector label="The mood" opts={["Everyday","Treat","Impress"]} val={feel} set={setFeel}/>
          </div>

          {/* top pick */}
          {top && (
            <>
              <div className="section-label" style={{marginBottom:9}}>Open this</div>
              <button onClick={()=>onOpen(top.w.id)} className="card" style={{width:"100%",textAlign:"left",padding:16,display:"flex",gap:15,alignItems:"center",marginBottom:16,borderColor:"var(--wine)",boxShadow:"0 8px 24px rgba(109,31,47,.14)"}}>
                <WineSwatch w={top.w} size={52}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="wine-name" style={{fontSize:19,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{top.w.producer}{top.w.cuvee?<span className="cuvee"> · {top.w.cuvee}</span>:""}</div>
                  <div className="wine-meta">{top.w.cuvee?top.w.cuvee+" · ":""}{top.w.varietal} · {top.w.vintage}</div>
                  <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
                    <StatusPill w={top.w}/>
                    {top.w.location && <LocationChip loc={top.w.location}/>}
                    {top.reasons[0] && <span className="chip gold" style={{fontSize:11.5,padding:"3px 9px"}}><Ico n="check" s={12}/>{top.reasons[0]}</span>}
                  </div>
                </div>
                <span className="muted"><Ico n="chevR" s={20}/></span>
              </button>
            </>
          )}

          {/* runners up */}
          {rest.length>0 && <>
            <div className="section-label" style={{marginBottom:4}}>Or instead</div>
            {rest.map(({w,reasons})=>(
              <button key={w.id} onClick={()=>onOpen(w.id)} className="wine-row" style={{width:"100%",textAlign:"left"}}>
                <WineSwatch w={w}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="wine-name" style={{fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.producer}{w.cuvee?<span className="cuvee"> · {w.cuvee}</span>:""}</div>
                  <div className="wine-meta">{reasons[0]||statusLabel(w)} · {w.region}</div>
                  {w.location && <div style={{marginTop:4}}><LocationChip loc={w.location}/></div>}
                </div>
                <StatusPill w={w}/>
              </button>
            ))}
          </>}

          {/* sommelier */}
          <div className="card" style={{padding:16,marginTop:18,background:"var(--wine)",color:"#f5ece1",borderColor:"transparent"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:somm?10:12}}>
              <Ico n="grape" s={22}/>
              <div style={{fontSize:18,fontWeight:600}}>Ask the sommelier</div>
            </div>
            {somm
              ? <p style={{fontSize:14.5,lineHeight:1.55,margin:"0 0 12px",opacity:.96}}>{somm}</p>
              : <p style={{fontSize:13.5,lineHeight:1.5,margin:"0 0 12px",opacity:.85}}>A second opinion on tonight’s pick, using your occasion above.</p>}
            <button className="btn block" style={{background:"rgba(255,255,255,.16)",color:"#fff",border:"none"}} onClick={askSomm} disabled={loadingSomm}>
              {loadingSomm? <><span className="spin" style={{display:"inline-grid"}}><Ico n="refresh" s={16}/></span>Thinking…</> : <><Ico n="grape" s={16}/>{somm?"Ask again":"Recommend a bottle"}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TonightScreen });
