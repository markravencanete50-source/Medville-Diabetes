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

  Since 2026-09-03 the same discipline covers two more choices. A post may
  name one of five layouts (a template), and any block may name one of the
  site's own scroll reveals as its animation, with a pace and a delay. Both
  are ids from the tables below, both are checked on the way in, and both
  become nothing more than a class name on the page.

  Inline text uses a deliberately tiny subset of Markdown:

      **bold**        *italic*        [label](https://example.com)

  Nothing else is special, so an author can write an apostrophe or an asterisk
  without thinking about it.
*/

/* ---- colour and type ---- */

/* The brand palette, offered as swatches. Each maps to a design token. The
   palette has had no orange since 2026-09-02; a post saved earlier with the
   old "cta" swatch falls back to the default text colour.

   `hex` is the value the token resolves to on the public site, kept in step
   by hand. Only the dashboard's colour picker reads it, to place its plane
   on a named swatch; the page itself always paints the token. */
export type KnownColor = "ink" | "brand" | "teal" | "accent" | "muted";

/* A block's colour: a swatch name, or any colour as #rrggbb. */
export type BlockColor = KnownColor | `#${string}`;

export const BLOCK_COLORS: { id: KnownColor; label: string; token: string; hex: string }[] = [
  { id: "ink", label: "Navy", token: "var(--color-ink)", hex: "#00293b" },
  { id: "brand", label: "Brand", token: "var(--color-brand)", hex: "#0a6d8a" },
  { id: "teal", label: "Teal", token: "var(--color-teal)", hex: "#0d99bb" },
  { id: "accent", label: "Cyan", token: "var(--color-accent-deep)", hex: "#0b7c9d" },
  { id: "muted", label: "Soft navy", token: "var(--color-grey-dark)", hex: "#1d4a5e" },
];

/* The one shape a stored colour may take besides a swatch name. Shared with
   the dashboard so the picker and the decoder can never disagree. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isBlockColor(value: unknown): value is BlockColor {
  return (
    typeof value === "string" &&
    (BLOCK_COLORS.some((c) => c.id === value) || HEX_COLOR.test(value))
  );
}

/* The CSS value for a block's colour. A swatch becomes its token; a hex code
   is used as it is, since the decoder has already checked its shape. */
export function colorToken(color: BlockColor | undefined): string {
  const swatch = BLOCK_COLORS.find((c) => c.id === color);
  if (swatch) return swatch.token;
  if (color && HEX_COLOR.test(color)) return color.toLowerCase();
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

/* ---- motion ----

   A block arrives on screen with one of the site's own scroll reveals, the
   same vocabulary the marketing pages use (see the reveal block of index.css
   and lib/useReveal.ts). Each effect below is nothing more than the class
   name that picks the arrival shape, so a stored animation can only ever
   become a class the stylesheet already defines. The pace is a second class
   and the delay is the number useReveal reads from data-reveal.

   Reduced motion needs nothing here: the starting state is applied by the
   hook, which does not run for a visitor who has asked for less movement, so
   every block simply stays visible. */

export type AnimationEffect =
  | "fade"
  | "rise"
  | "settle"
  | "drop"
  | "blur"
  | "left"
  | "right"
  | "swing-left"
  | "swing-right"
  | "zoom"
  | "push"
  | "tilt"
  | "curtain"
  | "curtain-left"
  | "expand";

export type AnimationPace = "swift" | "normal" | "slow" | "glacial";

export interface BlockAnimation {
  effect: AnimationEffect;
  /* Absent means the normal pace, about a second. */
  pace?: AnimationPace;
  /* Milliseconds before the arrival starts, in steps of 50 up to 800. Absent
     means none. */
  delay?: number;
}

export const ANIMATION_DELAY_MAX = 800;
export const ANIMATION_DELAY_STEP = 50;

export type AnimationGroup = "Enter" | "Slide" | "Zoom" | "Reveal";

export const ANIMATION_GROUPS: AnimationGroup[] = ["Enter", "Slide", "Zoom", "Reveal"];

export interface AnimationDef {
  id: AnimationEffect;
  label: string;
  group: AnimationGroup;
  /* The reveal class. Empty for the default rise, which needs none. */
  className: string;
  /* A curtain moves the block inside a frame that holds still, so the
     renderer wraps it rather than animating the block itself. */
  curtain?: boolean;
  description: string;
}

export const ANIMATIONS: AnimationDef[] = [
  { id: "fade", label: "Fade in", group: "Enter", className: "reveal-fade", description: "Appears in place, with no movement." },
  { id: "rise", label: "Rise", group: "Enter", className: "", description: "Lifts up into place." },
  { id: "settle", label: "Settle", group: "Enter", className: "reveal-settle", description: "The smallest lift there is, for dense text." },
  { id: "drop", label: "Drop", group: "Enter", className: "reveal-drop", description: "Falls into place from above." },
  { id: "blur", label: "Focus", group: "Enter", className: "reveal-blur", description: "Sharpens out of a soft blur." },
  { id: "left", label: "From the left", group: "Slide", className: "reveal-left", description: "Slides in from the left. On a phone it rises instead." },
  { id: "right", label: "From the right", group: "Slide", className: "reveal-right", description: "Slides in from the right. On a phone it rises instead." },
  { id: "swing-left", label: "Swing from the left", group: "Slide", className: "reveal-swing-left", description: "Swings open from its left edge." },
  { id: "swing-right", label: "Swing from the right", group: "Slide", className: "reveal-swing-right", description: "Swings open from its right edge." },
  { id: "zoom", label: "Zoom in", group: "Zoom", className: "reveal-zoom", description: "Grows into place from slightly smaller." },
  { id: "push", label: "Push back", group: "Zoom", className: "reveal-push", description: "Settles back from slightly larger." },
  { id: "tilt", label: "Tilt up", group: "Zoom", className: "reveal-tilt", description: "Tilts up from the page, like a card." },
  { id: "curtain", label: "Curtain up", group: "Reveal", className: "reveal-curtain", curtain: true, description: "Slides up inside its own frame. Suits a picture." },
  { id: "curtain-left", label: "Curtain across", group: "Reveal", className: "reveal-curtain-left", curtain: true, description: "Slides across inside its own frame." },
  { id: "expand", label: "Widen", group: "Reveal", className: "reveal-expand", description: "Widens from its centre. Suits a divider." },
];

export const ANIMATION_PACES: { id: AnimationPace; label: string; className: string; seconds: string }[] = [
  { id: "swift", label: "Swift", className: "reveal-swift", seconds: "0.8" },
  { id: "normal", label: "Normal", className: "", seconds: "1" },
  { id: "slow", label: "Slow", className: "reveal-slow", seconds: "1.4" },
  { id: "glacial", label: "Glacial", className: "reveal-glacial", seconds: "1.75" },
];

export function animationById(id: unknown): AnimationDef | undefined {
  return ANIMATIONS.find((animation) => animation.id === id);
}

/* The class list an animated block carries: its shape, then its pace. */
export function animationClass(animation: BlockAnimation): string {
  const effect = animationById(animation.effect)?.className ?? "";
  const pace = ANIMATION_PACES.find((p) => p.id === animation.pace)?.className ?? "";
  return [effect, pace].filter(Boolean).join(" ");
}

/* ---- blocks ---- */

export interface BaseBlock {
  id: string;
  /* How the block arrives on screen. Absent means it is simply there. */
  animation?: BlockAnimation;
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
  align?: BlockAlign;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
  attribution?: string;
  color?: BlockColor;
  font?: BlockFont;
  align?: BlockAlign;
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

/* Whether any block asks to arrive with motion. The article page uses this
   to decide between one reveal for the whole body and one per block. */
export function hasAnimations(blocks: PostBlock[]): boolean {
  return blocks.some((block) => block.animation !== undefined);
}

/* ---- the post and its layout ---- */

/* The layouts an article can take. Each is rendered by ArticleHeader for the
   page and for the dashboard preview alike, so the two cannot drift. A post
   saved before layouts existed has no template and reads as Classic. */
export type PostTemplate = "classic" | "magazine" | "minimal" | "feature" | "split";

export const DEFAULT_TEMPLATE: PostTemplate = "classic";

export const POST_TEMPLATES: { id: PostTemplate; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "Title on the navy band, a framed cover picture, then a comfortable reading column." },
  { id: "magazine", label: "Magazine", description: "A full width cover with the title laid over it on a navy fade." },
  { id: "minimal", label: "Minimal", description: "No cover picture. A large title and a narrow column for reading." },
  { id: "feature", label: "Feature", description: "A wide cover and a wider column, for a long article with pictures." },
  { id: "split", label: "Split", description: "Cover on the right, title on the left. Stacks on a phone." },
];

export function isPostTemplate(value: unknown): value is PostTemplate {
  return POST_TEMPLATES.some((template) => template.id === value);
}

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
  template?: PostTemplate;
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
  colour, font, alignment or animation the site does not recognise is dropped
  from its block rather than written into the page.
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

/* Only the fields that are set are kept, so a stored animation never carries
   an undefined member, which Firestore would refuse to write back. */
function asAnimation(value: unknown): BlockAnimation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const effect = animationById(raw.effect)?.id;
  if (!effect) return undefined;
  const animation: BlockAnimation = { effect };
  const pace = ANIMATION_PACES.find((p) => p.id === raw.pace)?.id;
  if (pace && pace !== "normal") animation.pace = pace;
  if (typeof raw.delay === "number" && Number.isFinite(raw.delay)) {
    const stepped = Math.round(raw.delay / ANIMATION_DELAY_STEP) * ANIMATION_DELAY_STEP;
    const delay = Math.min(ANIMATION_DELAY_MAX, Math.max(0, stepped));
    if (delay > 0) animation.delay = delay;
  }
  return animation;
}

export function decodeBlocks(raw: unknown): PostBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: PostBlock[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const b = entry as Record<string, unknown>;
    const id = asString(b.id) || newBlockId();
    const animation = asAnimation(b.animation);

    switch (b.type) {
      case "paragraph":
        out.push({
          id,
          type: "paragraph",
          text: asString(b.text),
          color: asColor(b.color),
          font: asFont(b.font),
          align: asAlign(b.align),
          animation,
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
          animation,
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
          align: asAlign(b.align),
          animation,
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
          align: asAlign(b.align),
          animation,
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
          animation,
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
          animation,
        });
        break;
      case "divider":
        out.push({ id, type: "divider", animation });
        break;
      default:
        break;
    }
  }
  return out;
}
