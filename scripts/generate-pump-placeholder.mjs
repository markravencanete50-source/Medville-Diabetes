/*
  Placeholder photography for the Tandem t:slim X2 insulin pump, used until
  the client's supplier photo is uploaded. Never overwrites an existing
  file, so the delivered photo is safe once it lands.

  Run:  node scripts/generate-pump-placeholder.mjs
*/

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "products");
const FONT = "DejaVu Sans, sans-serif";

const defs = `
  <defs>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#00293b" flood-opacity="0.16"/>
    </filter>
  </defs>`;

function svgDoc(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">${defs}${body}</svg>`;
}

/* Front: touchscreen face with bolus and options rows, sensor, tubing. */
const front = svgDoc(`
  <rect width="1536" height="1024" fill="#ffffff"/>
  <g filter="url(#soft)" transform="rotate(-4 700 430)">
    <rect x="330" y="180" width="760" height="500" rx="56" fill="#16191c"/>
    <rect x="330" y="180" width="760" height="500" rx="56" fill="none" stroke="#3a4145" stroke-width="4"/>
    <rect x="386" y="230" width="560" height="400" rx="16" fill="#000000"/>
    <text x="666" y="292" font-family="${FONT}" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">12:31 PM</text>
    <rect x="410" y="330" width="512" height="76" rx="10" fill="#23282c"/>
    <circle cx="452" cy="368" r="18" fill="#3b9fd8"/>
    <text x="490" y="380" font-family="${FONT}" font-size="30" font-weight="bold" fill="#3b9fd8">BOLUS</text>
    <rect x="410" y="424" width="512" height="76" rx="10" fill="#23282c"/>
    <circle cx="452" cy="462" r="18" fill="#e8a33d"/>
    <text x="490" y="474" font-family="${FONT}" font-size="30" font-weight="bold" fill="#e8a33d">OPTIONS</text>
    <text x="414" y="548" font-family="${FONT}" font-size="22" fill="#c8cdd0">INSULIN ON BOARD</text>
    <rect x="410" y="566" width="512" height="46" rx="8" fill="#23282c"/>
    <text x="430" y="597" font-family="${FONT}" font-size="22" fill="#e8ebec">1.1 u</text>
    <text x="900" y="597" font-family="${FONT}" font-size="22" fill="#e8ebec" text-anchor="end">1:09 hrs</text>
    <rect x="980" y="380" width="86" height="86" rx="18" fill="#2b3237"/>
    <path d="M 1005 402 h 36 v 14 h -11 v 40 h -14 v -40 h -11 Z" fill="#8f989d"/>
  </g>
  <path d="M 1080 640 C 1180 660 1240 720 1200 800 C 1170 860 1080 850 1040 820"
    fill="none" stroke="#d7dee1" stroke-width="8" stroke-linecap="round"/>
  <g filter="url(#soft)" transform="rotate(-8 560 800)">
    <rect x="400" y="730" width="320" height="150" rx="72" fill="#e9e5ee"/>
    <rect x="428" y="752" width="264" height="106" rx="52" fill="#d9d2e2"/>
    <text x="560" y="815" font-family="${FONT}" font-size="30" font-weight="bold" fill="#5c6b73" text-anchor="middle">Dexcom G6</text>
  </g>
  <g filter="url(#soft)">
    <circle cx="1010" cy="840" r="44" fill="#f2f4f5"/>
    <rect x="1054" y="828" width="70" height="24" rx="12" fill="#e3e8ea"/>
  </g>`);

/* Back: matte case with the maker's mark and a belt clip. */
const back = svgDoc(`
  <rect width="1536" height="1024" fill="#ffffff"/>
  <g filter="url(#soft)" transform="rotate(-4 768 470)">
    <rect x="388" y="220" width="760" height="500" rx="56" fill="#22272b"/>
    <rect x="428" y="260" width="680" height="420" rx="36" fill="#2b3237"/>
    <rect x="688" y="300" width="160" height="340" rx="24" fill="#383f44"/>
    <path d="M 742 420 h 52 v 18 h -17 v 84 h -18 v -84 h -17 Z" fill="#9aa4aa"/>
    <text x="768" y="700" font-family="${FONT}" font-size="26" fill="#8f989d" text-anchor="middle">tandem</text>
  </g>`);

await mkdir(outDir, { recursive: true });
for (const [name, svg] of [
  ["tandem-tslim-x2-front", front],
  ["tandem-tslim-x2-back", back],
]) {
  const out = join(outDir, `${name}.webp`);
  if (existsSync(out)) {
    console.log(`skip   ${name}.webp (already delivered)`);
    continue;
  }
  const buffer = await sharp(Buffer.from(svg), { density: 96 })
    .resize({ width: 1200 })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(out, buffer);
  console.log(`write  ${name}.webp  ${(buffer.length / 1024).toFixed(0)} kB`);
}
