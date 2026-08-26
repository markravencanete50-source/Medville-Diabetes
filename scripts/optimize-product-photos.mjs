/*
  Converts the client's supplier photography into web-sized WebP files.

  The originals are 1536x1024 PNGs at roughly 1.4 MB each. Twenty two of them
  is about 29 MB, which is far too much to serve: Section 7.3 of the agreement
  holds the client's Google Cloud spend to 0 to 5 USD per month, and hosting
  bandwidth is the one line item this site can push. WebP at 1200 px brings the
  set under 2 MB with no visible loss at the sizes the cards render.

  Run:  node scripts/optimize-product-photos.mjs <source-directory>
  The source directory is the "uploads" folder from the design handoff bundle.
  Output goes to public/products/<slug>-front.webp and <slug>-back.webp.
*/

import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "products");

/* Source file names come from the handoff bundle exactly as the client sent
   them. Note the lowercase "front" on Dexcom G7, which is not a typo here. */
const MAP = {
  "freestyle-libre-3": ["FreeStyle Libre 3 Front.png", "FreeStyle Libre 3 Back.png"],
  "freestyle-libre-2": ["FreeStyle Libre 2 Front.png", "FreeStyle Libre 2 Back.png"],
  "freestyle-libre-14-day": ["FreeStyle Libre 14 Day Front.png", "FreeStyle Libre 14 Day Back.png"],
  "stelo-by-dexcom": ["Stelo by Dexcom Front.png", "Stelo by Dexcom Back.png"],
  "dexcom-g7": ["Dexcom G7 front.png", "Dexcom G7 Back.png"],
  "dexcom-g6": ["Dexcom G6 Front.png", "Dexcom G6 Back.png"],
  "dexcom-g6-sensors-applicator": [
    "Dexcom G6 Sensors and Applicator (3 Sensors Per Box) Front.png",
    "Dexcom G6 Sensors and Applicator (3 Sensors Per Box) Back.png",
  ],
  "dexcom-g6-transmitter": ["Dexcom G6 Transmitter Front.png", "Dexcom G6 Transmitter Back.png"],
  "tandem-tslim-x2": ["Tandem t slim X2 Front.png", "Tandem t slim X2 Back.png"],
  "freestyle-libre-14-day-sensor": [
    "FreeStyle Libre 14 Day Sensor (Box of 1) Front.png",
    "FreeStyle Libre 14 Day Sensor (Box of 1) Back.png",
  ],
  "freestyle-libre-2-sensor": [
    "FreeStyle Libre 2 Sensor (Box of 1) Front.png",
    "FreeStyle Libre 2 Sensor (Box of 1) Back.png",
  ],
  "freestyle-libre-3-sensor": [
    "FreeStyle Libre 3 Sensor (Box of 1) Front.png",
    "FreeStyle Libre 3 Sensor (Box of 1) Back.png",
  ],
};

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Pass the handoff uploads directory as the first argument.");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const present = new Set(await readdir(srcDir));

let totalIn = 0;
let totalOut = 0;
const missing = [];

for (const [slug, faces] of Object.entries(MAP)) {
  for (const [index, file] of faces.entries()) {
    const face = index === 0 ? "front" : "back";
    if (!present.has(file)) {
      missing.push(`${slug} ${face}: ${file}`);
      continue;
    }
    const input = join(srcDir, file);
    const buffer = await sharp(input)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();

    const target = join(outDir, `${slug}-${face}.webp`);
    await writeFile(target, buffer);

    const inSize = (await stat(input)).size;
    totalIn += inSize;
    totalOut += buffer.length;
    console.log(
      `${slug}-${face}.webp  ${(inSize / 1048576).toFixed(2)}MB -> ${(buffer.length / 1024).toFixed(0)}KB`,
    );
  }
}

if (missing.length) {
  console.error("\nMissing source files:");
  missing.forEach((m) => console.error("  " + m));
  process.exit(1);
}

console.log(
  `\nTotal ${(totalIn / 1048576).toFixed(1)}MB -> ${(totalOut / 1048576).toFixed(2)}MB ` +
    `(${(100 - (totalOut / totalIn) * 100).toFixed(1)}% smaller)`,
);
