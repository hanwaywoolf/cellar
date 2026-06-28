/* store.jsx — cellar data model, persistence, status logic, AI identify */

const THIS_YEAR = 2026;
const LS_KEY = "cellar_wines_v2";
const SCHEMA_VERSION = 3; // bump this when the wine object shape changes
const DATA_VER_LS = "cellar_schema_version";

// Display currency. The AI now estimates values directly in GBP; legacy
// USD-valued bottles are converted once via the v2->v3 migration below.
const CURRENCY = { code:"GBP", symbol:"\u00A3" };
const USD_TO_GBP = 0.79; // fixed conversion for one-time migration of pre-GBP data

// ---------- migration ----------
// Each step takes the wines array and returns an upgraded copy.
// Add a new case for every schema change; never delete old cases.
function migrateWines(wines, fromVersion){
  let v = fromVersion || 1;
  let ws = wines.map(function(w){ return Object.assign({}, w); }); // shallow-clone all

  // v1 -> v2: ensure qty, addedAt, photo exist; flatten legacy nested fields
  if(v < 2){
    ws = ws.map(function(w){
      if(w.qty == null) w.qty = 1;
      if(!w.addedAt) w.addedAt = Date.now();
      if(w.photo === undefined) w.photo = null;
      return w;
    });
    v = 2;
  }

  // v2 -> v3: app switched from USD to GBP. Convert money fields once and tag
  // the wine with its currency so we never double-convert.
  if(v < 3){
    ws = ws.map(function(w){
      if(w.currency !== "GBP"){
        ["valueEst","valueLow","valueHigh","paid"].forEach(function(k){
          if(typeof w[k] === "number" && isFinite(w[k])) w[k] = Math.round(w[k] * USD_TO_GBP);
        });
        w.currency = "GBP";
      }
      return w;
    });
    v = 3;
  }

  return ws;
}

// ---------- backup ----------
const AUTO_BACKUP_LS = "cellar_auto_bk";
let _autoBackup = (()=>{ try{ return localStorage.getItem(AUTO_BACKUP_LS)!=="false"; }catch(e){ return true; } })();
let _bkTimer = null;
function _dl(blob,name){ const url=URL.createObjectURL(blob); const a=Object.assign(document.createElement("a"),{href:url,download:name}); document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),2000); }

// ---------- persistence ----------
let _wines = null;
const listeners = new Set();
function uid(){ return "w_" + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-3); }

function load(){
  if(_wines) return _wines;
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){ _wines = JSON.parse(raw); }
  }catch(e){}
  if(!_wines){
    _wines = [];
    persist();
    try{ localStorage.setItem(DATA_VER_LS, String(SCHEMA_VERSION)); }catch(e){}
  } else {
    // upgrade any data saved by an older app version (e.g. USD -> GBP)
    let stored = 1;
    try{ stored = parseInt(localStorage.getItem(DATA_VER_LS)||"2",10) || 2; }catch(e){ stored = 2; }
    if(stored < SCHEMA_VERSION){
      _wines = migrateWines(_wines, stored);
      persist();
      try{ localStorage.setItem(DATA_VER_LS, String(SCHEMA_VERSION)); }catch(e){}
    }
  }
  return _wines;
}
function persist(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(_wines)); }catch(e){} listeners.forEach(fn=>fn()); }

