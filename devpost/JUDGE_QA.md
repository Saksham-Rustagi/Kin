# Kin: likely judge questions

**1. Why not just a contacts app with photos?**
A contacts app only helps if she knows to open it, at the moment she's confused. Kin comes to her: the card arrives with the message and says who it is, *why it matters right now* (one memory line, or "Biscuit is Mike's dog"), and gives her a one-tap reply. The point is helping her *answer*, not just look someone up. It also adds things a contacts app can't: scam protection and reminders that come from family.

**2. Privacy: you're reading a grandmother's messages?**
Only with the family's setup, on the family's own Mac. The database and media stay local, and the dashboard is localhost only. Memories are learned **only from threads with enrolled family** (`person.enrolled` is checked in code). Unknown senders are only checked for scams, and nothing from those threads is kept as a memory. Family can text "what do you know about me?" and "forget that." For the demo we use made-up data, because Gemini's free tier may be used for training. A real deployment would use the paid tier.

**3. What if Gemini is wrong, or down?**
Gemini never decides. It fills a JSON schema, and plain code applies the rules. Memory lines are verified: the id must be one of the candidates, every name must be grounded in that memory, and quiz phrasing is rejected. If any check fails, the card shows just the name and relationship. If Gemini is down (8 s timeout, 1 retry, daily budget, `GEMINI_OFF`), Protect still runs on a regex, and cards still go out with canned replies. The demo never depends on one AI call succeeding.

**4. Group chats?**
Not in v1, on purpose. Photon's Pro shared pool can't join groups, and Kin ignores her group threads. The design (rule G1: speak only when someone addresses her or mentions a plan with her) is ready for Photon's Business plan, where Kin joins the family group as a member.

**5. Why iMessage?**
That's where she already is. Every new app is one more thing a person living with memory loss has to learn, and her family won't switch apps either. iMessage mini-app cards let us give her big buttons, photos and audio *inside* the conversation, with `edit()` updating the same bubble so nothing piles up.

**6. Scale and cost?**
Per message: one Gemini Flash-Lite call that decides the card, plus a small fact-extraction call for longer family messages, and cached TTS that's only made for cards. A family produces tens of messages a day, so the AI cost is cents a month. Memory is a small SQLite graph that fits in a prompt, so there's no vector DB. Each family needs a Kin line (Photon) and, today, a Mac. A hosted version is next.

**7. Consent: does Gammy agree to this?**
She has to. The research is clear that her consent comes first, and that Kin should add to human contact rather than replace it (S31, S32). The product design starts with Kin asking her "Is that okay?" before anything happens. In this hackathon build the family and her consent are pre-seeded, and the in-chat consent flow is on our "next" list. Every send as her needs her tap or her spoken yes.

**8. False positives in Protect?**
A false positive costs one calm card and one text to Nicole, and nothing is blocked or deleted, because her original message is untouched. Nicole replies SAFE, and the same card updates to "Nicole says this is okay." If the sender claimed to be family, that number is added to that person. A false negative can cost thousands, so we lean toward caution, but only for **unknown** senders. Enrolled family never trigger Protect.

**9. How do you avoid being condescending?**
The wording rules come from dementia guidance (S14, S10, S11, S16): statements, never quizzes ("Nicole · your granddaughter", never "Do you know who this is?"); no "remember when…?" (blocked in code); a warm adult tone; no baby talk; no "you almost got scammed". Reminders are in the family's own words and credited to them. Kin stays quiet for "ok" and 👍, and it never reports her activity.

**10. Why does it need a Mac?**
Reading her real threads and sending a reply *as her* needs a device signed into her Apple ID. Spectrum's local provider uses the Mac's Messages database and AppleScript to do that. Kin's own line (the cloud provider) handles the cards. Many families already have an old Mac; the hosted version would remove that need.

**11. What's real and what's mocked in the demo?**
Real: the iMessages on three devices, Kin's Photon line, the cards and in-place `edit()` updates, replies sent from Gammy's account, caregiver alerts, Gemini calls, ElevenLabs audio, and the Talk to Kin voice agent. Demo settings: the family and memories are made up and pre-seeded; the reminder clock is fast (minutes become seconds); and the family's phone numbers were registered with Photon ahead of time (the Pro shared pool requires it). Phone calls are not built; Talk to Kin happens in the card instead.

**12. Business model?**
A family subscription (around the cost of one streaming service) paid by the adult children, who are the ones looking for peace of mind. Later: partnerships with memory-care programs, home-care agencies and banks' elder-fraud teams. With 13M unpaid caregivers in the US (S1) and $7.7B in reported elder fraud losses in 2025 (S3), both the caregiving and the fraud side have real budgets.
