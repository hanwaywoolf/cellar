/* backup.jsx - scan-counter auto-backup + optional Google Drive */

const BK_SCAN_COUNT = "storavin_scans_since_bk";
const BK_LAST_LOCAL = "storavin_last_bk_local";
const BK_LAST_DRIVE = "storavin_last_bk_drive";
const BK_CLIENT_ID  = "storavin_gdrive_client_id";
const BK_INTERVAL   = 10; // wines scanned between auto-backups

/* --- Google Drive token (in-memory only, never persisted) --- */
let _gToken  = null;
let _gExpiry = 0;
function _tokenValid(){ return !!_gToken && Date.now() < _gExpiry - 30000; }
function _gHeader(){ return { "Authorization": "Bearer " + _gToken }; }

/* Lazily inject Google Identity Services and resolve when it's ready. */
let _gisPromise = null;
function _loadGIS(){
  if(window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if(_gisPromise) return _gisPromise;
  _gisPromise = new Promise(function(resolve, reject){
    var existing = document.querySelector('script[data-gis]');
    function ready(){
      // GIS sets window.google.accounts shortly after the script loads
      var tries = 0;
      (function check(){
        if(window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
        if(tries++ > 60) return reject(new Error("Google sign-in library failed to initialise. Check your connection and try again."));
        setTimeout(check, 50);
      })();
    }
    if(existing){ existing.addEventListener("load", ready); ready(); return; }
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true; s.setAttribute("data-gis","1");
    s.onload = ready;
    s.onerror = function(){ _gisPromise = null; reject(new Error("Couldn't reach Google. Check your internet connection and try again.")); };
    document.head.appendChild(s);
  });
  return _gisPromise;
}

async function _gSignIn(clientId){
  await _loadGIS();
  return new Promise(function(resolve, reject){
    if(!window.google || !window.google.accounts || !window.google.accounts.oauth2)
      return reject(new Error("Google Identity Services not loaded. Check your connection."));
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: function(resp){
        if(resp.error) return reject(new Error(resp.error_description || resp.error));
        _gToken  = resp.access_token;
        _gExpiry = Date.now() + ((resp.expires_in || 3600) * 1000);
        resolve();
      },
      error_callback: function(err){
        var t = (err && err.type) || "";
        if(t === "popup_closed")      return reject(new Error("Sign-in window was closed before finishing. Tap Connect Drive and complete the Google sign-in."));
        if(t === "popup_failed_to_open") return reject(new Error("Your browser blocked the Google sign-in popup. Allow popups for this site, then tap Connect Drive again."));
        return reject(new Error((err && err.message) || "Google sign-in didn't complete. Please try again."));
      }
    });
    client.requestAccessToken({ prompt:"select_account" });
  });
}

async function _gFindOrCreateFolder(){
  const q = encodeURIComponent("name='Storavin Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const r = await fetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id)", { headers: _gHeader() });
  const d = await r.json();
  if(d.files && d.files.length) return d.files[0].id;
  const cr = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: Object.assign({}, _gHeader(), { "Content-Type":"application/json" }),
    body: JSON.stringify({ name:"Storavin Backups", mimeType:"application/vnd.google-apps.folder" })
  });
  const folder = await cr.json();
  if(!folder.id) throw new Error("Could not create Drive folder.");
  return folder.id;
}

async function _gUpload(json, filename){
  const folderId = await _gFindOrCreateFolder();
  const meta = { name: filename, mimeType:"application/json", parents:[folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], {type:"application/json"}));
  form.append("file",     new Blob([json],               {type:"application/json"}));
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime", {
    method: "POST", headers: _gHeader(), body: form
  });
  if(!r.ok) throw new Error("Drive upload failed: " + r.statusText);
  return await r.json();
}

async function _gList(){
  const q = encodeURIComponent("name contains 'storavin-backup' and trashed=false");
  const r = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=" + q + "&orderBy=createdTime desc&fields=files(id,name,createdTime,size)&pageSize=20",
    { headers: _gHeader() }
  );
  if(!r.ok) return [];
  const d = await r.json();
  return d.files || [];
}

