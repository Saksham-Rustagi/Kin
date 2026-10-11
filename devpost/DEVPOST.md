# Kin: Who's texting Grandma?

**Kin helps a grandmother living with memory loss know who's texting her, stay safe from scams, and get reminders from the people she loves, all inside iMessage and without anyone changing how they text her.**

## Inspiration

Our persona is Grandma, 78, who still texts. Some days she can't place who "Mike" is, so she doesn't reply, and then she worries she's upset someone. Other days a stranger texts "Grandma it's me, I need gift cards," and she wants to help.

7.4M Americans 65+ are living with Alzheimer's, and 59% of their 13M unpaid caregivers report high stress (S1). Older adults reported $7.7B in fraud losses in 2025 (S3), and scams that start with a text grew fivefold since 2020 (S5). Most dementia tech asks the person to learn a new app. We wanted something that lives in the app she already opens every day.

## What it does

Kin has its own iMessage contact. The family keeps texting Grandma as before. Kin reads her real threads on the family Mac and sends her a **live card**:

- **Recognize:** "Nicole · your granddaughter," **one verified memory line** ("She visited two weeks ago with apple pie"), the quoted message, and up to three one-tap replies. A tap sends the reply **as Grandma** in Nicole's real thread, and the card updates to "Sent to Nicole ✓". Names she might not place get explained: "Biscuit is Mike's dog 🐶".
- **Protect:** an unknown number asking for gift cards, or claiming to be family, gets a calm red card ("Please don't send money or codes. I've let Nicole know."). Links can't be tapped. Nicole is alerted and replies SAFE or SCAM, and the card updates in place. Kin never replies to the sender.
- **Remind:** Nicole texts Kin "remind Grandma to take her 2pm pill." At 2pm Grandma gets a green card *from Nicole*. ✅ (or a 👍 tapback) sends Nicole "Grandma did it ✅". If there's no answer, Kin nudges once, then tells Nicole.
- **Listen and Talk to Kin:** 🔊 reads the card aloud with the text still on screen. 🎙️ opens a voice conversation **inside the iMessage card** that reads a reply back and sends it only after she says "yes."
- **Voice notes from Grandma:** she holds the mic in Kin's thread and says "Tell Nicole I can't wait to see her." Kin turns it into a "Send to Nicole?" card, and **nothing is sent until she taps ✅ Send**.
- **👍 I know Nicole:** Grandma can tell Kin she recognizes someone, and Kin steps back for them. It still steps in for questions, names she may not place, or stressful messages.
- **☀️ Today card:** at 8 AM, a calm card with today's reminders and upcoming visits, built by code from what the family set.
- **Family memories:** "Remember: Mike's dog is Biscuit," or a captioned photo, pops onto the dashboard's memory map.

## How we built it

One Bun process runs **both Photon Spectrum providers**. The local provider reads Grandma's `chat.db` and sends as her, and the cloud provider is Kin's line, which sends `app()` cards and updates them with `edit()`. Card taps POST to our Bun server through a tunnel, using HMAC-signed URLs.

**Gemini 3.5 Flash-Lite** gets one structured-JSON call per family message: triage, memory pick, replies, and a photo caption. Gemini also does vision for photo memories and audio for Grandma's voice notes. **Plain code decides every action:** rules R1–R7, Q1–Q3 and P1–P4 in `decide.ts`, and `verifyMemoryLine()` drops any memory that isn't a real candidate or names someone it shouldn't. If Gemini is down, the rules still produce cards with fixed replies and no memory line (never invented), and a regex still catches scams. Replay tests with a fake transport cover the whole pipeline: 34 checks with real Gemini, 19 for the Talk to Kin tools, and 13 with Gemini switched off.

**ElevenLabs** `eleven_v4` makes the in-card Listen audio. Conversational AI runs Talk to Kin over WebRTC in the card webview, with three webhook tools that our server re-checks before acting.

## Challenges we ran into

- `imessage-kit` 3.0.0 crashed on macOS 15's `chat.db` (no `ck_chat_id`), so we patched it. Its WAL watcher **missed a real message**, so we added a poll fallback and resume-from-ROWID.
- Photon Pro's shared pool only messages **phone numbers that texted the line first**, so we rebuilt our device plan at 11 PM.
- The card webview is **280×300**, so we redesigned the cards to show one idea per screen.
- iOS audio needed HTTP range requests, and the mic prompt could hang in the webview, so we added a timeout and an "Open in Safari" fallback.

## Accomplishments that we're proud of

- A voice agent **inside an iMessage bubble** that can reply as her, but only after a spoken yes, with code checking every tool call.
- Memory that **can't hallucinate onto her screen**: every line is verified or dropped.
- It works on real devices with real threads, real replies as Grandma, and real caregiver alerts. Replay tests cover the whole pipeline.

## What we learned

The hard part was restraint. Most of Kin's rules decide when to stay quiet ("ok" and 👍 get no card) and which words never to use ("do you remember…?" is blocked). Dementia guidance (S14, S10, S30) shaped the UI more than any framework did. iMessage mini-apps turned out to be a real UI surface.

## What's next

- On Photon's Business plan, Kin **joins the family group chat**.
- A hosted version, so families don't need a Mac.
- Real phone calls through Photon SIP, using the same agent and tools.
- A consent conversation with Grandma at setup, and co-design with people living with dementia and their caregivers (S32).

## Built with

Bun, TypeScript, Photon Spectrum (spectrum-ts, @spectrum-ts/imessage-local, iMessage mini-apps), iMessage, Gemini 3.5 Flash-Lite, ElevenLabs Eleven v4, ElevenLabs Conversational AI, WebRTC, SQLite, Cloudflare Tunnel, AppleScript, HTML/CSS

## Prize tracks

- **Photon:** the chat is the product. Kin runs both providers, sends live `app()` cards updated with `edit()`, uses tapbacks and voice notes, texts first, and sends as Grandma only on her tap.
- **Gemini:** one structured-JSON call per message, plus vision and audio, all verified by code, with a rules-only fallback.
- **ElevenLabs:** `eleven_v4` Listen in the card, and Conversational AI over WebRTC *inside iMessage* with tools gated by a spoken yes.
- **Frutiger Aero:** glossy sky-and-water cards, bubble buttons, and a bubbly memory map.
- **General:** a real problem, built safety-first, shown working live.
