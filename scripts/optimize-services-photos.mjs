/*
  Converts the Our Services journey photography into web-sized WebP.

  The originals are 2.4 to 4.6 MB PNGs delivered with the services page
  handoff. Six of them is about 24 MB, which is far too much to serve:
  Section 7.3 of the agreement holds the client's Google Cloud spend to 0 to
  5 USD per month, and hosting bandwidth is the one line item this site can
  push. WebP at the sizes below brings the set under 400 kB with no visible
  loss at the sizes the sections render.

  Run:  node scripts/optimize-services-photos.mjs
  Reads the PNG originals from public/services/journey/ and writes the WebP
  files the services page references. The originals are not committed; they
  stay in the client's handoff folder. Re-running after a fresh copy is safe.
*/

import { readdir, writeFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "public", "services", "journey");

/* Source name as delivered -> output slug and rendered width.

   Widths are twice the largest size each image renders at, so the art stays
   sharp on high density screens without paying for pixels nobody sees.
   The hero fills a little over half of the 1200 px frame; each stage photo
   takes half of it. The orbit mark never renders above 58 px. */
const MAP = {
  "medville-services-hero.png": ["journey-hero", 1600],
  "medville-cycle-call.png": ["journey-stage-01-start", 1100],
  "medville-step-02-clinic-confirmation.png": ["journey-stage-02-confirm", 1100],
  "medville-step-06-insurance.png": ["journey-stage-03-approve", 1100],
  "medville-step-08-delivery.png": ["journey-stage-04-deliver", 1100],
  "medville-orbit-mark.png": ["journey-mark", 240],
};

const present = await readdir(dir);
let converted = 0;
let total = 0;

for (const [source, [slug, width]] of Object.entries(MAP)) {
  if (!present.includes(source)) {
    console.log(`skip   ${source} (not present)`);
    continue;
  }
  const buffer = await sharp(join(dir, source))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(join(dir, `${slug}.webp`), buffer);
  console.log(`write  ${slug}.webp  ${(buffer.length / 1024).toFixed(0)} kB`);
  converted += 1;
  total += buffer.length;
}

/* Remove the PNG originals so they are never deployed. Everything under
   public/ is copied into dist/ verbatim by Vite, and 24 MB of unused PNGs
   would be served to nobody's benefit. */
for (const source of Object.keys(MAP)) {
  if (present.includes(source)) await unlink(join(dir, source));
}

console.log(`\n${converted} image(s) converted, ${(total / 1024).toFixed(0)} kB total, originals removed.`);
