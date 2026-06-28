/* screen-pairing.jsx — type a dish, get ranked bottles from the cellar */

const DISH_RULES = [
  { kw:["steak","ribeye","beef","brisket","bbq","barbecue","burger","short rib"], colors:["Red"], body:[60,100], why:"bold red stands up to rich red meat" },
  { kw:["lamb","venison","game","duck breast","mutton"], colors:["Red"], body:[55,100], why:"savory red for gamey, fatty meat" },
  { kw:["truffle","mushroom","risotto","porcini"], colors:["Red"], earthy:true, body:[45,80], why:"earthy red echoes umami notes" },
  { kw:["pasta","pizza","tomato","bolognese","marinara","lasagna"], colors:["Red"], acid:[55,100], why:"high-acid red cuts tomato" },
  { kw:["pork","chicken","turkey","poultry","roast"], colors:["Red","White"], body:[30,70], why:"medium-bodied, food-friendly" },
  { kw:["salmon","tuna","trout"], colors:["White","Rosé","Red"], body:[20,55], why:"lighter wine for oily fish" },
  { kw:["oyster","shellfish","shrimp","prawn","crab","lobster","sushi","ceviche","scallop"], colors:["White","Sparkling"], acid:[60,100], why:"crisp, bright wine for shellfish" },
  { kw:["fish","seafood","cod","halibut","sole"], colors:["White","Sparkling"], acid:[55,100], why:"clean white for delicate fish" },
  { kw:["spicy","thai","curry","indian","szechuan","chili"], colors:["White","Sparkling","Rosé"], why:"aromatic, off-dry tames heat" },
  { kw:["blue cheese","roquefort","stilton","gorgonzola"], colors:["Red","Sparkling"], sweetish:true, why:"richness balances pungent cheese" },
  { kw:["cheese","brie","camembert","gouda","manchego","cheddar","parmesan"], colors:["Red","Sparkling","White"], why:"versatile match for the cheese board" },
  { kw:["salad","vegetable","veg","greens","goat cheese","asparagus"], colors:["White","Rosé"], acid:[55,100], why:"fresh, herbal white for greens" },
  { kw:["chocolate","dessert","cake","tart","fruit"], colors:["Sparkling","Red"], sweetish:true, why:"a touch of sweetness for dessert" },
  { kw:["celebration","aperitif","toast","party","cheers"], colors:["Sparkling","White"], why:"festive and refreshing to start" },
];

function inferRule(dish){
  const d = dish.toLowerCase();
  for(const r of DISH_RULES){ if(r.kw.some(k=>d.includes(k))) return r; }
  return null;
}
function pairScore(w, rule, dish){
  if(!rule) return { score:0, label:null, why:null };
  let score=0; const reasons=[];
  if(rule.colors.includes(w.color)){ score+=40; }
  else { score-=25; }
  const pairHit = (w.pairings||[]).some(p=> dish.toLowerCase().split(/[\s,]+/).some(t=>t.length>2&&p.toLowerCase().includes(t)) || p.toLowerCase().includes(dish.toLowerCase()));
  if(pairHit){ score+=35; reasons.push("a listed pairing"); }
  if(rule.body && w.body>=rule.body[0]-10 && w.body<=rule.body[1]+10) score+=14;
  if(rule.acid && w.acidity>=rule.acid[0]) score+=14;
  if(rule.earthy && /nebbiolo|pinot/i.test(w.varietal||"")) score+=16;
  if(rule.sweetish && (w.sweetness||0)>12) score+=10;
  // prefer ready-to-drink
  const s=statusOf(w); if(s==="now"||s==="peak")score+=10; else if(s==="hold")score-=6;
  const label = score>=70?"Excellent":score>=50?"Great":score>=32?"Good":score>0?"Fair":null;
  return { score, label, why: reasons[0] || rule.why };
}

function PairingScreen({ onOpen }){
  const wines = useCellar();
  const [dish, setDish] = React.useState("");
  const [submitted, setSubmitted] = React.useState("");
  const rule = submitted? inferRule(submitted): null;
  const results = submitted
    ? wines.map(w=>({ w, ...pairScore(w, rule, submitted) })).filter(r=>r.score>0).sort((a,b)=>b.score-a.score)
    : [];

  function go(v){ const t=(v??dish).trim(); if(!t) return; setDish(t); setSubmitted(t); }

  return (
    <>
      <div className="topbar">
        <div><h1>Pairing</h1><div className="sub">What’s on the table tonight?</div></div>
      </div>
      <div className="screen-wrap">
        <div style={{padding:"0 18px"}}>
          <form onSubmit={e=>{e.preventDefault();go();}} style={{display:"flex",gap:9,marginBottom:12}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:9,background:"var(--card)",border:"1px solid var(--line2)",borderRadius:13,padding:"0 13px"}}>
              <span className="muted"><Ico n="fork" s={18}/></span>
              <input className="field" style={{border:"none",background:"transparent",padding:"13px 0",boxShadow:"none"}} placeholder="e.g. grilled lamb chops" value={dish} onChange={e=>setDish(e.target.value)}/>
            </div>
            <button type="submit" className="btn primary" style={{padding:"0 16px"}}><Ico n="search" s={18}/></button>
          </form>

          <div className="chip-row" style={{marginBottom:18}}>
            {["Steak","Salmon","Pasta","Cheese board","Roast chicken","Sushi","Spicy curry"].map(d=>(
              <span key={d} className="chip line" onClick={()=>go(d)}>{d}</span>
            ))}
          </div>

          {!submitted ? (
            <div className="empty">
              <div style={{opacity:.4,marginBottom:10,display:"grid",placeItems:"center"}}><Ico n="glass" s={40}/></div>
              <div style={{fontSize:18,fontWeight:600,marginBottom:4}}>Tell us what you’re eating</div>
              <div style={{fontSize:13.5}}>We’ll rank the bottles in your cellar from best to worst match.</div>
            </div>
          ) : results.length===0 ? (
            <div className="empty">
              <div style={{fontSize:17,fontWeight:600,marginBottom:6}}>No strong matches</div>
              <div style={{fontSize:13.5}}>Nothing in your cellar is an obvious fit for “{submitted}”. Try a broader dish.</div>
            </div>
          ) : (
            <>
              <div className="section-label" style={{marginBottom:6}}>Best for “{submitted}”{rule?` · ${rule.why}`:""}</div>
              {results.map(({w,label,why},i)=>(
                <button key={w.id} onClick={()=>onOpen(w.id)} className="wine-row" style={{width:"100%",textAlign:"left"}}>
                  <WineSwatch w={w}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="wine-name" style={{fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.producer}{w.cuvee?<span className="cuvee"> · {w.cuvee}</span>:""}</div>
                    <div className="wine-meta">{w.varietal} · {w.vintage} · {why}</div>
                    <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                      <StatusPill w={w}/>
                      {w.location && <LocationChip loc={w.location}/>}
                    </div>
                  </div>
                  <span className={"chip "+(i===0?"on":"gold")} style={{fontSize:11.5,padding:"4px 10px"}}>{label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PairingScreen });
