/* screen-scan.jsx — capture → OCR → AI identify → confirm → add */

// downscale an image source (dataURL/Blob URL) to a JPEG dataURL
function downscale(src, max, q=0.82){
  return new Promise((res)=>{
    const img = new Image();
    img.onload = ()=>{
      let {width:w, height:h} = img;
      const scale = Math.min(1, max/Math.max(w,h));
      w=Math.round(w*scale); h=Math.round(h*scale);
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      res(c.toDataURL("image/jpeg", q));
    };
    img.onerror=()=>res(src);
    img.src=src;
  });
}

const COLORS = ["Red","White","Rosé","Sparkling"];

function ScanScreen({ start="camera", onClose, onAdded }){
  const [phase, setPhase] = React.useState(start==="manual" ? "confirm" : "camera"); // camera | processing | confirm | error
  const [progress, setProgress] = React.useState(0);
  const [progLabel, setProgLabel] = React.useState("");
  const [shot, setShot] = React.useState(null);     // full photo dataURL
  const [thumb, setThumb] = React.useState(null);   // small stored photo
  const [ocr, setOcr] = React.useState("");
  const [draft, setDraft] = React.useState(start==="manual" ? blankDraft() : null);
  const [conf, setConf] = React.useState(start==="manual" ? 0 : null);
  const [qty, setQty] = React.useState(1);
  const [err, setErr] = React.useState("");
  const [camReady, setCamReady] = React.useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const fileRef = React.useRef(null);

  // start camera
  React.useEffect(()=>{
    if(phase!=="camera") return;
    let cancelled=false;
    (async()=>{
      try{
        const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ideal:"environment"} }, audio:false });
        if(cancelled){ s.getTracks().forEach(t=>t.stop()); return; }
        streamRef.current=s;
        if(videoRef.current){ videoRef.current.srcObject=s; await videoRef.current.play().catch(()=>{}); setCamReady(true); }
      }catch(e){ setCamReady(false); }
    })();
    return ()=>{ cancelled=true; stopCam(); };
  },[phase]);

  function stopCam(){ if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; } }

  function captureFromVideo(){
    const v=videoRef.current; if(!v||!v.videoWidth) return;
    const c=document.createElement("canvas"); c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    stopCam();
    runPipeline(c.toDataURL("image/jpeg",0.9));
  }
  function onFile(e){
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    const url=URL.createObjectURL(f);
    stopCam();
    runPipeline(url);
  }

  // jump straight to the editable form — no photo, no AI call
  function enterManually(){ stopCam(); setShot(null); setThumb(null); setOcr(""); setDraft(blankDraft()); setConf(0); setPhase("confirm"); }

  async function runPipeline(src){
    setPhase("processing"); setErr(""); setProgress(8); setProgLabel("Reading the label…");
    // gentle indeterminate progress while the vision model works
    let p = 8;
    const tick = setInterval(()=>{ p = Math.min(92, p + Math.random()*9); setProgress(Math.round(p)); }, 300);
    try{
      const big = await downscale(src, 1100, 0.86);
      const small = await downscale(src, 360, 0.8);
      setShot(big); setThumb(small);
      setProgLabel("Identifying the wine…");
      const obj = await identifyFromImage(big);
      clearInterval(tick); setProgress(100);
      setOcr(obj.labelText || "");
      setConf(obj.confidence ?? null);
      setDraft(normalize(obj));
      setPhase("confirm");
    }catch(e){
      clearInterval(tick);
      setErr(e.message || "Something went wrong reading that label."); setPhase("error");
    }
  }

  function blankDraft(){
    return { producer:"", cuvee:"", vintage:THIS_YEAR-3, color:"Red", country:"", region:"", subregion:"", appellation:"", classification:"Estate", varietal:"", abv:13.5, critScore:90, drinkFrom:THIS_YEAR, drinkTo:THIS_YEAR+6, peakFrom:THIS_YEAR+1, peakTo:THIS_YEAR+4, valueLow:null, valueHigh:null, valueEst:null, pairings:[], tasting:"", body:60, tannin:50, acidity:55, sweetness:10, ratings:{}, location:null };
  }
  function normalize(o){ return { ...blankDraft(), ...o, pairings:Array.isArray(o.pairings)?o.pairings:[] }; }

  function field(k,v){ setDraft(d=>({...d,[k]:v})); }

  function save(){
    const w = { ...draft, qty, photo:thumb,
      valueEst: draft.valueEst!=null?Number(draft.valueEst): (draft.valueLow&&draft.valueHigh?Math.round((+draft.valueLow+ +draft.valueHigh)/2):null) };
    ["vintage","abv","critScore","drinkFrom","drinkTo","peakFrom","peakTo","valueLow","valueHigh","valueEst","body","tannin","acidity","sweetness"]
      .forEach(k=>{ if(w[k]!==null&&w[k]!=="") w[k]=Number(w[k]); });
    const item = Cellar.addOrMerge(w, qty);
    window.BackupManager?.recordScan?.();
    onAdded && onAdded(item.id);
  }

  // ---------- render ----------
  return (
    <div className={phase==="camera" ? "scan-cam" : "full-screen"}>
      {phase==="camera" && (
        <div style={{flex:1,position:"relative",background:"#1a1413",overflow:"hidden"}}>
          <video ref={videoRef} playsInline muted style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:camReady?1:0,transition:"opacity .4s"}}/>
          {!camReady && (
            <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",color:"#e9ded2",textAlign:"center",padding:30}}>
              <div>
                <div style={{opacity:.6,marginBottom:14}}><Ico n="camera" s={40}/></div>
                <div style={{fontSize:20,fontWeight:600,marginBottom:6}}>Point at the label</div>
                <div style={{fontSize:13,opacity:.7,maxWidth:240,margin:"0 auto"}}>Allow camera access, or upload a photo of the front label below.</div>
                <button onClick={enterManually} style={{marginTop:18,display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,253,249,.14)",color:"#f3ece0",border:"1px solid rgba(243,236,224,.4)",borderRadius:30,padding:"10px 18px",fontSize:13,fontWeight:600}}><Ico n="edit" s={15}/>Enter details manually</button>
              </div>
            </div>
          )}
          {/* frame guide */}
          <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0}}>
              {[[8,16,1,1],[92,16,-1,1],[8,84,1,-1],[92,84,-1,-1]].map(([x,y,sx,sy],i)=>(
                <path key={i} d={`M${x} ${y+9*sy} V${y} H${x+9*sx}`} fill="none" stroke="#f3ece0" strokeWidth="0.7" opacity="0.85" vectorEffect="non-scaling-stroke" style={{strokeWidth:2.4}}/>
              ))}
            </svg>
          </div>
          {/* top bar */}
          <div style={{position:"absolute",top:0,left:0,right:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"calc(var(--safe-top) + 14px) 16px"}}>
            <button className="icon-btn" onClick={()=>{stopCam();onClose();}}><Ico n="x" s={20}/></button>
            <span style={{color:"#f3ece0",fontSize:13,fontWeight:600,background:"rgba(0,0,0,.35)",padding:"6px 12px",borderRadius:20,whiteSpace:"nowrap"}}>Scan a label</span>
            <div style={{width:42}}/>
          </div>
          {/* controls */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",alignItems:"flex-end",justifyContent:"space-around",padding:"20px 24px calc(var(--safe-bottom) + 22px)"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:64}}>
              <button className="icon-btn" style={{background:"rgba(255,253,249,.16)",border:"none",color:"#f3ece0"}} onClick={()=>fileRef.current.click()}><Ico n="image" s={22}/></button>
              <span style={{color:"#f3ece0",fontSize:10.5,opacity:.75}}>Upload</span>
            </div>
            <button onClick={captureFromVideo} disabled={!camReady} style={{width:74,height:74,borderRadius:"50%",border:"4px solid #f3ece0",background:camReady?"#6d1f2f":"rgba(255,253,249,.3)",display:"grid",placeItems:"center",boxShadow:"0 6px 20px rgba(0,0,0,.4)",marginBottom:14}}>
              <span style={{width:54,height:54,borderRadius:"50%",background:camReady?"#6d1f2f":"transparent",border:"2px solid rgba(255,255,255,.5)"}}/>
            </button>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:64}}>
              <button className="icon-btn" style={{background:"rgba(255,253,249,.16)",border:"none",color:"#f3ece0"}} onClick={enterManually}><Ico n="edit" s={20}/></button>
              <span style={{color:"#f3ece0",fontSize:10.5,opacity:.75}}>Manual</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{display:"none"}}/>
        </div>
      )}

      {phase==="processing" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:30,textAlign:"center",gap:22}}>
          {thumb && <img src={thumb} alt="" style={{width:120,height:170,objectFit:"cover",borderRadius:14,boxShadow:"var(--sh)"}}/>}
          <div style={{color:"var(--wine)"}}><div className="spin" style={{width:34,height:34}}><Ico n="refresh" s={34}/></div></div>
          <div>
            <div style={{fontSize:20,fontWeight:600}}>{progLabel}</div>
            <div className="muted" style={{fontSize:13,marginTop:6}}>Matching against the wine database…</div>
          </div>
          <div style={{width:200,height:6,background:"var(--bg2)",borderRadius:30,overflow:"hidden"}}>
            <div style={{height:"100%",width:progress+"%",background:"var(--wine)",transition:"width .35s"}}/>
          </div>
        </div>
      )}

      {phase==="error" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:36,textAlign:"center",gap:18}}>
          <div className="muted"><Ico n="info" s={40}/></div>
          <div style={{fontFamily:"var(--serif)",fontSize:22}}>Couldn’t read that one</div>
          <div className="muted" style={{fontSize:14,maxWidth:280}}>{err}</div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn primary" onClick={()=>{ setDraft(blankDraft()); setConf(0); setPhase("confirm"); }}>Enter manually</button>
            <button className="btn" onClick={()=>setPhase("camera")}>Retake</button>
          </div>
        </div>
      )}

      {phase==="confirm" && draft && (
        <ConfirmForm draft={draft} field={field} qty={qty} setQty={setQty} thumb={thumb} ocr={ocr} conf={conf}
          onCancel={onClose} onSave={save} onRetake={()=>{ setDraft(null); setPhase("camera"); }} />
      )}
    </div>
  );
}

Object.assign(window, { ScanScreen, downscale });
