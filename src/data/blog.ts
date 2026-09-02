import { fontFamily, isFontId } from "./fonts";

/*
  The blog: its shape, and the small formatting language its text uses.

  A post is a list of typed blocks rather than a blob of HTML. Two reasons.

  First, safety. Post bodies arrive from Firestore, which means they arrive
  from whatever the dashboard wrote, and one day from whoever else is given an
  editor account. Rendering stored HTML would mean trusting all of that. There
  is no path here by which stored text becomes markup: every string is escaped
  before any formatting is applied, so a pasted <script> is displayed as the
  characters a person typed and never runs.

  Second, the design system. CLAUDE.md's rule is that colour and type come
  from the tokens in index.css and never from raw values in a component. The
  blog is the one deliberate exception, made on the client's instruction on
  2026-09-02: an author may set a block in any colour and any font on the
  list in fonts.ts. What keeps that safe is that nothing is trusted on the
  way back in. A colour is either the name of a brand token or a six-figure
  hex code, checked by pattern; a font is an id the list recognises; anything
  else is dropped by the decoder below. The renderer is still the only thing
  that turns either into a style, and the rest of the site never sees them.

  Inline text uses a deliberately tiny subset of Markdown:

      **bold**        *italic*        [label](https://example.com)

  Nothing else is special, so an author can write an apostrophe or an asterisk
  without thinking about it.
*/

/* ---- blocks ---- */

/* The brand palette, offered as swatches. Each maps to a design token. */
export type KnownColor = "ink" | "brand" | "teal" | "accent" | "muted" | "cta";

/* A block's colour: a swatch name, or any colour as #rrggbb. */
export type BlockColor = KnownColor | `#${string}`;

export const BLOCK_COLORS: { id: KnownColor; label: string; token: string }[] = [
  { id: "ink", label: "Navy", token: "var(--color-ink)" },
  { id: "brand", label: "Brand", token: "var(--color-brand)" },
  { id: "teal", label: "Teal", token: "var(--color-teal)" },
  { id: "accent", label: "Cyan", token: "var(--color-accent-deep)" },
  { id: "muted", label: "Grey", token: "var(--color-grey-dark)" },
  { id: "cta", label: "Orange", token: "var(--color-cta-hover)" },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function isBlockColor(value: unknown): value is BlockColor {
  return (
    typeof value === "string" &&
    (BLOCK_COLORS.some((c) => c.id === value) || HEX.test(value))
  );
}

/* The CSS value for a block's colour. A swatch becomes its token; a hex code
   is used as it is, since the decoder has already checked its shape. */
export function colorToken(color: BlockColor | undefined): string {
  const swatch = BLOCK_COLORS.find((c) => c.id === color);
  if (swatch) return swatch.token;
  if (color && HEX.test(color)) return color.toLowerCase();
  return "var(--color-grey-dark)";
}

/* A font is an id from fonts.ts. The value is kept as a string here so a
   post does not have to change shape when a face is added to that list. */
export type BlockFont = string;

export function fontToken(font: BlockFont | undefined, fallback: "body" | "display" = "body") {
  return fontFamily(font, fallback);
}

export type BlockAlign = "left" | "center";

/* Aspect ratios an author can pick for a picture. "auto" keeps whatever the
   uploaded file already is, which is the right answer for a screenshot or a
   diagram that must not be cropped. */
export type ImageRatio = "16/9" | "4/3" | "3/2" | "1/1" | "auto";

export const IMAGE_RATIOS: { id: ImageRatio; label: string }[] = [
  { id: "16/9", label: "Wide 16:9" },
  { id: "4/3", label: "Classic 4:3" },
  { id: "3/2", label: "Photo 3:2" },
  { id: "1/1", label: "Square 1:1" },
  { id: "auto", label: "Original shape" },
];

export type CalloutTone = "brand" | "accent" | "warn";

export interface BaseBlock {
  id: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
  color?: BlockColor;
  font?: BlockFont;
  align?: BlockAlign;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  /* 2 and 3 only. The post's own title is the page's h1, and skipping levels
     breaks the outline a screen reader announces. */
  level: 2 | 3;
  text: string;
  color?: BlockColor;
  font?: BlockFont;
  align?: BlockAlign;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  style: "bullet" | "number";
  items: string[];
  color?: BlockColor;
  font?: BlockFont;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
  attribution?: string;
  color?: BlockColor;
  font?: BlockFont;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt: string;
  ratio: ImageRatio;
  /* "inset" keeps the picture inside the reading column; "full" lets it run
     to the width of the article. */
  width: "inset" | "full";
  caption?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  text: string;
  tone: CalloutTone;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export type PostBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | ImageBlock
  | CalloutBlock
  | DividerBlock;

export const BLOCK_LABEL: Record<PostBlock["type"], string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  list: "List",
  quote: "Quote",
  image: "Picture",
  callout: "Highlight",
  divider: "Divider",
};

export interface Post {
  /* The document id, and the address: /blog/<slug>. */
  slug: string;
  title: string;
  excerpt: string;
  body: PostBlock[];
  image: string;
  imageAlt: string;
  author: string;
  /* ISO date. Sorting and the visible date both read this. */
  publishedAt: string;
  published: boolean;
}

/* ---- inline formatting ----

   The parser walks the string once and returns pieces the renderer turns into
   elements. It never produces markup, so nothing a person types can become an
   element they did not ask for. */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

/* Only http and https links are kept. A javascript: or data: address would
   otherwise be a way to run code from a stored post. */
function safeHref(raw: string): string | null {
  const value = raw.trim();
  return /^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("mailto:")
    ? value
    : null;
}

const PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(input: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  PATTERN.lastIndex = 0;
  while ((match = PATTERN.exec(input)) !== null) {
    if (match.index > last) spans.push({ text: input.slice(last, match.index) });

    if (match[1] !== undefined) spans.push({ text: match[1], bold: true });
    else if (match[2] !== undefined) spans.push({ text: match[2], italic: true });
    else if (match[3] !== undefined) {
      const href = safeHref(match[4] ?? "");
      /* An address that is not allowed loses its link and keeps its words,
         rather than disappearing and taking the sentence with it. */
      spans.push(href ? { text: match[3], href } : { text: match[3] });
    }
    last = match.index + match[0].length;
  }

  if (last < input.length) spans.push({ text: input.slice(last) });
  return spans.length ? spans : [{ text: input }];
}

/* Plain text of a post, for the reading time and for a description when the
   author has not written an excerpt. */
export function postPlainText(body: PostBlock[]): string {
  return body
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
        case "callout":
          return block.text;
        case "quote":
          return `${block.text} ${block.attribution ?? ""}`;
        case "list":
          return block.items.join(" ");
        default:
          return "";
      }
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Whether there is anything for a reader: some words, or at least a picture.
   The editor asks this before it lets a post be published. */
export function postHasContent(body: PostBlock[]): boolean {
  return postPlainText(body) !== "" || body.some((block) => block.type === "image" && block.url !== "");
}

/* 200 words a minute, rounded up, floor of one. Close enough to be useful and
   never zero, which reads as a mistake. */
export function readingMinutes(body: PostBlock[]): number {
  const words = postPlainText(body).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatPostDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function newBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

/* A new block of each type, so the editor never has to know their shapes. */
export function emptyBlock(type: PostBlock["type"]): PostBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type: "heading", level: 2, text: "" };
    case "list":
      return { id, type: "list", style: "bullet", items: [""] };
    case "quote":
      return { id, type: "quote", text: "" };
    case "image":
      return { id, type: "image", url: "", alt: "", ratio: "16/9", width: "inset" };
    case "callout":
      return { id, type: "callout", text: "", tone: "brand" };
    case "divider":
      return { id, type: "divider" };
    default:
      return { id, type: "paragraph", text: "" };
  }
}

