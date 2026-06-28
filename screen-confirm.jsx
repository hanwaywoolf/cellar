/* screen-confirm.jsx — editable AI-identified wine before adding */

function ConfirmForm({ draft, field, qty, setQty, thumb, ocr, conf, onCancel, onSave, onRetake }){
  const [showRaw, setShowRaw] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false);
  const F = ({label, k, type="text", w, ph}) => (
    <label style={{display:"flex",flexDirection:"column",gap:5,flex:w||"1 1 100%",minWidth:0}}>
      <span className="section-label" style={{fontSize:10}}>{label}</span>
      <input className="field" style={{padding:"10px 12px",fontSize:14}} type={type} value={draft[k]??""} placeholder={ph||""}
        inputMode={type==="number"?"decimal":undefined}
        onChange={e=>field(k, type==="number"? (e.target.value===""?"":e.target.value) : e.target.value)} />
    </label>
  );
  const named = (draft.producer||draft.cuvee);

  return (
    <>
      <div className="topbar" style={{paddingTop:"calc(var(--safe-top) + 12px)"}}>
        <button className="icon-btn" onClick={onCancel}><Ico n="x" s={20}/></button>
        <div style={{textAlign:"center"}}>
          <div style={{fontWeight:700,fontSize:15}}>Confirm wine</div>
          {conf!=null && <div className="muted" style={{fontSize:11}}>{conf>=70?`Identified · ${conf}% sure`: conf>0?`Low confidence · ${conf}%`:"Manual entry"}</div>}
        </div>
        <button className="icon-btn" onClick={onRetake}><Ico n="camera" s={19}/></button>
      </div>

      <div className="screen-wrap" style={{paddingBottom:120}}>
        <div style={{padding:"4px 18px 0"}}>
          {/* hero */}
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:8}}>
            {thumb ? <img src={thumb} alt="" style={{width:72,height:104,objectFit:"cover",borderRadius:12,boxShadow:"var(--sh-sm)",flex:"0 0 auto"}}/> : <Bottle w={draft} size={66}/>}
            <div style={{minWidth:0}}>
              <div style={{fontSize:22,lineHeight:1.12,fontWeight:600}}>{draft.producer||"Unknown producer"}</div>
              <div className="muted" style={{fontSize:14,marginTop:2}}>{[draft.cuvee,draft.vintage].filter(Boolean).join(" · ")||"Add the details below"}</div>
              <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}>
                {draft.varietal&&<span className="chip"><ColorDot color={draft.color}/>{draft.varietal}</span>}
                {draft.classification&&<span className="chip gold">{draft.classification}</span>}
              </div>
            </div>
          </div>

          {conf!=null && conf<70 && (thumb||ocr) && (
            <div className="card" style={{padding:"10px 13px",display:"flex",gap:9,alignItems:"center",marginBottom:12,background:"var(--gold-tint)",borderColor:"transparent"}}>
              <span className="gold"><Ico n="info" s={18}/></span>
              <span style={{fontSize:12.5,color:"#7a571c"}}>Double-check the details below — the label was hard to read.</span>
            </div>
          )}

          {/* identity */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
            <F label="Producer" k="producer" w="1 1 100%"/>
            <F label="Cuvée / name" k="cuvee" w="1 1 60%"/>
            <F label="Vintage" k="vintage" type="number" w="1 1 30%"/>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
            <label style={{display:"flex",flexDirection:"column",gap:5,flex:"1 1 40%"}}>
              <span className="section-label" style={{fontSize:10}}>Type</span>
              <select className="field" style={{padding:"10px 12px",fontSize:14}} value={draft.color} onChange={e=>field("color",e.target.value)}>
                {COLORS.map(c=><option key={c}>{c}</option>)}
              </select>
            </label>
            <F label="Varietal" k="varietal" w="1 1 50%"/>
          </div>

          {/* origin — feeds the cellar drill-down */}
          <div className="section-label" style={{margin:"6px 0 8px"}}>Origin</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
            <F label="Country" k="country" w="1 1 45%"/>
            <F label="Region" k="region" w="1 1 45%"/>
            <F label="Sub-region" k="subregion" w="1 1 45%"/>
            <F label="Classification" k="classification" w="1 1 45%" ph="e.g. Reserva"/>
          </div>

          {/* drink window */}
          <div className="section-label" style={{margin:"6px 0 8px"}}>Drink window</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:6}}>
            <F label="Drink from" k="drinkFrom" type="number" w="1 1 21%"/>
            <F label="Peak from" k="peakFrom" type="number" w="1 1 21%"/>
            <F label="Peak to" k="peakTo" type="number" w="1 1 21%"/>
            <F label="Drink by" k="drinkTo" type="number" w="1 1 21%"/>
          </div>
          {meterGeom(draft) && <div style={{margin:"4px 2px 14px"}}><DrinkMeter w={draft}/></div>}

          {/* value */}
          <div className="section-label" style={{margin:"6px 0 8px"}}>Value</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <F label="Est. value £" k="valueEst" type="number" w="1 1 30%"/>
            <F label="Low £" k="valueLow" type="number" w="1 1 30%"/>
            <F label="High £" k="valueHigh" type="number" w="1 1 30%"/>
          </div>

          {/* storage location */}
          <div className="section-label" style={{margin:"10px 0 8px"}}>Where are you storing this?</div>
          <div style={{marginBottom:14}}>
            <LocationPicker value={draft.location} onChange={v=>field("location",v)} wines={Cellar.all()}/>
          </div>

          {/* pairings */}
          <div className="section-label" style={{margin:"6px 0 8px"}}>Pairs with</div>
          <input className="field" style={{padding:"10px 12px",fontSize:14,marginBottom:12}} value={(draft.pairings||[]).join(", ")}
            placeholder="Ribeye, lamb, aged cheese" onChange={e=>field("pairings", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}/>

          {/* tasting */}
          <div className="section-label" style={{margin:"6px 0 8px"}}>Tasting notes</div>
          <textarea className="field" rows={3} style={{padding:"11px 12px",fontSize:14}} value={draft.tasting||""} onChange={e=>field("tasting",e.target.value)}/>

          {/* critic ratings */}
          <div className="section-label" style={{margin:"12px 0 8px"}}>Critic scores</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {Object.entries(RATING_SOURCES).map(([k,label])=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11.5,fontWeight:700,width:24,color:"var(--muted)"}}>{k}</span>
                <input className="field" type="number" min={0} max={100} placeholder="—" style={{padding:"8px 10px",fontSize:13,flex:1}}
                  value={(draft.ratings&&draft.ratings[k]!=null)?draft.ratings[k]:""} onChange={e=>{
                    const v=e.target.value===""?null:Number(e.target.value);
                    field("ratings",{...(draft.ratings||{}), [k]:v});
                  }}/>
              </label>
            ))}
          </div>

          <button className="btn ghost block" style={{marginTop:14}} onClick={()=>setAdvanced(a=>!a)}>
            <Ico n="sliders" s={16}/>{advanced?"Hide":"Edit"} body · tannin · acidity
          </button>
          {advanced && (
            <div className="card" style={{padding:"14px 14px",marginTop:10,display:"flex",flexDirection:"column",gap:11}}>
              {[["Body","body"],["Tannin","tannin"],["Acidity","acidity"],["Sweetness","sweetness"]].map(([l,k])=>(
                <label key={k} style={{display:"grid",gridTemplateColumns:"66px 1fr 34px",alignItems:"center",gap:10}}>
                  <span className="muted" style={{fontSize:12.5}}>{l}</span>
                  <input type="range" min={0} max={100} value={draft[k]||0} onChange={e=>field(k,Number(e.target.value))} style={{accentColor:"var(--wine)"}}/>
                  <span className="num" style={{fontSize:14,textAlign:"right"}}>{draft[k]||0}</span>
                </label>
              ))}
            </div>
          )}

          {ocr && (
            <div style={{marginTop:14}}>
              <button className="btn ghost block" onClick={()=>setShowRaw(s=>!s)}><Ico n="image" s={15}/>{showRaw?"Hide":"View"} text read from label</button>
              {showRaw && <pre style={{whiteSpace:"pre-wrap",fontSize:11,color:"var(--muted)",background:"var(--bg2)",padding:12,borderRadius:12,marginTop:8,fontFamily:"ui-monospace,monospace"}}>{ocr}</pre>}
            </div>
          )}
        </div>
      </div>

      {/* add bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,zIndex:50,background:"linear-gradient(rgba(243,236,224,0),var(--bg) 30%)",padding:"18px 18px calc(var(--safe-bottom) + 16px)",display:"flex",gap:12,alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <span className="section-label" style={{fontSize:9.5}}>Bottles</span>
          <QtyStepper value={qty} onChange={v=>setQty(Math.max(1,v))} min={1}/>
        </div>
        <button className="btn primary block" style={{flex:1,height:52}} onClick={onSave} disabled={!named}>
          <Ico n="plus" s={18}/>Add {qty>1?`${qty} bottles`:"to cellar"}
        </button>
      </div>
    </>
  );
}

Object.assign(window, { ConfirmForm });
