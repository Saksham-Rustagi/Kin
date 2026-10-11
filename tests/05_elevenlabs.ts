// TEST 5: ElevenLabs conversation token + eleven_v4 TTS -> m4a
import { writeFileSync, mkdirSync } from "fs";
const KEY = process.env.ELEVENLABS_API_KEY!, AGENT = process.env.ELEVENLABS_AGENT_ID!;
const H = { "xi-api-key": KEY };
const tok = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${AGENT}`, { headers: H });
const tj: any = await tok.json();
console.log("token status=", tok.status, "token present=", !!tj.token, "len=", tj.token?.length ?? 0, tok.ok ? "" : JSON.stringify(tj).slice(0, 300));
const ag = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT}`, { headers: H });
const aj: any = await ag.json();
const voiceId = process.env.ELEVENLABS_VOICE_ID || aj?.conversation_config?.tts?.voice_id;
console.log("agent status=", ag.status, "name=", aj?.name, "tts model=", aj?.conversation_config?.tts?.model_id, "voice=", voiceId);
const t0 = Date.now();
const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
  method: "POST", headers: { ...H, "content-type": "application/json", accept: "audio/mpeg" },
  body: JSON.stringify({ text: "[warmly] Grandma, this message is from Nicole, your granddaughter. She says she can't wait to see you Sunday.", model_id: "eleven_v4" }) });
const hdr: Record<string,string> = {}; tts.headers.forEach((v,k)=>{ if (/char|request-id|limit|cost/i.test(k)) hdr[k]=v; });
console.log("tts status=", tts.status, "ms=", Date.now() - t0, "headers=", JSON.stringify(hdr));
if (!tts.ok) { console.log(await tts.text()); process.exit(1); }
mkdirSync("data/media", { recursive: true });
const buf = Buffer.from(await tts.arrayBuffer());
writeFileSync("data/media/test_tts.mp3", buf);
console.log("mp3 bytes=", buf.length);