async function _gDownload(fileId){
  const r = await fetch("https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media", { headers: _gHeader() });
  if(!r.ok) throw new Error("Download failed.");
  return await r.text();
}

/* --- Drive sync-file helpers (single canonical file all devices share) --- */
const SYNC_FILE = "storavin-cellar.json";
async function _gFindFile(name){
  const folderId = await _gFindOrCreateFolder();
  const q = encodeURIComponent("name='" + name + "' and '" + folderId + "' in parents and trashed=false");
  const r = await fetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id,modifiedTime)&orderBy=modifiedTime desc", { headers: _gHeader() });
  if(!r.ok) return null;
  const d = await r.json();
  return (d.files && d.files[0]) ? d.files[0] : null;
}
async function _gUpdateFile(fileId, json){
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files/" + fileId + "?uploadType=media&fields=id,modifiedTime", {
    method: "PATCH", headers: Object.assign({}, _gHeader(), { "Content-Type":"application/json" }), body: json
  });
  if(!r.ok) throw new Error("Sync upload failed: " + r.statusText);
  return await r.json();
}
async function _gCreateFile(name, json){
  const folderId = await _gFindOrCreateFolder();
  const meta = { name: name, mimeType:"application/json", parents:[folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], {type:"application/json"}));
  form.append("file",     new Blob([json],                {type:"application/json"}));
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime", { method:"POST", headers:_gHeader(), body:form });
  if(!r.ok) throw new Error("Sync create failed: " + r.statusText);
  return await r.json();
}

/* Try to get an access token WITHOUT user interaction (active Google session +
   prior consent). Used for background auto-sync. Falls back to needing a tap. */
async function _gSilentToken(clientId){
  await _loadGIS();
  return new Promise(function(resolve, reject){
    if(!window.google || !window.google.accounts || !window.google.accounts.oauth2)
      return reject(new Error("GIS not loaded"));
    var done = false;
    var client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: function(resp){ done=true; if(resp.error) return reject(new Error(resp.error)); _gToken=resp.access_token; _gExpiry=Date.now()+((resp.expires_in||3600)*1000); resolve(); },
      error_callback: function(err){ done=true; reject(new Error((err && err.type) || "silent_failed")); }
    });
    try{ client.requestAccessToken({ prompt:"" }); }catch(e){ reject(e); }
    setTimeout(function(){ if(!done) reject(new Error("silent_timeout")); }, 8000);
  });
}

/* --- helpers --- */
function _dl(json, filename){
  const url = URL.createObjectURL(new Blob([json], {type:"application/json"}));
  const a = Object.assign(document.createElement("a"), {href:url, download:filename});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
}
function _payload(){ return JSON.stringify({ version:SCHEMA_VERSION, exportedAt:new Date().toISOString(), count:Cellar.all().length, wines:Cellar.all() }, null, 2); }
function _ts(){ return new Date().toISOString().slice(0,19).replace("T","-").replace(/:/g,"-"); }

/* --- localStorage helpers (getter/setter object) --- */
function _lsGet(key, def){ try{ var v=localStorage.getItem(key); return v===null?def:v; }catch(e){ return def; } }
function _lsSet(key, val){ try{ localStorage.setItem(key,String(val)); }catch(e){} }

const _ls = {
  getCount:    function(){ return parseInt(_lsGet(BK_SCAN_COUNT,"0"),10)||0; },
  setCount:    function(n){ _lsSet(BK_SCAN_COUNT,n); },
  getLastLocal:function(){ return _lsGet(BK_LAST_LOCAL,null); },
  setLastLocal:function(v){ _lsSet(BK_LAST_LOCAL,v); },
  getLastDrive:function(){ return _lsGet(BK_LAST_DRIVE,null); },
  setLastDrive:function(v){ _lsSet(BK_LAST_DRIVE,v); },
  getClientId: function(){ return _lsGet(BK_CLIENT_ID,""); },
  setClientId: function(v){ _lsSet(BK_CLIENT_ID,v.trim()); }
};

