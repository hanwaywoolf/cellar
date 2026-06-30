/* app-adaptive.jsx — single entry point that picks phone or iPad layout by screen width */

const BREAKPOINT = 768; // iPad mini portrait = 768px

const EMPTY_FILTERS_A = { color:"All", country:null, region:null, cls:null, varietal:null, vintage:null, status:null, storage:null };

/* Shows the running version and a one-time "Updated to vXX" toast after the app
   reloads onto a new build, so the version is always trackable. All logic lives
   inside the component (lazy init reads the version + last-seen at first render;
   the new version is written back in an effect) to avoid cross-scope/timing
   issues in the bundled build. */
let _versionHandled = false;
function VersionWatcher(){
  const [show, setShow] = React.useState(()=>{
    if(_versionHandled) return false;
    const v = window.APP_VERSION || "";
    if(!v) return false;
    let seen = null;
    try{ seen = localStorage.getItem("cellar_seen_version"); }catch(e){}
    return !!(seen && seen !== v);
  });
  React.useEffect(()=>{
    _versionHandled = true;
    const v = window.APP_VERSION || "";
    try{ if(v) localStorage.setItem("cellar_seen_version", v); }catch(e){}
  },[]);
  React.useEffect(()=>{ if(show){ const t=setTimeout(()=>setShow(false), 8000); return ()=>clearTimeout(t); } },[show]);
  if(!show) return null;
  return (
    <div className="version-toast" onClick={()=>setShow(false)}>
      <span className="dot"/>Updated to <strong>{window.APP_VERSION||""}</strong>
    </div>
  );
}

/* Small, non-blocking banner asking to restore the Drive connection — shown at
   most once per calendar day (see BackupManager.shouldShowReconnectPrompt).
   Tapping Reconnect runs the normal Google sign-in (a real user gesture, so no
   surprise popups); tapping the x just silences it until tomorrow. Local data
   is never at risk either way — the cellar is always saved on-device; this only
   affects whether other devices see today's changes yet. */
function ReconnectBanner(){
  const bk = useBackup();
  const sync = useSync();
  const [show, setShow] = React.useState(()=>bk.shouldShowReconnectPrompt());
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(()=>{
    setShow(bk.shouldShowReconnectPrompt());
  },[sync.lastError, bk.driveConnected]);

  if(!show) return null;

  async function reconnect(){
    setBusy(true); setErr("");
    try{ await bk.quickReconnect(); setShow(false); }
    catch(e){ setErr("Couldn't reconnect — try again from Backup & Restore."); }
    finally{ setBusy(false); }
  }
  function dismiss(){ bk.dismissReconnectPrompt(); setShow(false); }

  return (
    <div style={{
      position:"fixed", left:"50%", transform:"translateX(-50%)",
      top:"calc(var(--safe-top, 0px) + 12px)", zIndex:99998,
      display:"flex", alignItems:"center", gap:10,
      background:"#1a1a1a", color:"#f3e6cf",
      font:"600 12.5px/1.3 system-ui,sans-serif",
      padding:"9px 10px 9px 15px", borderRadius:30,
      boxShadow:"0 6px 24px rgba(0,0,0,.35)", maxWidth:"calc(100vw - 24px)"
    }}>
      <span style={{whiteSpace:"nowrap"}}>{err || "Sync paused — reconnect Drive?"}</span>
      <button onClick={reconnect} disabled={busy} style={{flex:"0 0 auto",background:"#f3e6cf",color:"#1a1a1a",border:"none",borderRadius:20,padding:"6px 13px",fontWeight:700,fontSize:12}}>
        {busy?"…":"Reconnect"}
      </button>
      <button onClick={dismiss} aria-label="Dismiss" style={{flex:"0 0 auto",width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,.12)",border:"none",color:"#f3e6cf",display:"grid",placeItems:"center"}}>
        <Ico n="x" s={13}/>
      </button>
    </div>
  );
}

function AdaptiveApp(){
  const [isWide, setIsWide] = React.useState(()=> window.innerWidth >= BREAKPOINT);

  React.useEffect(()=>{
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const handler = (e)=> setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return ()=> mq.removeEventListener("change", handler);
  },[]);

  return (<>
    {isWide ? <IPadAppInner/> : <PhoneAppInner/>}
    <VersionWatcher/>
    <ReconnectBanner/>
  </>);
}

/* ---- Phone layout (from app-main.jsx) ---- */
function PhoneAppInner(){
  const [tab, setTab] = React.useState("cellar");
  const [scanMode, setScanMode] = React.useState(null);
  const [detailId, setDetailId] = React.useState(null);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS_A);
  const [storageMapOpen, setStorageMapOpen] = React.useState(false);

  const open = (id)=> setDetailId(id);
  const drillTo = (patch)=>{ setFilters({ ...EMPTY_FILTERS_A, ...patch }); setTab("cellar"); };

  const TABS = [
    { id:"cellar", icon:"cellar", label:"CoChez" },
    { id:"tonight", icon:"glass", label:"Tonight" },
    { id:"scan", icon:"camera", label:"Scan", fab:true },
    { id:"pairing", icon:"fork", label:"Pair" },
    { id:"stats", icon:"chart", label:"Stats" },
  ];

  return (
    <div className="app app-phone">
      <div key={tab} className="fade-in" style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
        {tab==="cellar" && <CellarScreen onOpen={open} openScan={(mode)=>setScanMode(mode||"camera")} openStorageMap={()=>setStorageMapOpen(true)} filters={filters} setFilters={setFilters}/>}
        {tab==="tonight" && <TonightScreen onOpen={open}/>}
        {tab==="pairing" && <PairingScreen onOpen={open}/>}
        {tab==="stats" && <StatsScreen onDrill={drillTo}/>}
      </div>

      <nav className="tabbar">
        {TABS.map(t=> t.fab ? (
          <button key={t.id} className="tab scan-tab" onClick={()=>setScanMode("camera")}>
            <span className="scan-fab"><Ico n="camera" s={26}/></span>
          </button>
        ) : (
          <button key={t.id} className={"tab"+(tab===t.id?" on":"")} onClick={()=>setTab(t.id)}>
            <Ico n={t.icon} s={23}/>{t.label}
          </button>
        ))}
      </nav>

      {detailId && <DetailScreen id={detailId} onClose={()=>setDetailId(null)}/>}
      {scanMode && <ScanScreen start={scanMode} onClose={()=>setScanMode(null)} onAdded={(id)=>{ setScanMode(null); setTab("cellar"); setDetailId(id); }}/>}
      {storageMapOpen && <StorageMapScreen onClose={()=>setStorageMapOpen(false)} onOpenWine={(id)=>{ setStorageMapOpen(false); setDetailId(id); }}/>}
    </div>
  );
}

