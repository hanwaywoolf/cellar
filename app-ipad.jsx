/* app-ipad.jsx — iPad shell: sidebar nav + master-detail layout */

const EMPTY_FILTERS = { color:"All", country:null, region:null, cls:null, varietal:null, vintage:null, status:null };

/* ---- Sidebar ---- */
function Sidebar({ tab, setTab, onScan }){
  const NAV = [
    { id:"cellar",  icon:"cellar",   label:"Cellar"  },
    { id:"tonight", icon:"glass",    label:"Tonight" },
    { id:"pairing", icon:"fork",     label:"Pair"    },
    { id:"stats",   icon:"chart",    label:"Stats"   },
    { id:"backup",  icon:"download", label:"Backup"  },
  ];
  return (
    <nav className="sidebar">
      <div className="brand">CC</div>
      {NAV.map(n=>(
        <button key={n.id} className={"nav-btn"+(tab===n.id?" on":"")} onClick={()=>setTab(n.id)}>
          <Ico n={n.icon} s={22}/>{n.label}
        </button>
      ))}
      <div style={{flex:1}}/>
      <button className="scan-btn" onClick={onScan} title="Scan a label">
        <Ico n="camera" s={24}/>
      </button>
    </nav>
  );
}

/* ---- Detail side panel (reuses DetailScreen internals) ---- */
function DetailPanel({ id, onClose }){
  useCellar();
  const w = Cellar.get(id);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [openSheet, setOpenSheet] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [locSheet, setLocSheet] = React.useState(false);
  const [winBusy, setWinBusy] = React.useState(false);

  if(!w) return (
    <aside className="detail-panel">
      <div className="empty">Wine not found.<br/><button className="btn" style={{marginTop:14}} onClick={onClose}>Close</button></div>
    </aside>
  );

  const value = (w.valueEst||0);
  const gain = w.paid? Math.round(((value-w.paid)/w.paid)*100) : null;
  const cor = coravinInfo(w);
  const fmtDate = (t,opts)=> new Date(t).toLocaleDateString(undefined, opts);

  function pullCork(){ const willEmpty=(w.qty||1)<=1; Cellar.finishBottle(w.id); setOpenSheet(false); if(willEmpty) onClose(); }
  function finishCoravin(){ const willEmpty=(w.qty||1)<=1; Cellar.finishBottle(w.id); if(willEmpty) onClose(); }

  return (
    <aside className="detail-panel">
      {/* header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 0"}}>
        <button className="icon-btn" onClick={onClose}><Ico n="x" s={19}/></button>
        <button className="icon-btn" onClick={()=>setConfirmDel(true)}><Ico n="trash" s={17}/></button>
      </div>

      <div className="screen-wrap">
        {/* hero */}
        <div style={{background:"linear-gradient(160deg, var(--wine), var(--wine2))",color:"#f5ece1",padding:"22px 22px 22px",display:"flex",gap:16,alignItems:"flex-end",margin:"12px 16px 0",borderRadius:14}}>
          <div style={{flex:"0 0 auto",borderRadius:12,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.3)"}}>
            <Bottle w={w} size={72}/>
          </div>
          <div style={{minWidth:0,paddingBottom:2}}>
            <div style={{fontSize:11,letterSpacing:1.5,textTransform:"uppercase",opacity:.7,fontWeight:700}}>{w.varietal}</div>
            <div style={{fontSize:20,lineHeight:1.12,fontWeight:600,marginTop:3}}>{w.producer}</div>
            <div style={{fontSize:14,opacity:.85,fontWeight:300,fontStyle:"italic",marginTop:2}}>{[w.cuvee,w.vintage].filter(Boolean).join(" · ")}</div>
            <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
              <span className="chip" style={{background:"rgba(255,255,255,.16)",color:"#fff",fontSize:11.5}}><Ico n="pin" s={12}/>{w.region}, {w.country}</span>
              {w.critScore&&<span className="chip" style={{background:"rgba(255,255,255,.16)",color:"#fff",fontSize:11.5}}><Ico n="star" s={12} fill/>{w.critScore}</span>}
            </div>
          </div>
        </div>

        <div style={{padding:"16px 20px 0"}}>
          {/* key stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            <div className="card" style={{padding:"10px 6px",textAlign:"center"}}>
              <div style={{display:"grid",placeItems:"center",marginBottom:4}}><StatusPill w={w}/></div>
              <div className="muted" style={{fontSize:10.5}}>{statusSub(w)}</div>
            </div>
            <div className="card" style={{padding:"10px 6px",textAlign:"center"}}>
              <div className="num wine-c" style={{fontSize:20}}>{fmt$(value)}</div>
              <div className="muted" style={{fontSize:10.5}}>{gain!=null?`${gain>=0?"▲":"▼"} ${Math.abs(gain)}% vs paid`:"est. value"}</div>
            </div>
            <div className="card" style={{padding:"10px 6px",textAlign:"center"}}>
              <div className="num" style={{fontSize:20}}>×{w.qty}</div>
              <div className="muted" style={{fontSize:10.5}}>in cellar</div>
            </div>
          </div>

          {/* coravin */}
          {cor && (
            <div className="card" style={{padding:"12px 14px",marginBottom:14,borderColor:"transparent",background:cor.expired?"var(--wine-tint)":"var(--gold-tint)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{color:cor.expired?"var(--red)":"#7a571c",flex:"0 0 auto"}}><Ico n="clock" s={19}/></span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13}}>Open · Coravin preserved</div>
                  <div className="muted" style={{fontSize:11}}>Opened {fmtDate(cor.openedAt,{month:"short",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{textAlign:"right",flex:"0 0 auto"}}>
                  <div className="num" style={{fontSize:15,color:cor.expired?"var(--red)":"#7a571c"}}>{coravinText(w)}</div>
                </div>
              </div>
              <div style={{height:6,borderRadius:30,background:"rgba(36,28,27,.10)",overflow:"hidden"}}>
                <div style={{height:"100%",width:Math.round(cor.frac*100)+"%",background:cor.expired?"var(--red)":"linear-gradient(90deg,var(--gold),#caa44f)",borderRadius:30}}/>
              </div>
            </div>
          )}

          {/* storage location */}
          <LocationCard wine={w} onEdit={()=>setLocSheet(true)}/>

          {/* drink window */}
          <div className="section-label" style={{marginBottom:8}}>Drink window</div>
          <div className="card" style={{padding:"14px 14px",marginBottom:14}}>
            <DrinkMeter w={w}/>
            {windowMarkers(w) && <div style={{marginTop:9,fontSize:12.5,lineHeight:1.5}} className="muted">
              {statusBlurb(w)}
            </div>}
            <button className="btn ghost block" style={{marginTop:11,fontSize:12}} disabled={winBusy}
              onClick={async()=>{ setWinBusy(true); try{ await refreshWindow(w.id); }catch(e){ alert(e.message); } setWinBusy(false); }}>
              <Ico n="refresh" s={13}/>{winBusy?"Re-assessing…":"Re-assess drink window with AI"}
            </button>
          </div>

          {/* critic ratings */}
          {(()=>{
            const doRefresh = async()=>{ setRefreshing(true); try{ await refreshRatings(w.id); }catch(e){} setRefreshing(false); };
            const saveRating = (k,v)=>{
              const ratings = { ...(w.ratings||{}) };
              ratings[k] = v===""||v==null ? null : Number(v);
              const vals = Object.values(ratings).filter(x=>x!=null&&x>0);
              Cellar.update(w.id, { ratings, critScore: vals.length ? Math.max(...vals) : w.critScore });
            };
            return <>
              <div className="section-label" style={{marginBottom:8}}>Critic scores</div>
              <div className="card" style={{padding:"4px 14px",marginBottom:4}}>
                {Object.entries(RATING_SOURCES).map(([k,label])=>{
                  const v = w.ratings && w.ratings[k]!=null ? w.ratings[k] : null;
                  return (
                    <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--line)",fontSize:13}}>
                      <span className="muted">{label}</span>
                      <input type="number" min={0} max={100} placeholder="—" value={v!=null?Math.round(v):""}
                        onChange={e=>saveRating(k,e.target.value)}
                        style={{width:48,textAlign:"right",fontWeight:700,fontSize:15,fontFamily:"var(--mono)",border:"none",background:"transparent",padding:"2px 0",color:"var(--ink)"}}/>
                    </div>
                  );
                })}
              </div>
              <button className="btn ghost block" style={{marginBottom:14,fontSize:12.5}} onClick={doRefresh} disabled={refreshing}>
                <Ico n="refresh" s={14}/>{refreshing?"Looking up…":"Auto-fill from AI"}
              </button>
            </>;
          })()}

          {/* pairings */}
          {w.pairings&&w.pairings.length>0 && <>
            <div className="section-label" style={{marginBottom:8}}>Pairs with</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {w.pairings.map((p,i)=><span key={i} className="chip" style={{padding:"6px 11px",fontSize:13}}><Ico n="fork" s={13}/>{p}</span>)}
            </div>
          </>}

          {/* tasting */}
          {w.tasting && <>
            <div className="section-label" style={{marginBottom:8}}>Tasting notes</div>
            <p style={{fontSize:14.5,lineHeight:1.5,fontWeight:300,fontStyle:"italic",margin:"0 0 14px",color:"var(--ink)"}}>"{w.tasting}"</p>
          </>}

          {/* traits */}
          {(w.body||w.tannin||w.acidity)&&<>
            <div className="section-label" style={{marginBottom:9}}>Profile</div>
            <div className="card" style={{padding:"14px 14px",display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
              <Trait label="Body" v={w.body}/><Trait label="Tannin" v={w.tannin}/><Trait label="Acidity" v={w.acidity}/><Trait label="Sweetness" v={w.sweetness}/>
            </div>
          </>}

          {/* meta */}
          <div className="card" style={{padding:"4px 14px",marginBottom:18}}>
            {[["Appellation",w.appellation],["Sub-region",w.subregion],["Classification",w.classification],["ABV",w.abv?w.abv+"%":null],["Paid",w.paid?fmt$(w.paid):null]].filter(r=>r[1]).map((r,i,a)=>(
              <div key={r[0]} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<a.length-1?"1px solid var(--line)":"none",fontSize:13.5}}>
                <span className="muted">{r[0]}</span><span style={{fontWeight:600}}>{r[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* action bar */}
      <div className="detail-action-bar" style={{borderTop:"1px solid var(--line2)",background:"var(--bg)",padding:"14px 20px",display:"flex",gap:12,alignItems:"center"}}>
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <span className="section-label" style={{fontSize:9}}>Bottles</span>
          <QtyStepper value={w.qty} onChange={v=>Cellar.setQty(w.id, v)} min={0}/>
        </div>
        {cor ? (
          <button className="btn primary block" style={{flex:1,height:48}} onClick={finishCoravin}>
            <Ico n="glass" s={17}/>Finish bottle
          </button>
        ) : (
          <button className="btn primary block" style={{flex:1}} onClick={()=>setOpenSheet(true)}>
            <Ico n="bottle" s={17}/>Open a bottle
          </button>
        )}
      </div>

      {locSheet && <LocationSheet wine={w} onClose={()=>setLocSheet(false)}/>}

      {openSheet && (
        <Sheet onClose={()=>setOpenSheet(false)}>
          <div style={{padding:"4px 22px 26px"}}>
            <div style={{fontSize:20,fontWeight:600,marginBottom:3}}>Open this bottle</div>
            <div className="muted" style={{fontSize:13.5,marginBottom:16}}>How are you opening it?</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <button className="card" style={{display:"flex",gap:13,alignItems:"center",padding:"14px 15px",textAlign:"left",border:"1px solid var(--line2)",width:"100%"}} onClick={()=>{ Cellar.openCoravin(w.id); setOpenSheet(false); }}>
                <span style={{width:42,height:42,borderRadius:11,background:"var(--gold-tint)",color:"#7a571c",display:"grid",placeItems:"center",flex:"0 0 auto"}}><Ico n="clock" s={22}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontWeight:700,fontSize:15.5}}>Pour with Coravin</span>
                  <span className="muted" style={{display:"block",fontSize:12.5,marginTop:2}}>Cork stays in. Starts a 3-year clock.</span>
                </span>
                <span className="muted"><Ico n="chevR" s={18}/></span>
              </button>
              <button className="card" style={{display:"flex",gap:13,alignItems:"center",padding:"14px 15px",textAlign:"left",border:"1px solid var(--line2)",width:"100%"}} onClick={pullCork}>
                <span style={{width:42,height:42,borderRadius:11,background:"var(--wine-tint)",color:"var(--wine)",display:"grid",placeItems:"center",flex:"0 0 auto"}}><Ico n="glass" s={22}/></span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontWeight:700,fontSize:15.5}}>Pull the cork</span>
                  <span className="muted" style={{display:"block",fontSize:12.5,marginTop:2}}>Fully opening — leaves cellar{(w.qty||1)>1?` (${(w.qty||1)-1} left)`:""}.</span>
                </span>
                <span className="muted"><Ico n="chevR" s={18}/></span>
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {confirmDel && (
        <Sheet onClose={()=>setConfirmDel(false)}>
          <div style={{padding:"8px 22px 28px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:600,marginBottom:6}}>Remove this wine?</div>
            <div className="muted" style={{fontSize:14,marginBottom:20}}>{w.producer} {w.cuvee} will be deleted from your cellar.</div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn ghost block" style={{flex:1}} onClick={()=>setConfirmDel(false)}>Cancel</button>
              <button className="btn block" style={{flex:1,background:"var(--red)",color:"#fff",borderColor:"var(--red)"}} onClick={()=>{Cellar.remove(w.id);onClose();}}>Remove</button>
            </div>
          </div>
        </Sheet>
      )}
    </aside>
  );
}

Object.assign(window, { Sidebar, DetailPanel });
