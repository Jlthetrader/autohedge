/* Justin HQ bridge: gives the app the same window.claude.use(...) API it had on claude.ai,
   but backed by your own server (Claude, ChatGPT, Muse), the browser's storage, voice and mic. */
(() => {
  "use strict";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  const DEFAULT_MAP = { jarvis: "claude", shuri: "muse", widow: "openai" };
  const HQ = (window.HQ = {
    PROVIDERS: {
      claude: { name: "Claude", short: "Claude", color: "#d97757" },
      openai: { name: "ChatGPT", short: "ChatGPT", color: "#10a37f" },
      muse: { name: "Muse", short: "Muse", color: "#7b61ff" },
    },
    settings() { return { server: "", password: "", map: { ...DEFAULT_MAP }, ...LS.get("hq-settings", {}), map: { ...DEFAULT_MAP, ...(LS.get("hq-settings", {}).map || {}) } }; },
    save(s) { LS.set("hq-settings", s); window.dispatchEvent(new CustomEvent("hq-settings")); },
    configured() { const s = HQ.settings(); return !!(s.server && s.password); },
    providerFor(agent) { return HQ.settings().map[agent] || DEFAULT_MAP[agent] || "claude"; },
    async health(s = HQ.settings()) {
      const r = await fetch(s.server.replace(/\/+$/, "") + "/api/health", { headers: { Authorization: "Bearer " + s.password } });
      if (r.status === 401) throw { code: "unauthorized", message: "Wrong password" };
      if (r.status === 403) throw { code: "origin", message: "This web address isn't allowed on the server (ALLOWED_ORIGINS)" };
      if (!r.ok) throw { code: "server", message: "Server error " + r.status };
      return r.json();
    },
  });

  /* ---- Images: shrink to ~1568px JPEG data URLs before upload ---- */
  async function toDataUrl(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const k = Math.min(1, 1568 / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---- sample(): talk to an agent's model through the server ---- */
  async function sample(input, opts = {}) {
    const s = HQ.settings();
    if (!s.server || !s.password) throw { code: "not_configured", message: "Connect your server in Settings" };
    const provider = opts.provider || HQ.providerFor(opts.agent || "jarvis");
    const messages = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const imgs = opts.images ? [...(opts.images instanceof Blob ? [opts.images] : opts.images)] : [];
    const images = await Promise.all(imgs.slice(0, 4).map(toDataUrl));
    let res;
    try {
      res = await fetch(s.server.replace(/\/+$/, "") + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.password },
        body: JSON.stringify({ provider, system: opts.system || "", messages, images, tier: opts.modelTier || "default" }),
        signal: opts.signal,
      });
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      throw { code: "network", message: "Can't reach your server" };
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const code = res.status === 401 ? "not_granted" : res.status === 429 ? "rate_limited" : j.error || "server";
      throw { code, message: j.error === "provider_not_configured" ? `${HQ.PROVIDERS[provider].name} has no API key on the server yet` : j.error || "Server error" };
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        const ev = JSON.parse(line);
        if (ev.t === "d") { text += ev.v; opts.onText?.({ text, delta: ev.v }); }
        else if (ev.t === "err") throw { code: "provider_error", message: ev.v, text };
      }
    }
    return { text, truncated: false, provider };
  }
  sample.json = async (input, opts = {}) => {
    const r = await sample((typeof input === "string" ? input : "") + "\n\nReply with JSON only, no code fences.", opts);
    const m = r.text.match(/[\[{][\s\S]*[\]}]/);
    return JSON.parse(m ? m[0] : r.text);
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 4, maxInputBytes: 20e6, mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] } });

  /* ---- db: saved on this device ---- */
  function docRef(path) {
    const key = "hq-db:" + path;
    return { async get() { const d = LS.get(key, null); return { exists: !!d, data: () => d }; }, async set(v) { if (!LS.set(key, v)) throw new Error("storage_full"); } };
  }
  const db = { collection: (c) => ({ doc: (id) => docRef(c + "/" + id) }), doc: (p) => docRef(p) };
  const user = { id: async () => "me", isOwner: () => true, canEdit: () => true };

  /* ---- Voice out: the phone's built-in speech ---- */
  const tts = "speechSynthesis" in window ? (() => {
    const pick = (style) => {
      const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      const order = { glassy: ["Daniel", "Alex", "Google UK English Male", "Arthur"], airy: ["Samantha", "Ava", "Google US English", "Karen"], rounded: ["Victoria", "Moira", "Zoe", "Google UK English Female"] }[style] || [];
      return order.map((n) => vs.find((v) => v.name.includes(n))).find(Boolean) || vs[0];
    };
    return {
      speak(text, o = {}) {
        return new Promise((res, rej) => {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(String(text).slice(0, 2000));
          const v = pick(o.voice); if (v) u.voice = v;
          u.rate = o.rate || 1;
          u.onend = () => res(); u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? res() : rej({ code: e.error }));
          speechSynthesis.speak(u);
        });
      },
      stop() { speechSynthesis.cancel(); },
    };
  })() : null;

  /* ---- Mic: browser speech recognition (Safari and Chrome) ---- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const dictation = SR ? (() => {
    let rec = null, h = { partial: [], final: [], state: [] };
    const emit = (k, v) => h[k].forEach((f) => f(v));
    return {
      onPartial: (f) => h.partial.push(f), onFinal: (f) => h.final.push(f), onState: (f) => h.state.push(f),
      async start() {
        rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
        rec.onresult = (e) => { let t = ""; for (const r of e.results) t += r[0].transcript; (e.results[e.results.length - 1].isFinal ? emit("final", { text: t }) : emit("partial", { text: t })); };
        rec.onstart = () => emit("state", { state: "listening" });
        rec.onend = () => emit("state", { state: "idle", reason: "stopped" });
        rec.onerror = () => emit("state", { state: "idle", reason: "error" });
        rec.start();
      },
      async stop() { rec?.stop(); },
    };
  })() : null;

  const caps = { sample, db, user, tts, dictation, mcp: null };
  window.claude = { use: async (name) => (name === "sample" ? (HQ.configured() ? sample : null) : caps[name] ?? null) };
})();
