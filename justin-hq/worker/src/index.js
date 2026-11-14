// Justin HQ backend: one endpoint that sends a message to Claude, ChatGPT or Muse
// and streams the answer back. API keys live here as Worker secrets, never in the app.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const MAX_BODY = 25 * 1024 * 1024; // photos are sent as base64

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return json({ ok: true, name: "Justin HQ" }, 200, cors);
    if (!cors["Access-Control-Allow-Origin"]) return json({ error: "origin_not_allowed" }, 403, cors);
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401, cors);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, providers: providerStatus(env) }, 200, cors);
    }
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const len = Number(request.headers.get("content-length") || 0);
      if (len > MAX_BODY) return json({ error: "too_large" }, 413, cors);
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400, cors); }
      return chat(body, env, cors);
    }
    return json({ error: "not_found" }, 404, cors);
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes("*") || allowed.includes(origin);
  return {
    ...(ok ? { "Access-Control-Allow-Origin": origin || "*" } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function authorized(request, env) {
  const want = String(env.APP_PASSWORD || "");
  const got = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!want || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

function providerStatus(env) {
  return {
    claude: !!env.ANTHROPIC_API_KEY,
    openai: !!env.OPENAI_API_KEY,
    muse: !!env.MUSE_API_KEY,
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

// Turn "data:image/jpeg;base64,...." into its parts.
function parseDataUrl(u) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(u || ""));
  return m ? { mediaType: m[1], data: m[2], url: u } : null;
}

// Body: { provider, system, messages: [{role: "user"|"assistant", content}], images: [dataUrl], tier }
// Reply: newline-delimited JSON events: {"t":"d","v":"text chunk"} ... {"t":"end"} or {"t":"err","v":"message"}
async function chat(body, env, cors) {
  const provider = body.provider;
  if (!["claude", "openai", "muse"].includes(provider)) return json({ error: "bad_provider" }, 400, cors);
  if (!providerStatus(env)[provider]) return json({ error: "provider_not_configured", provider }, 400, cors);

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content)
    .slice(-40);
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "last_message_must_be_user" }, 400, cors);
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4).map(parseDataUrl).filter(Boolean);
  const system = typeof body.system === "string" ? body.system.slice(0, 20000) : "";
  const quick = body.tier === "quick";

  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const out = writable.getWriter();
  const send = (obj) => out.write(enc.encode(JSON.stringify(obj) + "\n"));

  (async () => {
    try {
      if (provider === "claude") await streamClaude(env, system, messages, images, quick, send);
      else await streamOpenAICompatible(env, provider, system, messages, images, send);
      await send({ t: "end" });
    } catch (e) {
      await send({ t: "err", v: friendlyError(e, provider) }).catch(() => {});
    } finally {
      await out.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: { ...cors, "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function streamClaude(env, system, messages, images, quick, send) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
  if (images.length) {
    const last = msgs[msgs.length - 1];
    last.content = [
      ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mediaType, data: im.data } })),
      { type: "text", text: last.content },
    ];
  }
  const stream = client.beta.messages.stream({
    model: env.CLAUDE_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    ...(system ? { system } : {}),
    messages: msgs,
    output_config: { effort: quick ? "low" : "medium" },
    // If Claude declines a request for safety reasons, retry it on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") await send({ t: "d", v: event.delta.text });
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") await send({ t: "d", v: "\n\n(I can't help with that one.)" });
}

// ChatGPT and Muse (Meta Model API) both speak the OpenAI Chat Completions format.
async function streamOpenAICompatible(env, provider, system, messages, images, send) {
  const isMuse = provider === "muse";
  const client = new OpenAI({
    apiKey: isMuse ? env.MUSE_API_KEY : env.OPENAI_API_KEY,
    ...(isMuse ? { baseURL: env.MUSE_BASE_URL || "https://api.meta.ai/v1" } : {}),
  });
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  for (const m of messages) msgs.push({ role: m.role, content: m.content });
  if (images.length) {
    const last = msgs[msgs.length - 1];
    last.content = [
      { type: "text", text: last.content },
      ...images.map((im) => ({ type: "image_url", image_url: { url: im.url } })),
    ];
  }
  const stream = await client.chat.completions.create({
    model: isMuse ? env.MUSE_MODEL || "muse-spark-1.1" : env.OPENAI_MODEL || "gpt-5",
    messages: msgs,
    stream: true,
  });
  for await (const chunk of stream) {
    const t = chunk.choices?.[0]?.delta?.content;
    if (t) await send({ t: "d", v: t });
  }
}

function friendlyError(e, provider) {
  const name = { claude: "Claude", openai: "ChatGPT", muse: "Muse" }[provider];
  const status = e?.status;
  if (status === 401 || status === 403) return `${name} rejected the API key. Check the key saved on the server.`;
  if (status === 404) return `${name} doesn't recognize the model name. Check the model setting on the server.`;
  if (status === 429) return `${name} is rate limited or out of credit. Try again in a minute, or check billing.`;
  if (status >= 500) return `${name} is having problems right now. Try again shortly.`;
  return `${name} error: ${e?.message || "unknown"}`.slice(0, 300);
}
