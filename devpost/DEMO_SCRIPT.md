# Kin: demo video script (2:45)

**Devices**
- **Asha:** Saksham's iPhone. It shows the Kin thread with cards and her real threads.
- **Priya:** Nicole's iPhone (caregiver; texts Asha and texts Kin).
- **Scammer:** the iPad (an unknown sender).
- **Mac:** runs Kin and shows the dashboard at `localhost:3000/dash` ("Kin's thinking" log on the left, memory map on the right).

**Shots**
- **PHONE** = a close-up of Asha's iPhone, held steady and lit, with the card readable.
- **PRIYA** = a close-up of Nicole's iPhone.
- **DASH** = a screen recording of the Mac.
- **SPLIT** = phone on the left, dashboard on the right.

**Pre-flight**
- `bun src/seed.ts` resets the made-up family. Priya's last contact is 12 days ago, so R1 fires.
- `DEMO_FAST_CLOCK=1` and a short `DEMO_REMINDER_SEC` are set.
- The tunnel is up and `scripts/sync_agent.ts` has run.
- The iPad's handle is in `TEST_SENDERS`.
- Talk to Kin mic permission has been granted once.
- Do Not Disturb is off on Priya's phone.
- Clear old cards from the Kin thread.

---

| Time | Shot | On screen (must be visible) | Voiceover |
|---|---|---|---|
| **0:00–0:12** | PHONE, slow push-in | Asha's Messages list: a thread from "Priya", and the pinned "Kin" thread | "This is Asha. She's 78 and living with memory loss. She still texts, but some days she can't place who's writing, so she stops replying." |
| 0:12–0:18 | Title card (Frutiger Aero gradient) | **Kin** · "Know who's texting. Stay safe. Hear from family." | "Kin is a helper that lives in her iMessage. Her family doesn't change a thing." |

### Beat 1: Recognize (0:18–1:00)

| Time | Shot | On screen | Voiceover |
|---|---|---|---|
| 0:18–0:24 | PRIYA | Priya types to Nani: *"Hi Nani! Can I come over Sunday? I'll bring mangoes 🥭"* and sends it | "Priya texts her grandmother, like always." |
| 0:24–0:34 | SPLIT | A card bubble arrives in Asha's Kin thread. DASH log shows `Priya → Asha · R1 12 days · R5 question · M m_01 · card`. Priya's bubble glows on the memory map | "A few seconds later a card lands in Kin's thread. The dashboard shows why: Priya hasn't texted in 12 days, and she's asking a question." |
| 0:34–0:44 | PHONE | Card opened: Priya's photo, **"Priya · your granddaughter"**, the memory line **"She visited two weeks ago with mangoes"**, and the quoted message | "Who she is, as a statement, never a quiz. One memory line, picked by Gemini and **checked by code** against the family's memories. If it can't be verified, it isn't shown." |
| 0:44–0:52 | PHONE then PRIYA | Asha taps a reply (e.g. **"Yes, come Sunday! ❤️"**). The card flips to **"Sent to Priya ✓"**. Cut to Priya's phone: the reply arrives **from Nani** in their real thread | "One tap, and the reply goes out as Asha, in Priya's real thread. Nothing is ever sent without her tap." |
| 0:52–1:00 | PHONE (sound on) | Asha taps **🔊 Listen**. The audio plays inside the card while the text stays on screen | *(let ~4 s of the ElevenLabs voice play: "Asha, this message is from Priya, your granddaughter…")* "Listen reads it aloud, right in the card." |

### Beat 2: Protect (1:00–1:40)

| Time | Shot | On screen | Voiceover |
|---|---|---|---|
| 1:00–1:07 | iPad close-up | The scammer types to Asha: *"Grandma it's Priya, I lost my phone. I need $500 in gift cards, please don't tell mom"* | "Now a text from a number Asha doesn't know." |
| 1:07–1:18 | SPLIT | A **calm red** card arrives: **"Someone I don't know · says it's Priya"**, *"This says it's Priya, but it's not Priya's number. I'm checking with Priya."*. DASH shows `P1 gift cards · P1 money · P1 secrecy · P4 claims to be Priya → protect` | "Kin holds it back with a calm warning. No alarms, no blame. Links are never tappable, and Kin never replies to the sender." |
| 1:18–1:28 | PRIYA | Priya's phone **buzzes**: *"🛡️ Someone claiming to be YOU texted Nani… Reply SAFE if you know them, or SCAM to block them."* Priya types **SCAM** | "Priya's phone buzzes, because the message used her name. She answers with one word." |
| 1:28–1:40 | PHONE | The **same** red card updates: **"Priya checked this message for you."** / **"You don't need to do anything 💙"** | "The same card updates in place. If that number texts again, Asha gets a quiet warning, and Priya isn't bothered." |

### Beat 3: Remind (1:40–2:10)

| Time | Shot | On screen | Voiceover |
|---|---|---|---|
| 1:40–1:48 | PRIYA | Priya texts **Kin**: *"Remind Nani to take her 2pm pill every day"*. Kin replies *"Got it: daily at 2:00 PM, 'take your 2pm pill 💊.' I'll let you know when she's done it."* | "Reminders come from family, in their own words." |
| 1:48–1:58 | PHONE | A green card: Priya's photo, **"Priya asked me to remind you"**, **"Take your 2pm pill 💊"**, with **✅ Done** and **⏰ In 10 minutes** | "It isn't an alarm. It's a message from someone she loves." *(demo clock: the card arrives in seconds)* |
| 1:58–2:10 | PHONE then PRIYA | Asha taps **✅ Done**. The card turns to **"Done at 2:04 ✅ Priya knows."** Priya's phone: **"Nani did it: 'take your 2pm pill 💊' ✅"** | "One tap, and Priya knows. If Asha doesn't answer, Kin nudges once in the same card, then tells Priya. Kin never reports anything else about her day." |

### Bonus (2:10–2:32)

| Time | Shot | On screen | Voiceover |
|---|---|---|---|
| 2:10–2:24 | PHONE (sound on) | A **fresh** card (pre-roll: Priya texts *"Should I bring chai too?"*; the Beat 1 card is already replied, so it won't send twice). Asha taps **🎙️ Talk to Kin**. Kin: *"Hi Asha, it's Kin, the helper your family set up…"* → reads the message → *"I'll send Priya: 'Yes please!' Shall I send it?"* → Asha: **"Yes."** → the card shows **"Sent to Priya ✓"** | "Or she can just talk. This is an ElevenLabs voice agent running inside the iMessage card. It reads back the reply and sends only after she says yes, and our server re-checks every action." |
| 2:24–2:32 | DASH | Priya texts Kin a photo captioned *"Me and Nani making sweets at Diwali"*. A new **photo bubble pops onto the memory map** and links to Priya | "Family can add memories by text or photo. Gemini reads the photo, but names come only from the caption, never from faces." |

### Close (2:32–2:45)

| Time | Shot | On screen | Voiceover |
|---|---|---|---|
| 2:32–2:40 | Title card | **Kin never:** edits her messages · sends as her without her yes · touches money or codes · replies to strangers · pretends to be family · invents a memory · gives medical advice · reports her day | "Kin has a never list, and every rule is enforced in code." |
| 2:40–2:45 | PHONE, Asha's thread list | The Kin logo | "Nobody changed how they text her. Kin just helps her answer." |

---

**If something fails live:** if a card is slow, keep talking over the dashboard log (it shows the decision before the card lands). If Gemini fails, the rules-only fallback still sends the card with canned replies, and the protect check is regex-based. Keep the recorded take on the laptop as a backup.
