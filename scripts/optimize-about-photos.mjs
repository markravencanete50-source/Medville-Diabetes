/*
  Converts the client's About page photography into web-sized WebP.

  Same rationale as scripts/optimize-home-photos.mjs: everything under
  public/ ships to Hosting verbatim, and Section 7.3 of the agreement holds
  the client's hosting spend down, so multi-megabyte PNGs must not deploy.

  Run:  node scripts/optimize-about-photos.mjs
  Reads the PNG originals uploaded to public/about/ and writes the WebP
  files the About page references, then removes the originals.
*/

import { readdir, writeFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "public", "about");

/* Source name as delivered -> output slug and width. The hero spans the
   full viewport, so it keeps more pixels than the three cards. */
const MAP = {
  "About page hero section background.png": ["about-hero", 1600],
  "Plain Answers.png": ["value-plain-answers", 900],
  "The leading brands.png": ["value-leading-brands", 900],
  "Privacy by design.png": ["value-privacy", 900],
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

for (const source of Object.keys(MAP)) {
  if (present.includes(source)) await unlink(join(dir, source));
}

console.log(`\n${converted} image(s) converted, originals removed.`);
