// TEST 1: can Kin read this Mac's Messages? Text this Mac's iMessage account from another phone.
import { Spectrum } from "spectrum-ts";
import { localIMessage } from "@spectrum-ts/imessage-local";

// Only react to these senders (comma list in .env TEST_SENDERS), so your real texts are never logged, forwarded or answered.
const ALLOW = (process.env.TEST_SENDERS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const allowed = (id?: string) => !!id && ALLOW.some((a) => id.toLowerCase().includes(a.replace(/^\+?1?/, "")));
let ignored = 0;
let echoed = false;
if (!ALLOW.length) { console.error("Set TEST_SENDERS in .env (the phone that will text this Mac), e.g. +19195551234"); process.exit(1); }

const app = await Spectrum({ providers: [localIMessage.config()] });
console.log("Listening to this Mac's Messages... send a text to it from another phone. Ctrl+C to stop.");
for await (const [space, message] of app.messages) {
  if (!allowed(message.sender?.id)) { console.log(`(ignored a message from someone else; ${++ignored} so far)`); continue; }
  const c: any = message.content;
  console.log(`[${message.platform}] ${message.direction} from=${message.sender?.id} space=${space.id} type=${c.type}`,
    c.type === "text" ? JSON.stringify(c.text) : c.name ?? c.mimeType ?? "");
  const echoTo = (process.env.ECHO_TO ?? "").replace(/\D/g, "").slice(-10);
  const isEchoTarget = !echoTo || (message.sender?.id ?? "").replace(/\D/g, "").endsWith(echoTo);
  if ((process.argv.includes("--echo") || (process.argv.includes("--echo-once") && !echoed)) && isEchoTarget && message.direction === "inbound" && c.type === "text") {
    echoed = true;
    await space.send(`(test reply sent as this Mac's account) got: ${c.text}`);
    console.log("  -> replied as this account");
  }
}
