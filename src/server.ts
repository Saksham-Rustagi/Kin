// HTTP: card pages + taps (public, via tunnel), talk, media, and the localhost-only dashboard.
import { existsSync } from "fs";
import { config } from "./config";
import { graph } from "./db";
import { log, subscribe, recentEvents, emit, type DashEvent } from "./events";
import { checkToken, getCard, renderCardHtml, cardToken } from "./cards/service";
import { renderTalk } from "./cards/talk";
import { renderDashboard } from "./dash/page";
import { onCardAction } from "./kin";
import { geminiUsed } from "./ai/gemini";

const html = (b: string, status = 200) => new Response(b, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const isLocal = (req: Request) => !req.headers.get("cf-connecting-ip") && !req.headers.get("x-forwarded-for");
const enc = new TextEncoder();

export function startServer(opts: { health: () => { local: boolean; cloud: boolean }; onReset?: () => void }) {
  return Bun.serve({
    port: config.port,
    idleTimeout: 0,
    async fetch(req) {
      const u = new URL(req.url);
      const p = u.pathname;
      try {
        // ---------- card page ----------
        let m = p.match(/^\/card\/([\w-]+)$/);
        if (m && req.method === "GET") {
          if (!checkToken(m[1], u.searchParams.get("t"))) return html("<h1>This card has expired.</h1>", 403);
          const h = renderCardHtml(m[1]);
          return h ? html(h) : html("<h1>Not found</h1>", 404);
        }
        m = p.match(/^\/card\/([\w-]+)\/act$/);
        if (m && req.method === "POST") {
          const body: any = await req.json().catch(() => ({}));
          if (!checkToken(m[1], body.t)) return Response.json({ ok: false }, { status: 403 });
          return Response.json(await onCardAction(m[1], String(body.action || ""), body.payload ?? {}));
        }
        // ---------- talk to Kin ----------
        m = p.match(/^\/talk\/([\w-]+)$/);
        if (m && req.method === "GET") {
          if (!checkToken(m[1], u.searchParams.get("t"))) return html("<h1>Expired</h1>", 403);
          const c = getCard(m[1]);
          return html(renderTalk({ cardId: m[1], token: cardToken(m[1]), base: config.publicBase, title: c?.data.title ?? "your family" }));
        }
        m = p.match(/^\/talk\/([\w-]+)\/session$/);
        if (m && req.method === "POST") {
          if (!checkToken(m[1], u.searchParams.get("t"))) return Response.json({ ok: false }, { status: 403 });
          const c = getCard(m[1]);
          const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${config.elevenAgent}`, { headers: { "xi-api-key": config.elevenKey } });
          const j: any = await r.json();
          log.info(`talk to Kin: session for card ${m[1]} (token ${r.status})`);
          const d = c?.data;
          const dynamicVariables = {
            asha_name: config.ashaName,
            reason: c?.row.type === "reminder" ? "reminder" : c?.row.type === "protect" ? "safety" : "message",
            from_name: d?.title ?? "",
            relation: (d?.subtitle ?? "").replace(/^your /, ""),
            message_text: d?.quote ?? "",
            reminder_text: c?.row.type === "reminder" ? d?.line ?? "" : "",
            reply_options: (d?.buttons ?? []).filter((b) => b.action === "reply").map((b) => b.label).join(" | "),
            memory_line: d?.line ?? "",
          };
          return Response.json(r.ok ? { ok: true, conversationToken: j.token, dynamicVariables } : { ok: false, error: `token ${r.status}` });
        }
        if (p === "/diag" && req.method === "POST") {
          const d: any = await req.json().catch(() => ({}));
          log.info(`device: ${d.page ?? "?"} ${d.ev ?? "load"} ${d.id ?? ""} ${d.w ? `${d.w}x${d.h}` : ""}${d.msg ? " " + d.msg : ""}`);
          return new Response("ok");
        }
        // ---------- media (photos for cards) ----------
        m = p.match(/^\/media\/([\w.-]+\.(?:jpg|jpeg|png))$/);
        if (m && req.method === "GET") {
          const f = `${config.dataDir}/media/${m[1]}`;
          return existsSync(f) ? new Response(Bun.file(f)) : new Response("not found", { status: 404 });
        }
        if (p === "/health") return Response.json({ ok: true, ...opts.health(), gemini: geminiUsed() });

        // ---------- dashboard (localhost only) ----------
        if (p.startsWith("/dash")) {
          if (!isLocal(req)) return new Response("not found", { status: 404 });
          if (p === "/dash") return html(renderDashboard({}));
          if (p === "/dash/graph.json") return Response.json(graph());
          if (p === "/dash/reset" && req.method === "POST") { opts.onReset?.(); return Response.json({ ok: true }); }
          if (p === "/dash/events") {
            let unsub = () => {};
            const stream = new ReadableStream({
              start(ctrl) {
                const send = (e: DashEvent) => { try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { unsub(); } };
                for (const e of recentEvents()) send(e);
                const h = opts.health();
                send({ kind: "health", local: h.local, cloud: h.cloud, tunnel: !!config.publicBase, gemini: { used: geminiUsed(), limit: config.geminiDailyLimit } });
                unsub = subscribe(send);
                const ka = setInterval(() => { try { ctrl.enqueue(enc.encode(`: ka\n\n`)); } catch { clearInterval(ka); } }, 15000);
              },
              cancel() { unsub(); },
            });
            return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
          }
        }
        return new Response("not found", { status: 404 });
      } catch (e) {
        log.error(`HTTP ${p}`, e);
        return Response.json({ ok: false }, { status: 500 });
      }
    },
  });
}

/** Push a health event every 10 s for the dashboard. */
export function startHealthTicker(health: () => { local: boolean; cloud: boolean }) {
  setInterval(() => {
    const h = health();
    emit({ kind: "health", local: h.local, cloud: h.cloud, tunnel: !!config.publicBase, gemini: { used: geminiUsed(), limit: config.geminiDailyLimit } });
  }, 10000);
}
