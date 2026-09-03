/*
  The fonts an article may be set in.

  The site itself uses two faces, Poppins for display and Inter for text, and
  those remain the defaults for every block. The client asked on 2026-09-02
  for articles to reach further than that, so an author can choose from the
  list below: the site's two faces, the faces every device already carries,
  and a spread of Google Fonts across sans, serif, display, handwriting and
  monospace. The spread grew on 2026-09-03 to 172 Google families, checked
  one by one against the Fonts API before they were added.

  A Google font is fetched only on a page that actually uses it, through the
  same stylesheet route index.html already takes for Poppins and Inter, so a
  visitor who never opens an article never downloads one. Nothing here is a
  script: Google Fonts serves CSS and font files from a host the site already
  reaches for its own type.

  A block stores the id, never a family name, and the decoder in blog.ts drops
  an id it does not recognise. A stored post can therefore only ever name a
  font on this list, which is what keeps a raw value out of the page.
*/

export type FontCategory =
  | "brand"
  | "system"
  | "sans"
  | "serif"
  | "display"
  | "handwriting"
  | "mono";

export interface FontFace {
  id: string;
  label: string;
  category: FontCategory;
  /* The CSS font-family value, with its fallback. */
  family: string;
  /*
    The family parameter of the Google Fonts request, for a Google font.
    Weights are listed only for a family that has them: asking the API for a
    weight a family lacks fails the whole request, and the single-weight
    display faces below have nothing to ask for.
  */
  google?: string;
}

const g = (
  label: string,
  category: FontCategory,
  generic: string,
  weights?: string,
): FontFace => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label,
  category,
  family: `"${label}", ${generic}`,
  google: `${label.replace(/ /g, "+")}${weights ? `:wght@${weights}` : ""}`,
});

const system = (label: string, family: string): FontFace => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label,
  category: "system",
  family,
});