const Cellar = {
  all(){ return load(); },
  get(id){ return load().find(w=>w.id===id); },
  add(w){ const item = { id:uid(), addedAt:Date.now(), qty:1, photo:null, currency:"GBP", ...w }; _wines=[item, ...load()]; persist(); Cellar.scheduleAutoBackup(); return item; },
  // Find an existing wine that matches producer+cuvée+vintage+color (case-insensitive)
  findDuplicate(w){
    const norm = s => (s||"").trim().toLowerCase();
    return load().find(e =>
      norm(e.producer)===norm(w.producer) &&
      norm(e.cuvee)===norm(w.cuvee) &&
      e.vintage==w.vintage &&
      norm(e.color)===norm(w.color)
    );
  },
  // Add or merge: if exact bottle exists, increment qty and return existing; otherwise add new
  addOrMerge(w, addQty=1){
    const existing = Cellar.findDuplicate(w);
    if(existing){
      Cellar.setQty(existing.id, (existing.qty||1) + addQty);
      return { ...Cellar.get(existing.id), merged:true };
    }
    return { ...Cellar.add({ ...w, qty:addQty }), merged:false };
  },
  update(id, patch){ _wines = load().map(w=> w.id===id ? {...w, ...patch} : w); persist(); },
  setQty(id, qty){ qty=Math.max(0,qty); if(qty===0){ Cellar.remove(id); return; } Cellar.update(id,{qty}); },
  remove(id){ _wines = load().filter(w=>w.id!==id); persist(); },
  _restore(wines){ _wines = wines; persist(); try{ localStorage.setItem(DATA_VER_LS, String(SCHEMA_VERSION)); }catch(e){} },
  openCoravin(id){ Cellar.update(id, { coravin:{ openedAt: Date.now() } }); },
  reseal(id){ Cellar.update(id, { coravin:null }); },
  finishBottle(id){ const w=Cellar.get(id); if(!w) return; const qty=(w.qty||1)-1; if(qty<=0){ Cellar.remove(id); } else { Cellar.update(id, { qty, coravin:null }); } },
  subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); },
  exportBackup(){
    const date=new Date().toISOString().slice(0,10);
    const payload={version:2,exportedAt:new Date().toISOString(),count:load().length,wines:load()};
    _dl(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),"cochez-cellar-"+date+".json");
  },
  importBackup(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=e=>{
        try{
          const data=JSON.parse(e.target.result);
          const wines=Array.isArray(data)?data:(Array.isArray(data.wines)?data.wines:null);
          if(!wines) throw new Error("No wine data found in this file.");
          _wines=wines; persist(); resolve(wines.length);
        }catch(err){ reject(err); }
      };
      r.onerror=()=>reject(new Error("Could not read file."));
      r.readAsText(file);
    });
  },
  getAutoBackup(){ return _autoBackup; },
  setAutoBackup(on){ _autoBackup=!!on; try{ localStorage.setItem(AUTO_BACKUP_LS,String(_autoBackup)); }catch(e){} },
  scheduleAutoBackup(){
    // now handled by BackupManager.recordScan() — kept for legacy callers
    if(window.BackupManager) return; // defer to new system
    if(!_autoBackup) return;
    clearTimeout(_bkTimer);
    _bkTimer=setTimeout(()=>Cellar.exportBackup(),3000);
  },
};

// React hook
function useCellar(){
  const [, force] = React.useReducer(x=>x+1, 0);
  React.useEffect(()=> Cellar.subscribe(force), []);
  return Cellar.all();
}

