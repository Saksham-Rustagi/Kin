// Preview grid: renders sample cards at the real webview size (280×300) and the bubble size (149×58). bun tests/preview_cards.ts
import { renderCard, type CardView } from "../src/cards/render";
import { writeFileSync, mkdirSync } from "fs";
mkdirSync("data/preview", { recursive: true });
const base = { version: 1, token: "x", photoUrl: null, readAloud: true, talk: true } as const;
const b = (label: string, action: string, payload: any = {}, style: any = "green") => ({ id: label, label, action, payload, style });
const cards: Record<string, CardView> = {
  context: { ...base, id: "c1", type: "context", state: "sent", title: "Priya", subtitle: "your granddaughter", emoji: "👩🏽", line: "She visited two weeks ago with mangoes 🥭", summary: "Biscuit is Raj's dog 🐶", quoteFrom: "Priya wrote:", quote: "Hi Nani! Coming over Sunday with mangoes again 🥭 Biscuit says hi! Are you free for lunch?", status: null, buttons: [b("I would love that 🥭", "reply", { text: "x" }), b("Yes, see you Sunday", "reply", { text: "x" }), b("Call me soon", "reply", { text: "x" })] },
  replied: { ...base, id: "c2", type: "context", state: "replied", title: "Priya", subtitle: "your granddaughter", emoji: "👩🏽", line: "She visited two weeks ago with mangoes 🥭", summary: null, quoteFrom: "Priya wrote:", quote: "Hi Nani! Coming over Sunday with mangoes again 🥭", status: { text: "Sent to Priya ✓ “I would love that 🥭”", tone: "ok" }, buttons: [] },
  protect: { ...base, talk: false, id: "c3", type: "protect", state: "family_notified", title: "Someone I don't know", subtitle: "says it's Priya", emoji: "🛡️", line: "This isn't Priya's number. I'm checking with Priya.", summary: null, quoteFrom: "They wrote:", quote: "Grandma it's Priya, I lost my phone. I'm in trouble, please send $500 in gift cards", status: { text: "Priya knows ✓", tone: "info" }, buttons: [b("📞 Ask Priya to call me", "callme", {}, "blue")] },
  reminder: { ...base, id: "c4", type: "reminder", state: "due", title: "Priya", subtitle: "asked me to remind you", emoji: "💊", line: "Take your 2pm pill 💊", summary: null, quoteFrom: null, quote: null, status: null, buttons: [b("✅ Done", "done"), b("⏰ In 10 minutes", "snooze", {}, "blue")] },
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
