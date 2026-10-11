// "Read it to me": ElevenLabs eleven_v4 → m4a (afconvert) → voice message in Kin's thread. Cached per card version.
import { existsSync, writeFileSync } from "fs";
import { config } from "./config";
import { log, decision } from "./events";
import { getCard } from "./cards/service";
import type { Transport } from "./transport";

let T: Transport;
export function setVoiceTransport(t: Transport) { T = t; }

export function scriptFor(cardId: string): string | null {
  const c = getCard(cardId);
  if (!c) return null;
  const d = c.data, a = config.ashaName;
  const strip = (s: string) => s.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, "").replace(/\[\.\]/g, " dot ").trim();
  switch (c.row.type) {
    case "context": {
      const parts = [`[warmly] ${a}, this message is from ${d.title}, your ${d.subtitle?.replace(/^your /, "")}.`];
      if (d.line) parts.push(strip(d.line) + ".");
      if (d.summary) parts.push(strip(d.summary) + ".");
      parts.push(`${d.title} wrote: ${strip(d.quote ?? "")}`);
      return parts.join(" ");
    }
    case "protect":
      return `[calmly] ${a}, a number you don't know sent you a message. ${strip(d.line ?? "")} You don't need to reply.`;
    case "reminder":
      return `[warmly] ${a}, ${d.title} asked me to remind you: ${strip(d.line ?? "")}.`;
    default:
      return `[warmly] ${a}, ${strip(d.title)}. ${strip(d.line ?? "")}`;
  }
}

export async function tts(text: string, outBase: string): Promise<{ file: string; duration: number } | null> {
  const m4a = `${outBase}.m4a`;
  if (existsSync(m4a)) return { file: m4a, duration: await durationOf(m4a) };
  let voiceId = config.elevenVoice;
  if (!voiceId) {
    const a: any = await (await fetch(`https://api.elevenlabs.io/v1/convai/agents/${config.elevenAgent}`, { headers: { "xi-api-key": config.elevenKey } })).json();
    voiceId = a?.conversation_config?.tts?.voice_id;
  }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": config.elevenKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_v4" }), signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) { log.warn(`TTS HTTP ${res.status}`); return null; }
  writeFileSync(`${outBase}.mp3`, Buffer.from(await res.arrayBuffer()));
  const p = Bun.spawnSync(["afconvert", "-f", "m4af", "-d", "aac", `${outBase}.mp3`, m4a]);
  if (p.exitCode !== 0) { log.warn("afconvert failed"); return null; }
  return { file: m4a, duration: await durationOf(m4a) };
}

async function durationOf(file: string): Promise<number> {
  const p = Bun.spawnSync(["afinfo", file]);
  const m = p.stdout.toString().match(/estimated duration:\s*([\d.]+)/);
  return m ? Math.max(1, Math.round(Number(m[1]))) : 5;
}

export async function readAloud(cardId: string) {
  const c = getCard(cardId);
  const script = scriptFor(cardId);
  if (!c || !script) return;
  const t0 = Date.now();
  try {
    const out = await tts(script, `${config.dataDir}/media/tts_${cardId}_v${c.row.version}`);
    if (!out) return;
    await T.sendVoice(config.ashaHandle, out.file, out.duration);
    decision({ from: "Kin", preview: `🔊 read aloud (${out.duration}s)`, rules: ["her tap"], action: "reply", cardId, ms: Date.now() - t0 });
  } catch (e) { log.error("read aloud", e); }
}

export function writeTmp(path: string, data: string) { writeFileSync(path, data); }