/* ---- iPad layout (from app-ipad-main.jsx) ---- */
function IPadAppInner(){
  const [tab, setTab] = React.useState("cellar");
  const [scanMode, setScanMode] = React.useState(null);
  const [detailId, setDetailId] = React.useState(null);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS_A);

  const open = (id)=> setDetailId(id);
  const drillTo = (patch)=>{ setFilters({ ...EMPTY_FILTERS_A, ...patch }); setTab("cellar"); };

  const hasDetail = detailId && tab === "cellar";
  const [storageMapOpen, setStorageMapOpen] = React.useState(false);

  return (
    <div className={"app app-ipad"+(hasDetail?" detail-open":"")}>
      <Sidebar tab={tab} setTab={(t)=>{setTab(t); if(t!=="cellar") setDetailId(null);}} onScan={()=>setScanMode("camera")}/>

      <main className="main-area">
        <div key={tab} className="fade-in" style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
          {tab==="cellar" && <CellarScreenIPad onOpen={open} selectedId={detailId} openScan={(mode)=>setScanMode(mode||"camera")} openStorageMap={()=>setStorageMapOpen(true)} filters={filters} setFilters={setFilters}/>}
          {tab==="tonight" && <TonightScreen onOpen={(id)=>{setTab("cellar");setDetailId(id);}}/>}
          {tab==="pairing" && <PairingScreen onOpen={(id)=>{setTab("cellar");setDetailId(id);}}/>}
          {tab==="stats" && <StatsScreen onDrill={drillTo}/>}
          {tab==="backup" && <BackupScreen/>}
        </div>
      </main>

      {hasDetail && <DetailPanel id={detailId} onClose={()=>setDetailId(null)}/>}

      {scanMode && <ScanScreen start={scanMode} onClose={()=>setScanMode(null)} onAdded={(id)=>{ setScanMode(null); setTab("cellar"); setDetailId(id); }}/>}
      {storageMapOpen && <StorageMapScreen onClose={()=>setStorageMapOpen(false)} onOpenWine={(id)=>{ setStorageMapOpen(false); setTab("cellar"); setDetailId(id); }}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdaptiveApp/>);
