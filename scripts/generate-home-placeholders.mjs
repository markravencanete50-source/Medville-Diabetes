/*
  Generates placeholder marketing art for the 2026-08-26 homepage upgrade.

  The client approved a set of real lifestyle photos for the How-it-works
  steps, the Why-monitoring feature, and the three guide cards. Until those
  files are delivered, this script draws brand-styled stand-ins with the same
  composition, so the live site never shows a broken image. Replacing a file
  in public/home/ with the real photo (same name) needs no code change.

  Run:  node scripts/generate-home-placeholders.mjs
  Output goes to public/home/<name>.webp. Never put PHI or real customer
  data in this art; every value shown is invented.
*/

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "home");

/* Brand tokens, mirrored from src/index.css. */
const INK = "#00293b";
const GREY = "#5c6b73";
const GREY_FAINT = "#c3ced2";
const GREEN = "#0e6a4b";
const GREEN_BRIGHT = "#2fa97c";
const GREEN_SOFT = "#e6f3ec";
const GREEN_MINT = "#d2ead9";
const BLUE = "#0b7c9d";
const BLUE_SOFT = "#e2f5fa";
const FONT = "DejaVu Sans, sans-serif";

/* ---------- shared parts ---------- */

const defs = `
  <defs>
    <linearGradient id="mint" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef7f2"/><stop offset="1" stop-color="#e2efe8"/>
    </linearGradient>
    <linearGradient id="blueWash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7f2fa"/><stop offset="1" stop-color="#d8eaf5"/>
    </linearGradient>
    <linearGradient id="neutral" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f6f3"/><stop offset="1" stop-color="#ece8e0"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e3cda9"/><stop offset="1" stop-color="#d4b98d"/>
    </linearGradient>
    <linearGradient id="kraft" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dcbb90"/><stop offset="1" stop-color="#c9a26f"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#00293b" flood-opacity="0.16"/>
    </filter>
    <filter id="soft2" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#00293b" flood-opacity="0.12"/>
    </filter>
  </defs>`;

/* CGM sensor puck seen from above. */
function sensor(cx, cy, r) {
  return `
  <g filter="url(#soft2)">
    <ellipse cx="${cx}" cy="${cy + r * 0.32}" rx="${r * 1.45}" ry="${r * 0.95}" fill="#f1efec"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#dfe5e6" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="#eef1f1" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="#c9d2d4"/>
  </g>`;
}