// ---------- status logic ----------
// Five clearly-defined bands across a wine's life, from the four window markers
// drinkFrom <= peakFrom <= peakTo <= drinkTo:
//   hold  - before drinkFrom ......... too young, keep cellaring
//   early - drinkFrom..peakFrom ...... drinkable, still climbing to peak
//   now   - peakFrom..peakTo ......... at peak, ideal to drink
//   soon  - peakTo..drinkTo .......... past peak but in window, drink up
//   past  - after drinkTo ............ beyond its window, likely too old
function _num(x){ return (typeof x==="number" && isFinite(x)) ? x : null; }
function windowMarkers(w){
  let df=_num(w.drinkFrom), pf=_num(w.peakFrom), pt=_num(w.peakTo), dt=_num(w.drinkTo);
  if(df==null && pf==null && pt==null && dt==null) return null; // no window data
  // Fill gaps from whatever markers exist so partial data still classifies.
  if(pf==null) pf = (df!=null?df:(pt!=null?pt:dt));
  if(pt==null) pt = (dt!=null?dt:pf);
  if(df==null) df = pf;
  if(dt==null) dt = pt;
  // Enforce monotonic order so a mis-estimated set still behaves sanely.
  pf = Math.max(df, pf); pt = Math.max(pf, pt); dt = Math.max(pt, dt);
  return { df, pf, pt, dt };
}
function statusOf(w, year=THIS_YEAR){
  const m = windowMarkers(w);
  if(!m) return "hold";              // unknown window -> hold
  if(year > m.dt) return "past";     // beyond drink window - too old
  if(year < m.df) return "hold";     // before window - too young
  if(year < m.pf) return "early";    // in window, climbing to peak
  if(year <= m.pt) return "now";     // at peak
  return "soon";                     // past peak, still drinkable - drink up
}
const STATUS_LABEL = { now:"Drink now", soon:"Drink soon", early:"Almost ready", hold:"Too young", past:"Past window" };
function statusLabel(w){
  const s = statusOf(w);
  const m = windowMarkers(w);
  if(s==="hold" && m) return "Hold → " + m.df;
  if(s==="early" && m) return "Drink · peaks " + m.pf;
  return STATUS_LABEL[s];
}
// Short subtitle for the status tile (e.g. "drink by 2030").
function statusSub(w){
  const s = statusOf(w), m = windowMarkers(w);
  if(!m) return "";
  if(s==="hold") return "drink from " + m.df;
  if(s==="early") return "peak " + m.pf + "–" + m.pt;
  if(s==="now") return "peak through " + m.pt;
  if(s==="soon") return "drink by " + m.dt;
  return "window closed " + m.dt;
}
// One-line plain-English guidance shown on the detail screen.
function statusBlurb(w){
  const s = statusOf(w), m = windowMarkers(w);
  if(s==="now") return "At its peak now — a great time to open.";
  if(s==="soon") return "Past peak but still drinking well — drink up over the next year or two.";
  if(s==="early") return m ? ("Drinking well already; should keep improving toward its peak around " + m.pf + ".") : "Drinkable now, with room to improve.";
  if(s==="past") return "Likely past its drinking window — open soon if at all.";
  return m ? ("Too young — best left to age until around " + m.df + ".") : "Best left to age a while longer.";
}
function windowText(w){
  if(!w.drinkFrom) return "—";
  return `${w.drinkFrom}–${w.drinkTo}` + (w.peakFrom?`  ·  peak ${w.peakFrom}–${w.peakTo}`:"");
}
// position 0..1 of "now" across the drink window, + peak band
function meterGeom(w){
  const m = windowMarkers(w); if(!m) return null;
  const a=m.df, b=m.dt; if(b<=a) return null;
  const clamp=v=>Math.max(0,Math.min(1,v));
  return {
    now: clamp((THIS_YEAR-a)/(b-a)),
    peakL: clamp((m.pf-a)/(b-a)),
    peakR: clamp((m.pt-a)/(b-a)),
  };
}
const fmt$ = n => n==null ? "\u2014" : CURRENCY.symbol + Math.round(n).toLocaleString();
const COLOR_HEX = { Red:"#7a2233", White:"#c8a93f", "Rosé":"#d98a8f", Rose:"#d98a8f", Sparkling:"#b88a2a" };

// ---------- professional critic ratings ----------
const RATING_SOURCES = { RP:"Robert Parker", JS:"James Suckling", WS:"Wine Spectator", AG:"Vinous", JR:"Jancis Robinson", D:"Decanter", WE:"Wine Enthusiast" };
function ratingsList(w){
  if(!w||!w.ratings) return [];
  return Object.entries(w.ratings).filter(([k,v])=>v!=null&&v>0).sort((a,b)=>b[1]-a[1]);
}

// ---------- Coravin preservation (3-year window) ----------
const CORAVIN_DAYS = 365*3;
function coravinInfo(w){
  if(!w || !w.coravin || !w.coravin.openedAt) return null;
  const total = CORAVIN_DAYS*86400000;
  const left = (w.coravin.openedAt + total) - Date.now();
  return { total, leftMs:left, leftDays:Math.ceil(left/86400000), frac:Math.max(0,Math.min(1,left/total)), expired:left<=0, drinkBy:w.coravin.openedAt+total, openedAt:w.coravin.openedAt };
}
function coravinText(w){
  const c = coravinInfo(w); if(!c) return null;
  if(c.expired) return "Window passed — drink now";
  const d = c.leftDays;
  if(d>=365){ const y=Math.floor(d/365); const mo=Math.round((d%365)/30.44); return mo ? (y+"y "+mo+"mo left") : (y+"y left"); }
  if(d>=60) return Math.round(d/30.44)+" months left";
  if(d>=1) return d+(d===1?" day left":" days left");
  return "Drink today";
}

