import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
const app = await Spectrum({ projectId: process.env.PROJECT_ID!, projectSecret: process.env.PROJECT_SECRET!, providers: [imessage.config()] });
const im = imessage(app);
const h = process.env.PROBE_HANDLE!;
try { const dm = await im.space.create(await im.user(h)); const m = await dm.send("Kin test ping to your iCloud address"); console.log("icloud OK id=", m?.id); }
catch (e: any) { console.log("icloud FAIL", String(e?.message ?? e).split("\n")[0]); }
process.exit(0);
