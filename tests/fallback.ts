// Fallback test: Gemini OFF (rules only), fake transport. Proves Kin still recognizes, protects and stays quiet without AI,
// and never invents a memory or replies to an unknown sender. Run: bun tests/fallback.ts
process.env.KIN_DB = "data/fallback.db";
process.env.GEMINI_OFF = "1";
process.env.KIN_NO_PREFETCH = "1";
process.env.DEMO_FAST_CLOCK = "1";
process.env.DEMO_REMINDER_SEC = "2";
process.env.CAREGIVER_HANDLE = "+15555550100";
process.env.GRANDMA_HANDLE = "+15555550199";
process.env.PUBLIC_BASE_URL = "https://example.test";
const { rmSync } = await import("fs");
for (const f of ["data/fallback.db", "data/fallback.db-wal", "data/fallback.db-shm"]) try { rmSync(f); } catch {}

const { seed } = await import("../src/seed");
const { createFakeTransport } = await import("../src/transport");
const { setCardTransport } = await import("../src/cards/service");
const kin = await import("../src/kin");
const { setReminderTransport } = await import("../src/reminders");
const { setVoiceTransport } = await import("../src/voice");
const { personByHandle, db } = await import("../src/db");
const { geminiDisabled } = await import("../src/ai/gemini");

seed();
const T = createFakeTransport();
setCardTransport(T); kin.setTransport(T); setReminderTransport(T); setVoiceTransport(T);

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name} ${info}`); };
const turn = (from: string, text: string) => ({ from, chatId: `iMessage;-;${from}`, isGroup: false, texts: [text], ids: [crypto.randomUUID()], at: new Date(), attachments: [] });
const lastCard = (type: string) => { const c = db.query("SELECT * FROM card WHERE type = ? ORDER BY created_at DESC LIMIT 1").get(type) as any; return c ? { row: c, data: JSON.parse(c.data) } : null; };
const ASHA = "+15555550199", PRIYA = "+15555550100", SCAMMER = "+15559876543", STRANGER = "+15553334444";
const priya = personByHandle(PRIYA)!;

check("Gemini is off", geminiDisabled());

// 1. Family after 12 days (R1) → context card, canned replies, NO memory line (never invented).
let n = T.sent.length;
await kin.onFamilyToAsha(priya, turn(PRIYA, "Hi Nani! Coming over Sunday with mangoes again. Are you free for lunch?"));
const c1 = lastCard("context");
console.log("   rules:", c1?.data.meta.rules, "| line:", c1?.data.line, "| replies:", c1?.data.buttons.map((b: any) => b.label));
check("R1 context card sent to Asha", T.sent.slice(n).some((s) => s.kind === "card" && s.to === ASHA) && !!c1);
check("rules-only fallback noted", !!c1?.data.meta.rules.includes("fallback: rules only"));
check("canned replies", JSON.stringify(c1?.data.buttons.map((b: any) => b.label)) === JSON.stringify(["❤️ Thank you!", "Sounds good", "Call me soon"]));
check("no memory line (never invented)", c1?.data.line === null && c1?.data.meta.memoryId === null);
check("nothing sent as Asha without a tap", !T.sent.some((s) => s.kind === "as_asha"));

// 2. Trivial "ok" → quiet.
n = T.sent.length;
await kin.onFamilyToAsha(personByHandle(PRIYA)!, turn(PRIYA, "ok"));
check("trivial 'ok' stays quiet", T.sent.length === n);

// 3. Gift-card scam from an unknown sender → protect card + caregiver alert from the regex alone.
n = T.sent.length;
await kin.onUnknownToAsha(turn(SCAMMER, "Grandma it's Priya, I lost my phone. Please buy two Google Play gift cards and text me the codes, don't tell mom"));
const prot = T.sent.slice(n);
const pc = lastCard("protect");
console.log("   protect line:", pc?.data.line);
check("protect card to Asha", prot.some((s) => s.kind === "card" && s.to === ASHA) && !!pc);
check("caregiver alerted", prot.some((s) => s.kind === "text" && s.to === PRIYA && /SCAM/.test(s.text ?? "")));
check("alert row stored", !!db.query("SELECT 1 FROM alert WHERE sender = ? AND kind = 'protect'").get(SCAMMER));

// 4. Unknown sender, no risk signals → gentle card to Asha only.
n = T.sent.length;
await kin.onUnknownToAsha(turn(STRANGER, "Hello, this is Margaret from the library book club."));
check("P2 gentle card to Asha", T.sent.slice(n).some((s) => s.kind === "card" && s.to === ASHA));

// 5. Never anything to an unknown sender, across the whole run (including her taps on those cards).
const ic = lastCard("info");
if (ic) await kin.onCardAction(ic.row.id, "ask_caregiver", {});
if (pc) await kin.onCardAction(pc.row.id, "callme", pc.data.buttons[0]?.payload ?? {});
check("never replies to the unknown senders", !T.sent.some((s) => s.to === SCAMMER || s.to === STRANGER));
check("every send goes to Asha or enrolled family", T.sent.every((s) => s.to === ASHA || !!personByHandle(s.to)), JSON.stringify([...new Set(T.sent.map((s) => s.to))]));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
