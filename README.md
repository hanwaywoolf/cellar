# CoChez Cellar

A mobile-first wine cellar app with AI label scanning, powered by Claude.  
Hosted on **Cloudflare Pages** with automatic deploys from GitHub.

---

## Repo structure

```
index.html              ← app entry point
manifest.json           ← PWA manifest
sw.js                   ← service worker
_headers                ← Cloudflare custom headers (MIME types, cache control)
functions/
  claude.js             ← Cloudflare Pages Function — proxies /claude to Anthropic API
icons/                  ← app icons (192, 512, maskable variants, svg)
styles.css
styles-ipad.css
claude-bridge.js
store.jsx / ui.jsx / screen-*.jsx / app-*.jsx
```

> ⚠️ There is **no** `_worker.js` in this repo. The Claude proxy runs as a Pages Function in `functions/claude.js`. Do not add a `_worker.js` — it would override the Functions setup.

---

## One-time setup

### 1. Create the GitHub repo

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/cellar.git
git add .
git commit -m "initial commit"
git push -u origin main
```

Or drag-and-drop all files into a new repo via the GitHub web UI.

### 2. Connect to Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorise GitHub → select this repo
3. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | **None** |
   | Build command | *(leave empty)* |
   | Build output directory | `/` |

4. **Save and Deploy**

### 3. Add your Anthropic API key 🔑

**Cloudflare dashboard → Workers & Pages → your project → Settings → Variables and Secrets → Add**

| Variable | Value | Type |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **Secret (encrypt)** |
| `CLAUDE_MODEL` | `claude-haiku-4-5` | Plain text *(optional)* |

After saving → **Deployments → Retry deployment** so the Function picks up the secret.

### 4. Install as a PWA

Once deployed, open the `*.pages.dev` URL in **Chrome on Android** or **Safari on iOS/iPadOS**.

- A burgundy **"Install"** banner appears at the bottom when Chrome is ready — tap it
- Or: Chrome ⋯ menu → **Install app**
- iOS Safari: Share → **Add to Home Screen**

---

## Deploying updates

```bash
git add .
git commit -m "your change"
git push
```

Cloudflare Pages auto-deploys within ~30 seconds.

---

## Custom domain

**Pages project → Custom domains → Set up a custom domain**

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "wine-ID service isn't connected" | `ANTHROPIC_API_KEY` missing — check Variables and redeploy |
| Camera not working | Must be HTTPS — `*.pages.dev` always is |
| PWA install not showing | Clear Chrome site data for the domain (lock icon → Site settings → Clear & reset), reload twice |
| Old version after push | Hard-refresh `Cmd+Shift+R` / `Ctrl+Shift+R` |
