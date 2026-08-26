/*
  Converts the client's homepage marketing photography into web-sized WebP.

  The originals are 1.5 to 1.9 MB PNGs delivered through the client's Drive
  folder and uploaded to public/home/. Seven of them is about 12 MB, which is
  far too much to serve: Section 7.3 of the agreement holds the client's
  Google Cloud spend to 0 to 5 USD per month, and hosting bandwidth is the
  one line item this site can push. WebP at the sizes below brings the set
  under 400 kB with no visible loss at the sizes the sections render.

  Run:  node scripts/optimize-home-photos.mjs
  Reads the PNG originals from public/home/ and writes the WebP files the
  homepage references. The originals are not committed; they stay in the
  client's Drive folder. Re-running after a fresh upload is safe.
*/

import { readdir, writeFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "public", "home");

/* Source name as delivered -> output slug and rendered width.

   Widths are twice the largest size each image renders at, so the art stays
   sharp on high density screens without paying for pixels nobody sees.
   Step and guide cards top out near 420 px in the three column grid; the
   monitoring image spans half of the container on large screens. */
const MAP = {
  "Step 1.png": ["step-1-short-form", 900],
  "Step 2.png": ["step-2-review", 900],
  "Step 3.png": ["step-3-delivery", 900],
  "Guide 1.png": ["guide-what-is-a-cgm", 900],
  "Guide 2.png": ["guide-libre-or-dexcom", 900],
  "Guide 3.png": ["guide-coverage", 900],
  "Your Glucose, All Day picture.png": ["why-monitoring", 1200],
};

const present = await readdir(dir);
let converted = 0;

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
}

/* Remove the PNG originals so they are never deployed. Everything under
   public/ is copied into dist/ verbatim by Vite, and 12 MB of unused PNGs
   would be served to nobody's benefit. */
for (const source of Object.keys(MAP)) {
  if (present.includes(source)) await unlink(join(dir, source));
}

console.log(`\n${converted} image(s) converted, originals removed.`);
