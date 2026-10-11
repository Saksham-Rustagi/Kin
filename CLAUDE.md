# Kin — project context for Claude Code

Kin is an iMessage agent (HackNC 2026, Photon AI Agent track) for **Asha, 78, living with memory loss**. Her family texts her normally. Kin reads her real threads on her Mac (Photon Spectrum **local** provider, `@spectrum-ts/imessage-local`) and sends her live mini-app **cards** from its own Photon line (Spectrum **cloud** provider, `app()` + `edit()`). Jobs: **Recognize** (who is texting + one memory line + ≤3 one-tap replies sent *as her*), **Protect** (scam texts → calm red card + caregiver alert, never reply to the sender), **Remind** (family reminders with ✅ + escalation). Voice: "Listen" (ElevenLabs `eleven_v4`, plays in the card) and "Talk to Kin" (ElevenLabs Conversational AI over WebRTC inside the card). AI: Gemini `gemini-3.5-flash-lite` returns JSON; **plain code decides every action**.

## Run / test (macOS only; Bun is NOT on PATH)
- Type-check: `node_modules/.bin/tsc -p tsconfig.json` (must exit 0)
- Replay test (fake transport, real Gemini): `~/.bun/bin/bun tests/replay.ts` (must stay all-PASS; extend it for new behaviour)
- Card previews at the real webview size: `~/.bun/bin/bun tests/preview_cards.ts` → `data/preview/grid.html`
- The live bot (`src/main.ts`) is started/stopped by the orchestrator (Hermes). **Do not start, stop or kill `src/main.ts`, `cloudflared`, or any process.** Do not run anything that sends real iMessages.
- Do not `git commit`/`git push`; the orchestrator reviews and commits.

## Layout
- `src/main.ts` bootstrap · `src/transport.ts` Spectrum (cloud+local) + fake transport · `src/router.ts` dedupe/echo/allowlist/debounce/dispatch
- `src/kin.ts` the brain: `onFamilyToAsha`, `onUnknownToAsha`, `onCardAction`, `onAshaToKin`, `onFamilyToKin`
- `src/decide.ts` rules R1–R7, Q1–Q3, P1–P4 · `src/memory.ts` memory graph (candidates → Gemini pick → code verify) · `src/ai/gemini.ts` REST + schemas + budget
- `src/cards/service.ts` card rows, HMAC tokens, send/edit · `src/cards/render.ts` card HTML (280×300 webview!) · `src/cards/talk.ts` Talk-to-Kin page
- `src/reminders.ts` scheduler + escalation · `src/voice.ts` ElevenLabs TTS · `src/server.ts` Bun.serve routes · `src/dash/page.ts` dashboard · `src/db.ts` bun:sqlite schema
- Docs/specs: `docs/03_kin_product/Kin_Product_Spec.md`, `docs/03_kin_product/Kin_Tech_Spec.md`, `docs/04_research/photon_spectrum/KIN_PHOTON_REFERENCE.md`

## Hard rules (the "never" list — enforce in code)
1. Never edit/hide a real message. 2. Never send as Asha without her explicit tap (or a spoken "yes" after a read-back in Talk to Kin). 3. Never send money, codes or personal info; never reply to an unknown sender. 4. Never pretend to be family. 5. Never invent a memory (verify ids/names in code). 6. No medical advice. 7. Never report her general activity. 8. Never learn from threads with people who aren't enrolled family. 9. No chit-chat.
- Wording: plain, warm, adult; statements not quizzes (never "do you remember…?"); "person living with memory loss".
- **Secrets:** never print or read `.env` values; use `process.env`. Gemini free tier → made-up demo data only.
- **Testing allowlist:** `TEST_SENDERS` must keep gating the local stream (it is Saksham's real Apple ID).

## Platform facts (verified on devices)
- Photon Pro shared pool: Kin can only message **phone numbers** registered as project users that have texted their Kin line first.
- Card webview: iPhone, 280×300 opened, 149×58 in the bubble. Taps are NOT Spectrum events: the card page POSTs `/card/:id/act`. `edit()` updates the same bubble.
- Local provider only sees incoming rows; sends as Asha via AppleScript with `space.send()` only.
- `browser`-side code in cards must be plain ES5-ish JS inline (no build step).
