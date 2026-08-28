/*
  Builds public/og-image.jpg, the picture that appears when someone shares a
  link to this site in WhatsApp, Messenger, Slack, LinkedIn, iMessage or X.

  It is a render of the site's own home page hero rather than a separate
  graphic, so the card can never drift from what a visitor actually lands on.
  Re-run it whenever the hero copy, the hero photograph or the palette change:

      npm run build && npx vite preview --port 4173 &
      node scripts/build-og-image.mjs

  Two details worth keeping:

  - The page is captured at 1440x756 and scaled down to 1200x630. Both are the
    same 1.905 ratio, and the extra room stops the hero's last line being
    sliced in half at the bottom edge of the card.
  - "Drag to flip" and the Front/Back badge are hidden first. They invite an
    action nobody can take inside a chat preview.

  Output is JPEG at quality 86, which lands around 70 kB. WhatsApp quietly
  gives up on preview images much above a few hundred kilobytes, so this stays
  well inside that.
*/
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ORIGIN = process.env.OG_ORIGIN ?? "http://localhost:4173";
const OUT = "public/og-image.jpg";

/* The card is 1200x630. Capturing larger and scaling down also means the type
   is rendered at 2x and stays crisp after the resize. */
const CAPTURE = { width: 1440, height: 756 };
const CARD = { width: 1200, height: 630 };

const work = await mkdtemp(join(tmpdir(), "og-"));
const shot = join(work, "hero.png");

/* Honour a proxy when one is configured, so the Google Fonts stylesheet loads
   and the card renders in Poppins and Inter rather than a fallback face. */
const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  ...(proxy ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } } : {}),
});

try {
  const page = await browser.newPage({
    viewport: CAPTURE,
    deviceScaleFactor: 2,
    /* Reduced motion settles every entrance animation immediately, so the
       capture never catches the hero mid-arrival. */
    reducedMotion: "reduce",
  });

  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(() => {
    for (const el of document.querySelectorAll("span")) {
      const text = (el.textContent ?? "").trim();
      if (text === "Drag to flip" || text === "Front" || text === "Back") {
        el.style.display = "none";
      }
    }
  });

  /* Let the product photograph and the blurred colour blobs finish painting. */
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shot });

  const info = await sharp(shot)
    .resize(CARD.width, CARD.height, { fit: "cover" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(OUT);

  console.log(`${OUT}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} kB`);
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
