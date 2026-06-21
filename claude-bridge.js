/* claude-bridge.js
 * Provides window.claude.complete when the app is hosted OUTSIDE the Anthropic
 * preview (e.g. on your own Netlify site).
 *
 * - In the Anthropic preview the host already injects window.claude — this
 *   script detects that and does nothing, so the built-in bridge keeps working.
 * - Everywhere else it installs a proxy that POSTs to a serverless endpoint
 *   (default: /.netlify/functions/claude) which holds your Anthropic API key.
 *
 * Override the endpoint with either:
 *   <meta name="claude-proxy" content="https://your-site/.netlify/functions/claude">
 *   or  window.CLAUDE_PROXY_URL = "..."  (set before this script runs)
 */
(function () {
  if (window.claude && typeof window.claude.complete === "function") return; // host bridge present

  var meta = document.querySelector('meta[name="claude-proxy"]');
  var ENDPOINT =
    window.CLAUDE_PROXY_URL ||
    (meta && meta.getAttribute("content")) ||
    "/.netlify/functions/claude";

  function toMessages(arg) {
    if (typeof arg === "string") return [{ role: "user", content: arg }];
    if (arg && Array.isArray(arg.messages)) return arg.messages;
    if (arg && arg.content) return [{ role: "user", content: arg.content }];
    return [{ role: "user", content: String(arg) }];
  }

  window.claude = {
    complete: async function (arg) {
      var res;
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: toMessages(arg) })
        });
      } catch (e) {
        throw new Error("Couldn’t reach the wine-ID service. Check your connection and that the API proxy is deployed.");
      }
      if (!res.ok) {
        var msg = "The wine-ID service returned an error (" + res.status + ").";
        try { var j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
        throw new Error(msg);
      }
      var data = await res.json();
      return (data && data.text) || "";
    }
  };
})();