/*
  Decoding what came back from the database.

  Everything is checked rather than trusted. A malformed block is dropped
  instead of throwing, so one bad record can never take a page down, and a
  colour, font or alignment the site does not recognise is dropped from its
  block rather than written into the page.
*/
function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asColor(value: unknown): BlockColor | undefined {
  return isBlockColor(value) ? (value.startsWith("#") ? (value.toLowerCase() as BlockColor) : value) : undefined;
}

function asFont(value: unknown): BlockFont | undefined {
  return isFontId(value) ? value : undefined;
}

function asAlign(value: unknown): BlockAlign | undefined {
  return value === "center" ? "center" : value === "left" ? "left" : undefined;
}

export function decodeBlocks(raw: unknown): PostBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: PostBlock[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const b = entry as Record<string, unknown>;
    const id = asString(b.id) || newBlockId();

    switch (b.type) {
      case "paragraph":
        out.push({
          id,
          type: "paragraph",
          text: asString(b.text),
          color: asColor(b.color),
          font: asFont(b.font),
          align: asAlign(b.align),
        });
        break;
      case "heading":
        out.push({
          id,
          type: "heading",
          level: b.level === 3 ? 3 : 2,
          text: asString(b.text),
          color: asColor(b.color),
          font: asFont(b.font),
          align: asAlign(b.align),
        });
        break;
      case "list":
        out.push({
          id,
          type: "list",
          style: b.style === "number" ? "number" : "bullet",
          items: Array.isArray(b.items) ? b.items.map((i) => asString(i)) : [],
          color: asColor(b.color),
          font: asFont(b.font),
        });
        break;
      case "quote":
        out.push({
          id,
          type: "quote",
          text: asString(b.text),
          attribution: asString(b.attribution) || undefined,
          color: asColor(b.color),
          font: asFont(b.font),
        });
        break;
      case "image":
        out.push({
          id,
          type: "image",
          url: asString(b.url),
          alt: asString(b.alt),
          ratio: (IMAGE_RATIOS.find((r) => r.id === b.ratio)?.id ?? "16/9") as ImageRatio,
          width: b.width === "full" ? "full" : "inset",
          caption: asString(b.caption) || undefined,
        });
        break;
      case "callout":
        out.push({
          id,
          type: "callout",
          text: asString(b.text),
          tone: (["brand", "accent", "warn"].includes(b.tone as string)
            ? b.tone
            : "brand") as CalloutTone,
        });
        break;
      case "divider":
        out.push({ id, type: "divider" });
        break;
      default:
        break;
    }
  }
  return out;
}