export const FONTS: FontFace[] = [
  /* The site's own two faces, already loaded by index.html. */
  { id: "body", label: "Inter", category: "brand", family: "var(--font-body)" },
  { id: "display", label: "Poppins", category: "brand", family: "var(--font-display)" },

  /* Faces every device has, so nothing is fetched. */
  system("Arial", "Arial, Helvetica, sans-serif"),
  system("Helvetica", "Helvetica, Arial, sans-serif"),
  system("Verdana", "Verdana, Geneva, sans-serif"),
  system("Trebuchet", '"Trebuchet MS", Helvetica, sans-serif'),
  system("Georgia", "Georgia, serif"),
  system("Times New Roman", '"Times New Roman", Times, serif'),
  system("Courier New", '"Courier New", Courier, monospace'),

  /* Sans serif */
  g("Roboto", "sans", "sans-serif", "400;500;700"),
  g("Open Sans", "sans", "sans-serif", "400;600;700"),
  g("Lato", "sans", "sans-serif", "400;700"),
  g("Montserrat", "sans", "sans-serif", "400;600;700"),
  g("Nunito", "sans", "sans-serif", "400;600;700"),
  g("Raleway", "sans", "sans-serif", "400;600;700"),
  g("Work Sans", "sans", "sans-serif", "400;600;700"),
  g("Source Sans 3", "sans", "sans-serif", "400;600;700"),
  g("DM Sans", "sans", "sans-serif", "400;500;700"),
  g("Manrope", "sans", "sans-serif", "400;600;700"),
  g("Plus Jakarta Sans", "sans", "sans-serif", "400;600;700"),
  g("Rubik", "sans", "sans-serif", "400;500;700"),
  g("Karla", "sans", "sans-serif", "400;600;700"),
  g("Mulish", "sans", "sans-serif", "400;600;700"),
  g("Figtree", "sans", "sans-serif", "400;600;700"),
  g("Outfit", "sans", "sans-serif", "400;600;700"),
  g("Quicksand", "sans", "sans-serif", "400;600;700"),
  g("Josefin Sans", "sans", "sans-serif", "400;600;700"),
  g("Noto Sans", "sans", "sans-serif", "400;700"),
  g("PT Sans", "sans", "sans-serif", "400;700"),
  g("Ubuntu", "sans", "sans-serif", "400;500;700"),
  g("Cabin", "sans", "sans-serif", "400;600;700"),
  g("Barlow", "sans", "sans-serif", "400;600;700"),
  g("Hind", "sans", "sans-serif", "400;600;700"),
  g("Heebo", "sans", "sans-serif", "400;600;700"),
  g("Oxygen", "sans", "sans-serif", "400;700"),
  g("Titillium Web", "sans", "sans-serif", "400;600;700"),
  g("Exo 2", "sans", "sans-serif", "400;600;700"),
  g("Kanit", "sans", "sans-serif", "400;600;700"),
  g("Archivo", "sans", "sans-serif", "400;600;700"),
  g("Assistant", "sans", "sans-serif", "400;600;700"),
  g("Nunito Sans", "sans", "sans-serif", "400;600;700"),
  g("Libre Franklin", "sans", "sans-serif", "400;600;700"),
  g("Public Sans", "sans", "sans-serif", "400;600;700"),
  g("Red Hat Display", "sans", "sans-serif", "400;600;700"),
  g("Sora", "sans", "sans-serif", "400;600;700"),
  g("Urbanist", "sans", "sans-serif", "400;600;700"),
  g("Lexend", "sans", "sans-serif", "400;600;700"),
  g("Space Grotesk", "sans", "sans-serif", "400;500;700"),
  g("Jost", "sans", "sans-serif", "400;600;700"),
  g("Be Vietnam Pro", "sans", "sans-serif", "400;600;700"),
  g("Albert Sans", "sans", "sans-serif", "400;600;700"),
  g("Instrument Sans", "sans", "sans-serif", "400;600;700"),
  g("Fira Sans", "sans", "sans-serif", "400;600;700"),
  g("IBM Plex Sans", "sans", "sans-serif", "400;600;700"),
  g("Overpass", "sans", "sans-serif", "400;600;700"),
  g("Dosis", "sans", "sans-serif", "400;600;700"),
  g("Atkinson Hyperlegible", "sans", "sans-serif", "400;700"),
  g("Varela Round", "sans", "sans-serif"),
  g("Questrial", "sans", "sans-serif"),

  /* Serif */
  g("Merriweather", "serif", "serif", "400;700"),
  g("Playfair Display", "serif", "serif", "400;600;700"),
  g("Lora", "serif", "serif", "400;600;700"),
  g("PT Serif", "serif", "serif", "400;700"),
  g("Libre Baskerville", "serif", "serif", "400;700"),
  g("Source Serif 4", "serif", "serif", "400;600;700"),
  g("EB Garamond", "serif", "serif", "400;600;700"),
  g("Crimson Text", "serif", "serif", "400;600;700"),
  g("Cormorant Garamond", "serif", "serif", "400;600;700"),
  g("Noto Serif", "serif", "serif", "400;700"),
  g("DM Serif Display", "serif", "serif"),
  g("Bitter", "serif", "serif", "400;700"),
  g("Domine", "serif", "serif", "400;700"),
  g("Cardo", "serif", "serif", "400;700"),
  g("Spectral", "serif", "serif", "400;600;700"),
  g("Zilla Slab", "serif", "serif", "400;600;700"),
  g("Arvo", "serif", "serif", "400;700"),
  g("Roboto Slab", "serif", "serif", "400;700"),
  g("Roboto Serif", "serif", "serif", "400;600;700"),
  g("Libre Caslon Text", "serif", "serif", "400;700"),
  g("Old Standard TT", "serif", "serif", "400;700"),
  g("Vollkorn", "serif", "serif", "400;600;700"),
  g("Alegreya", "serif", "serif", "400;700"),
  g("Gelasio", "serif", "serif", "400;700"),
  g("Frank Ruhl Libre", "serif", "serif", "400;700"),
  g("Fraunces", "serif", "serif", "400;600;700"),
  g("Newsreader", "serif", "serif", "400;600;700"),
  g("Literata", "serif", "serif", "400;700"),
  g("Cormorant", "serif", "serif", "400;600;700"),
  g("Crimson Pro", "serif", "serif", "400;600;700"),
  g("Bodoni Moda", "serif", "serif", "400;600;700"),
  g("Josefin Slab", "serif", "serif", "400;700"),
  g("Rokkitt", "serif", "serif", "400;700"),
  g("Noticia Text", "serif", "serif", "400;700"),
  g("Prata", "serif", "serif"),
  g("Marcellus", "serif", "serif"),
  g("Instrument Serif", "serif", "serif"),
  g("DM Serif Text", "serif", "serif"),

  /* Display */
  g("Oswald", "display", "sans-serif", "400;600;700"),
  g("Bebas Neue", "display", "sans-serif"),
  g("Abril Fatface", "display", "serif"),
  g("Righteous", "display", "sans-serif"),
  g("Lobster", "display", "cursive"),
  g("Anton", "display", "sans-serif"),
  g("Archivo Black", "display", "sans-serif"),
  g("Bangers", "display", "cursive"),
  g("Alfa Slab One", "display", "serif"),
  g("Bungee", "display", "sans-serif"),
  g("Fjalla One", "display", "sans-serif"),
  g("Francois One", "display", "sans-serif"),
  g("Lilita One", "display", "sans-serif"),
  g("Patua One", "display", "serif"),
  g("Russo One", "display", "sans-serif"),
  g("Yeseva One", "display", "serif"),
  g("Monoton", "display", "cursive"),
  g("Staatliches", "display", "sans-serif"),
  g("Luckiest Guy", "display", "cursive"),
  g("Passion One", "display", "sans-serif", "400;700"),
  g("Teko", "display", "sans-serif", "400;600"),
  g("Fredoka", "display", "sans-serif", "400;600"),
  g("Comfortaa", "display", "sans-serif", "400;700"),
  g("Orbitron", "display", "sans-serif", "400;700"),
  g("Barlow Condensed", "display", "sans-serif", "400;600;700"),
  g("Antonio", "display", "sans-serif", "400;700"),
  g("League Spartan", "display", "sans-serif", "400;700"),
  g("Syne", "display", "sans-serif", "400;700"),
  g("Unbounded", "display", "sans-serif", "400;700"),
  g("Cinzel", "display", "serif", "400;700"),

  /* Handwriting */
  g("Pacifico", "handwriting", "cursive"),
  g("Caveat", "handwriting", "cursive", "400;700"),
  g("Dancing Script", "handwriting", "cursive", "400;700"),
  g("Satisfy", "handwriting", "cursive"),
  g("Shadows Into Light", "handwriting", "cursive"),
  g("Kalam", "handwriting", "cursive", "400;700"),
  g("Permanent Marker", "handwriting", "cursive"),
  g("Great Vibes", "handwriting", "cursive"),
  g("Sacramento", "handwriting", "cursive"),
  g("Cookie", "handwriting", "cursive"),
  g("Courgette", "handwriting", "cursive"),
  g("Kaushan Script", "handwriting", "cursive"),
  g("Indie Flower", "handwriting", "cursive"),
  g("Gloria Hallelujah", "handwriting", "cursive"),
  g("Homemade Apple", "handwriting", "cursive"),
  g("Yellowtail", "handwriting", "cursive"),
  g("Allura", "handwriting", "cursive"),
  g("Alex Brush", "handwriting", "cursive"),
  g("Parisienne", "handwriting", "cursive"),
  g("Marck Script", "handwriting", "cursive"),
  g("Handlee", "handwriting", "cursive"),
  g("Patrick Hand", "handwriting", "cursive"),
  g("Architects Daughter", "handwriting", "cursive"),
  g("Rock Salt", "handwriting", "cursive"),
  g("Reenie Beanie", "handwriting", "cursive"),
  g("Nothing You Could Do", "handwriting", "cursive"),
  g("Playball", "handwriting", "cursive"),
  g("Bad Script", "handwriting", "cursive"),
  g("Nanum Pen Script", "handwriting", "cursive"),
  g("Amatic SC", "handwriting", "cursive", "400;700"),
  g("Tangerine", "handwriting", "cursive", "400;700"),
  g("Lobster Two", "handwriting", "cursive", "400;700"),
  g("Merienda", "handwriting", "cursive", "400;700"),
  g("Comic Neue", "handwriting", "cursive", "400;700"),

  /* Monospace */
  g("Roboto Mono", "mono", "monospace", "400;700"),
  g("Source Code Pro", "mono", "monospace", "400;700"),
  g("JetBrains Mono", "mono", "monospace", "400;700"),
  g("Fira Code", "mono", "monospace", "400;700"),
  g("IBM Plex Mono", "mono", "monospace", "400;700"),
  g("Space Mono", "mono", "monospace", "400;700"),
  g("Inconsolata", "mono", "monospace", "400;700"),
  g("Ubuntu Mono", "mono", "monospace", "400;700"),
  g("Courier Prime", "mono", "monospace", "400;700"),
  g("DM Mono", "mono", "monospace", "400;500"),
  g("Overpass Mono", "mono", "monospace", "400;700"),
  g("Red Hat Mono", "mono", "monospace", "400;700"),
  g("Cousine", "mono", "monospace", "400;700"),
  g("Anonymous Pro", "mono", "monospace", "400;700"),
  g("Fira Mono", "mono", "monospace", "400;700"),
  g("Azeret Mono", "mono", "monospace", "400;700"),
  g("Martian Mono", "mono", "monospace", "400;700"),
  g("PT Mono", "mono", "monospace"),
  g("Share Tech Mono", "mono", "monospace"),
  g("VT323", "mono", "monospace"),
];