// ---------- AI identify from OCR text ----------
async function identifyFromText(ocrText){
  const prompt = `You are a master sommelier and wine database. Text was OCR-scanned from a wine bottle label (it may be messy, partial, or contain noise). Identify the wine and return ONLY a JSON object (no markdown, no prose) with EXACTLY these keys:
{"producer":string,"cuvee":string,"vintage":number,"color":"Red"|"White"|"Rosé"|"Sparkling","country":string,"region":string,"subregion":string,"appellation":string,"classification":string,"varietal":string,"abv":number,"critScore":number,"drinkFrom":number,"drinkTo":number,"peakFrom":number,"peakTo":number,"valueLow":number,"valueHigh":number,"valueEst":number,"pairings":string[],"tasting":string,"body":number,"tannin":number,"acidity":number,"sweetness":number,"ratings":{"RP":number|null,"JS":number|null,"WS":number|null,"AG":number|null,"JR":number|null,"D":number|null,"WE":number|null},"confidence":number}
Rules: classification = the meaningful tier for that region (e.g. Rioja: Crianza/Reserva/Gran Reserva; Bordeaux: Cru Bourgeois/Grand Cru; else "Estate" or appellation tier). body/tannin/acidity/sweetness are 0-100. Estimate realistic current market value in GBP (British pounds sterling) — valueLow, valueHigh and valueEst must all be GBP amounts, not USD. drinkFrom/peakFrom/peakTo/drinkTo are 4-digit years and MUST satisfy drinkFrom <= peakFrom <= peakTo <= drinkTo. Base the window on this exact producer+cuvee+vintage and its real ageing curve — be rigorous and honest, never inflate longevity. drinkFrom = when it first drinks well; peakFrom..peakTo = the prime plateau; drinkTo = the realistic end of its drinking life, after which it is likely past its best. CRUCIAL: for older vintages the window may already have CLOSED — if the wine is past its drinking life, set drinkTo to the (past) year it realistically faded; never extend the window just because a bottle still exists. Everyday/early-drinking wines get short windows of a few years; only genuinely age-worthy wines (top Bordeaux, Barolo, Rioja Gran Reserva, vintage Port, etc.) get multi-decade windows. pairings = 3-5 specific foods. tasting = one vivid sentence. ratings = known professional critic scores for this specific wine+vintage (RP=Robert Parker, JS=James Suckling, WS=Wine Spectator, AG=Vinous, JR=Jancis Robinson converted to 100-pt, D=Decanter, WE=Wine Enthusiast); use null for unknown. critScore = the single highest score. confidence 0-100 = how sure you are of the identification. If a field is unknown, make your best expert estimate. Today is ${THIS_YEAR}.

OCR TEXT:
"""${ocrText.slice(0,1200)}"""`;
  const raw = await window.claude.complete(prompt);
  let obj;
  try{
    const m = raw.match(/\{[\s\S]*\}/);
    obj = JSON.parse(m ? m[0] : raw);
  }catch(e){
    throw new Error("Could not read that label. Try again or enter details manually.");
  }
  // coerce numbers
  ["vintage","abv","critScore","drinkFrom","drinkTo","peakFrom","peakTo","valueLow","valueHigh","valueEst","body","tannin","acidity","sweetness","confidence"]
    .forEach(k=>{ if(obj[k]!=null) obj[k]=Number(obj[k]); });
  if(!Array.isArray(obj.pairings)) obj.pairings = obj.pairings? [String(obj.pairings)] : [];
  return obj;
}

// ---------- AI identify directly from the label photo (vision) ----------
// Far more reliable than OCR for real bottles — gold-on-black, embossed,
// curved, or decorative labels that defeat text recognition.
const WINE_SCHEMA = `{"producer":string,"cuvee":string,"vintage":number,"color":"Red"|"White"|"Rosé"|"Sparkling","country":string,"region":string,"subregion":string,"appellation":string,"classification":string,"varietal":string,"abv":number,"critScore":number,"drinkFrom":number,"drinkTo":number,"peakFrom":number,"peakTo":number,"valueLow":number,"valueHigh":number,"valueEst":number,"pairings":string[],"tasting":string,"body":number,"tannin":number,"acidity":number,"sweetness":number,"ratings":{"RP":number|null,"JS":number|null,"WS":number|null,"AG":number|null,"JR":number|null,"D":number|null,"WE":number|null},"labelText":string,"confidence":number}`;

