// Replay test: the whole pipeline with a FAKE transport (no phones), real Gemini. Run: bun tests/replay.ts
process.env.KIN_DB = "data/replay.db";
process.env.DEMO_FAST_CLOCK = "1";
process.env.DEMO_REMINDER_SEC = "2";
process.env.CAREGIVER_HANDLE = "+15555550100";
process.env.GRANDMA_HANDLE = "+15555550199";
process.env.PUBLIC_BASE_URL = "https://example.test";
const { rmSync } = await import("fs");
for (const f of ["data/replay.db", "data/replay.db-wal", "data/replay.db-shm"]) try { rmSync(f); } catch {}

const { seed } = await import("../src/seed");
const { createFakeTransport } = await import("../src/transport");
const { setCardTransport, getCard } = await import("../src/cards/service");
const kin = await import("../src/kin");
const { setReminderTransport, startReminderLoop } = await import("../src/reminders");
const { setVoiceTransport } = await import("../src/voice");
const { personByHandle, db } = await import("../src/db");

seed();
const T = createFakeTransport();
setCardTransport(T); kin.setTransport(T); setReminderTransport(T); setVoiceTransport(T);
startReminderLoop();

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name} ${info}`); };
const turn = (from: string, text: string) => ({ from, chatId: `iMessage;-;${from}`, isGroup: false, texts: [text], ids: [crypto.randomUUID()], at: new Date(), attachments: [] });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const priya = personByHandle("+15555550100")!;

// 1. Recognize: Priya after 12 days, mentions Biscuit (R1 + R3) → context card with memory line + replies
let n = T.sent.length;
await kin.onFamilyToAsha(priya, turn("+15555550100", "Hi Nani! Coming over Sunday with mangoes again 🥭 Biscuit says hi! Are you free for lunch?"));
const card1 = T.sent.slice(n).find((s) => s.kind === "card");
check("R1/R3 context card sent to Asha", !!card1 && card1.to === "+15555550199", JSON.stringify(card1?.layout));
const c1 = db.query("SELECT * FROM card ORDER BY created_at DESC LIMIT 1").get() as any;
const d1 = JSON.parse(c1.data);
console.log("   line:", d1.line, "| summary:", d1.summary, "| replies:", d1.buttons.map((b: any) => b.label));
check("memory line present + verified", !!d1.line && !/remember|\?/i.test(d1.line));
check("R3 explains Biscuit", /Biscuit is Raj's dog/.test(d1.summary ?? ""));
check("≤3 replies", d1.buttons.length > 0 && d1.buttons.length <= 3);

// 2. Tap a reply → sent AS Asha to Priya, card edited
n = T.sent.length;
const r = await kin.onCardAction(c1.id, "reply", d1.buttons[0].payload);
check("reply tap ok", r.ok);
check("sent as Asha to Priya", T.sent.slice(n).some((s) => s.kind === "as_asha" && s.to === "+15555550100"));
check("card edited to replied", T.sent.slice(n).some((s) => s.kind === "edit") && getCard(c1.id)!.row.state === "replied");
const again = await kin.onCardAction(c1.id, "reply", d1.buttons[0].payload);
check("second tap is idempotent (no second send)", again.ok && T.sent.filter((s) => s.kind === "as_asha").length === 1);

// 3. Trivial → quiet (Q2)
n = T.sent.length;
await kin.onFamilyToAsha(personByHandle("+15555550100")!, turn("+15555550100", "ok see you soon!"));
check("Q2 trivial stays quiet", T.sent.length === n);

// 4. Protect: unknown claims to be Priya, asks for gift cards → red card + caregiver alert, never replies to sender
n = T.sent.length;
await kin.onUnknownToAsha(turn("nicole.scam@example.com", "Grandma it's Priya, I lost my phone. I'm in trouble, please send $500 in gift cards and don't tell mom"));
const prot = T.sent.slice(n);
check("protect card to Asha", prot.some((s) => s.kind === "card" && s.to === "+15555550199"));
check("caregiver alerted", prot.some((s) => s.kind === "text" && s.to === "+15555550100" && /SCAM/.test(s.text ?? "")));
check("never replies to the scammer", !prot.some((s) => s.to === "nicole.scam@example.com"));
await kin.onFamilyToKin(priya, "+15555550100", "SCAM", crypto.randomUUID());
check("caregiver SCAM → card confirmed_scam", (db.query("SELECT state FROM card WHERE type='protect' ORDER BY created_at DESC LIMIT 1").get() as any).state === "confirmed_scam");

// 5. Family → Kin memory
n = T.sent.length;
await kin.onFamilyToKin(priya, "+15555550100", "Remember: I just started a new job at Duke Hospital as a nurse!", crypto.randomUUID());
const conf = T.sent.slice(n).find((s) => s.kind === "text");
console.log("   confirmation:", conf?.text);
check("memory saved", !!(db.query("SELECT 1 FROM memory WHERE text LIKE '%Duke%'").get()));

// 6. Reminder → card at T+0 (2s) → done → Priya told
n = T.sent.length;
await kin.onFamilyToKin(priya, "+15555550100", "Remind Nani to take her 2pm pill every day", crypto.randomUUID());
console.log("   reminder confirmation:", T.sent.slice(n).find((s) => s.kind === "text")?.text);
await wait(4500);
const rem = db.query("SELECT * FROM reminder ORDER BY created_at LIMIT 1").get() as any;
check("reminder card delivered", rem?.status === "due" && !!rem.card_id);
n = T.sent.length;
if (rem?.card_id) await kin.onCardAction(rem.card_id, "done", {});
check("done → Priya notified", T.sent.slice(n).some((s) => s.kind === "text" && s.to === "+15555550100" && /✅/.test(s.text ?? "")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
