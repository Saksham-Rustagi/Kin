// TEST 7/8: real mini-app round trip. Card page served here, behind the tunnel; taps are HTTP POSTs; we edit() the card.
// Also /talk/test: in-card ElevenLabs WebRTC voice chat, with diagnostics posted back so we can see what the webview allows.
import { Spectrum, app as appCard, edit, type Message } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const BASE = process.env.PUBLIC_BASE_URL!;
const TARGET = process.env.TARGET || process.env.PRIYA_HANDLE!;
const EL = { key: process.env.ELEVENLABS_API_KEY!, agent: process.env.ELEVENLABS_AGENT_ID! };
const ELEVENLABS_CLIENT = "https://esm.sh/@elevenlabs/client@1.25.0";
if (!BASE) throw new Error("PUBLIC_BASE_URL missing");
const t = () => new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" });
const log = (...a: unknown[]) => console.log(`[${t()}]`, ...a);

let taps = 0, version = 1, card: Message | undefined;
const sp = await Spectrum({ projectId: process.env.PROJECT_ID!, projectSecret: process.env.PROJECT_SECRET!, providers: [imessage.config()] });
const im = imessage(sp);
const dm = await im.space.create(await im.user(TARGET));

const css = `
:root{color-scheme:light}*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font:clamp(14px,5vmin,22px) -apple-system,system-ui,sans-serif;color:#0b2a4a;
background:linear-gradient(180deg,#bfe9ff 0%,#7fd0ff 45%,#2fa8e0 100%);display:flex;align-items:center;justify-content:center;padding:2vmin;overflow:hidden}
.panel{width:100%;max-width:560px;max-height:100%;background:rgba(255,255,255,.82);border-radius:6vmin;padding:3vmin 4vmin;text-align:center;
box-shadow:0 10px 30px rgba(0,60,120,.25),inset 0 1px 0 #fff;backdrop-filter:blur(8px)}
h1{font-size:clamp(18px,8vmin,40px);margin:.1em 0}
.btn{display:block;width:100%;min-height:clamp(40px,14vmin,72px);margin:2vmin 0;border:0;border-radius:999px;font:700 clamp(15px,6vmin,26px) -apple-system,system-ui;color:#fff;
background:linear-gradient(180deg,#6ee07a 0%,#22a63a 55%,#1b8f31 100%);box-shadow:0 6px 14px rgba(0,80,30,.3),inset 0 2px 0 rgba(255,255,255,.6)}
.blue{background:linear-gradient(180deg,#7cc8ff 0%,#1f8fe0 55%,#1678c2 100%)}
#s{min-height:1.4em}`;

function cardPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta property="og:title" content="Kin test card"><meta property="og:description" content="Tap the button">
<title>Kin test card</title><style>${css}</style></head><body><div class="panel">
<h1>👋 Kin test</h1><div id="s">Taps so far: ${taps}</div>
<button class="btn" id="tap">✅ Tap me</button>
<button class="btn blue" id="talk">🎙️ Talk to Kin</button>
<a href="${BASE}/talk/test" target="_blank" style="font-size:18px">Open Talk to Kin in Safari</a>
</div><script>
const diag = (ev, extra={}) => fetch("/diag", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({page:"card", ev, ua:navigator.userAgent, w:innerWidth, h:innerHeight, md:!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia), rtc: typeof RTCPeerConnection, secure: isSecureContext, ...extra})}).catch(()=>{});
diag("load");
document.getElementById("tap").onclick = async () => {
  const r = await fetch("/card/test/act", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({action:"tap"})});
  const j = await r.json(); document.getElementById("s").textContent = "Taps so far: " + j.taps + " ✓";
};
document.getElementById("talk").onclick = () => { diag("talk-click"); location.href = "/talk/test"; };
</script></body></html>`;
}

function talkPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Talk to Kin</title><style>${css}</style></head><body><div class="panel">
<h1>🎙️ Talk to Kin</h1><button class="btn" id="talk">Tap to talk</button><div id="s">Allow the microphone when asked.</div>
<button class="btn" id="end" style="display:none;background:linear-gradient(180deg,#ff8a7a,#d9342b)">End</button>
<button class="btn blue" id="safari">Open in Safari</button>
<button class="btn blue" id="textme">Text me the link</button>
</div><script type="module">
document.getElementById("safari").onclick = () => { diag("safari-click"); window.open(${JSON.stringify(BASE)} + "/talk/test?via=safari", "_blank"); };
document.getElementById("textme").onclick = async () => { diag("textme-click"); await fetch("/talk/test/link", {method:"POST"}); document.getElementById("s").textContent = "Kin texted you the link. Tap it in Messages."; };
const s = document.getElementById("s"), talk = document.getElementById("talk"), end = document.getElementById("end");
const diag = (ev, extra={}) => fetch("/diag", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({page:"talk", ev, ua:navigator.userAgent, md:!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia), rtc: typeof RTCPeerConnection, secure:isSecureContext, ...extra})}).catch(()=>{});
diag("load");
let conv = null;
talk.onclick = async () => {
  if (conv) return; talk.disabled = true; s.textContent = "Connecting…";
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no getUserMedia in this view"), {name:"NoMediaDevices"});
    diag("mic-request");
    const st = await Promise.race([navigator.mediaDevices.getUserMedia({audio:true}),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("microphone request never answered"), {name:"MicTimeout"})), 6000))]);
    diag("mic-ok", {tracks: st.getAudioTracks().length}); st.getTracks().forEach(x=>x.stop());
    const { Conversation } = await import(${JSON.stringify(ELEVENLABS_CLIENT)});
    const body = await (await fetch("/talk/test/session", {method:"POST"})).json();
    if (!body.ok) throw new Error(body.error);
    conv = await Conversation.startSession({ conversationToken: body.conversationToken, connectionType: "webrtc",
      dynamicVariables: { asha_name: "Grandma", reason: "test", from_name: "Nicole", relation: "granddaughter", message_text: "Can't wait to see you Sunday", reminder_text: "", reply_options: "Hi Nicole!" },
      onConnect: () => { diag("connected"); talk.textContent = "Listening"; end.style.display = "block"; s.textContent = "You're talking to Kin."; },
      onModeChange: ({mode}) => { diag("mode", {mode}); talk.textContent = mode === "speaking" ? "Kin is speaking" : "Listening"; },
      onDisconnect: (d) => { diag("disconnect", {d: String(d?.reason ?? "")}); s.textContent = "Call ended."; talk.textContent = "Done"; end.style.display = "none"; },
      onError: (e) => { diag("error", {e: String(e?.message ?? e)}); s.textContent = "Problem: " + (e?.message ?? e); } });
  } catch (err) {
    diag("fail", {name: err?.name, msg: String(err?.message ?? err)}); conv = null; talk.disabled = false;
    s.textContent = (err?.name === "NotAllowedError" ? "Kin needs the microphone. " : "Couldn't connect: " + (err?.message ?? err) + ". ") + "Try 'Open in Safari'.";
  }
};
end.onclick = async () => { try { await conv?.endSession(); } catch {} };
</script></body></html>`;
}

Bun.serve({ port: 3000, async fetch(req) {
  const u = new URL(req.url);
  const html = (b: string) => new Response(b, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  if (req.method === "GET" && u.pathname === "/card/test") { log("GET /card/test", req.headers.get("user-agent")?.slice(0, 140)); return html(cardPage()); }
  if (req.method === "GET" && u.pathname === "/talk/test") { log("GET /talk/test"); return html(talkPage()); }
  if (req.method === "POST" && u.pathname === "/diag") { log("DIAG", JSON.stringify(await req.json())); return new Response("ok"); }
  if (req.method === "POST" && u.pathname === "/talk/test/session") {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${EL.agent}`, { headers: { "xi-api-key": EL.key } });
    const j: any = await r.json(); log("talk session token", r.status);
    return Response.json(r.ok ? { ok: true, conversationToken: j.token } : { ok: false, error: "token " + r.status });
  }
  if (req.method === "POST" && u.pathname === "/card/test/act") {
    taps++; version++; log(`TAP received (#${taps}) -> editing card to v${version}`);
    const layout = { caption: `Tapped ✓ (${taps})`, subcaption: `Kin got your tap at ${t()}` };
    if (card) dm.send(edit(appCard(`${BASE}/card/test?v=${version}`, { live: true, layout }), card)).then(() => log("edit() sent")).catch((e) => log("edit FAIL", e?.message));
    return Response.json({ ok: true, taps });
  }
  if (req.method === "POST" && u.pathname === "/talk/test/link") {
    dm.send(`🎙️ Talk to Kin: ${BASE}/talk/test?via=link`).then(() => log("talk link texted")).catch((e) => log("link FAIL", e?.message));
    return Response.json({ ok: true });
  }
  if (u.pathname === "/health") return new Response("ok");
  return new Response("not found", { status: 404 });
} });
log("server on :3000");
if (!process.argv.includes("--no-send")) {
  card = await dm.send(appCard(`${BASE}/card/test?v=1`, { live: true, layout: { caption: "Kin test card", subcaption: "Tap me to test the round trip" } }));
  log("card sent", card?.id);
}
for await (const [space, message] of sp.messages) {
  const c: any = message.content;
  log(`[inbound ${message.platform}] type=${c.type}`, c.type === "text" ? c.text : (c.emoji ?? ""));
}
