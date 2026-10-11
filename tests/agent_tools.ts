// Talk to Kin webhook tools with a FAKE transport (no phones), real Gemini. Run: ~/.bun/bin/bun tests/agent_tools.ts
process.env.KIN_DB = "data/agent_test.db";
process.env.KIN_NO_PREFETCH = "1";
process.env.DEMO_FAST_CLOCK = "1";
process.env.DEMO_REMINDER_SEC = "1";
process.env.CAREGIVER_HANDLE = "+15555550100";
process.env.GRANDMA_HANDLE = "+15555550199";
process.env.PUBLIC_BASE_URL = "https://example.test";
process.env.ELEVENLABS_TOOL_SECRET = "test-tool-secret";
const { rmSync } = await import("fs");
for (const f of ["data/agent_test.db", "data/agent_test.db-wal", "data/agent_test.db-shm"]) try { rmSync(f); } catch {}

const { seed } = await import("../src/seed");
const { createFakeTransport } = await import("../src/transport");
const { setCardTransport, getCard } = await import("../src/cards/service");
const kin = await import("../src/kin");
const { setReminderTransport, createReminder, startReminderLoop } = await import("../src/reminders");
const { setVoiceTransport } = await import("../src/voice");
const { personByHandle, db } = await import("../src/db");
const { handleTool, talkVariables, onTalkEnded } = await import("../src/tools");

seed();
const T = createFakeTransport();
setCardTransport(T); kin.setTransport(T); setReminderTransport(T); setVoiceTransport(T);
startReminderLoop();

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, info = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name} ${info}`); };
const turn = (from: string, text: string) => ({ from, chatId: `iMessage;-;${from}`, isGroup: false, texts: [text], ids: [crypto.randomUUID()], at: new Date(), attachments: [] });
const S = "test-tool-secret";
const priya = personByHandle("+15555550100")!;
const asAsha = () => T.sent.filter((s) => s.kind === "as_asha").length;

// Context card from Nicole
await kin.onFamilyToAsha(priya, turn("+15555550100", "Hi Gammy! Coming over Sunday with apple pie again 🥧 Are you free for lunch?"));
const c1 = db.query("SELECT * FROM card WHERE type='context' ORDER BY created_at DESC LIMIT 1").get() as any;
check("context card created", !!c1);
const vars = talkVariables(c1.id);
console.log("   vars:", JSON.stringify(vars));
check("session vars include card_id + opening", vars.card_id === c1.id && vars.reason === "message" && !!vars.opening);

// Auth
check("bad secret → 401", (await handleTool("send_reply", "wrong", { card_id: c1.id, text: "Yes!" })).status === 401);
check("no secret → 401", (await handleTool("send_reply", null, { card_id: c1.id, text: "Yes!" })).status === 401);
check("nothing sent on bad secret", asAsha() === 0);

// Guards
check("money words rejected", !(await handleTool("send_reply", S, { card_id: c1.id, text: "Send me $50 gift card" })).body.ok && asAsha() === 0);
check("long text rejected", !(await handleTool("send_reply", S, { card_id: c1.id, text: "x".repeat(121) })).body.ok && asAsha() === 0);
check("mark_reminder_done on context card rejected", !(await handleTool("mark_reminder_done", S, { card_id: c1.id })).body.ok);

// send_reply
let n = T.sent.length;
const r1 = await handleTool("send_reply", S, { card_id: c1.id, text: "Yes, see you Sunday!" });
console.log("   send_reply →", JSON.stringify(r1.body));
check("send_reply ok", r1.status === 200 && r1.body.ok && /Sent to Nicole/.test(r1.body.message));
check("exactly one as_asha to Nicole", asAsha() === 1 && T.sent.slice(n).some((s) => s.kind === "as_asha" && s.to === "+15555550100"));
check("card → replied", getCard(c1.id)!.row.state === "replied");
const r2 = await handleTool("send_reply", S, { card_id: c1.id, text: "Yes, see you Sunday!" });
check("second call idempotent", r2.body.ok && asAsha() === 1, r2.body.message);

// talk end must not overwrite "Sent to Nicole ✓"
const before = getCard(c1.id)!.data.status?.text;
await onTalkEnded(c1.id);
check("talk end keeps existing status", getCard(c1.id)!.data.status?.text === before, before ?? "");

// Reminder card → mark_reminder_done
await createReminder(priya, { text: "take your 2pm pill", due_local: null, daily: false, in_minutes: 0 });
let rem: any = null;
for (let i = 0; i < 40 && !rem?.card_id; i++) {
  await new Promise((r) => setTimeout(r, 250));
  rem = db.query("SELECT * FROM reminder ORDER BY created_at DESC LIMIT 1").get();
}
check("reminder card delivered", !!rem?.card_id);
if (rem?.card_id) {
  check("reminder vars", talkVariables(rem.card_id).reason === "reminder" && /pill/.test(talkVariables(rem.card_id).reminder_text));
  const d = await handleTool("mark_reminder_done", S, { card_id: rem.card_id });
  console.log("   mark_reminder_done →", JSON.stringify(d.body));
  check("mark_reminder_done ok", d.body.ok && (db.query("SELECT status FROM reminder WHERE id=?").get(rem.id) as any).status === "done");
  check("reminder card → done", getCard(rem.card_id)!.row.state === "done");
}

// Talk end on a fresh card adds the note
await kin.onFamilyToAsha(priya, turn("+15555550100", "Mike got a new job at the library! He starts Monday."));
const c2 = db.query("SELECT * FROM card WHERE type='context' ORDER BY created_at DESC LIMIT 1").get() as any;
if (c2 && c2.id !== c1.id) {
  await onTalkEnded(c2.id);
  check("talk end note added", /talked with Kin/.test(getCard(c2.id)!.data.status?.text ?? ""));
  const a = await handleTool("ask_family_to_call", S, { card_id: c2.id });
  check("ask_family_to_call ok + text to Nicole", a.body.ok && T.sent.some((s) => s.kind === "text" && s.to === "+15555550100" && /call her/.test(s.text ?? "")), a.body.message);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
