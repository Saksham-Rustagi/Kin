# Kin: Who's texting Nani?

**Kin helps a grandmother living with memory loss know who's texting her, stay safe from scams, and get reminders from the people she loves, all inside iMessage and without anyone changing how they text her.**

## Inspiration

Our persona is Asha, 78, who still texts on her phone. Some days she can't place who "Raj" is, so she doesn't reply, and then she worries that she's upset someone. On other days, a stranger texts "Grandma it's me, I lost my phone, I need gift cards," and she wants to help.

This is very common. 7.4M Americans 65+ are living with Alzheimer's, and 13M unpaid caregivers support them; 59% of those caregivers report high stress (S1). Older adults reported $7.7B in fraud losses to the FBI in 2025 (S3), and scams that start with a text grew fivefold since 2020 (S5). Most "dementia tech" asks the person to learn a new app. We wanted something that works inside the app she already opens every day, and that asks nothing new of anyone.

## What it does

Kin is a gentle helper with its own iMessage contact. The family keeps texting Asha exactly as before. Kin reads her real threads on the family Mac and sends her a **live card** in the Kin thread.

- **Recognize.** When Priya texts, Asha gets a card that says "Priya · your granddaughter," **one memory line** ("She visited two weeks ago with mangoes"), the quoted message, and up to three one-tap replies. A tap sends the reply **as Asha**, in Priya's real thread, and the card updates to "Sent to Priya ✓". If the message mentions someone she might not place, the card explains it from the family graph: "Biscuit is Raj's dog 🐶".
- **Protect.** An unknown number asking for gift cards, or claiming to be family from a new number, gets a calm red card: "Please don't send money or codes. I've let Priya know." Links are shown as untappable text. Priya gets an alert and replies SAFE or SCAM, and Asha's card updates in place. Kin never replies to the sender.
- **Remind.** Priya texts Kin "remind Nani to take her 2pm pill." At 2pm Asha gets a green card *from Priya* with ✅ Done. A tap, or a 👍 tapback, sends Priya "Nani did it ✅". If there's no answer, Kin nudges once in the same card, then tells Priya.
- **Listen and Talk to Kin.** 🔊 reads the card aloud in a warm ElevenLabs voice while the text stays on screen. 🎙️ opens a real voice conversation **inside the iMessage card**: Kin tells her who wrote, offers a reply, reads it back, and sends it only after she says "yes."
- **Memories from the family.** Family can text Kin "Remember: Raj's dog is Biscuit" or send a captioned photo. Each one pops onto the memory map on the dashboard and can show up on her next card.

## How we built it

Kin is one Bun process running **both Photon Spectrum providers**. The local provider reads Asha's `chat.db` and sends as her, and the cloud provider is Kin's own line. That line sends `app()` mini-app cards and updates them with `edit()`. Taps on a card POST to our Bun server through an HTTPS tunnel, using HMAC-signed URLs.

**Gemini 3.5 Flash-Lite** gets one structured-JSON call per family message. That call triages the message, picks a memory, writes the replies, and captions any photo. Gemini also handles photo memories (vision) and Asha's voice notes (audio). **Plain code makes every decision.** The rules R1–R7, Q1–Q3 and P1–P4 live in `decide.ts`, and `verifyMemoryLine()` rejects any memory id that wasn't a candidate, any name that isn't grounded in the memory, and any quiz phrasing. If Gemini is down, a regex still catches scams and cards still go out with canned replies.

**ElevenLabs** `eleven_v4` makes the Listen audio, which plays inside the card. ElevenLabs Conversational AI runs Talk to Kin over WebRTC in the card webview, with three webhook tools that our server re-checks before acting.

## Challenges we ran into

- `imessage-kit` 3.0.0 crashed on macOS 15's `chat.db` (`ck_chat_id` is missing there), so we patched it. Its WAL watcher also **missed a real message**, so we added a poll fallback and resume-from-ROWID.
- Photon Pro's shared pool can only message **phone numbers that texted the line first**. Emails never worked, so we rebuilt our device plan at 11 PM.
- The card webview is **280×300**. We redesigned the cards to show one idea per screen.
- iOS audio needed HTTP range requests, and the mic prompt could hang inside the webview, so we added a timeout and an "Open in Safari" fallback.

## Accomplishments that we're proud of

- A voice agent running **inside an iMessage bubble** that can send a reply as her, but only after a spoken yes, with code checking every tool call.
- Memory that **can't hallucinate onto her screen**: every line is verified against the family graph or dropped.
- Everything works on real devices: real threads, real replies sent as Asha, real caregiver alerts, and cards that update in place.
- Replay tests for the whole pipeline, plus tests for the voice tools.

## What we learned

The hard part was restraint. Most of Kin's rules decide when to stay quiet (an "ok" or a 👍 gets no card) and which words not to use ("do you remember…?" is banned). Dementia guidance (S14, S10, S30) shaped the UI more than any framework did. We also learned that iMessage mini-apps are a real UI surface, not just links.

## What's next

- On Photon's Business plan, Kin can **join the family group chat** and speak only when someone addresses her.
- A hosted version, so families don't need a Mac.
- Real phone calls through Photon SIP, using the same agent and tools.
- A consent conversation with Asha at setup, and co-design with people living with dementia and their caregivers before any real launch (S32).

## Built with

Bun, TypeScript, Photon Spectrum (spectrum-ts, @spectrum-ts/imessage-local, iMessage mini-apps), iMessage, Gemini 3.5 Flash-Lite, Gemini API, ElevenLabs Eleven v4, ElevenLabs Conversational AI, WebRTC, SQLite (bun:sqlite), Cloudflare Tunnel, AppleScript, macOS afconvert, HTML/CSS

## Prize tracks

- **Photon AI Agent:** the chat is the product. Kin runs both Spectrum providers in one process, sends live `app()` cards updated with `edit()`, uses tapbacks and voice notes, and sends as Asha only on her tap. It's proactive (it texts first) and has one job: help her answer the people she loves.
- **MLH Best Use of Gemini:** one structured-JSON call per message, vision for photo memories, audio for voice notes, all checked by code, with a rules-only fallback.
- **MLH Best Use of ElevenLabs:** `eleven_v4` Listen in the card, and Conversational AI over WebRTC *inside the iMessage card* with webhook tools gated by a spoken yes.
- **Frutiger Aero:** glossy sky-and-water gradients, bubble buttons and glass panels on every card, plus a bubbly memory map on the dashboard.
- **General:** a real problem (memory loss and text scams), built safety-first and shown working live.