export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  brand: "The site's own",
  system: "On every device",
  sans: "Sans serif",
  serif: "Serif",
  display: "Display",
  handwriting: "Handwriting",
  mono: "Monospace",
};

const BY_ID = new Map(FONTS.map((font) => [font.id, font]));

export function fontById(id: string | undefined): FontFace | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function isFontId(value: unknown): value is string {
  return typeof value === "string" && BY_ID.has(value);
}

/* The CSS value for a block's font. An unknown or missing id falls back to
   the given default, which is the body face unless a heading asks for the
   display face. */
export function fontFamily(id: string | undefined, fallback: "body" | "display" = "body"): string {
  return (fontById(id) ?? BY_ID.get(fallback)!).family;
}

/*
  Fetches a Google font the first time a page needs it. One link per family,
  found again by its data attribute so a second mount cannot add a second
  request. The site's own faces and the system faces need nothing.
*/
const requested = new Set<string>();

export function ensureFontLoaded(id: string | undefined) {
  const font = fontById(id);
  if (!font?.google || requested.has(font.id) || typeof document === "undefined") return;
  requested.add(font.id);
  if (document.querySelector(`link[data-font="${font.id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  link.dataset.font = font.id;
  document.head.appendChild(link);
}

/*
  A preview of a face: a stylesheet holding only the letters of the family's
  own name, so the dashboard's font list can show each name in its own face
  for a few hundred bytes a row. The request names no weight, which returns
  the regular instance of every family and can never ask for a weight a
  family lacks. The full family is fetched by ensureFontLoaded only when a
  face is chosen.
*/
const previewed = new Set<string>();

export function ensureFontPreview(id: string | undefined) {
  const font = fontById(id);
  if (!font?.google || previewed.has(font.id) || typeof document === "undefined") return;
  previewed.add(font.id);
  if (document.querySelector(`link[data-font="${font.id}"], link[data-font-preview="${font.id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.label.replace(/ /g, "+")}&text=${encodeURIComponent(font.label)}&display=swap`;
  link.dataset.fontPreview = font.id;
  document.head.appendChild(link);
}