/* Rounded badge with a simple glyph: "q" question, "r" route, "s" shield. */
function badge(cx, cy, glyph) {
  let icon = "";
  if (glyph === "q") {
    icon = `<text x="${cx}" y="${cy + 17}" font-family="${FONT}" font-size="50" font-weight="bold" fill="${GREEN}" text-anchor="middle">?</text>`;
  } else if (glyph === "r") {
    icon = `
      <path d="M ${cx - 16} ${cy + 12} C ${cx - 16} ${cy - 10}, ${cx + 16} ${cy + 10}, ${cx + 16} ${cy - 12}"
        fill="none" stroke="${BLUE}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="${cx - 16}" cy="${cy + 14}" r="7" fill="${BLUE}"/>
      <circle cx="${cx + 16}" cy="${cy - 14}" r="7" fill="none" stroke="${BLUE}" stroke-width="5"/>`;
  } else {
    icon = `
      <path d="M ${cx} ${cy - 20} L ${cx + 17} ${cy - 13} V ${cy + 2} C ${cx + 17} ${cy + 14}, ${cx} ${cy + 21}, ${cx} ${cy + 21}
               C ${cx} ${cy + 21}, ${cx - 17} ${cy + 14}, ${cx - 17} ${cy + 2} V ${cy - 13} Z"
        fill="none" stroke="${GREEN}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M ${cx - 7} ${cy} l 5 6 l 10 -12" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `
  <g filter="url(#soft2)">
    <circle cx="${cx}" cy="${cy}" r="46" fill="#ffffff"/>
    <circle cx="${cx}" cy="${cy}" r="38" fill="none" stroke="${glyph === "r" ? BLUE : GREEN}" stroke-width="4" opacity="0.9"/>
    ${icon}
  </g>`;
}

/* Small potted plant. */
function plant(cx, baseY, s = 1) {
  const leaf = (dx, dy, rot, fill) =>
    `<ellipse cx="${cx + dx * s}" cy="${baseY - (70 + dy) * s}" rx="${16 * s}" ry="${42 * s}"
       fill="${fill}" transform="rotate(${rot} ${cx + dx * s} ${baseY - (70 + dy) * s})"/>`;
  return `
  <g>
    ${leaf(-24, 10, -28, "#5f9e78")}
    ${leaf(24, 10, 28, "#6fae86")}
    ${leaf(-8, 34, -10, "#4c8f68")}
    ${leaf(10, 36, 12, "#7cba93")}
    ${leaf(0, 50, 0, "#639f7a")}
    <path d="M ${cx - 34 * s} ${baseY - 40 * s} h ${68 * s} l ${-8 * s} ${52 * s} h ${-52 * s} Z" fill="#efeae2"/>
    <path d="M ${cx - 34 * s} ${baseY - 40 * s} h ${68 * s} l ${-2 * s} ${12 * s} h ${-64 * s} Z" fill="#e2dbd0"/>
  </g>`;
}

/* Glucose trend wave inside a chart area. */
function wave(x, y, w, h, color, sw = 6) {
  const p = `M ${x} ${y + h * 0.55}
    C ${x + w * 0.1} ${y + h * 0.15}, ${x + w * 0.16} ${y + h * 0.9}, ${x + w * 0.28} ${y + h * 0.6}
    S ${x + w * 0.42} ${y + h * 0.1}, ${x + w * 0.52} ${y + h * 0.45}
    S ${x + w * 0.68} ${y + h * 0.95}, ${x + w * 0.78} ${y + h * 0.55}
    S ${x + w * 0.92} ${y + h * 0.2}, ${x + w} ${y + h * 0.4}`;
  return `<path d="${p}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

/* Grey text-placeholder bars. */
function bars(x, y, w, rows, gap = 26, h = 11, color = "#d7dee1") {
  let out = "";
  for (let i = 0; i < rows; i++) {
    const width = i === rows - 1 ? w * 0.62 : w;
    out += `<rect x="${x}" y="${y + i * gap}" width="${width}" height="${h}" rx="${h / 2}" fill="${color}"/>`;
  }
  return out;
}

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`;
}

/* ---------- scenes ---------- */

/* Step 1: phone with the short qualify form. */
function stepOne() {
  const px = 700, py = 96, pw = 380, ph = 700;
  return svgDoc(1200, 900, `
  <rect width="1200" height="900" fill="url(#neutral)"/>
  <rect y="700" width="1200" height="200" fill="url(#wood)"/>
  <rect y="700" width="1200" height="10" fill="#c6a97c"/>
  ${plant(240, 760, 1.5)}
  <g filter="url(#soft)">
    <rect x="${px - 14}" y="${py - 14}" width="${pw + 28}" height="${ph + 28}" rx="58" fill="#2c3438"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="46" fill="#ffffff"/>
    <rect x="${px + pw / 2 - 52}" y="${py + 16}" width="104" height="24" rx="12" fill="#2c3438"/>
    <text x="${px + 36}" y="${py + 110}" font-family="${FONT}" font-size="34" font-weight="bold" fill="${INK}">Short Form</text>
    <text x="${px + 36}" y="${py + 152}" font-family="${FONT}" font-size="19" fill="${GREY}">A few details to get started.</text>
    ${["Full name", "Email address", "Phone number", "About your insulin use"]
      .map((label, i) => `
      <rect x="${px + 30}" y="${py + 190 + i * 92}" width="${pw - 60}" height="72" rx="18" fill="#f6f8f8" stroke="#e3e9ea"/>
      <circle cx="${px + 62}" cy="${py + 226 + i * 92}" r="9" fill="none" stroke="#9fb0b6" stroke-width="3"/>
      <text x="${px + 86}" y="${py + 233 + i * 92}" font-family="${FONT}" font-size="18" fill="${GREY}">${label}</text>`)
      .join("")}
    <rect x="${px + 30}" y="${py + ph - 110}" width="${pw - 60}" height="66" rx="20" fill="${GREEN}"/>
    <text x="${px + pw / 2}" y="${py + ph - 68}" font-family="${FONT}" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">Submit</text>
  </g>`);
}

/* Step 2: laptop with the reviewed-submission checklist. */
function stepTwo() {
  const sx = 250, sy = 130, sw = 700, sh = 440;
  const rows = ["Answers reviewed", "Paperwork prepared", "Next steps planned"];
  return svgDoc(1200, 900, `
  <rect width="1200" height="900" fill="#f4f6f7"/>
  <rect y="710" width="1200" height="190" fill="url(#wood)"/>
  ${plant(1130, 730, 1.1)}
  <g filter="url(#soft)">
    <rect x="${sx - 18}" y="${sy - 18}" width="${sw + 36}" height="${sh + 36}" rx="26" fill="#2c3438"/>
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="12" fill="#fbfdfd"/>
    <circle cx="${sx + sw - 90}" cy="${sy + 90}" r="110" fill="${BLUE_SOFT}" opacity="0.7"/>
    <text x="${sx + 48}" y="${sy + 86}" font-family="${FONT}" font-size="38" font-weight="bold" fill="${INK}">Your submission</text>
    ${rows.map((label, i) => `
      <rect x="${sx + 44}" y="${sy + 122 + i * 100}" width="${sw - 160}" height="80" rx="18" fill="#ffffff" filter="url(#soft2)"/>
      <circle cx="${sx + 92}" cy="${sy + 162 + i * 100}" r="24" fill="${GREEN_MINT}"/>
      <path d="M ${sx + 82} ${sy + 162 + i * 100} l 7 8 l 14 -16" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${sx + 134}" y="${sy + 170 + i * 100}" font-family="${FONT}" font-size="24" font-weight="600" fill="${INK}">${label}</text>`)
      .join("")}
    <path d="M ${sx - 120} ${sy + sh + 18} h ${sw + 240} l 46 96 a 18 18 0 0 1 -18 22 h ${-(sw + 296)} a 18 18 0 0 1 -18 -22 Z" fill="#c9ced1"/>
    <path d="M ${sx - 120} ${sy + sh + 18} h ${sw + 240} l 12 26 h ${-sw - 264} Z" fill="#9aa3a7"/>
    <rect x="${sx + sw / 2 - 110}" y="${sy + sh + 52}" width="220" height="34" rx="10" fill="#b3babe"/>
  </g>
  <g filter="url(#soft2)">
    <path d="M 950 590 v 100 a 55 55 0 0 0 110 0 v -100 Z" fill="#ffffff"/>
    <path d="M 1060 610 q 52 14 0 68" fill="none" stroke="#ffffff" stroke-width="16"/>
    <ellipse cx="1005" cy="590" rx="55" ry="12" fill="#eef1f2"/>
  </g>`);
}

/* Step 3: delivery box with sensor and supplies. */
function stepThree() {
  return svgDoc(1200, 900, `
  <rect width="1200" height="900" fill="url(#mint)"/>
  <rect y="720" width="1200" height="180" fill="url(#wood)"/>
  ${plant(170, 750, 1.4)}
  <g filter="url(#soft)">
    <path d="M 470 330 L 880 300 L 1020 380 V 700 L 610 740 L 470 650 Z" fill="url(#kraft)"/>
    <path d="M 470 330 L 610 410 V 740 L 470 650 Z" fill="#b8945f"/>
    <path d="M 470 330 L 880 300 L 1020 380 L 610 410 Z" fill="#e7c898"/>
    <path d="M 740 306 L 750 412 L 830 407 L 815 300 Z" fill="#dfbf8e" opacity="0.85"/>
    <g transform="translate(815 470) rotate(-4)">
      <rect x="-52" y="-64" width="104" height="104" rx="26" fill="none" stroke="${GREEN}" stroke-width="7"/>
      <circle cx="0" cy="18" r="10" fill="none" stroke="${GREEN}" stroke-width="6"/>
      <circle cx="0" cy="-16" r="4" fill="${GREEN}"/>
      <circle cx="0" cy="-34" r="4" fill="${GREEN}"/>
      <text x="0" y="102" font-family="${FONT}" font-size="34" font-weight="bold" fill="${GREEN}" text-anchor="middle">Your health.</text>
      <text x="0" y="142" font-family="${FONT}" font-size="34" font-weight="bold" fill="${GREEN}" text-anchor="middle">Delivered.</text>
    </g>
    <circle cx="990" cy="620" r="52" fill="#e9dcc4" opacity="0.9"/>
    <text x="990" y="612" font-family="${FONT}" font-size="14" fill="#6d5a3a" text-anchor="middle">Carefully</text>
    <text x="990" y="632" font-family="${FONT}" font-size="14" fill="#6d5a3a" text-anchor="middle">packed</text>
  </g>
  <g filter="url(#soft2)">
    <path d="M 300 470 l 150 -18 q 22 -2 24 18 l 12 130 q 2 20 -20 22 l -150 18 q -22 2 -24 -18 l -12 -130 q -2 -20 20 -22 Z" fill="#f6f4f0"/>
    <text x="336" y="520" font-family="${FONT}" font-size="26" font-weight="bold" fill="${GREEN}" transform="rotate(-6 336 520)">Sensors</text>
    ${bars(338, 540, 120, 2, 20, 8, "#cfd8d3")}
  </g>
  ${sensor(430, 690, 62)}
  <g filter="url(#soft2)" transform="rotate(-8 250 660)">
    <rect x="180" y="620" width="150" height="90" rx="10" fill="#ffffff"/>
    <text x="255" y="658" font-family="${FONT}" font-size="17" font-weight="bold" fill="${INK}" text-anchor="middle">Alcohol Pad</text>
    ${bars(205, 672, 100, 2, 14, 6, "#d7dee1")}
  </g>`);
}

/* Guide 1: open book, "What is a continuous glucose monitor?" */
function guideBook() {
  return svgDoc(1200, 750, `
  <rect width="1200" height="750" fill="url(#mint)"/>
  <g filter="url(#soft)" transform="rotate(-3 600 400)">
    <path d="M 200 180 Q 590 130 596 150 V 610 Q 590 630 200 660 Z" fill="#dff0e6"/>
    <path d="M 992 180 Q 602 130 596 150 V 610 Q 602 630 992 660 Z" fill="#dff0e6"/>
    <path d="M 214 190 Q 588 142 594 160 V 600 Q 588 618 214 648 Z" fill="#ffffff"/>
    <path d="M 978 190 Q 604 142 598 160 V 600 Q 604 618 978 648 Z" fill="#fdfefd"/>
    <text x="256" y="268" font-family="${FONT}" font-size="33" font-weight="bold" fill="#0d1f18" transform="rotate(-4 256 268)">What is a continuous</text>
    <text x="256" y="308" font-family="${FONT}" font-size="33" font-weight="bold" fill="#0d1f18" transform="rotate(-4 256 308)">glucose monitor?</text>
    <g transform="rotate(-4 256 360)">${bars(256, 350, 290, 3, 24, 9, "#b9c6bf")}</g>
    <g transform="rotate(-4 256 470)">${bars(256, 460, 270, 5, 26, 10, "#8fa39a")}</g>
    ${sensor(790, 260, 56)}
    <g transform="rotate(3 790 480)">
      <rect x="648" y="380" width="290" height="170" rx="14" fill="${GREEN_SOFT}"/>
      <rect x="648" y="380" width="290" height="40" rx="14" fill="${GREEN_MINT}"/>
      <circle cx="700" cy="400" r="9" fill="none" stroke="${GREEN}" stroke-width="3"/>
      <circle cx="790" cy="400" r="9" fill="none" stroke="${GREEN}" stroke-width="3"/>
      <path d="M 880 392 a 9 9 0 1 0 4 17" fill="none" stroke="${GREEN}" stroke-width="3"/>
      ${wave(662, 440, 262, 90, GREEN, 5)}
      <text x="642" y="450" font-family="${FONT}" font-size="15" fill="${GREY}" text-anchor="end">180</text>
      <text x="642" y="530" font-family="${FONT}" font-size="15" fill="${GREY}" text-anchor="end">70</text>
      <text x="672" y="580" font-family="${FONT}" font-size="15" fill="${GREY}">12AM</text>
      <text x="780" y="580" font-family="${FONT}" font-size="15" fill="${GREY}">12PM</text>
      <text x="892" y="580" font-family="${FONT}" font-size="15" fill="${GREY}">12AM</text>
    </g>
  </g>
  ${badge(120, 120, "q")}`);
}

/* Guide 2: phone reading next to a sensor, blue scene. */
function guidePhoneSensor() {
  const px = 330, py = 110, pw = 330, ph = 540;
  return svgDoc(1200, 750, `
  <rect width="1200" height="750" fill="url(#blueWash)"/>
  <g filter="url(#soft)" transform="rotate(-6 ${px + pw / 2} ${py + ph / 2})">
    <rect x="${px - 12}" y="${py - 12}" width="${pw + 24}" height="${ph + 24}" rx="50" fill="#2c3438"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="40" fill="#ffffff"/>
    <text x="${px + pw / 2}" y="${py + 52}" font-family="${FONT}" font-size="21" font-weight="600" fill="${INK}" text-anchor="middle">Today</text>
    <text x="${px + pw / 2}" y="${py + 130}" font-family="${FONT}" font-size="56" font-weight="bold" fill="#111c22" text-anchor="middle">6.2 &#8594;</text>
    <text x="${px + pw / 2}" y="${py + 162}" font-family="${FONT}" font-size="18" fill="${GREY}" text-anchor="middle">mmol/L</text>
    <rect x="${px + 28}" y="${py + 195}" width="${pw - 56}" height="180" rx="12" fill="${GREEN_SOFT}"/>
    <rect x="${px + 28}" y="${py + 235}" width="${pw - 56}" height="100" fill="#d8ecdf"/>
    ${wave(px + 40, py + 220, pw - 80, 130, "#0d3f2e", 5)}
    <circle cx="${px + pw / 2}" cy="${py + 218}" r="11" fill="none" stroke="${GREEN}" stroke-width="3"/>
    <text x="${px + 50}" y="${py + 404}" font-family="${FONT}" font-size="14" fill="${GREY}">12AM</text>
    <text x="${px + pw / 2}" y="${py + 404}" font-family="${FONT}" font-size="14" fill="${GREY}" text-anchor="middle">12PM</text>
    <text x="${px + pw - 50}" y="${py + 404}" font-family="${FONT}" font-size="14" fill="${GREY}" text-anchor="end">12AM</text>
    <rect x="${px + 54}" y="${py + ph - 96}" width="${pw - 108}" height="58" rx="29" fill="#5b9bd0"/>
    <text x="${px + pw / 2}" y="${py + ph - 58}" font-family="${FONT}" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle">Add Note</text>
  </g>
  ${sensor(880, 400, 96)}
  ${badge(120, 120, "r")}`);
}

/* Guide 3: customer-care call screen. */
function guideCare() {
  const px = 400, py = 130, pw = 330, ph = 520;
  return svgDoc(1200, 750, `
  <rect width="1200" height="750" fill="url(#mint)"/>
  <g filter="url(#soft)" transform="rotate(-8 ${px + pw / 2} ${py + ph / 2})">
    <rect x="${px - 12}" y="${py - 12}" width="${pw + 24}" height="${ph + 24}" rx="50" fill="#3a4145"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="40" fill="#15191c"/>
    <text x="${px + pw / 2}" y="${py + 96}" font-family="${FONT}" font-size="30" font-weight="600" fill="#ffffff" text-anchor="middle">Customer Care</text>
    <text x="${px + pw / 2}" y="${py + 134}" font-family="${FONT}" font-size="19" fill="#9aa4aa" text-anchor="middle">Calling&#8230;</text>
    ${[-1, 0, 1].map((i) => `
      <circle cx="${px + pw / 2 + i * 88}" cy="${py + 320}" r="34" fill="#2b3237"/>`).join("")}
    <rect x="${px + pw / 2 - 96}" y="${py + 312}" width="20" height="16" rx="3" fill="#8f989d"/>
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) =>
      `<circle cx="${px + pw / 2 - 8 + c * 8}" cy="${py + 312 + r * 8}" r="2.4" fill="#8f989d"/>`).join("")).join("")}
    <path d="M ${px + pw / 2 + 76} ${py + 320} q 12 -12 24 0 M ${px + pw / 2 + 80} ${py + 312} q 8 -8 16 0" fill="none" stroke="#8f989d" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${px + pw / 2}" cy="${py + 430}" r="40" fill="#e04640"/>
    <path d="M ${px + pw / 2 - 16} ${py + 434} q 16 -12 32 0 l -5 8 q -11 -8 -22 0 Z" fill="#ffffff"/>
  </g>
  <g>
    ${plant(940, 560, 1.9)}
  </g>
  ${badge(120, 120, "s")}`);
}

/* Why-monitoring composition: chart card, phone, sensor. */
function whyMonitoring() {
  return svgDoc(1200, 980, `
  <rect width="1200" height="980" fill="#f6fafb"/>
  <circle cx="1010" cy="210" r="240" fill="${GREEN_SOFT}" opacity="0.55"/>
  <circle cx="180" cy="820" r="200" fill="${BLUE_SOFT}" opacity="0.6"/>
  <g filter="url(#soft)">
    <rect x="90" y="80" width="640" height="360" rx="26" fill="#ffffff"/>
    <text x="134" y="146" font-family="${FONT}" font-size="24" font-weight="bold" fill="${BLUE}" letter-spacing="2">YOUR GLUCOSE, ALL DAY</text>
    <text x="694" y="140" font-family="${FONT}" font-size="17" fill="${GREY}" text-anchor="end">Target range</text>
    <rect x="666" y="126" width="16" height="16" rx="4" fill="${GREEN_BRIGHT}" opacity="0.5"/>
    <rect x="134" y="200" width="552" height="130" fill="${GREEN_SOFT}"/>
    ${wave(134, 180, 552, 190, "#1f6fae", 6)}
    <circle cx="686" cy="266" r="9" fill="#1f6fae"/>
    <text x="120" y="208" font-family="${FONT}" font-size="15" fill="${GREY}" text-anchor="end">180</text>
    <text x="120" y="336" font-family="${FONT}" font-size="15" fill="${GREY}" text-anchor="end">70</text>
    ${["12AM", "6AM", "12PM", "6PM", "12AM"].map((t, i) =>
      `<text x="${134 + i * 138}" y="392" font-family="${FONT}" font-size="15" fill="${GREY}">${t}</text>`).join("")}
  </g>
  <path d="M 730 300 h 90 v 160" fill="none" stroke="#5b9bd0" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
  <g filter="url(#soft)">
    <rect x="640" y="470" width="340" height="470" rx="44" fill="#2c3438"/>
    <rect x="652" y="482" width="316" height="446" rx="34" fill="#ffffff"/>
    <text x="810" y="560" font-family="${FONT}" font-size="17" font-weight="600" fill="${GREY}" text-anchor="middle" letter-spacing="1">GLUCOSE IN RANGE</text>
    <text x="810" y="640" font-family="${FONT}" font-size="64" font-weight="bold" fill="#111c22" text-anchor="middle">112 &#8594;</text>
    <text x="810" y="672" font-family="${FONT}" font-size="17" fill="${GREY}" text-anchor="middle">mg/dL</text>
    <rect x="690" y="700" width="240" height="140" rx="12" fill="${GREEN_SOFT}"/>
    ${wave(700, 716, 220, 108, "#123c2d", 4)}
    <text x="810" y="890" font-family="${FONT}" font-size="17" font-weight="600" fill="#1f6fae" text-anchor="middle">ADD NOTE</text>
  </g>
  <g filter="url(#soft2)">
    <rect x="120" y="540" width="300 " height="300" rx="26" fill="#ffffff"/>
    <text x="160" y="600" font-family="${FONT}" font-size="20" font-weight="bold" fill="${INK}">Share your data</text>
    ${[["Family", GREEN_MINT, GREEN], ["Caregivers", BLUE_SOFT, BLUE], ["Care team", GREEN_SOFT, GREEN]].map(([label, bg, fg], i) => `
      <circle cx="182" cy="${648 + i * 62}" r="21" fill="${bg}"/>
      <circle cx="182" cy="${642 + i * 62}" r="7" fill="none" stroke="${fg}" stroke-width="3"/>
      <path d="M 170 ${660 + i * 62} a 12 8 0 0 1 24 0" fill="none" stroke="${fg}" stroke-width="3"/>
      <text x="220" y="${648 + i * 62}" font-family="${FONT}" font-size="18" font-weight="600" fill="${INK}">${label}</text>
      <text x="220" y="${670 + i * 62}" font-family="${FONT}" font-size="14" fill="${GREY}">View your data</text>`).join("")}
  </g>
  ${sensor(1050, 840, 78)}
  <path d="M 980 470 v -30 h 60" fill="none" stroke="#5b9bd0" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>`);
}

/* ---------- render ---------- */

const SCENES = {
  "step-1-short-form": [stepOne(), 1200],
  "step-2-review": [stepTwo(), 1200],
  "step-3-delivery": [stepThree(), 1200],
  "guide-what-is-a-cgm": [guideBook(), 1200],
  "guide-libre-or-dexcom": [guidePhoneSensor(), 1200],
  "guide-coverage": [guideCare(), 1200],
  "why-monitoring": [whyMonitoring(), 1200],
};

await mkdir(outDir, { recursive: true });
for (const [name, [svg, width]] of Object.entries(SCENES)) {
  const out = join(outDir, `${name}.webp`);
  const buffer = await sharp(Buffer.from(svg), { density: 96 })
    .resize({ width })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(out, buffer);
  console.log(`${name}.webp  ${(buffer.length / 1024).toFixed(0)} kB`);
}
