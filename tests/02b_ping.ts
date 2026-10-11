import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
const app = await Spectrum({ projectId: process.env.PROJECT_ID!, projectSecret: process.env.PROJECT_SECRET!, providers: [imessage.config()] });
const im = imessage(app);
for (const [label, h] of [["GRANDMA_HANDLE(email)", process.env.GRANDMA_HANDLE!], ["PRIYA_HANDLE(phone)", process.env.PRIYA_HANDLE!]]) {
  try { const dm = await im.space.create(await im.user(h)); const m = await dm.send(`Kin test ping to ${label.split("(")[0]}`); console.log(label, "OK id=", m?.id); }
  catch (e: any) { console.log(label, "FAIL", String(e?.message ?? e).split("\n")[0]); }
}
process.exit(0);
