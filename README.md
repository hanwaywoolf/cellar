# CoChez Cellar

A mobile-first wine cellar app with AI label scanning. Push to `main` → Cloudflare deploys automatically.

---

## Repo structure

```
index.html              ← app entry point
_worker.js              ← Cloudflare Pages Worker (proxies to Anthropic API)
manifest.json           ← PWA manifest
sw.js                   ← service worker (offline support)
icons/                  ← app icons (192, 512, svg)
styles.css
styles-ipad.css
claude-bridge.js        ← connects app to /claude proxy
store.jsx               ← app state
ui.jsx                  ← shared UI components
location-picker.jsx
screen-*.jsx            ← individual screens
app-*.jsx               ← app shells (phone + iPad)
```

---

## ⚙️ One-time setup

### Step 1 — Create the GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it (e.g. `cellar`), set to **Private**, click **Create repository**
3. Upload all files from this zip (drag into the GitHub UI, or use git CLI):

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/cellar.git
git add .
git commit -m "initial commit"
git push -u origin main
```

---

### Step 2 — Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** tab
2. Click **Connect to Git** → authorise GitHub → select your `cellar` repo
3. Build settings — set these exactly:

   | Setting | Value |
   |---|---|
   | Framework preset | **None** |
   | Build command | *(leave empty)* |
   | Build output directory | `/` |

4. Click **Save and Deploy**

Cloudflare assigns a URL like `https://cellar.pages.dev`.

---

### Step 3 — Add your API key 🔑

> **The API key goes in Cloudflare only — never commit it to GitHub.**

In your Cloudflare Pages project:  
**Settings** → **Variables and Secrets** → **Add variable**

| Variable name | Value | Type |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **Secret** ← select "Encrypt" |
| `CLAUDE_MODEL` | `claude-haiku-4-5` | Plain text *(optional — cheaper/faster)* |

After saving, go to **Deployments** → latest deploy → **⋯ → Retry deployment** so the Worker picks up the secret.

> Get an Anthropic key at [console.anthropic.com](https://console.anthropic.com) → **API keys**.  
> Add a small credit balance — each scan costs ~$0.01 on Sonnet, fractions of a cent on Haiku.

---

### Step 4 — Install as a PWA on your phone

Open your `*.pages.dev` URL in Safari (iOS) or Chrome (Android):
- **iOS:** Share → **Add to Home Screen**
- **Android:** Chrome menu → **Add to Home Screen**

---

## Deploying updates

```bash
git add .
git commit -m "describe your change"
git push
```

That's it — Cloudflare detects the push and deploys within ~30 seconds. No drag-and-drop, no manual steps.

---

## Custom domain (optional)

**Pages project** → **Custom domains** → **Set up a custom domain**  
Add your domain and follow the DNS prompts. Active in ~1 minute if your domain is already on Cloudflare.

---

## Do I need any secrets in GitHub?

**No** — not for basic deploys. Cloudflare pulls the code directly from GitHub and holds the secret itself.

If you later want to run automated tests or a build step via **GitHub Actions**, you would add `ANTHROPIC_API_KEY` as a GitHub repo secret too (**Settings → Secrets → Actions**). But for this app there's no build step, so it's not needed.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "wine-ID service isn't connected" | `ANTHROPIC_API_KEY` missing or misspelled in Cloudflare → Variables; redeploy after fixing |
| Camera not working | Must be HTTPS — `*.pages.dev` always is; custom domains need an active Cloudflare certificate |
| Stale version after push | Hard-refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`), or check the CF deployment finished |
| Worker errors | **Workers & Pages** → your project → **Functions** tab → **Logs** |

---

## Cost

| Service | Cost |
|---|---|
| Cloudflare Pages | **Free** — unlimited static requests, 100k Worker invocations/day |
| Anthropic (scanning) | ~$0.01/scan on Sonnet · fraction of a cent on Haiku |
