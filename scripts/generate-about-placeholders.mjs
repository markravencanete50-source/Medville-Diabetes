/*
  Generates placeholder art for the About page redesign.

  The client approved a hero banner and three value-card illustrations.
  Until the final files are uploaded to public/about/, this script draws
  brand-styled stand-ins with the same composition so the live page never
  shows a broken image. Replacing a file (same name) needs no code change.

  Run:  node scripts/generate-about-placeholders.mjs
*/

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "about");

const INK = "#00293b";
const GREY = "#5c6b73";
const GREEN = "#0e6a4b";
const GREEN_DEEP = "#2e6b52";
const GREEN_SOFT = "#e6f3ec";
const GREEN_MINT = "#d2ead9";
const FONT = "DejaVu Sans, sans-serif";

const defs = `
  <defs>
    <linearGradient id="mint" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9f4ee"/><stop offset="1" stop-color="#dcece3"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#00293b" flood-opacity="0.15"/>
    </filter>
    <filter id="soft2" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="5" stdDeviation="9" flood-color="#00293b" flood-opacity="0.12"/>
    </filter>
  </defs>`;

function sensor(cx, cy, r) {
  return `
  <g filter="url(#soft2)">
    <ellipse cx="${cx}" cy="${cy + r * 0.34}" rx="${r * 1.4}" ry="${r * 0.9}" fill="#f0eeeb"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#dfe5e6" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="#c9d2d4"/>
  </g>`;
}