/* --- BackupManager --- */
const _bkSubs = new Set();
function _notify(){ _bkSubs.forEach(function(fn){ fn(); }); }

const BackupManager = {
  get scanCount(){ return _ls.getCount(); },
  get interval(){  return BK_INTERVAL; },
  get lastLocal(){ return _ls.getLastLocal(); },
  get lastDrive(){ return _ls.getLastDrive(); },
  get clientId(){  return _ls.getClientId(); },
  get driveConnected(){ return _tokenValid(); },

  recordScan: function(){
    var n = _ls.getCount() + 1;
    _ls.setCount(n);
    _notify();
    if(n >= BK_INTERVAL) this._autoBackup();
  },

  _autoBackup: async function(){
    _ls.setCount(0);
    try { this._localDownload(); } catch(e){ console.warn("[Backup] local auto-backup failed", e); }
    if(_tokenValid()){
      try { await this._driveUpload(); } catch(e){ console.warn("[Backup] Drive auto-backup failed", e); }
    }
    _notify();
  },

  /* local */
  _localDownload: function(){
    _dl(_payload(), "storavin-backup-" + _ts() + ".json");
    _ls.setLastLocal(new Date().toISOString());
    _notify();
  },
  saveLocal: function(){ this._localDownload(); },

  /* drive */
  connectDrive: async function(clientId){
    if(clientId) _ls.setClientId(clientId);
    var id = _ls.getClientId();
    if(!id) throw new Error("Paste your Google Client ID first.");
    await _gSignIn(id);
    _notify();
    if(typeof SyncManager!=="undefined" && SyncManager.enabled){ SyncManager.start(); SyncManager.syncNow().catch(function(){}); }
  },
  disconnectDrive: function(){
    if(_gToken && window.google && window.google.accounts && window.google.accounts.oauth2)
      window.google.accounts.oauth2.revoke(_gToken);
    _gToken = null; _gExpiry = 0;
    _notify();
  },
  _driveUpload: async function(){
    var file = await _gUpload(_payload(), "storavin-backup-" + _ts() + ".json");
    _ls.setLastDrive(new Date().toISOString());
    _notify();
    return file;
  },
  saveDrive: async function(){
    if(!_tokenValid()) throw new Error("Not connected to Google Drive.");
    return this._driveUpload();
  },
  listDriveBackups: async function(){ return _gList(); },

  /* restore */
  restoreFromJSON: function(text){
    var data = JSON.parse(text);
    var raw = Array.isArray(data) ? data : (Array.isArray(data.wines) ? data.wines : null);
    if(!raw) throw new Error("No wine data found in this file.");
    var fromVersion = data.version || 1;
    var wines = migrateWines(raw, fromVersion);
    Cellar._restore(wines);
    _notify();
    return wines.length;
  },
  restoreFromDrive: async function(fileId){
    var text = await _gDownload(fileId);
    return this.restoreFromJSON(text);
  },

  /* subscriptions */
  subscribe: function(fn){ _bkSubs.add(fn); return function(){ _bkSubs.delete(fn); }; },

  /* warm up Google's sign-in library ahead of the tap so the popup opens within the gesture */
  preloadGoogle: function(){ try{ _loadGIS().catch(function(){}); }catch(e){} }
};

function useBackup(){
  var forceUpdate = React.useReducer(function(x){ return x+1; }, 0)[1];
  React.useEffect(function(){ return BackupManager.subscribe(forceUpdate); }, []);
  return BackupManager;
}

/* ===================== Multi-device sync ===================== */
const SYNC_ENABLED_LS = "storavin_sync_enabled";
const SYNC_LAST_LS    = "storavin_last_sync";
let _syncTimer = null, _syncing = false, _syncInterval = null, _syncErr = "";

function _onVis(){ if(document.visibilityState === "visible") SyncManager.syncNow().catch(function(){}); }
function _onOnline(){ SyncManager.syncNow().catch(function(){}); }

