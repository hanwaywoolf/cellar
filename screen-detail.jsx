/* screen-detail.jsx — full wine profile */

function DetailScreen({ id, onClose }){
  useCellar();
  const w = Cellar.get(id);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [openSheet, setOpenSheet] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [locSheet, setLocSheet] = React.useState(false);
  if(!w){ return <div className="full-screen"><div className="empty">Wine not found.<br/><button className="btn" style={{marginTop:14}} onClick={onClose}>Back</button></div></div>; }

  const value = (w.valueEst||0);
  const gain = w.paid? Math.round(((value-w.paid)/w.paid)*100) : null;
  const cor = coravinInfo(w);
  const fmtDate = (t,opts)=> new Date(t).toLocaleDateString(undefined, opts);

  function pullCork(){ const willEmpty=(w.qty||1)<=1; Cellar.finishBottle(w.id); setOpenSheet(false); if(willEmpty) onClose(); }
  function finishCoravin(){ const willEmpty=(w.qty||1)<=1; Cellar.finishBottle(w.id); if(willEmpty) onClose(); }

  return (
    <div className="full-screen" style={{overflow:"hidden"}}>
      <div className="topbar" style={{background:"transparent",position:"absolute",left:0,right:0,zIndex:30}}>
        <button className="icon-btn" onClick={onClose}><Ico n="chevL" s={21}/></button>
        <button className="icon-btn" onClick={()=>setConfirmDel(true)}><Ico n="trash" s={18}/></button>
      </div>

      <div className="screen-wrap" style={{paddingTop:0}}>
        {/* hero band */}
        <div style={{background:"linear-gradient(160deg, var(--wine), var(--wine2))",color:"#f5ece1",padding:"calc(env(safe-area-inset-top,0) + 70px) 22px 26px",display:"flex",gap:18,alignItems:"flex-end"}}>
          <div style={{flex:"0 0 auto",borderRadius:14,overflow:"hidden",boxShadow:"0 12px 30px rgba(0,0,0,.35)"}}>
            <Bottle w={w} size={92}/>
          </div>
          <div style={{minWidth:0,paddingBottom:4}}>
            <div style={{fontSize:12,letterSpacing:1.5,textTransform:"uppercase",opacity:.75,fontWeight:700}}>{w.varietal}</div>
            <div style={{fontSize:24,lineHeight:1.12,fontWeight:600,marginTop:4}}>{w.producer}</div>
            <div style={{fontSize:16,opacity:.9,fontWeight:300,fontStyle:"italic",marginTop:3,lineHeight:1.2}}>{[w.cuvee,w.vintage].filter(Boolean).join(" · ")}</div>
            <div style={{display:"flex",gap:7,marginTop:9,flexWrap:"wrap"}}>
              <span className="chip" style={{background:"rgba(255,255,255,.16)",color:"#fff"}}><Ico n="pin" s={13}/>{w.region}, {w.country}</span>
              {w.critScore&&<span className="chip" style={{background:"rgba(255,255,255,.16)",color:"#fff"}}><Ico n="star" s={13} fill/>{w.critScore}</span>}
            </div>
          </div>
        </div>

        <div style={{padding:"18px 18px 0"}}>
          {/* key stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            <div className="card" style={{padding:"12px 8px",textAlign:"center"}}>
              <div style={{display:"grid",placeItems:"center",marginBottom:5}}><StatusPill w={w}/></div>
              <div className="muted" style={{fontSize:11}}>{w.peakFrom&&statusOf(w)==="hold"?`peak ${w.peakFrom}`:`through ${w.drinkTo}`}</div>
            </div>
            <div className="card" style={{padding:"12px 8px",textAlign:"center"}}>
              <div className="num wine-c" style={{fontSize:22}}>{fmt$(value)}</div>
              <div className="muted" style={{fontSize:11}}>{gain!=null?`${gain>=0?"▲":"▼"} ${Math.abs(gain)}% vs paid`:"est. value"}</div>
            </div>
            <div className="card" style={{padding:"12px 8px",textAlign:"center"}}>
              <div className="num" style={{fontSize:22}}>×{w.qty}</div>
              <div className="muted" style={{fontSize:11}}>in cellar</div>
            </div>
          </div>

          {/* coravin countdown */}
          {cor && (
            <div className="card" style={{padding:"14px 15px",marginBottom:16,borderColor:"transparent",background:cor.expired?"var(--wine-tint)":"var(--gold-tint)"}}>
              <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:10}}>
                <span style={{color:cor.expired?"var(--red)":"#7a571c",flex:"0 0 auto"}}><Ico n="clock" s={21}/></span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>Open · preserved with Coravin</div>
                  <div className="muted" style={{fontSize:12}}>Opened {fmtDate(cor.openedAt,{month:"short",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{textAlign:"right",flex:"0 0 auto"}}>
                  <div className="num" style={{fontSize:17,color:cor.expired?"var(--red)":"#7a571c"}}>{coravinText(w)}</div>
                  <div className="muted" style={{fontSize:11}}>drink by {fmtDate(cor.drinkBy,{month:"short",year:"numeric"})}</div>
                </div>
              </div>
              <div style={{height:7,borderRadius:30,background:"rgba(36,28,27,.10)",overflow:"hidden"}}>
                <div style={{height:"100%",width:Math.round(cor.frac*100)+"%",background:cor.expired?"var(--red)":"linear-gradient(90deg,var(--gold),#caa44f)",borderRadius:30,transition:"width .4s"}}/>
              </div>
            </div>
          )}

          {/* storage location */}
          <LocationCard wine={w} onEdit={()=>setLocSheet(true)}/>

          {/* drink window */}
          <div className="section-label" style={{marginBottom:9}}>Drink window</div>
          <div className="card" style={{padding:"15px 15px",marginBottom:16}}>
            <DrinkMeter w={w}/>
            {w.peakFrom && <div style={{marginTop:11,fontSize:13.5,lineHeight:1.5}} className="muted">
              {statusOf(w)==="now"?"At its peak now — a great time to open.":statusOf(w)==="soon"?"Drink up over the next year or two.":statusOf(w)==="past"?"Past its prime — open soon if at all.":`Best left to age; opens up around ${w.peakFrom}.`}
            </div>}
          </div>

          {/* critic ratings */}
          {(()=>{
            const rl = ratingsList(w);
            const doRefresh = async()=>{ setRefreshing(true); try{ await refreshRatings(w.id); }catch(e){} setRefreshing(false); };
            const saveRating = (k,v)=>{
              const ratings = { ...(w.ratings||{}) };
              ratings[k] = v===""||v==null ? null : Number(v);
              const vals = Object.values(ratings).filter(x=>x!=null&&x>0);
              Cellar.update(w.id, { ratings, critScore: vals.length ? Math.max(...vals) : w.critScore });
            };
            return <>
              <div className="section-label" style={{marginBottom:9}}>Critic scores</div>
              <div className="card" style={{padding:"4px 15px",marginBottom:4}}>
                {Object.entries(RATING_SOURCES).map(([k,label])=>{
                  const v = w.ratings && w.ratings[k]!=null ? w.ratings[k] : null;
                  return (
                    <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--line)",fontSize:14}}>
                      <span className="muted">{label}</span>
                      <input type="number" min={0} max={100} placeholder="—" value={v!=null?Math.round(v):""} 
                        onChange={e=>saveRating(k,e.target.value)}
                        style={{width:52,textAlign:"right",fontWeight:700,fontSize:16,fontFamily:"var(--mono,ui-monospace,monospace)",border:"none",background:"transparent",padding:"2px 0",color:"var(--ink)"}}/>
                    </div>
                  );
                })}
              </div>
              <button className="btn ghost block" style={{marginBottom:16,fontSize:13}} onClick={doRefresh} disabled={refreshing}>
                <Ico n="refresh" s={15}/>{refreshing?"Looking up scores…":"Auto-fill from AI"}
              </button>
            </>;
          })()}

          {/* pairings */}
          {w.pairings&&w.pairings.length>0 && <>
            <div className="section-label" style={{marginBottom:9}}>Pairs beautifully with</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {w.pairings.map((p,i)=><span key={i} className="chip" style={{padding:"7px 13px",fontSize:13.5}}><Ico n="fork" s={14}/>{p}</span>)}
            </div>
          </>}

          {/* tasting */}
          {w.tasting && <>
            <div className="section-label" style={{marginBottom:9}}>Tasting notes</div>
            <p style={{fontSize:16,lineHeight:1.5,fontWeight:300,fontStyle:"italic",margin:"0 0 16px",color:"var(--ink)"}}>“{w.tasting}”</p>
          </>}

          {/* traits */}
          {(w.body||w.tannin||w.acidity)&&<>
            <div className="section-label" style={{marginBottom:11}}>Profile</div>
            <div className="card" style={{padding:"15px 15px",display:"flex",flexDirection:"column",gap:11,marginBottom:16}}>
              <Trait label="Body" v={w.body}/><Trait label="Tannin" v={w.tannin}/><Trait label="Acidity" v={w.acidity}/><Trait label="Sweetness" v={w.sweetness}/>
            </div>
          </>}

          {/* meta */}
          <div className="card" style={{padding:"4px 15px",marginBottom:20}}>
            {[["Appellation",w.appellation],["Sub-region",w.subregion],["Classification",w.classification],["ABV",w.abv?w.abv+"%":null],["Paid",w.paid?fmt$(w.paid):null]].filter(r=>r[1]).map((r,i,a)=>(
              <div key={r[0]} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:i<a.length-1?"1px solid var(--line)":"none",fontSize:14}}>
                <span className="muted">{r[0]}</span><span style={{fontWeight:600}}>{r[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* action bar */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(rgba(243,236,224,0),var(--bg) 32%)",padding:"20px 18px calc(env(safe-area-inset-bottom,0) + 16px)",display:"flex",gap:12,alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <span className="section-label">Bottles</span>
          <QtyStepper value={w.qty} onChange={v=>Cellar.setQty(w.id, v)} min={0}/>
        </div>
        {cor ? (
          <button className="btn primary block" style={{flex:1}} onClick={finishCoravin}>
            <Ico n="glass" s={18}/>Finish the bottle
          </button>
        ) : (
          <button className="btn primary block" style={{flex:1}} onClick={()=>setOpenSheet(true)}>
            <Ico n="bottle" s={18}/>Open a bottle
          </button>
        )}
      </div>

      {openSheet && (
        <Sheet onClose={()=>setOpenSheet(false)}>
          <div style={{padding:"4px 22px 26px"}}>
            <div style={{fontSize:20,fontWeight:600,marginBottom:3}}>Open this bottle</div>
            <div className="muted" style={{fontSize:13.5,marginBottom:16}}>How are you opening it? We’ll keep track for you.</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <button className="card" style={{display:"flex",gap:13,alignItems:"center",padding:"14px 15px",textAlign:"left",border:"1px solid var(--line2)",width:"100%"}} onClick={()=>{ Cellar.openCoravin(w.id); setOpenSheet(false); }}>
                <span style={{width:42,height:42,borderRadius:11,background:"var(--gold-tint)",color:"#7a571c",display:"grid",placeItems:"center",flex:"0 0 auto"}}><Ico n="clock" s={22}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontWeight:700,fontSize:15.5}}>Pour with Coravin</span>
                  <span className="muted" style={{display:"block",fontSize:12.5,marginTop:2,lineHeight:1.4}}>Cork stays in. Starts a 3-year clock so you know when to finish it.</span>
                </span>
                <span className="muted" style={{flex:"0 0 auto"}}><Ico n="chevR" s={18}/></span>
              </button>
              <button className="card" style={{display:"flex",gap:13,alignItems:"center",padding:"14px 15px",textAlign:"left",border:"1px solid var(--line2)",width:"100%"}} onClick={pullCork}>
                <span style={{width:42,height:42,borderRadius:11,background:"var(--wine-tint)",color:"var(--wine)",display:"grid",placeItems:"center",flex:"0 0 auto"}}><Ico n="glass" s={22}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontWeight:700,fontSize:15.5}}>Pull the cork</span>
                  <span className="muted" style={{display:"block",fontSize:12.5,marginTop:2,lineHeight:1.4}}>Opening it fully — this bottle leaves your cellar{(w.qty||1)>1?` (${(w.qty||1)-1} left)`:""}.</span>
                </span>
                <span className="muted" style={{flex:"0 0 auto"}}><Ico n="chevR" s={18}/></span>
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {locSheet && <LocationSheet wine={w} onClose={()=>setLocSheet(false)}/>}

      {confirmDel && (
        <Sheet onClose={()=>setConfirmDel(false)}>
          <div style={{padding:"8px 22px 28px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:600,marginBottom:6}}>Remove this wine?</div>
            <div className="muted" style={{fontSize:14,marginBottom:20}}>{w.producer} {w.cuvee} will be deleted from your cellar entirely.</div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn ghost block" style={{flex:1}} onClick={()=>setConfirmDel(false)}>Cancel</button>
              <button className="btn block" style={{flex:1,background:"var(--red)",color:"#fff",borderColor:"var(--red)"}} onClick={()=>{Cellar.remove(w.id);onClose();}}>Remove</button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

Object.assign(window, { DetailScreen });
