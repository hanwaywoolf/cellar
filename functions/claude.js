// functions/claude.js — Cloudflare Pages Function
// Handles POST /claude — proxies to Anthropic API
// Set ANTHROPIC_API_KEY in Cloudflare Pages → Settings → Variables and Secrets

export async function onRequestPost({ request, env }) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    return res(500, { error: "Server is missing ANTHROPIC_API_KEY. Add it in Cloudflare Pages → Settings → Variables and secrets, then redeploy." });
  }

  let payload;
  try { payload = await request.json(); }
  catch { return res(400, { error: "Invalid JSON body." }); }

  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res(400, { error: "Request must include a non-empty messages[] array." });
  }

  const model   = payload.model      || env.CLAUDE_MODEL || "claude-sonnet-4-6";
  const max_tok = Math.min(Number(payload.max_tokens) || 1024, 4096);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ model, max_tokens: max_tok, messages })
    });
    const data = await r.json();
    if (!r.ok) {
      return res(r.status, { error: data?.error?.message || "Anthropic API error." });
    }
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
    return res(200, { text });
  } catch (e) {
    return res(502, { error: "Failed to reach Anthropic: " + (e?.message ?? String(e)) });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type"
    }
  });
}

function res(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
