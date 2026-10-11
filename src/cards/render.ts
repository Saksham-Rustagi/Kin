// Kin card renderer: pure functions that turn a CardView into a full HTML document.
// Loaded inside the Photon Spectrum iMessage extension's WKWebView.
// Hard constraints: fits 280x300 with no scrolling; compact strip at 149x58;
// no external assets; all user text escaped; erasable TS only (runs under Bun and node type stripping).

export type CardType = "context" | "protect" | "reminder" | "whois" | "info";
export interface CardButton { id: string; label: string; style?: "green" | "blue" | "red" | "plain"; action: string; payload?: Record<string, unknown> }
export interface CardView {
  id: string; type: CardType; state: string; version: number; token: string;
  title: string;
  subtitle?: string | null;
  photoUrl?: string | null;
  emoji?: string | null;
  line?: string | null;
  quoteFrom?: string | null;
  quote?: string | null;
  summary?: string | null;
  status?: { text: string; tone: "ok" | "info" | "warn" } | null;
  buttons: CardButton[];
  readAloud?: boolean;
  talk?: boolean;
}

const TYPES = ["context", "protect", "reminder", "whois", "info"];
const TONES = ["ok", "info", "warn"];
const BTN_STYLES = ["green", "blue", "red", "plain"];
const ERR_TEXT = "That didn't work. Please try again.";

const ESC_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

