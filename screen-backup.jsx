/* screen-backup.jsx — Backup & Restore screen
   Renders as an iPad sidebar tab (no onClose) OR a phone full-screen overlay (with onClose). */

function BackupScreen({ onClose }){
  const bk = useBackup();
  const wines = useCellar();

  const [driveList, setDriveList]   = React.useState(null);   // null=not fetched, []=fetched
  const [driveLoading, setDriveLoading] = React.useState(false);
  const [driveErr, setDriveErr]     = React.useState("");
  const [clientInput, setClientInput] = React.useState(bk.clientId || "");
  const [clientEditing, setClientEditing] = React.useState(!bk.clientId);
  const [status, setStatus]         = React.useState("");   // transient feedback
  const [restoreConfirm, setRestoreConfirm] = React.useState(null); // {label, fn}
  const fileRef = React.useRef(null);

  React.useEffect(()=>{
    if(bk.driveConnected && driveList===null) fetchDriveList();
  }, [bk.driveConnected]);

  function flash(msg){ setStatus(msg); setTimeout(()=>setStatus(""), 3500); }

  async function fetchDriveList(){
    setDriveLoading(true); setDriveErr("");
    try { setDriveList(await bk.listDriveBackups()); }
    catch(e){ setDriveErr(e.message); }
    finally { setDriveLoading(false); }
  }

  async function handleConnect(){
    setDriveErr(""); setDriveLoading(true);
    try{
      await bk.connectDrive(clientInput);
      setClientEditing(false);
      flash("Connected to Google Drive ✓");
      fetchDriveList();
    } catch(e){ setDriveErr(e.message); }
    finally{ setDriveLoading(false); }
  }

  async function handleDriveBackup(){
    setDriveLoading(true); setDriveErr("");
    try{ await bk.saveDrive(); flash("Backed up to Drive ✓"); fetchDriveList(); }
    catch(e){ setDriveErr(e.message); }
    finally{ setDriveLoading(false); }
  }

  function handleLocalBackup(){ bk.saveLocal(); flash("Download started ✓"); }

  function onFileChange(e){
    const f = e.target.files?.[0]; if(!f) return;
    const name = f.name;
    setRestoreConfirm({
      label: `Restore from "${name}"? This will replace your current cellar.`,
      fn: async()=>{
        const text = await f.text();
        const n = bk.restoreFromJSON(text);
        flash(`Restored ${n} wines ✓`);
      }
    });
    e.target.value = "";
  }

  const fmtDate = iso => iso ? new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "Never";
  const scansLeft = bk.interval - bk.scanCount;
  const progress  = Math.min(1, bk.scanCount / bk.interval);

  const inner = (
    <div className="screen-wrap" style={{paddingBottom:32}}>
      {/* header */}
      <div className="topbar" style={{paddingBottom:12,display:"flex",alignItems:"center",gap:10}}>
        {onClose && <button className="icon-btn" onClick={onClose}><Ico n="chevL" s={21}/></button>}
        <div>
          <div style={{fontSize:20,fontWeight:700}}>Backup & Restore</div>
          <div className="muted" style={{fontSize:13,marginTop:2}}>{wines.length} wines in cellar</div>
        </div>
      </div>

      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:20}}>

        {/* status badge */}
        {status && (
          <div style={{background:"var(--wine-tint)",color:"var(--wine)",borderRadius:12,padding:"12px 16px",fontSize:13.5,fontWeight:600,textAlign:"center"}}>
            {status}
          </div>
        )}

        {/* auto-backup progress */}
        <div className="card" style={{padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14}}>Auto-backup</div>
            <span className="muted" style={{fontSize:12}}>{bk.scanCount} / {bk.interval} scans</span>
          </div>
          <div style={{height:6,background:"var(--bg2)",borderRadius:30,overflow:"hidden",marginBottom:8}}>
            <div style={{height:"100%",width:`${progress*100}%`,background:"var(--wine)",borderRadius:30,transition:"width .4s"}}/>
          </div>
          <div className="muted" style={{fontSize:12}}>
            {progress>=1 ? "Backing up now…" : `Backs up automatically every ${bk.interval} scans — ${scansLeft} scan${scansLeft===1?"":"s"} to go`}
          </div>
        </div>

        {/* local backup */}
        <div>
          <div className="section-label" style={{marginBottom:10}}>Local backup</div>
          <div className="card" style={{padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>Download JSON</div>
                <div className="muted" style={{fontSize:12,marginTop:2}}>Last: {fmtDate(bk.lastLocal)}</div>
              </div>
              <button className="btn" style={{height:36,fontSize:12.5,whiteSpace:"nowrap"}} onClick={handleLocalBackup}>
                <Ico n="download" s={14}/>Backup now
              </button>
            </div>
            <button className="btn ghost block" style={{fontSize:12.5}} onClick={()=>fileRef.current.click()}>
              <Ico n="refresh" s={14}/>Restore from file…
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFileChange} style={{display:"none"}}/>
          </div>
        </div>

        {/* Google Drive */}
        <div>
          <div className="section-label" style={{marginBottom:10}}>Google Drive</div>
          <div className="card" style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:14}}>

            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{
                width:9,height:9,borderRadius:"50%",flex:"0 0 auto",
                background: bk.driveConnected ? "var(--green,#2d9a5e)" : "var(--line2)"
              }}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14}}>{bk.driveConnected ? "Connected" : "Not connected"}</div>
                {bk.lastDrive && <div className="muted" style={{fontSize:12}}>Last: {fmtDate(bk.lastDrive)}</div>}
              </div>
              {bk.driveConnected && (
                <button className="btn ghost" style={{height:34,fontSize:12,color:"var(--ink-soft)"}} onClick={()=>{bk.disconnectDrive();setDriveList(null);}}>
                  Disconnect
                </button>
              )}
            </div>

            {(!bk.driveConnected || clientEditing) && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input
                  value={clientInput}
                  onChange={e=>setClientInput(e.target.value)}
                  placeholder="Google OAuth Client ID (…apps.googleusercontent.com)"
                  style={{width:"100%",fontSize:12.5,padding:"9px 12px",borderRadius:10,border:"1px solid var(--line2)",background:"var(--bg)",color:"var(--ink)",fontFamily:"var(--mono)",boxSizing:"border-box"}}
                />
                <div className="muted" style={{fontSize:11.5,lineHeight:1.5}}>
                  Need a Client ID? Create one at <span style={{fontWeight:600,color:"var(--wine)"}}>console.cloud.google.com</span> → APIs &amp; Services → Credentials → OAuth 2.0 Client IDs. Add this page's origin as an Authorised JavaScript origin.
                </div>
                <button className="btn primary" style={{height:38,fontSize:13}} onClick={handleConnect} disabled={driveLoading||!clientInput.trim()}>
                  {driveLoading ? "Connecting…" : "Connect Drive"}
                </button>
              </div>
            )}

            {bk.driveConnected && !clientEditing && (
              <button className="btn block" style={{height:40,fontSize:13}} onClick={handleDriveBackup} disabled={driveLoading}>
                <Ico n="download" s={15}/>{ driveLoading ? "Uploading…" : "Backup to Drive now"}
              </button>
            )}

            {driveErr && (
              <div style={{background:"var(--wine-tint)",color:"var(--wine)",borderRadius:9,padding:"10px 13px",fontSize:12.5}}>
                {driveErr}
              </div>
            )}

            {bk.driveConnected && driveList !== null && (
              <div style={{marginTop:2}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:600,fontSize:13}}>Drive backups</div>
                  <button className="icon-btn" onClick={fetchDriveList} disabled={driveLoading}><Ico n="refresh" s={16}/></button>
                </div>
                {driveList.length === 0 && <div className="muted" style={{fontSize:12.5,textAlign:"center",padding:"12px 0"}}>No backups yet</div>}
                {driveList.map(f=>{
                  const d = new Date(f.createdTime);
                  return (
                    <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--line)"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                        <div className="muted" style={{fontSize:11}}>{d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                      </div>
                      <button className="btn ghost" style={{height:32,fontSize:11.5,padding:"0 10px",whiteSpace:"nowrap"}}
                        onClick={()=>setRestoreConfirm({
                          label:`Restore from "${f.name}"? This will replace your current cellar.`,
                          fn: async()=>{ const n=await bk.restoreFromDrive(f.id); flash(`Restored ${n} wines ✓`); }
                        })}>
                        Restore
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  const sheet = restoreConfirm && (
    <Sheet onClose={()=>setRestoreConfirm(null)}>
      <div style={{padding:"8px 22px 28px",textAlign:"center"}}>
        <div style={{fontSize:20,fontWeight:600,marginBottom:8}}>Replace cellar?</div>
        <div className="muted" style={{fontSize:13.5,marginBottom:20,lineHeight:1.5}}>{restoreConfirm.label}</div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn ghost block" style={{flex:1}} onClick={()=>setRestoreConfirm(null)}>Cancel</button>
          <button className="btn block" style={{flex:1,background:"var(--wine)",color:"#fff",borderColor:"var(--wine)"}}
            onClick={async()=>{ await restoreConfirm.fn(); setRestoreConfirm(null); }}>
            Restore
          </button>
        </div>
      </div>
    </Sheet>
  );

  // Phone/overlay mode: full-screen with its own scroll. iPad tab mode: fill the main area.
  return onClose
    ? <div className="full-screen">{inner}{sheet}</div>
    : <React.Fragment>{inner}{sheet}</React.Fragment>;
}

Object.assign(window, { BackupScreen });
