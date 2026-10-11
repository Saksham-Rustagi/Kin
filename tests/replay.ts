// Replay test: the whole pipeline with a FAKE transport (no phones), real Gemini. Run: bun tests/replay.ts
process.env.KIN_DB = "data/replay.db";
process.env.KIN_NO_PREFETCH = "1";
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

// 1. Recognize: Nicole after 12 days, mentions Biscuit (R1 + R3) → context card with memory line + replies
let n = T.sent.length;
await kin.onFamilyToAsha(priya, turn("+15555550100", "Hi Grandma! Coming over Sunday with apple pie again 🥧 Biscuit says hi! Are you free for lunch?"));
const card1 = T.sent.slice(n).find((s) => s.kind === "card");
check("R1/R3 context card sent to Grandma", !!card1 && card1.to === "+15555550199", JSON.stringify(card1?.layout));
const c1 = db.query("SELECT * FROM card ORDER BY created_at DESC LIMIT 1").get() as any;
const d1 = JSON.parse(c1.data);
console.log("   line:", d1.line, "| summary:", d1.summary, "| replies:", d1.buttons.map((b: any) => b.label));
check("memory line present + verified", !!d1.line && !/remember|\?/i.test(d1.line));
check("R3 explains Biscuit", /Biscuit is Mike's dog/.test(d1.summary ?? ""));
const replies1 = d1.buttons.filter((b: any) => b.action === "reply");
check("≤3 replies", replies1.length > 0 && replies1.length <= 3);
const knowBtn = d1.buttons.find((b: any) => b.action === "know");
check("'I know Nicole' button offered", knowBtn?.label === "👍 I know Nicole" && knowBtn.payload?.personId === "priya");
const { renderCardHtml } = await import("../src/cards/service");
const html1 = renderCardHtml(c1.id) ?? "";
const mainHtml = html1.slice(html1.indexOf('id="main"'), html1.indexOf('id="reply"'));
check("know button on the reply screen only", html1.indexOf('data-act="know"') > html1.indexOf('id="reply"') && !mainHtml.includes('data-act="know"'));

// 2. Tap a reply → sent AS Grandma to Nicole, card edited
n = T.sent.length;
const r = await kin.onCardAction(c1.id, "reply", d1.buttons[0].payload);
check("reply tap ok", r.ok);
check("sent as Grandma to Nicole", T.sent.slice(n).some((s) => s.kind === "as_asha" && s.to === "+15555550100"));
check("card edited to replied", T.sent.slice(n).some((s) => s.kind === "edit") && getCard(c1.id)!.row.state === "replied");
const again = await kin.onCardAction(c1.id, "reply", d1.buttons[0].payload);
check("second tap is idempotent (no second send)", again.ok && T.sent.filter((s) => s.kind === "as_asha").length === 1);

// 2b. "I know Nicole" (Q1): suppresses only R1; a question still makes a card
n = T.sent.length;
const k1 = await kin.onCardAction(c1.id, "know", knowBtn?.payload ?? {});
check("know tap ok + toast", k1.ok && k1.toast === "Okay. I'll only step in for Nicole when it helps.", k1.toast);
check("known_by_asha set", personByHandle("+15555550100")!.known_by_asha === 1);
const editsAfterKnow = T.sent.length;
const k2 = await kin.onCardAction(c1.id, "know", knowBtn?.payload ?? {});
check("know is idempotent", k2.ok && T.sent.length === editsAfterKnow);
const twelveDaysAgo = () => db.query("UPDATE person SET last_contact_at = ? WHERE id = 'priya'").run(new Date(Date.now() - 12 * 86400_000).toISOString());
twelveDaysAgo();
n = T.sent.length;
await kin.onFamilyToAsha(personByHandle("+15555550100")!, turn("+15555550100", "Just got back from a long walk this afternoon, the weather was lovely"));
check("Q1 after know: 12-day gap, no mentions → quiet", !T.sent.slice(n).some((s) => s.kind === "card"));
twelveDaysAgo();
n = T.sent.length;
await kin.onFamilyToAsha(personByHandle("+15555550100")!, turn("+15555550100", "What time should I call you tomorrow?"));
check("Q1 after know: a question still makes a card", T.sent.slice(n).some((s) => s.kind === "card" && s.to === "+15555550199"));
const cq = JSON.parse((db.query("SELECT data FROM card WHERE type='context' ORDER BY created_at DESC LIMIT 1").get() as any).data);
check("no know button once she knows them", !cq.buttons.some((b: any) => b.action === "know"));

// 3. Trivial → quiet (Q2)
n = T.sent.length;
await kin.onFamilyToAsha(personByHandle("+15555550100")!, turn("+15555550100", "ok see you soon!"));
check("Q2 trivial stays quiet", T.sent.length === n);

// 4. Protect: unknown claims to be Nicole, asks for gift cards → red card + caregiver alert, never replies to sender
n = T.sent.length;
await kin.onUnknownToAsha(turn("nicole.scam@example.com", "Grandma it's Nicole, I lost my phone. I'm in trouble, please send $500 in gift cards and don't tell mom"));
const prot = T.sent.slice(n);
check("protect card to Grandma", prot.some((s) => s.kind === "card" && s.to === "+15555550199"));
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

// 6. Reminder → card at T+0 (2s) → done → Nicole told
n = T.sent.length;
await kin.onFamilyToKin(priya, "+15555550100", "Remind Grandma to take her 2pm pill every day", crypto.randomUUID());
console.log("   reminder confirmation:", T.sent.slice(n).find((s) => s.kind === "text")?.text);
await wait(4500);
const rem = db.query("SELECT * FROM reminder ORDER BY created_at LIMIT 1").get() as any;
check("reminder card delivered", rem?.status === "due" && !!rem.card_id);
n = T.sent.length;
if (rem?.card_id) await kin.onCardAction(rem.card_id, "done", {});
check("done → Nicole notified", T.sent.slice(n).some((s) => s.kind === "text" && s.to === "+15555550100" && /✅/.test(s.text ?? "")));

// 7. Family → Kin photo memory (Gemini vision; a stock image stands in for a family photo)
const { readFileSync, existsSync } = await import("fs");
n = T.sent.length;
await kin.onFamilyPhotoToKin(priya, "+15555550100", [{ bytes: readFileSync("/Library/User Pictures/Animals/Parrot.heic"), mimeType: "image/heic", name: "IMG_0001.heic" }], "This is Biscuit at the park last Sunday", crypto.randomUUID());
const pm = db.query("SELECT * FROM memory WHERE photo IS NOT NULL ORDER BY created_at DESC LIMIT 1").get() as any;
console.log("   photo memory:", pm?.about, "|", pm?.text, "|", pm?.photo, "|", pm?.happened_on);
check("photo memory saved with photo", !!pm?.photo && pm.about === "biscuit");
check("JPEG written to data/media", !!pm?.photo && pm.photo.endsWith(".jpg") && existsSync(`data/media/${pm.photo}`));
const photoConf = T.sent.slice(n).find((s) => s.kind === "text" && s.to === "+15555550100");
console.log("   photo confirmation:", photoConf?.text);
check("photo confirmation sent to Nicole", !!photoConf?.text);
const { graph } = await import("../src/db");
check("map node for Biscuit has the photo", graph().nodes.some((nd: any) => nd.id === "biscuit" && nd.photo === `/media/${pm?.photo}`));

// 8. Grandma's voice note → "Send to Nicole?" card; nothing sent as her until she taps
const { execFileSync } = await import("child_process");
execFileSync("say", ["-o", "/tmp/kin_voice.aiff", "Tell Nicole I can't wait to see her"]);
execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@16000", "/tmp/kin_voice.aiff", "/tmp/kin_voice.wav"]);
n = T.sent.length;
const asAshaBefore = T.sent.filter((s) => s.kind === "as_asha").length;
await kin.onAshaVoiceToKin(readFileSync("/tmp/kin_voice.wav"), "audio/wav", crypto.randomUUID());
const vc = db.query("SELECT * FROM card WHERE type = 'info' ORDER BY created_at DESC LIMIT 1").get() as any;
const vd = vc ? JSON.parse(vc.data) : null;
console.log("   voice card:", vd?.title, "|", vd?.line);
check("voice → confirmation card to Grandma", !!vd?.meta?.voiceReply && vd.meta.personId === "priya" && T.sent.slice(n).some((s) => s.kind === "card" && s.to === "+15555550199"));
check("nothing sent as Grandma before her tap", T.sent.filter((s) => s.kind === "as_asha").length === asAshaBefore);
if (vc) { await kin.onCardAction(vc.id, "send_voice_reply", vd.buttons[0].payload); await kin.onCardAction(vc.id, "send_voice_reply", vd.buttons[0].payload); }
const voiceSends = T.sent.slice(n).filter((s) => s.kind === "as_asha");
check("tap → exactly one as_asha message to Nicole", voiceSends.length === 1 && voiceSends[0].to === "+15555550100", voiceSends[0]?.text);

// 9. ☀️ Morning Today card: today's reminders + events in the next 7 days, from code only
const tomorrow = new Date(Date.now() + 86400_000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
db.query("INSERT INTO memory (id, about, text, happened_on, added_by, source, created_at) VALUES ('m_visit','raj','Mike is visiting from Austin',?,'priya','family_to_kin',?)").run(tomorrow, new Date().toISOString());
const { sendTodayCard } = await import("../src/today");
n = T.sent.length;
const tc = await sendTodayCard();
const td = getCard(tc.id)!.data;
console.log("   today:", td.title, "|", td.subtitle, "|", td.line, "|", td.summary);
check("Today card sent to Grandma", T.sent.slice(n).some((s) => s.kind === "card" && s.to === "+15555550199") && td.title === "Good morning, Grandma" && td.emoji === "☀️");
check("Today card lists today's reminder", /^\d{1,2}:\d{2} [AP]M · .*\(from Nicole\)/.test(td.line ?? ""), td.line ?? "");
check("Today card lists tomorrow's visit", td.meta.items.includes("Tomorrow · Mike is visiting from Austin") && td.summary === td.meta.items[1] && td.buttons.length === 0 && !!td.readAloud && !!td.talk, JSON.stringify(td.meta.items));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
