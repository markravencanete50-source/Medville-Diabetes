import { useEffect, type CSSProperties } from "react";
import {
  colorToken,
  fontToken,
  parseInline,
  type PostBlock,
  type InlineSpan,
} from "../data/blog";
import { ensureFontLoaded } from "../data/fonts";

/*
  Renders a post's blocks.

  This is the only place a block becomes something on screen, and both the
  public article and the dashboard's preview use it. That is the point: a
  preview built from a second, similar renderer drifts from the real page, and
  an author stops trusting it. Here, what the preview shows is what a reader
  gets, because it is the same component.

  Nothing is rendered with dangerouslySetInnerHTML. Every string arrives as a
  React text child, which React escapes, so stored text cannot become markup.
  A colour or font reaches an inline style only after the decoder in
  data/blog.ts has checked it, and React writes styles as properties, never
  as a parsed attribute string, so a stored value cannot become a selector or
  a second declaration.
*/

function Inline({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.bold) node = <strong className="font-semibold">{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        if (span.href) {
          const external = /^https?:\/\//i.test(span.href);
          node = (
            <a
              href={span.href}
              className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {node}
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

/* Tailwind cannot see a class name built at runtime, so the ratio is set as an
   inline style rather than an arbitrary-value class. */
function ratioStyle(ratio: string): CSSProperties {
  return ratio === "auto" ? {} : { aspectRatio: ratio.replace("/", " / ") };
}

const CALLOUT_TONE: Record<string, string> = {
  brand: "border-brand bg-brand-tint",
  accent: "border-accent-deep bg-accent-soft",
  warn: "border-cta bg-cta/10",
};

/* The colour and font a text block asked for, as a style. A block that asked
   for neither gets its defaults from the class names on the element, so the
   style is left empty rather than restating them. */
function textStyle(
  block: { color?: string; font?: string },
  fallbackFont: "body" | "display",
  defaultColor?: string,
): CSSProperties {
  const style: CSSProperties = {};
  if (block.color) style.color = colorToken(block.color as never);
  else if (defaultColor) style.color = defaultColor;
  if (block.font) style.fontFamily = fontToken(block.font, fallbackFont);
  return style;
}

export default function PostBody({ blocks }: { blocks: PostBlock[] }) {
  /* Any Google font the article uses is fetched once the blocks are known,
     before the browser has laid them out. The site's own faces and the
     system faces need nothing, and the loader knows which is which. */
  useEffect(() => {
    for (const block of blocks) {
      if ("font" in block) ensureFontLoaded(block.font);
    }
  }, [blocks]);

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading": {
            const Tag = block.level === 3 ? "h3" : "h2";
            return (
              <Tag
                key={block.id}
                className={`m-0 font-display font-bold text-ink ${
                  block.level === 3 ? "mt-3 text-[1.25rem]" : "mt-5 text-h3"
                } ${block.align === "center" ? "text-center" : ""}`}
                style={textStyle(block, "display")}
              >
                <Inline spans={parseInline(block.text)} />
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p
                key={block.id}
                className={`m-0 text-body leading-relaxed ${
                  block.align === "center" ? "text-center" : ""
                }`}
                style={textStyle(block, "body", colorToken("muted"))}
              >
                <Inline spans={parseInline(block.text)} />
              </p>
            );

          case "list": {
            const Tag = block.style === "number" ? "ol" : "ul";
            return (
              <Tag
                key={block.id}
                className={`m-0 flex flex-col gap-2 pl-6 text-body leading-relaxed text-grey-dark ${
                  block.style === "number" ? "list-decimal" : "list-disc"
                }`}
                style={textStyle(block, "body")}
              >
                {block.items
                  .filter((item) => item.trim() !== "")
                  .map((item, i) => (
                    <li key={i} className="pl-1">
                      <Inline spans={parseInline(item)} />
                    </li>
                  ))}
              </Tag>
            );
          }

          case "quote":
            return (
              <figure key={block.id} className="m-0">
                <blockquote
                  className="m-0 rounded-lg border-l-4 border-brand bg-brand-tint px-7 py-5 font-display text-h3 font-semibold leading-snug text-brand"
                  style={textStyle(block, "display")}
                >
                  <Inline spans={parseInline(block.text)} />
                </blockquote>
                {block.attribution && (
                  <figcaption className="mt-2 pl-7 text-small text-grey-muted">
                    {block.attribution}
                  </figcaption>
                )}
              </figure>
            );

          case "image":
            if (!block.url) return null;
            return (
              <figure
                key={block.id}
                className={`m-0 ${block.width === "full" ? "lg:-mx-16" : ""}`}
              >
                <div className="overflow-hidden rounded-lg bg-grey-light">
                  <img
                    src={block.url}
                    alt={block.alt}
                    loading="lazy"
                    className="w-full object-cover"
                    style={ratioStyle(block.ratio)}
                  />
                </div>
                {block.caption && (
                  <figcaption className="mt-2.5 text-center text-caption text-grey-muted">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );

          case "callout":
            return (
              <div
                key={block.id}
                className={`rounded-lg border-l-4 p-6 text-body leading-relaxed text-grey-dark ${
                  CALLOUT_TONE[block.tone] ?? CALLOUT_TONE.brand
                }`}
              >
                <Inline spans={parseInline(block.text)} />
              </div>
            );

          case "divider":
            return (
              <hr key={block.id} className="my-2 border-0 border-t border-line-brand" />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
