import { continueRender, delayRender, staticFile } from "remotion";

/* The website's palette: navy, cyan and white, with their tints. */
export const C = {
  navy: "#00293b",
  abyss: "#001824",
  raised: "#0b3a52",
  cyan: "#18bada",
  cyanDeep: "#0a6d8a",
  teal: "#0d99bb",
  canvas: "#e6f4f9",
  surface: "#f3fafc",
  soft: "#cdeaf3",
  line: "#bfdde8",
  ink: "#00293b",
  inkMuted: "#3d6273",
  inkDark: "#1d4a5e",
  onDarkBrand: "#c5e3ee",
  onDarkMuted: "#a3c6d4",
  onDarkAccent: "#6fc4e0",
  white: "#ffffff",
};

export const DISPLAY = "Poppins, sans-serif";
export const BODY = "Inter, sans-serif";

const FACES: [string, string, string][] = [
  ["Poppins", "400", "fonts/poppins-400.woff2"],
  ["Poppins", "500", "fonts/poppins-500.woff2"],
  ["Poppins", "600", "fonts/poppins-600.woff2"],
  ["Poppins", "700", "fonts/poppins-700.woff2"],
  ["Poppins", "800", "fonts/poppins-800.woff2"],
  ["Inter", "100 900", "fonts/inter-var.woff2"],
];

// Hold every frame until both typefaces are ready, so no frame renders in a fallback font.
const handle = delayRender("Loading fonts");
Promise.all(
  FACES.map(([family, weight, file]) =>
    new FontFace(family, `url(${staticFile(file)}) format("woff2")`, { weight }).load().then((f) => {
      document.fonts.add(f);
    }),
  ),
)
  .then(() => continueRender(handle))
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