const SyncManager = {
  get enabled(){ return _lsGet(SYNC_ENABLED_LS,"false") === "true"; },
  get lastSync(){ return _lsGet(SYNC_LAST_LS, null); },
  get syncing(){ return _syncing; },
  get lastError(){ return _syncErr; },

  setEnabled: function(on){
    _lsSet(SYNC_ENABLED_LS, on ? "true" : "false");
    if(on){ this.start(); this.syncNow().catch(function(){}); } else { this.stop(); }
    _notify();
  },

  // Debounced push after any local change.
  scheduleSync: function(){
    if(!this.enabled) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(function(){ SyncManager.syncNow().catch(function(e){ console.warn("[Sync] push failed", e); }); }, 4000);
  },

  // Pull the shared file, merge it into local state, push the merged result back.
  // `interactive` MUST only be true when called directly from a user tap. A
  // background/auto sync (page load, visibility, online, debounced push) must
  // never trigger Google's sign-in UI — doing so was what threw up a Google
  // login screen on every refresh. Without a valid in-memory token we simply
  // mark needs_auth and bail; the user re-establishes a token from the Backup
  // screen's "Connect Drive" button, after which sync resumes for the session.
  syncNow: async function(interactive){
    if(_syncing) return;
    var id = _ls.getClientId();
    if(!id) throw new Error("Connect Google Drive first.");
    _syncing = true; _syncErr = ""; _notify();
    try{
      if(!_tokenValid()){
        if(!interactive){ _syncErr = "needs_auth"; _syncing = false; _notify(); return; }
        try { await _gSilentToken(id); }
        catch(e){ _syncErr = "needs_auth"; throw new Error("needs_auth"); }
      }
      var file = await _gFindFile(SYNC_FILE);
      var remote = null;
      if(file){ try{ remote = JSON.parse(await _gDownload(file.id)); }catch(e){} }
      if(remote && Array.isArray(remote.wines)){
        try{ remote.wines = migrateWines(remote.wines, remote.version || 1); }catch(e){}
      }
      var merged = remote ? Cellar.mergeRemote(remote) : Cellar.snapshot();
      var json = JSON.stringify(merged, null, 2);
      if(file){ await _gUpdateFile(file.id, json); } else { await _gCreateFile(SYNC_FILE, json); }
      try{ await this._dailySnapshot(json); }catch(e){}
      _ls.setLastDrive(new Date().toISOString());
      _lsSet(SYNC_LAST_LS, new Date().toISOString());
      _notify();
    } finally {
      _syncing = false; _notify();
    }
  },

  // Keep one rolling snapshot per calendar day as version history.
  _dailySnapshot: async function(json){
    var today = new Date().toISOString().slice(0,10);
    var name = "storavin-snapshot-" + today + ".json";
    var existing = await _gFindFile(name);
    if(existing){ await _gUpdateFile(existing.id, json); } else { await _gCreateFile(name, json); }
  },

  start: function(){
    if(!this.enabled) return;
    this.stop();
    _syncInterval = setInterval(function(){ SyncManager.syncNow().catch(function(){}); }, 5*60*1000);
    document.addEventListener("visibilitychange", _onVis);
    window.addEventListener("online", _onOnline);
  },
  stop: function(){
    if(_syncInterval){ clearInterval(_syncInterval); _syncInterval = null; }
    document.removeEventListener("visibilitychange", _onVis);
    window.removeEventListener("online", _onOnline);
  },

  subscribe: function(fn){ return BackupManager.subscribe(fn); }
};

function useSync(){
  var forceUpdate = React.useReducer(function(x){ return x+1; }, 0)[1];
  React.useEffect(function(){ return BackupManager.subscribe(forceUpdate); }, []);
  return SyncManager;
}

// Auto-start sync on load if the user previously enabled it.
(function(){
  try{
    if(SyncManager.enabled){
      SyncManager.start();
      setTimeout(function(){ SyncManager.syncNow().catch(function(){}); }, 1500);
    }
  }catch(e){}
})();

const APP_VERSION = "v27";

Object.assign(window, { BackupManager, useBackup, SyncManager, useSync, APP_VERSION });
