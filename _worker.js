// _worker.js — Cloudflare Pages (advanced mode)
// Serves the static site AND proxies /claude to the Anthropic API so your
// API key never reaches the browser.
//
// Set these in Cloudflare Pages → your project → Settings → Variables and secrets:
//   ANTHROPIC_API_KEY   (required, mark as a secret)  your sk-ant-... key
//   CLAUDE_MODEL        (optional)  e.g. claude-haiku-4-5 for a cheaper model
//                                   (default: claude-sonnet-4-6)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/claude") {
      if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
      if (request.method !== "POST") return json(405, { error: "Method not allowed" });
      return handleClaude(request, env);
    }
    // Everything else is a static asset (index.html, etc.)
    return env.ASSETS.fetch(request);
  }
};

async function handleClaude(request, env) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    return json(500, { error: "Server is missing ANTHROPIC_API_KEY. Add it in Cloudflare Pages → Settings → Variables and secrets, then redeploy." });
  }

  let payload;
  try { payload = await request.json(); }
  catch (e) { return json(400, { error: "Invalid JSON body." }); }

  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: "Request must include a non-empty messages[] array." });
  }

  const model = payload.model || env.CLAUDE_MODEL || "claude-sonnet-4-6";
  const max_tokens = Math.min(Number(payload.max_tokens) || 1024, 4096);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ model, max_tokens, messages })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || "Anthropic API error.";
      return json(r.status, { error: msg });
    }
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return json(200, { text });
  } catch (e) {
    return json(502, { error: "Failed to reach Anthropic: " + (e && e.message ? e.message : String(e)) });
  }
}

function cors(res) {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-headers", "content-type");
  res.headers.set("access-control-allow-methods", "POST, OPTIONS");
  return res;
}
function json(status, obj) {
  return cors(new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  }));
}