export function escapeHtml(s: string): string {
  return String(s == null ? "" : s).replace(/[&<>"'`]/g, (c) => ESC_MAP[c] || c);
}

function str(x: unknown): string {
  return x == null ? "" : String(x).trim();
}

function len(s: string): number {
  return Array.from(s).length;
}

/** JSON that is safe to drop inside an inline <script>. */
function jsonForScript(v: unknown): string {
  let s: string;
  try { s = JSON.stringify(v); } catch { s = "{}"; }
  return s
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function safeImgUrl(u: unknown): string | null {
  const s = str(u);
  if (!s) return null;
  if (/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(s)) return s;
  return null;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = (w: string | undefined) => (w ? Array.from(w)[0] || "" : "");
  const s = words.length >= 2 ? first(words[0]) + first(words[1]) : first(words[0]);
  return s.toUpperCase() || "🙂";
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden}
:root{
 --inset:clamp(5px,1.8vmin,18px);--pad:clamp(9px,3.3vmin,24px);--gap:clamp(5px,2vmin,14px);
 --fs:clamp(15px,5.3vmin,22px);--fs-sub:clamp(15px,5.3vmin,23px);
 --fs-title:clamp(23px,8.6vmin,42px);--fs-title-long:clamp(20px,7.2vmin,36px);
 --fs-task:clamp(19px,7vmin,32px);--fs-btn:clamp(16px,5.8vmin,25px);--fs-status:clamp(16px,6vmin,26px);
 --btn-h:clamp(40px,14.3vmin,68px);--av:clamp(50px,18.6vmin,108px);--av-hero:clamp(64px,25vmin,150px);
 --ic:clamp(40px,14.3vmin,60px);
 --ink:#0b2a4a;--ink2:#12385f;--btn-ink:#071c33;
 --tint:70,180,230;--av1:#c4f1ff;--av2:#5cc6ea;--acc:#2aa6dc;
}
.t-context{--tint:70,180,230;--av1:#c4f1ff;--av2:#5cc6ea;--acc:#2aa6dc}
.t-protect{--tint:236,124,108;--av1:#ffe0da;--av2:#f39a8c;--acc:#e0786a}
.t-reminder{--tint:84,196,96;--av1:#dafbd4;--av2:#78d67a;--acc:#3fae4c}
.t-whois{--tint:84,140,232;--av1:#d4e8ff;--av2:#78acef;--acc:#3f7fdc}
.t-info{--tint:60,190,200;--av1:#cff6f6;--av2:#62cfd0;--acc:#2bb0b8}
body{
 font-family:ui-rounded,"SF Pro Rounded",-apple-system,BlinkMacSystemFont,system-ui,"Helvetica Neue",sans-serif;
 color:var(--ink);-webkit-text-size-adjust:100%;text-size-adjust:100%;
 -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;
 position:relative;
 background:
  radial-gradient(120% 60% at 12% -12%,rgba(255,255,255,.95) 0%,rgba(255,255,255,0) 55%),
  radial-gradient(70% 45% at 105% 0%,rgba(var(--tint),.45) 0%,rgba(var(--tint),0) 70%),
  radial-gradient(90% 50% at 110% 112%,rgba(0,70,160,.55) 0%,rgba(0,70,160,0) 70%),
  linear-gradient(180deg,#d6f4ff 0%,#93ddf7 28%,#43bbe9 60%,#1a8fd6 82%,#0c5fae 100%);
}
.t-reminder{background:
  radial-gradient(120% 60% at 12% -12%,rgba(255,255,255,.95) 0%,rgba(255,255,255,0) 55%),
  radial-gradient(80% 40% at 30% 118%,rgba(120,214,96,.95) 0%,rgba(120,214,96,0) 70%),
  radial-gradient(90% 50% at 110% 112%,rgba(0,70,160,.5) 0%,rgba(0,70,160,0) 70%),
  linear-gradient(180deg,#d6f4ff 0%,#93ddf7 28%,#43bbe9 60%,#1a8fd6 82%,#0c5fae 100%)}
.sky{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.swoosh{position:absolute;left:-25%;top:52%;width:150%;height:34%;border-radius:50%;transform:rotate(-9deg);
 background:radial-gradient(ellipse at center,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 62%)}
.bub{position:absolute;border-radius:50%;pointer-events:none;
 background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.98) 0 7%,rgba(255,255,255,.35) 20%,rgba(255,255,255,.07) 55%,rgba(255,255,255,.28) 78%,rgba(255,255,255,.7) 100%);
 box-shadow:inset 0 0 6px rgba(255,255,255,.6),0 2px 10px rgba(0,60,140,.15);
 animation:float 13s ease-in-out infinite alternate}
.b1{width:34vmin;height:34vmin;left:-9vmin;bottom:-8vmin}
.b2{width:15vmin;height:15vmin;right:3%;top:5%;animation-duration:11s}
.b3{width:9vmin;height:9vmin;left:10%;top:12%;animation-duration:16s}
.b4{width:22vmin;height:22vmin;right:-7vmin;bottom:16%;animation-duration:15s}
.b5{width:6vmin;height:6vmin;left:47%;bottom:3%;animation-duration:10s}
@keyframes float{from{transform:translateY(0)}to{transform:translateY(-3.5vmin)}}

.panel{position:absolute;inset:var(--inset);z-index:1;display:flex;flex-direction:column;gap:var(--gap);
 padding:var(--pad);border-radius:clamp(18px,7vmin,36px);overflow:hidden;
 background:linear-gradient(180deg,rgba(255,255,255,.95) 0%,rgba(247,252,255,.89) 45%,rgba(232,247,255,.86) 100%);
 border:1.5px solid rgba(255,255,255,.95);
 box-shadow:0 0 0 2px rgba(var(--tint),.55),0 10px 28px rgba(0,50,120,.3),inset 0 1px 0 #fff,inset 0 -10px 22px rgba(var(--tint),.16);
 -webkit-backdrop-filter:blur(12px) saturate(1.5);backdrop-filter:blur(12px) saturate(1.5)}
.panel::before{content:"";position:absolute;left:0;right:0;top:0;height:44%;pointer-events:none;border-radius:inherit;
 background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,0))}
.pbubs{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:0}
.pb{position:absolute;border-radius:50%;border:1px solid rgba(var(--tint),.22);
 background:radial-gradient(circle at 30% 26%,rgba(255,255,255,.95) 0 9%,rgba(var(--tint),.10) 32%,rgba(var(--tint),.06) 60%,rgba(var(--tint),.28) 100%)}
.p1{width:34vmin;height:34vmin;right:-10vmin;bottom:-12vmin}
.p2{width:11vmin;height:11vmin;right:24%;bottom:30%}
.p3{width:7vmin;height:7vmin;left:62%;top:26%}
.top,.summary,.quote,.bottom{position:relative;z-index:1}

.top{display:flex;gap:var(--gap);align-items:flex-start;flex:none}
.who{flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--gap)}
.head{display:flex;align-items:center;gap:clamp(8px,3vmin,16px);min-width:0}
.avatar{flex:none;position:relative;width:var(--av);height:var(--av);border-radius:50%;display:grid;place-items:center;
 color:var(--ink);font-weight:800;border:2px solid #fff;
 background:radial-gradient(circle at 35% 30%,#fff 0%,var(--av1) 38%,var(--av2) 100%);
 box-shadow:0 3px 9px rgba(0,60,130,.32),inset 0 -5px 10px rgba(0,70,130,.22)}
.avatar::after{content:"";position:absolute;left:15%;right:15%;top:5%;height:44%;border-radius:50% 50% 45% 45%;z-index:2;pointer-events:none;
 background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.08))}
.avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:1}
.av-emoji{font-size:calc(var(--av) * .5);line-height:1}
.av-init{font-size:calc(var(--av) * .46);line-height:1;letter-spacing:-.02em}
.av-init.two{font-size:calc(var(--av) * .36)}
.names{flex:1;min-width:0}
.clamp{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
.title{font-size:var(--fs-title);font-weight:800;line-height:1.08;letter-spacing:-.01em;overflow-wrap:anywhere;-webkit-line-clamp:2}
.title.long{font-size:var(--fs-title-long)}
.sub{font-size:var(--fs-sub);font-weight:650;line-height:1.2;color:var(--ink2);margin-top:2px;overflow-wrap:anywhere;-webkit-line-clamp:2}
.glyph{display:none}
.line{font-size:var(--fs);font-weight:600;line-height:1.25;color:var(--ink);overflow-wrap:anywhere;-webkit-line-clamp:3}
.t-context .line,.t-whois .line,.t-info .line{border-left:4px solid var(--acc);padding-left:8px;border-radius:2px}
.t-protect .line{font-weight:700;background:rgba(255,230,224,.85);border:1.5px solid rgba(var(--tint),.5);border-radius:14px;padding:6px 10px}
.t-reminder .line{font-size:var(--fs-task);font-weight:800;line-height:1.2;border-radius:16px;padding:8px 12px;
 background:linear-gradient(180deg,#f5fff3,#dcf8d5);border:1.5px solid rgba(var(--tint),.5);box-shadow:inset 0 1px 0 #fff}
.summary{font-size:var(--fs);font-weight:700;line-height:1.25;flex:none;-webkit-line-clamp:2}
.quote{flex:none;border-radius:16px 16px 16px 6px;padding:6px 10px;
 background:linear-gradient(180deg,#f6fcff,#e4f5fd);border:1.5px solid rgba(var(--tint),.45);box-shadow:inset 0 1px 0 #fff}
.t-protect .quote{background:linear-gradient(180deg,#fffaf9,#fdeeea)}
.qt{font-size:var(--fs);font-weight:500;line-height:1.25;color:var(--ink);overflow-wrap:anywhere;-webkit-line-clamp:3}
.qt b{font-weight:800;color:#0a3560}

.bottom{margin-top:auto;display:flex;flex-direction:column;gap:var(--gap);flex:none}
.actions{display:flex;flex-direction:column;gap:var(--gap)}
.pair .actions{display:grid;grid-template-columns:1fr 1fr}
.pair .actions .btn:first-child{grid-column:1 / -1}
button{font:inherit;color:inherit;-webkit-appearance:none;appearance:none;cursor:pointer;touch-action:manipulation}
.btn,.pill,.ic{position:relative;overflow:hidden;border-radius:999px;color:var(--btn-ink);font-weight:800;
 border:1px solid var(--bb);background:linear-gradient(180deg,var(--g1) 0%,var(--g2) 52%,var(--g3) 100%);
 box-shadow:0 2px 6px rgba(0,50,110,.28),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -3px 7px rgba(0,60,120,.16);
 transition:transform .08s,filter .08s}
.btn::before,.pill::before,.ic::before,.status::before{content:"";position:absolute;left:5%;right:5%;top:1px;height:50%;pointer-events:none;
 border-radius:999px 999px 45% 45% / 999px 999px 14px 14px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.22))}
.btn:active,.pill:active,.ic:active{transform:translateY(1px);filter:brightness(.95)}
.btn{height:calc(var(--btn-h) + var(--grow,0px));min-height:40px;padding:0 12px;font-size:var(--fs-btn);display:flex;align-items:center;justify-content:center;min-width:0}
.bl{position:relative;z-index:1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.08;text-align:center;overflow-wrap:anywhere}
.b-aqua,.ic,.pill{--g1:#f2fdff;--g2:#b8edfb;--g3:#7ad4f2;--bb:rgba(30,140,190,.55)}
.b-blue{--g1:#f0f7ff;--g2:#bfdcff;--g3:#8bbff7;--bb:rgba(40,110,200,.5)}
.b-green{--g1:#f3fff1;--g2:#c2f3ba;--g3:#7edc84;--bb:rgba(40,150,60,.55)}
.b-red{--g1:#fff5f3;--g2:#ffd3cb;--g3:#f7a598;--bb:rgba(200,90,75,.5)}
.b-plain{--g1:#ffffff;--g2:#f2f7fb;--g3:#dce9f3;--bb:rgba(60,100,140,.35)}
.pill{--g1:#ffffff;--g2:#eef9ff;--g3:#cdeefb}
.btn.chosen{box-shadow:0 0 0 3px rgba(var(--tint),.7),0 2px 6px rgba(0,50,110,.28),inset 0 1px 0 #fff}
button:disabled{opacity:.62}
button.chosen:disabled{opacity:1}

.side{flex:none;display:flex;flex-direction:column;gap:var(--gap)}
.ic{width:var(--ic);height:var(--ic);display:grid;place-items:center;font-size:calc(var(--ic) * .48);line-height:1;padding:0}
.ic span{position:relative;z-index:1}
.ctl-row{display:flex;gap:var(--gap)}
.pill{flex:1;min-width:0;height:var(--btn-h);min-height:40px;padding:0 10px;font-size:var(--fs);display:flex;align-items:center;justify-content:center;gap:6px}
.pe{position:relative;z-index:1;font-size:1.2em;line-height:1;flex:none}
.pl{position:relative;z-index:1;text-wrap:balance;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.05;text-align:left}
body.ctl-row .side{display:none}
body.ctl-side .ctl-row{display:none}

.status{position:relative;overflow:hidden;min-height:calc(var(--btn-h) + var(--grow,0px));border-radius:18px;padding:8px 12px;display:flex;align-items:center;justify-content:center;
 font-size:var(--fs-status);font-weight:800;line-height:1.2;text-align:center;color:#06251a;
 border:1.5px solid var(--bb);background:linear-gradient(180deg,var(--g1) 0%,var(--g2) 52%,var(--g3) 100%);
 box-shadow:0 3px 9px rgba(0,60,40,.22),inset 0 1px 0 #fff,inset 0 -4px 9px rgba(0,80,40,.14)}
.status p{position:relative;z-index:1;-webkit-line-clamp:3;overflow-wrap:anywhere}
.s-ok{--g1:#f5fff3;--g2:#cdf6c4;--g3:#92e192;--bb:rgba(50,160,70,.55)}
.s-info{--g1:#f2fdff;--g2:#c4f0fb;--g3:#8ddaf3;--bb:rgba(30,140,190,.5);color:var(--btn-ink)}
.s-warn{--g1:#fffaf0;--g2:#ffe7a6;--g3:#ffcf6a;--bb:rgba(190,130,20,.5);color:#2a1a00}

.toast{position:absolute;left:var(--pad);right:var(--pad);bottom:var(--pad);z-index:5;min-height:var(--btn-h);display:none;
 align-items:center;justify-content:center;gap:8px;padding:8px 12px;border-radius:18px;text-align:center;
 font-size:var(--fs-btn);font-weight:800;line-height:1.15;color:var(--btn-ink);
 background:linear-gradient(180deg,rgba(255,255,255,.99),rgba(226,246,255,.98));border:1.5px solid rgba(40,150,210,.6);
 box-shadow:0 8px 22px rgba(0,50,120,.32),inset 0 1px 0 #fff}
.toast.show{display:flex}
.toast.ok{border-color:rgba(50,160,70,.6);background:linear-gradient(180deg,#fbfffa,#ddf8d7)}
.toast.err{border-color:rgba(214,110,94,.7);background:linear-gradient(180deg,#fffaf9,#ffe4de);color:#2a0d08}
.spin{flex:none;width:18px;height:18px;border-radius:50%;border:3px solid rgba(40,150,210,.25);border-top-color:#1a8fd6;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

@media (min-height:121px){
 body.hero .panel{justify-content:center}
 body.hero .top{flex-direction:column;align-items:center}
 body.hero .who{align-items:center;text-align:center;width:100%}
 body.hero .head{flex-direction:column;text-align:center}
 body.hero .avatar{width:var(--av-hero);height:var(--av-hero)}
 body.hero .av-emoji{font-size:calc(var(--av-hero) * .5)}
 body.hero .av-init{font-size:calc(var(--av-hero) * .46)}
 body.hero .av-init.two{font-size:calc(var(--av-hero) * .36)}
 body.hero .line{text-align:left}
 body.hero .bottom{margin-top:var(--gap);width:100%}
}
@media (max-height:120px){
 :root{--inset:3px}
 .panel{flex-direction:row;align-items:center;gap:6px;padding:4px 8px;border-radius:14px;box-shadow:0 0 0 1.5px rgba(var(--tint),.55),0 3px 8px rgba(0,50,120,.25),inset 0 1px 0 #fff}
 .summary,.quote,.bottom,.line,.side,.sub,.toast,.pbubs,.b3,.b5{display:none!important}
 .top,.who{flex:1;min-width:0}
 .head{gap:6px}
 .avatar{width:min(42px,calc(100vh - 16px));height:min(42px,calc(100vh - 16px));border-width:1.5px}
 .av-emoji{font-size:21px}.av-init{font-size:19px}.av-init.two{font-size:15px}
 .title,.title.long{font-size:15px;line-height:1.1;-webkit-line-clamp:2}
 .glyph{display:block;flex:none;font-size:18px;line-height:1}
}
@media (prefers-reduced-motion:reduce){.bub,.spin{animation:none!important}}
`;

const SCRIPT = `
(function(){
"use strict";
var d=document,b=d.body,panel=d.getElementById("panel"),toastEl=d.getElementById("toast");
var qt=d.getElementById("qt"),ln=d.getElementById("ln"),sm=d.getElementById("sm"),stx=d.getElementById("stx");
function lc(el,n){if(el){el.style.webkitLineClamp=String(n);el.style.lineClamp=String(n);}}
function over(){return panel.scrollHeight>panel.clientHeight+1;}
function mode(c,p){b.classList.toggle("ctl-side",c==="side");b.classList.toggle("ctl-row",c!=="side");b.classList.toggle("pair",!!p);}
function fit(){
 panel.style.setProperty("--grow","0px");
 if(innerHeight<=120)return;
 fit2();grow();
}
function grow(){
 var bt=d.querySelector(".bottom"),pv=bt&&bt.previousElementSibling;if(!bt||!pv||over())return;
 var rows=d.querySelectorAll(".actions .btn").length;if(b.classList.contains("pair")&&rows===3)rows=2;
 if(!rows&&d.getElementById("stx"))rows=1;if(!rows)return;
 var gap=parseFloat(getComputedStyle(panel).rowGap)||0;
 var spare=bt.getBoundingClientRect().top-pv.getBoundingClientRect().bottom-gap;
 var g=Math.max(0,Math.min(spare/rows-1,parseFloat(getComputedStyle(d.querySelector(".btn,.status")).height)*0.4));
 if(g>1)panel.style.setProperty("--grow",Math.floor(g)+"px");
 if(over())panel.style.setProperty("--grow","0px");
}
function fit2(){
 var tall=innerHeight>=460,QM=tall?8:5,LM=tall?4:3,tries=[];
 var cs=(K.ctl&&!K.hero)?["row","side"]:["row"],ps=(K.pairOk&&!tall)?[false,true]:[false];
 cs.forEach(function(c){ps.forEach(function(p){tries.push([c,p]);});});
 for(var i=0;i<tries.length;i++){
  mode(tries[i][0],tries[i][1]);lc(qt,QM);lc(ln,LM);lc(sm,2);lc(stx,3);
  if(!over())return;
  for(var q=QM-1;q>=2&&over();q--)lc(qt,q);
  for(var l=LM-1;l>=2&&over();l--)lc(ln,l);
  if(!over())return;
 }
 lc(sm,1);if(!over())return;
 lc(qt,1);if(!over())return;
 lc(ln,1);if(!over())return;
 lc(stx,2);
}
var raf=0;function refit(){cancelAnimationFrame(raf);raf=requestAnimationFrame(fit);}
fit();addEventListener("load",refit);addEventListener("resize",refit);
try{d.fonts&&d.fonts.ready&&d.fonts.ready.then(refit);}catch(e){}

var tmr=0;
function hideToast(){toastEl.className="toast";toastEl.textContent="";}
function toast(msg,kind,ms){
 clearTimeout(tmr);toastEl.textContent="";toastEl.className="toast show"+(kind?" "+kind:"");
 if(kind==="wait"){var s=d.createElement("span");s.className="spin";s.setAttribute("aria-hidden","true");toastEl.appendChild(s);}
 var t=d.createElement("span");t.textContent=msg;toastEl.appendChild(t);
 if(ms)tmr=setTimeout(hideToast,ms);
}
function post(action,payload,button){
 var ac=typeof AbortController!=="undefined"?new AbortController():null;
 var to=setTimeout(function(){if(ac)ac.abort();},15000);
 var body={t:K.t,v:K.v,action:action,payload:payload||{}};
 if(button)body.button=button;
 return fetch("/card/"+encodeURIComponent(K.id)+"/act",{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify(body),cache:"no-store",credentials:"same-origin",signal:ac?ac.signal:undefined})
 .then(function(r){return r.json().catch(function(){return {};}).then(function(j){
   clearTimeout(to);j=j||{};return {ok:!!(r.ok&&j.ok),toast:typeof j.toast==="string"?j.toast:""};});},
  function(){clearTimeout(to);return {ok:false,toast:""};});
}
var busy=false,reading=false;
function setBusy(on){busy=on;b.classList.toggle("busy",on);
 Array.prototype.forEach.call(d.querySelectorAll("button"),function(x){x.disabled=on;});}
function act(i,el){
 if(busy)return;var a=K.acts[i];if(!a)return;
 setBusy(true);el.classList.add("chosen");toast(K.wait,"wait");
 post(a.action,a.payload,a.id).then(function(res){
  if(res.ok){if(res.toast)toast(res.toast,"ok");setTimeout(function(){location.reload();},res.toast?1100:600);}
  else{setBusy(false);el.classList.remove("chosen");toast(res.toast||K.err,"err",7000);}
 });
}
function readAloud(){
 if(busy||reading)return;reading=true;toast(K.reading,"ok");
 post("readaloud",{}).then(function(res){
  setTimeout(function(){reading=false;},3000);
  if(res.ok){if(res.toast)toast(res.toast,"ok",6000);else tmr=setTimeout(hideToast,6000);}
  else{reading=false;toast(res.toast||K.err,"err",7000);}
 });
}
function talk(){if(busy)return;location.href="/talk/"+encodeURIComponent(K.id)+"?t="+encodeURIComponent(K.t);}
Array.prototype.forEach.call(d.querySelectorAll("[data-i]"),function(el){
 el.addEventListener("click",function(){act(Number(el.getAttribute("data-i")),el);});});
Array.prototype.forEach.call(d.querySelectorAll("[data-ctl]"),function(el){
 el.addEventListener("click",function(){if(el.getAttribute("data-ctl")==="talk")talk();else readAloud();});});
try{fetch("/diag",{method:"POST",headers:{"content-type":"application/json"},
 body:JSON.stringify({page:"card",id:K.id,w:innerWidth,h:innerHeight,ua:navigator.userAgent})}).catch(function(){});}catch(e){}
})();
`;

export function renderCard(v: CardView): string {
  const type = (TYPES.indexOf(String(v.type)) >= 0 ? v.type : "info") as CardType;
  const state = str(v.state);
  const title = str(v.title) || (type === "protect" ? "Someone I don't know" : "Kin");
  const subtitle = str(v.subtitle);
  const emoji = Array.from(str(v.emoji)).slice(0, 8).join("");
  const photo = safeImgUrl(v.photoUrl);
  const line = str(v.line);
  const quote = str(v.quote);
  const quoteFrom = str(v.quoteFrom) || (type === "protect" && quote ? "The message said:" : "");
  const summary = str(v.summary);

  let status: { text: string; tone: string } | null = null;
  if (v.status && str(v.status.text)) {
    status = { text: str(v.status.text), tone: TONES.indexOf(String(v.status.tone)) >= 0 ? String(v.status.tone) : "info" };
  } else if (type === "reminder" && /^done$/i.test(state)) {
    status = { text: "Done ✅", tone: "ok" };
  }

  const all = Array.isArray(v.buttons) ? v.buttons.filter((x) => x && str(x.label)).slice(0, 3) : [];
  const buttons = status ? [] : all; // a status banner replaces the reply buttons
  const defStyle = type === "protect" ? "red" : type === "reminder" ? "green" : "aqua";
  const readAloud = !!v.readAloud;
  const talk = !!v.talk;
  const hasCtl = readAloud || talk;
  const hero = !quote && !summary && buttons.length === 0 && !status;
  const pairOk = buttons.length === 3 && len(str(buttons[1].label)) <= 13 && len(str(buttons[2].label)) <= 13;
  const ctlGuess = !hero && hasCtl && (buttons.length >= 2 || (!!status && !!quote)) ? "side" : "row";

  let glyph = "";
  if (status && status.tone === "ok") glyph = "✅";
  else if (type === "protect" && (photo || emoji !== "🛡️")) glyph = "🛡️";

  const ini = initials(title);
  const avatarInner =
    (photo ? `<img src="${escapeHtml(photo)}" alt="" onerror="this.remove()">` : "") +
    (emoji
      ? `<span class="av-emoji">${escapeHtml(emoji)}</span>`
      : `<span class="av-init${len(ini) > 1 ? " two" : ""}">${escapeHtml(ini)}</span>`);

  const side = hasCtl
    ? `<div class="side">` +
      (readAloud ? `<button type="button" class="ic" data-ctl="read" aria-label="Read it to me"><span>🔊</span></button>` : "") +
      (talk ? `<button type="button" class="ic" data-ctl="talk" aria-label="Talk to Kin"><span>🎙️</span></button>` : "") +
      `</div>`
    : "";

  const ctlRow = hasCtl
    ? `<div class="ctl-row">` +
      (readAloud ? `<button type="button" class="pill" data-ctl="read"><span class="pe">🔊</span><span class="pl">Read it to&nbsp;me</span></button>` : "") +
      (talk ? `<button type="button" class="pill" data-ctl="talk"><span class="pe">🎙️</span><span class="pl">Talk to&nbsp;Kin</span></button>` : "") +
      `</div>`
    : "";

  const actions = buttons.length
    ? `<div class="actions">` +
      buttons
        .map((btn, i) => {
          const style = BTN_STYLES.indexOf(String(btn.style)) >= 0 ? String(btn.style) : defStyle;
          return `<button type="button" class="btn b-${style}" data-i="${i}"><span class="bl">${escapeHtml(str(btn.label))}</span></button>`;
        })
        .join("") +
      `</div>`
    : "";

  const statusHtml = status
    ? `<div class="status s-${status.tone}" role="status"><p class="clamp" id="stx">${escapeHtml(status.text)}</p></div>`
    : "";

  const bottomInner = statusHtml + actions + ctlRow;
  const bottom = bottomInner ? `<div class="bottom">${bottomInner}</div>` : "";

  const cfg = {
    id: str(v.id),
    t: str(v.token),
    v: Number(v.version) || 0,
    acts: buttons.map((btn) => ({ id: str(btn.id), action: str(btn.action), payload: btn.payload || {} })),
    ctl: hasCtl,
    hero,
    pairOk,
    wait: "One moment…",
    err: ERR_TEXT,
    reading: "I'm sending you a voice message 🔊",
  };

  const bodyClass = [`t-${type}`, hero ? "hero" : "", `ctl-${ctlGuess}`, pairOk ? "pair" : ""].filter(Boolean).join(" ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="format-detection" content="telephone=no,email=no,address=no">
<title>${escapeHtml(title)}${subtitle ? " · " + escapeHtml(subtitle) : ""}</title>
<style>${CSS}</style>
</head>
<body class="${escapeHtml(bodyClass)}" data-state="${escapeHtml(state)}" data-type="${type}">
<div class="sky" aria-hidden="true"><i class="swoosh"></i><i class="bub b1"></i><i class="bub b2"></i><i class="bub b3"></i><i class="bub b4"></i><i class="bub b5"></i></div>
<main class="panel" id="panel">
<div class="pbubs" aria-hidden="true"><i class="pb p1"></i><i class="pb p2"></i><i class="pb p3"></i></div>
<div class="top">
<div class="who">
<div class="head">
<div class="avatar" aria-hidden="true">${avatarInner}</div>
<div class="names"><h1 class="title clamp${len(title) > 12 ? " long" : ""}">${escapeHtml(title)}</h1>${subtitle ? `<p class="sub clamp">${escapeHtml(subtitle)}</p>` : ""}</div>
${glyph ? `<span class="glyph" aria-hidden="true">${glyph}</span>` : ""}
</div>
${line ? `<p class="line clamp" id="ln">${escapeHtml(line)}</p>` : ""}
</div>
${side}
</div>
${summary ? `<p class="summary clamp" id="sm">${escapeHtml(summary)}</p>` : ""}
${quote ? `<div class="quote"><p class="qt clamp" id="qt">${quoteFrom ? `<b>${escapeHtml(quoteFrom)}</b> ` : ""}“${escapeHtml(quote)}”</p></div>` : ""}
${bottom}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</main>
<script>var K=${jsonForScript(cfg)};</script>
<script>${SCRIPT}</script>
</body>
</html>`;
}