function parseWine(raw){
  let obj;
  try{
    const m = raw.match(/\{[\s\S]*\}/);
    obj = JSON.parse(m ? m[0] : raw);
  }catch(e){
    throw new Error("Could not read that label. Try again or enter details manually.");
  }
  ["vintage","abv","critScore","drinkFrom","drinkTo","peakFrom","peakTo","valueLow","valueHigh","valueEst","body","tannin","acidity","sweetness","confidence"]
    .forEach(k=>{ if(obj[k]!=null) obj[k]=Number(obj[k]); });
  if(obj.confidence!=null && obj.confidence<=1) obj.confidence = Math.round(obj.confidence*100); // accept 0-1 or 0-100
  if(!Array.isArray(obj.pairings)) obj.pairings = obj.pairings? [String(obj.pairings)] : [];
  // normalize ratings
  if(obj.ratings && typeof obj.ratings==="object"){
    Object.keys(obj.ratings).forEach(k=>{ if(obj.ratings[k]!=null){ obj.ratings[k]=Number(obj.ratings[k]); if(isNaN(obj.ratings[k])) obj.ratings[k]=null; } });
  } else { obj.ratings = {}; }
  // set critScore from highest rating if not already set
  if(!obj.critScore){ const vals=Object.values(obj.ratings||{}).filter(v=>v!=null&&v>0); if(vals.length) obj.critScore=Math.max(...vals); }
  return obj;
}

async function identifyFromImage(imageDataUrl){
  if(!window.claude || !window.claude.complete){
    throw new Error("The wine-ID service isn’t connected here. Scanning needs the Claude AI bridge, which is available in the Anthropic preview — a plain static host (e.g. Netlify) needs a small API proxy first.");
  }
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(imageDataUrl) || [];
  const media_type = m[1] || "image/jpeg";
  const data = m[2] || (imageDataUrl.split(",")[1] || imageDataUrl);
  const instruction = `You are a master sommelier with an encyclopedic wine database. Study this photo of a wine bottle label and identify the wine. Read every legible word — including small print, foil/gold lettering, and embossed or low-contrast text. Use producer logos and visual cues. Then return ONLY a JSON object (no markdown, no prose) with EXACTLY these keys:
${WINE_SCHEMA}
Rules: classification = the meaningful tier for that region (e.g. Rioja: Crianza/Reserva/Gran Reserva; Bordeaux: Cru Bourgeois/Grand Cru; else "Estate" or appellation tier). body/tannin/acidity/sweetness are 0-100. Estimate realistic current market value in GBP (British pounds sterling) — valueLow, valueHigh and valueEst must all be GBP amounts, not USD. drinkFrom/peakFrom/peakTo/drinkTo are 4-digit years and MUST satisfy drinkFrom <= peakFrom <= peakTo <= drinkTo. Base the window on this exact producer+cuvee+vintage and its real ageing curve — be rigorous and honest, never inflate longevity. drinkFrom = when it first drinks well; peakFrom..peakTo = the prime plateau; drinkTo = the realistic end of its drinking life, after which it is likely past its best. CRUCIAL: for older vintages the window may already have CLOSED — if the wine is past its drinking life, set drinkTo to the (past) year it realistically faded; never extend the window just because a bottle still exists. Everyday/early-drinking wines get short windows of a few years; only genuinely age-worthy wines (top Bordeaux, Barolo, Rioja Gran Reserva, vintage Port, etc.) get multi-decade windows. pairings = 3-5 specific foods. tasting = one vivid sentence. labelText = the exact words you can read on the label, comma-separated. ratings = known professional critic scores for this specific wine+vintage (RP=Robert Parker/Wine Advocate, JS=James Suckling, WS=Wine Spectator, AG=Antonio Galloni/Vinous, JR=Jancis Robinson converted to 100-pt, D=Decanter, WE=Wine Enthusiast); use null for any you don't know — only include scores you're confident about. critScore = the single highest/most authoritative score. confidence 0-100 = how sure you are of the identification. If the producer or wine is unclear, still give your best expert guess and lower the confidence. If a field is unknown, make your best expert estimate. Today is ${THIS_YEAR}.`;
  const raw = await window.claude.complete({ messages:[{ role:"user", content:[
    { type:"image", source:{ type:"base64", media_type, data } },
    { type:"text", text:instruction }
  ]}]});
  return parseWine(raw);
}

