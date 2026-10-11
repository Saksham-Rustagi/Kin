// TEST 2: can Kin's Photon cloud line reach Grandma's iPad, show an app card, and update it in place?
import { Spectrum, app as appCard, edit } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const { PROJECT_ID, PROJECT_SECRET, GRANDMA_HANDLE } = process.env;
if (!PROJECT_ID || !PROJECT_SECRET || !GRANDMA_HANDLE) throw new Error("Fill PROJECT_ID, PROJECT_SECRET, GRANDMA_HANDLE in .env");

const app = await Spectrum({ projectId: PROJECT_ID, projectSecret: PROJECT_SECRET, providers: [imessage.config()] });
const im = imessage(app);
const grandma = await im.user(GRANDMA_HANDLE);
console.log("resolved user:", grandma);
const dm = await im.space.create(grandma);
await dm.send("Hi! This is a Kin test message.");
console.log("1) sent text");
const card = await dm.send(appCard("https://photon.codes/", { live: true }));
console.log("2) sent app card:", card?.id);
await new Promise((r) => setTimeout(r, 10000));
await dm.send(edit(appCard("https://photon.codes/docs", { live: true }), card));
console.log("3) edited the card in place (check the iPad: same bubble should change)");
console.log("Now listening 2 min for replies / taps / voice notes to Kin...");
const stopAt = Date.now() + 120000;
for await (const [space, message] of app.messages) {
  const c: any = message.content;
  console.log(`[${message.platform}] from=${message.sender?.id} type=${c.type}`, c.type === "text" ? c.text : (c.emoji ?? c.mimeType ?? ""));
  if (Date.now() > stopAt) break;
}
process.exit(0);
