/*
  Renders review stills at given seconds, sharing one bundle and one browser.
    node scripts/stills.mjs out/stills 1.5 6 12.25
  REMOTION_BROWSER can point at an installed Chrome or headless shell.
*/
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const [outDir, ...times] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable: process.env.REMOTION_BROWSER ?? null });
const composition = await selectComposition({ serveUrl, id: "MedvilleAd", puppeteerInstance: browser, inputProps: { captions: true } });
for (const s of times.map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  await renderStill({ serveUrl, composition, frame, output: path.join(outDir, `t${s.toFixed(2).padStart(6, "0")}.png`), puppeteerInstance: browser, inputProps: { captions: true } });
}
await browser.close({ silent: true });
console.log("stills written to", outDir);
