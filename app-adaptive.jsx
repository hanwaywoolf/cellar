/* app-adaptive.jsx — single entry point that picks phone or iPad layout by screen width */

const BREAKPOINT = 768; // iPad mini portrait = 768px

const EMPTY_FILTERS_A = { color:"All", country:null, region:null, cls:null, varietal:null, vintage:null, status:null, storage:null };

function AdaptiveApp(){
  const [isWide, setIsWide] = React.useState(()=> window.innerWidth >= BREAKPOINT);

  React.useEffect(()=>{
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const handler = (e)=> setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return ()=> mq.removeEventListener("change", handler);
  },[]);

  return isWide ? <IPadAppInner/> : <PhoneAppInner/>;
}

/* ---- Phone layout (from app-main.jsx) ---- */
function PhoneAppInner(){
  const [tab, setTab] = React.useState("cellar");
  const [scanMode, setScanMode] = React.useState(null);
  const [detailId, setDetailId] = React.useState(null);
  const [filters, setFilters] = React.useState(EMPTY_FILTERS_A);

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
        {tab==="cellar" && <CellarScreen onOpen={open} openScan={(mode)=>setScanMode(mode||"camera")} filters={filters} setFilters={setFilters}/>}
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

  return (
    <div className={"app app-ipad"+(hasDetail?" detail-open":"")}>
      <Sidebar tab={tab} setTab={(t)=>{setTab(t); if(t!=="cellar") setDetailId(null);}} onScan={()=>setScanMode("camera")}/>

      <main className="main-area">
        <div key={tab} className="fade-in" style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
          {tab==="cellar" && <CellarScreenIPad onOpen={open} selectedId={detailId} openScan={(mode)=>setScanMode(mode||"camera")} filters={filters} setFilters={setFilters}/>}
          {tab==="tonight" && <TonightScreen onOpen={(id)=>{setTab("cellar");setDetailId(id);}}/>}
          {tab==="pairing" && <PairingScreen onOpen={(id)=>{setTab("cellar");setDetailId(id);}}/>}
          {tab==="stats" && <StatsScreen onDrill={drillTo}/>}
        </div>
      </main>

      {hasDetail && <DetailPanel id={detailId} onClose={()=>setDetailId(null)}/>}

      {scanMode && <ScanScreen start={scanMode} onClose={()=>setScanMode(null)} onAdded={(id)=>{ setScanMode(null); setTab("cellar"); setDetailId(id); }}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdaptiveApp/>);