// Refresh just the ratings for a wine already in the cellar (text-only, no image)
async function refreshRatings(id){
  if(!window.claude || !window.claude.complete) throw new Error("AI service not connected.");
  const w = Cellar.get(id);
  if(!w) throw new Error("Wine not found.");
  const prompt = `You are a master sommelier. Return ONLY a JSON object (no markdown) with professional critic scores for this specific wine:
Producer: ${w.producer}
Cuvée: ${w.cuvee||""}
Vintage: ${w.vintage||"NV"}
Varietal: ${w.varietal||""}
Region: ${w.region||""}, ${w.country||""}
Classification: ${w.classification||""}

Keys: {"RP":number|null,"JS":number|null,"WS":number|null,"AG":number|null,"JR":number|null,"D":number|null,"WE":number|null,"critScore":number}
RP=Robert Parker, JS=James Suckling, WS=Wine Spectator, AG=Vinous, JR=Jancis Robinson (100-pt), D=Decanter, WE=Wine Enthusiast. Use null for scores you don't know. critScore = the highest. Only include scores you're confident are real published scores for this exact wine+vintage.`;
  const raw = await window.claude.complete(prompt);
  let obj;
  try{ const m=raw.match(/\{[\s\S]*\}/); obj=JSON.parse(m?m[0]:raw); }catch(e){ throw new Error("Couldn't parse ratings."); }
  const ratings = {};
  Object.keys(RATING_SOURCES).forEach(k=>{ if(obj[k]!=null) ratings[k]=Number(obj[k]); });
  const critScore = obj.critScore ? Number(obj.critScore) : Math.max(0,...Object.values(ratings).filter(v=>v!=null&&v>0));
  Cellar.update(id, { ratings, critScore: critScore||w.critScore });
  return ratings;
}

// Re-assess the drink window for a wine already in the cellar (text-only, no image)
async function refreshWindow(id){
  if(!window.claude || !window.claude.complete) throw new Error("AI service not connected.");
  const w = Cellar.get(id);
  if(!w) throw new Error("Wine not found.");
  const prompt = `You are a master sommelier with deep knowledge of wine ageing curves. Assess the realistic drinking window for this exact wine and return ONLY a JSON object (no markdown):
Producer: ${w.producer}
Cuvée: ${w.cuvee||""}
Vintage: ${w.vintage||"NV"}
Colour: ${w.color||""}
Varietal: ${w.varietal||""}
Region: ${w.region||""}, ${w.country||""}
Classification: ${w.classification||""}

Keys: {"drinkFrom":number,"peakFrom":number,"peakTo":number,"drinkTo":number}
All four are 4-digit years and MUST satisfy drinkFrom <= peakFrom <= peakTo <= drinkTo. drinkFrom = when it first drinks well; peakFrom..peakTo = the prime plateau; drinkTo = the realistic end of its drinking life. Be rigorous and honest about this exact producer+cuvée+vintage — never inflate longevity. CRUCIAL: for older vintages the window may already have CLOSED; if so, set drinkTo to the (past) year it realistically faded. Everyday wines get short windows; only genuinely age-worthy wines get multi-decade windows. Today is ${THIS_YEAR}.`;
  const raw = await window.claude.complete(prompt);
  let obj;
  try{ const m=raw.match(/\{[\s\S]*\}/); obj=JSON.parse(m?m[0]:raw); }catch(e){ throw new Error("Couldn't read the drink window."); }
  const patch = {};
  ["drinkFrom","peakFrom","peakTo","drinkTo"].forEach(k=>{ const v=Number(obj[k]); if(isFinite(v)&&v>1900&&v<2200) patch[k]=v; });
  if(!patch.drinkTo && !patch.peakTo) throw new Error("Couldn't read the drink window.");
  Cellar.update(id, patch);
  return patch;
}

Object.assign(window, { Cellar, useCellar, statusOf, statusLabel, statusSub, statusBlurb, STATUS_LABEL, windowMarkers, windowText, meterGeom, fmt$, COLOR_HEX, RATING_SOURCES, ratingsList, refreshRatings, refreshWindow, identifyFromText, identifyFromImage, coravinInfo, coravinText, CORAVIN_DAYS, THIS_YEAR, SCHEMA_VERSION, migrateWines });
