// Router: dedupe, echo filter, TEST_SENDERS allowlist, debounce, dispatch. Never awaits handlers inside the stream loop.
import type { Message, Space } from "spectrum-ts";
import { config, isAllowedLocalSender, isAsha, isKinLine, mask, normalizeHandle } from "./config";
import { personByHandle, seenMessage } from "./db";
import { log } from "./events";
import { onFamilyToAsha, onUnknownToAsha, onAshaToKin, onFamilyToKin, type Turn } from "./kin";
import type { Transport } from "./transport";

const seen = new Set<string>();
function dedupe(id: string): boolean {
  if (seen.has(id) || seenMessage(id)) return true;
  seen.add(id);
  if (seen.size > 5000) seen.delete(seen.values().next().value!);
  return false;
}

type Buf = { turn: Turn; timer: ReturnType<typeof setTimeout>; first: number };
const buffers = new Map<string, Buf>();
export let ignoredCount = 0;

function flush(key: string) {
  const b = buffers.get(key);
  if (!b) return;
  buffers.delete(key);
  const person = isAsha(b.turn.from) ? null : personByHandle(b.turn.from);
  const p = person ? onFamilyToAsha(person, b.turn) : onUnknownToAsha(b.turn);
  p.catch((e) => log.error("turn handler failed", e));
}

function buffer(from: string, chatId: string | null, isGroup: boolean, id: string, text: string, att?: { name: string; mimeType: string }) {
  const key = `${from}|${chatId ?? ""}`;
  let b = buffers.get(key);
  if (!b) {
    b = { turn: { from, chatId, isGroup, texts: [], ids: [], at: new Date(), attachments: [] }, timer: setTimeout(() => {}, 0), first: Date.now() };
    buffers.set(key, b);
  }
  clearTimeout(b.timer);
  if (text) b.turn.texts.push(text);
  if (att) b.turn.attachments.push(att);
  b.turn.ids.push(id);
  const waited = Date.now() - b.first;
  const wait = Math.max(0, Math.min(config.debounceMs, 45_000 - waited));
  b.timer = setTimeout(() => flush(key), wait);
}

export async function route(space: Space | null, message: Message) {
  if (message.direction === "outbound") return;
  const c0: any = message.content;
  if (c0.type === "read" || c0.type === "typing") return;
  if (dedupe(message.id)) return;
  const from = normalizeHandle(message.sender?.id);

  if (message.platform === "local_imessage") {
    if (isKinLine(from)) return; // echo: Kin's own cloud messages also land in Asha's chat.db
    if (!isAllowedLocalSender(from)) { ignoredCount++; log.info(`(ignored a local message from a non-test sender ${mask(from)}; ${ignoredCount} so far)`); return; }
    const isGroup = (space as any)?.type === "group";
    if (isGroup) { log.info(`group message from ${mask(from)}: G1 group mode not enabled in v1`); return; }
    const c = c0.type === "reply" ? c0.content : c0;
    if (c.type === "text") buffer(from, space?.id ?? null, false, message.id, c.text);
    else if (c.type === "attachment" || c.type === "voice") buffer(from, space?.id ?? null, false, message.id, "", { name: c.name ?? "file", mimeType: c.mimeType ?? "" });
    return;
  }

  if (message.platform === "imessage") {
    const handle = async (c: any): Promise<void> => {
      if (c.type === "group") { for (const it of c.items) await handle(it); return; }
      if (c.type === "reply") return handle(c.content);
      if (isAsha(from)) {
        return onAshaToKin({ type: c.type, text: c.text, emoji: c.emoji, targetId: c.target?.id });
      }
      const person = personByHandle(from);
      if (!person) { log.info(`cloud message from unknown ${mask(from)} ignored`); return; }
      if (c.type === "text") return onFamilyToKin(person, from, c.text, message.id);
      log.info(`cloud ${c.type} from ${person.name} (not handled yet)`);
    };
    handle(c0).catch((e) => log.error("cloud handler failed", e));
  }
}

/** Supervisor: restart the merged stream if it ends or throws (a local watcher error can end it). */
export async function runRouter(T: Transport) {
  for (;;) {
    try {
      for await (const [space, message] of T.messages()) {
        void route(space, message).catch((e) => log.error("route failed", e));
      }
      log.warn("message stream ended; restarting in 2s");
    } catch (e) {
      log.error("message stream crashed; restarting in 2s", e);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
