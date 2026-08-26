/*
  Generates placeholder art for the About page sections that still await
  final photography. It never overwrites a file that already exists, so
  delivered photos are safe; delete a WebP first to force a redraw.

  Run:  node scripts/generate-about-placeholders.mjs
*/

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "about");

const FONT = "DejaVu Sans, sans-serif";

const defs = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f8f4"/><stop offset="1" stop-color="#e2efe8"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#00293b" flood-opacity="0.13"/>
    </filter>
  </defs>`;

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;
}

function tree(cx, baseY, s) {
  return `
    <circle cx="${cx}" cy="${baseY - 70 * s}" r="${46 * s}" fill="#bcd9c6"/>
    <circle cx="${cx - 30 * s}" cy="${baseY - 44 * s}" r="${32 * s}" fill="#cbe2d3"/>
    <circle cx="${cx + 30 * s}" cy="${baseY - 40 * s}" r="${28 * s}" fill="#aacfb8"/>
    <rect x="${cx - 6 * s}" y="${baseY - 34 * s}" width="${12 * s}" height="${34 * s}" rx="${5 * s}" fill="#9c8a70"/>`;
}

function sensor(cx, cy, r) {
  return `
  <g filter="url(#soft)">
    <ellipse cx="${cx}" cy="${cy + r * 0.34}" rx="${r * 1.4}" ry="${r * 0.9}" fill="#f0eeeb"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="#c9d2d4"/>
  </g>`;
}

/* Mission and vision band background: sunny path through green hills. */
function missionScene() {
  return svgDoc(1536, 800, `
  <rect width="1536" height="800" fill="url(#sky)"/>
  <circle cx="680" cy="330" r="260" fill="#f7f4e6" opacity="0.85"/>
  <path d="M 0 520 C 300 420 520 560 820 480 C 1120 400 1300 500 1536 440 V 800 H 0 Z" fill="#d9e9e0"/>
  <path d="M 0 620 C 360 540 700 660 1080 580 C 1300 535 1440 570 1536 560 V 800 H 0 Z" fill="#cfe3d7"/>
  <path d="M 700 800 C 690 700 660 620 680 520 C 695 450 710 420 730 380 L 770 380 C 760 440 745 480 740 540 C 732 640 760 710 780 800 Z" fill="#f1efe8"/>
  ${tree(180, 520, 1.4)}
  ${tree(320, 560, 1)}
  ${tree(1320, 540, 1.2)}
  <ellipse cx="1160" cy="240" rx="90" ry="34" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="330" cy="180" rx="70" ry="26" fill="#ffffff" opacity="0.8"/>
  ${sensor(1120, 660, 60)}
  <g filter="url(#soft)">
    <path d="M 1310 520 L 1420 560 V 660 C 1420 720 1310 760 1310 760 C 1310 760 1200 720 1200 660 V 560 Z" fill="#5b8a72"/>
    <path d="M 1268 640 l 26 28 l 52 -56" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`);
}

/* About the company: family silhouettes over hills, supplies in front. */
function familyScene() {
  return svgDoc(1200, 800, `
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="560" cy="300" r="230" fill="#f7f4e6" opacity="0.9"/>
  <path d="M 0 470 C 280 380 520 500 800 430 C 1020 380 1120 430 1200 410 V 800 H 0 Z" fill="#d9e9e0"/>
  <path d="M 0 590 C 340 510 680 620 1030 550 L 1200 520 V 800 H 0 Z" fill="#cfe3d7"/>
  <g fill="#5c7d6b">
    <circle cx="520" cy="300" r="34"/>
    <path d="M 470 470 C 470 380 570 380 570 470 L 566 560 h -92 Z"/>
    <circle cx="625" cy="315" r="30"/>
    <path d="M 582 470 C 582 392 668 392 668 470 L 664 556 h -82 Z"/>
    <circle cx="574" cy="380" r="22"/>
    <path d="M 545 470 C 545 420 603 420 603 470 L 600 540 h -52 Z"/>
  </g>
  ${sensor(310, 660, 66)}
  <g filter="url(#soft)">
    <rect x="820" y="560" width="180" height="230" rx="34" fill="#ffffff"/>
    <rect x="850" y="590" width="120" height="90" rx="10" fill="#dcece3"/>
    <rect x="870" y="700" width="80" height="34" rx="17" fill="#c3ced2"/>
  </g>
  <g filter="url(#soft)">
    <ellipse cx="1080" cy="700" rx="105" ry="66" fill="#f3f1ee"/>
    <rect x="1010" y="660" width="140" height="80" rx="40" fill="#ffffff"/>
  </g>`);
}

const SCENES = {
  "mission-bg": [missionScene(), 1536],
  "about-family": [familyScene(), 1200],
};

await mkdir(outDir, { recursive: true });
for (const [name, [svg, width]] of Object.entries(SCENES)) {
  const out = join(outDir, `${name}.webp`);
  if (existsSync(out)) {
    console.log(`skip   ${name}.webp (already delivered)`);
    continue;
  }
  const buffer = await sharp(Buffer.from(svg), { density: 96 })
    .resize({ width })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(out, buffer);
  console.log(`write  ${name}.webp  ${(buffer.length / 1024).toFixed(0)} kB`);
}
