// TEST 3 (the core of Kin): local hears a family text to Grandma -> cloud Kin line sends Grandma a note about it.
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { localIMessage } from "@spectrum-ts/imessage-local";

const { PROJECT_ID, PROJECT_SECRET, GRANDMA_HANDLE } = process.env;
// Only react to these senders (comma list in .env TEST_SENDERS), so your real texts are never logged, forwarded or answered.
const ALLOW = (process.env.TEST_SENDERS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const allowed = (id?: string) => !!id && ALLOW.some((a) => id.toLowerCase().includes(a.replace(/^\+?1?/, "")));
let ignored = 0;
if (!ALLOW.length) { console.error("Set TEST_SENDERS in .env (the phone that will text this Mac), e.g. +15555550123"); process.exit(1); }

const app = await Spectrum({ projectId: PROJECT_ID!, projectSecret: PROJECT_SECRET!, providers: [localIMessage.config(), imessage.config()] });
const im = imessage(app);
const kinThread = await im.space.create(await im.user(GRANDMA_HANDLE!));
console.log("Bridge running. From Priya's phone, text Grandma's Apple ID normally.");
for await (const [space, message] of app.messages) {
  if (message.platform === "local_imessage" && (process.env.KIN_LINE_HANDLES ?? "").split(",").includes(message.sender?.id ?? "")) { console.log("  (echo of Kin's own message dropped)"); continue; }
  if (message.platform === "local_imessage" && !allowed(message.sender?.id)) { console.log(`(ignored a message from someone else; ${++ignored} so far)`); continue; }
  const c: any = message.content;
  console.log(`[${message.platform}] ${message.direction} from=${message.sender?.id} type=${c.type}`, c.text ?? "");
  // Kin's own cloud messages to Grandma also land in this Mac's Messages DB: skip them (echo-loop guard)
  const KIN_LINES = (process.env.KIN_LINE_HANDLES ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const isKinEcho = KIN_LINES.includes(message.sender?.id ?? "") || (typeof c.text === "string" && c.text.startsWith("Kin:"));
  if (message.platform === "local_imessage" && isKinEcho) { console.log("  (echo of Kin's own message dropped)"); continue; }
  if (message.platform === "local_imessage" && message.direction === "inbound" && c.type === "text" && !isKinEcho) {
    await kinThread.send(`Kin: ${message.sender?.id} just wrote: "${c.text}"`);
    console.log("  -> Kin told Grandma via the cloud line");
  }
}
