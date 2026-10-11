// Preview grid: renders sample cards at the real webview size (280×300) and the bubble size (149×58). bun tests/preview_cards.ts
import { renderCard, type CardView } from "../src/cards/render";
import { writeFileSync, mkdirSync } from "fs";
mkdirSync("data/preview", { recursive: true });
const base = { version: 1, token: "x", photoUrl: null, readAloud: true, talk: true } as const;
const b = (label: string, action: string, payload: any = {}, style: any = "green") => ({ id: label, label, action, payload, style });
const cards: Record<string, CardView> = {
  context: { ...base, id: "c1", type: "context", state: "sent", title: "Nicole", subtitle: "your granddaughter", emoji: "👩🏽", line: "She visited two weeks ago with apple pie 🥧", summary: "Biscuit is Mike's dog 🐶", quoteFrom: "Nicole wrote:", quote: "Hi Grandma! Coming over Sunday with apple pie again 🥧 Biscuit says hi! Are you free for lunch?", status: null, buttons: [b("I would love that 🥧", "reply", { text: "x" }), b("Yes, see you Sunday", "reply", { text: "x" }), b("Call me soon", "reply", { text: "x" }), b("👍 I know Nicole", "know", { personId: "priya" }, "plain")] },
  today: { ...base, id: "c6", type: "info", state: "sent", title: "Good morning, Grandma", subtitle: "Saturday, October 10", emoji: "☀️", line: "2:00 PM · Take your 2pm pill 💊 (from Nicole)", summary: "Tomorrow · Mike is visiting from Austin", quoteFrom: null, quote: null, status: null, buttons: [] },
  replied: { ...base, id: "c2", type: "context", state: "replied", title: "Nicole", subtitle: "your granddaughter", emoji: "👩🏽", line: "She visited two weeks ago with apple pie 🥧", summary: null, quoteFrom: "Nicole wrote:", quote: "Hi Grandma! Coming over Sunday with apple pie again 🥧", status: { text: "Sent to Nicole ✓ “I would love that 🥧”", tone: "ok" }, buttons: [] },
  protect: { ...base, talk: false, id: "c3", type: "protect", state: "family_notified", title: "Someone I don't know", subtitle: "says it's Nicole", emoji: "🛡️", line: "This isn't Nicole's number. I'm checking with Nicole.", summary: null, quoteFrom: "They wrote:", quote: "Grandma it's Nicole, I lost my phone. I'm in trouble, please send $500 in gift cards", status: { text: "Nicole knows ✓", tone: "info" }, buttons: [b("📞 Ask Nicole to call me", "callme", {}, "blue")] },
  reminder: { ...base, id: "c4", type: "reminder", state: "due", title: "Nicole", subtitle: "asked me to remind you", emoji: "💊", line: "Take your 2pm pill 💊", summary: null, quoteFrom: null, quote: null, status: null, buttons: [b("✅ Done", "done"), b("⏰ In 10 minutes", "snooze", {}, "blue")] },
};
const frames: string[] = [];
for (const [name, v] of Object.entries(cards)) {
  writeFileSync(`data/preview/${name}.html`, renderCard(v));
  frames.push(`<figure><iframe src="${name}.html" width="280" height="300"></iframe><figcaption>${name}</figcaption></figure>`);
}
frames.push(`<figure><iframe src="context.html#reply" width="280" height="300"></iframe><figcaption>reply screen</figcaption></figure>`);
frames.push(`<figure><iframe src="context.html" width="149" height="58"></iframe><figcaption>bubble</figcaption></figure>`);
writeFileSync("data/preview/grid.html", `<!doctype html><body style="margin:8px;background:#dfe9f1;font:12px system-ui"><div style="display:flex;flex-wrap:wrap;gap:8px">${frames.join("")}</div>
<style>figure{margin:0}iframe{border:1px solid #9ab;border-radius:10px;background:#fff;display:block}</style></body>`);
console.log("wrote data/preview/grid.html");