function wave(x, y, w, h, color, sw = 5) {
  return `<path d="M ${x} ${y + h * 0.55}
    C ${x + w * 0.12} ${y + h * 0.1}, ${x + w * 0.2} ${y + h * 0.95}, ${x + w * 0.34} ${y + h * 0.55}
    S ${x + w * 0.52} ${y + h * 0.1}, ${x + w * 0.64} ${y + h * 0.5}
    S ${x + w * 0.85} ${y + h * 0.9}, ${x + w} ${y + h * 0.45}"
    fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;
}

/* Hero banner: phone, sensor and product box on the right, air on the left. */
function hero() {
  const px = 1050, py = 300, pw = 230, ph = 470;
  return svgDoc(1536, 1024, `
  <rect width="1536" height="1024" fill="url(#mint)"/>
  <path d="M 0 640 C 380 520 700 760 1100 640 C 1300 585 1440 620 1536 660 V 1024 H 0 Z" fill="#e2efe8"/>
  <path d="M 0 780 C 420 680 760 880 1200 760 L 1536 700 V 1024 H 0 Z" fill="#d9e9e0"/>
  <circle cx="150" cy="180" r="110" fill="#dcede4"/>
  <g filter="url(#soft)">
    <rect x="1160" y="540" width="290" height="270" rx="14" fill="#ffffff"/>
    <text x="1305" y="625" font-family="${FONT}" font-size="40" font-weight="bold" fill="${GREEN_DEEP}" text-anchor="middle">CGM</text>
    <text x="1305" y="660" font-family="${FONT}" font-size="19" fill="${GREY}" text-anchor="middle">Continuous</text>
    <text x="1305" y="684" font-family="${FONT}" font-size="19" fill="${GREY}" text-anchor="middle">Glucose Monitor</text>
    <circle cx="1305" cy="745" r="34" fill="none" stroke="${GREEN_MINT}" stroke-width="4"/>
    <circle cx="1305" cy="745" r="4" fill="${GREEN_MINT}"/>
  </g>
  <g filter="url(#soft)">
    <rect x="${px - 10}" y="${py - 10}" width="${pw + 20}" height="${ph + 20}" rx="40" fill="#2c3438"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="32" fill="#ffffff"/>
    <text x="${px + pw / 2}" y="${py + 46}" font-family="${FONT}" font-size="17" font-weight="600" fill="${INK}" text-anchor="middle">Today</text>
    <text x="${px + pw / 2}" y="${py + 108}" font-family="${FONT}" font-size="42" font-weight="bold" fill="#111c22" text-anchor="middle">6.2 &#8594;</text>
    <text x="${px + pw / 2}" y="${py + 134}" font-family="${FONT}" font-size="15" fill="${GREY}" text-anchor="middle">mmol/L</text>
    <rect x="${px + 20}" y="${py + 160}" width="${pw - 40}" height="150" rx="10" fill="${GREEN_SOFT}"/>
    ${wave(px + 30, py + 180, pw - 60, 108, "#0d3f2e", 4)}
    <rect x="${px + 38}" y="${py + ph - 76}" width="${pw - 76}" height="46" rx="23" fill="#5b9bd0"/>
    <text x="${px + pw / 2}" y="${py + ph - 46}" font-family="${FONT}" font-size="18" font-weight="600" fill="#ffffff" text-anchor="middle">Add Note</text>
  </g>
  ${sensor(970, 750, 78)}`);
}

/* Plain answers: clipboard with checked rows, speech bubble, plant. */
function plainAnswers() {
  const bx = 560, by = 190, bw = 520, bh = 700;
  return svgDoc(1400, 1120, `
  <rect width="1400" height="1120" fill="url(#mint)"/>
  <circle cx="700" cy="420" r="380" fill="#e2efe8"/>
  <g filter="url(#soft)">
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="40" fill="#f2f4f3"/>
    <rect x="${bx + 30}" y="${by + 30}" width="${bw - 60}" height="${bh - 60}" rx="26" fill="#ffffff"/>
    <rect x="${bx + bw / 2 - 120}" y="${by - 46}" width="240" height="96" rx="26" fill="${GREEN_DEEP}"/>
    <circle cx="${bx + bw / 2}" cy="${by - 14}" r="16" fill="#ffffff"/>
    ${[0, 1, 2].map((i) => `
      <rect x="${bx + 78}" y="${by + 120 + i * 170}" width="86" height="86" rx="20" fill="${GREEN_SOFT}"/>
      <path d="M ${bx + 100} ${by + 163 + i * 170} l 18 20 l 34 -40" fill="none" stroke="${GREEN_DEEP}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="${bx + 196}" y="${by + 138 + i * 170}" width="210" height="20" rx="10" fill="#d9dee0"/>
      <rect x="${bx + 196}" y="${by + 172 + i * 170}" width="150" height="16" rx="8" fill="#e6eaec"/>`).join("")}
  </g>
  <g filter="url(#soft)">
    <rect x="230" y="290" width="380" height="290" rx="90" fill="${GREEN_MINT}"/>
    <path d="M 350 570 l -20 70 l 80 -50 Z" fill="${GREEN_MINT}"/>
    ${[0, 1, 2].map((i) => `<circle cx="${350 + i * 65}" cy="435" r="17" fill="#b7d8c4"/>`).join("")}
  </g>
  <g filter="url(#soft2)">
    ${[[-30, -20, -25], [30, -18, 25], [0, 0, 0]].map(([dx, dy, rot]) =>
      `<ellipse cx="${300 + dx}" cy="${790 + dy}" rx="30" ry="72" fill="#4c8f68" transform="rotate(${rot} ${300 + dx} ${790 + dy})"/>`).join("")}
    <path d="M 240 860 h 120 l -14 120 h -92 Z" fill="#ffffff"/>
  </g>`);
}

/* Leading brands: two product boxes and two sensors. */
function leadingBrands() {
  return svgDoc(1400, 1120, `
  <rect width="1400" height="1120" fill="url(#mint)"/>
  <circle cx="700" cy="430" r="380" fill="#e2efe8"/>
  <g filter="url(#soft)" transform="rotate(-4 480 560)">
    <rect x="220" y="270" width="520" height="560" rx="18" fill="#f6c744"/>
    <rect x="220" y="270" width="520" height="560" rx="18" fill="none" stroke="#e9b62e" stroke-width="3"/>
    <text x="270" y="470" font-family="${FONT}" font-size="56" font-weight="bold" fill="#12365c">FreeStyle</text>
    <text x="270" y="540" font-family="${FONT}" font-size="56" font-weight="bold" font-style="italic" fill="#d2452b">Libre</text>
    <text x="270" y="590" font-family="${FONT}" font-size="20" fill="#3d5166">FLASH GLUCOSE MONITORING</text>
    <path d="M 610 350 q 24 -34 48 0 q -24 30 -48 0 Z" fill="#e78a2e"/>
    <path d="M 610 350 q -24 -34 -48 0 q 24 30 48 0 Z" fill="#f0a848"/>
  </g>
  <g filter="url(#soft)" transform="rotate(3 950 540)">
    <rect x="700" y="230" width="480" height="600" rx="18" fill="#ffffff"/>
    <text x="940" y="430" font-family="${FONT}" font-size="58" font-weight="bold" fill="#3f9e43" text-anchor="middle">Dexcom</text>
    <text x="940" y="505" font-family="${FONT}" font-size="64" font-weight="bold" fill="#3f9e43" text-anchor="middle">one+</text>
  </g>
  ${sensor(560, 840, 105)}
  <g filter="url(#soft2)">
    <ellipse cx="920" cy="880" rx="190" ry="120" fill="#f3f1ee"/>
    <rect x="810" y="810" width="220" height="130" rx="60" fill="#ffffff"/>
    <text x="920" y="885" font-family="${FONT}" font-size="24" fill="#9aa5ab" text-anchor="middle">Dexcom</text>
    <circle cx="990" cy="875" r="9" fill="#c9d2d4"/>
  </g>`);
}

/* Privacy by design: shield with lock, database, cloud. */
function privacy() {
  return svgDoc(1400, 1120, `
  <rect width="1400" height="1120" fill="url(#mint)"/>
  <circle cx="660" cy="420" r="380" fill="#e2efe8"/>
  <g filter="url(#soft2)">
    ${[0, 1, 2].map((i) => `
      <path d="M 200 ${470 + i * 130} a 170 55 0 0 1 340 0 v 80 a 170 55 0 0 1 -340 0 Z" fill="#ffffff"/>
      <ellipse cx="370" cy="${470 + i * 130}" rx="170" ry="55" fill="#f4f3f1"/>
      <circle cx="290" cy="${560 + i * 130}" r="12" fill="#9fdcb4"/>
      <circle cx="350" cy="${560 + i * 130}" r="12" fill="#9fdcb4"/>`).join("")}
  </g>
  <g filter="url(#soft2)">
    <ellipse cx="1080" cy="620" rx="150" ry="95" fill="#ffffff"/>
    <circle cx="990" cy="580" r="75" fill="#ffffff"/>
    <circle cx="1120" cy="555" r="95" fill="#ffffff"/>
  </g>
  <g filter="url(#soft)">
    <path d="M 700 220 L 940 310 V 590 C 940 760 700 880 700 880 C 700 880 460 760 460 590 V 310 Z" fill="${GREEN_DEEP}"/>
    <path d="M 700 260 L 902 337 V 585 C 902 725 700 833 700 833 C 700 833 498 725 498 585 V 337 Z" fill="none" stroke="#3f7d62" stroke-width="6"/>
    <rect x="630" y="500" width="140" height="120" rx="22" fill="#ffffff"/>
    <path d="M 660 500 v -40 a 40 40 0 0 1 80 0 v 40" fill="none" stroke="#ffffff" stroke-width="26"/>
    <circle cx="700" cy="548" r="16" fill="${GREEN_DEEP}"/>
    <rect x="692" y="552" width="16" height="34" rx="8" fill="${GREEN_DEEP}"/>
  </g>
  <g filter="url(#soft)">
    <circle cx="1000" cy="870" r="120" fill="${GREEN_DEEP}"/>
    <circle cx="1000" cy="870" r="88" fill="#ffffff"/>
    <rect x="965" y="862" width="70" height="58" rx="12" fill="${GREEN_DEEP}"/>
    <path d="M 980 862 v -20 a 20 20 0 0 1 40 0 v 20" fill="none" stroke="${GREEN_DEEP}" stroke-width="13"/>
  </g>`);
}

const SCENES = {
  "about-hero": [hero(), 1536],
  "value-plain-answers": [plainAnswers(), 900],
  "value-leading-brands": [leadingBrands(), 900],
  "value-privacy": [privacy(), 900],
};

await mkdir(outDir, { recursive: true });
for (const [name, [svg, width]] of Object.entries(SCENES)) {
  const buffer = await sharp(Buffer.from(svg), { density: 96 })
    .resize({ width })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(join(outDir, `${name}.webp`), buffer);
  console.log(`${name}.webp  ${(buffer.length / 1024).toFixed(0)} kB`);
}
