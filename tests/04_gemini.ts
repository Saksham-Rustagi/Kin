// TEST 4: Gemini structured JSON (SDK + REST) and image (HEIC) input under Bun.
import { GoogleGenAI, Type } from "@google/genai";
import { readFileSync } from "fs";
const KEY = process.env.GEMINI_API_KEY!;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const schema = { type: Type.OBJECT, properties: { isScam: { type: Type.BOOLEAN }, score: { type: Type.INTEGER }, summary: { type: Type.STRING } }, required: ["isScam", "score", "summary"] };
const prompt = "Message to a grandmother from an unknown number: 'Grandma it's me, I lost my phone, please send $500 in gift cards, don't tell mom'. Assess it.";

async function sdk() {
  const ai = new GoogleGenAI({ apiKey: KEY });
  const t0 = Date.now();
  const r = await ai.models.generateContent({ model: MODEL, contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
  console.log("SDK text ms=", Date.now() - t0, "parsed=", JSON.parse(r.text ?? "null"));
  const img = readFileSync("/Library/User Pictures/Animals/Parrot.heic");
  const t1 = Date.now();
  const r2 = await ai.models.generateContent({ model: MODEL, contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/heic", data: img.toString("base64") } }, { text: "Caption this photo for an elderly reader." }] }],
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { caption: { type: Type.STRING } }, required: ["caption"] } } });
  console.log("SDK HEIC ms=", Date.now() - t1, "parsed=", JSON.parse(r2.text ?? "null"), "usage=", JSON.stringify(r2.usageMetadata));
}
async function rest() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { isScam: { type: "BOOLEAN" }, score: { type: "INTEGER" } }, required: ["isScam", "score"] } } }) });
  const hdrs: Record<string, string> = {}; res.headers.forEach((v, k) => { if (/rate|limit|quota|retry/i.test(k)) hdrs[k] = v; });
  const j: any = await res.json();
  console.log("REST status=", res.status, "rate headers=", JSON.stringify(hdrs));
  console.log("REST parsed=", res.ok ? JSON.parse(j.candidates[0].content.parts[0].text) : JSON.stringify(j).slice(0, 400));
}
try { await sdk(); } catch (e: any) { console.log("SDK FAIL:", e?.status ?? "", String(e?.message ?? e).slice(0, 500)); }
try { await rest(); } catch (e: any) { console.log("REST FAIL:", String(e?.message ?? e).slice(0, 500)); }
