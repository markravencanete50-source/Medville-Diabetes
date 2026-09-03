import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import Container from "./Container";
import { Blob, Grain } from "./Decor";
import { formatPostDate, type PostTemplate } from "../data/blog";

/*
  The top of an article: its title, its date and author, and its cover
  picture, laid out according to the post's template.

  The article page and the dashboard preview both render this component, for
  the same reason PostBody is shared: a preview built from a second, similar
  header drifts from the real page, and an author stops trusting it. The
  widths of the reading column live here too, so the page and the preview
  cannot disagree about them either.

  Every template keeps the same order for a screen reader: the back link, the
  h1, then the date line. The Split layout moves its picture beside the title
  with CSS only, and a phone reads it top to bottom as written.
*/

export interface ArticleHeaderProps {
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  minutes: number;
  image: string;
  imageAlt: string;
  template: PostTemplate;
  /* The page shows a link back to the index; the preview must not, because
     following it would leave the editor. */
  backLink?: boolean;
  /* The page drifts the cover against the scroll; the preview has no
     parallax hook, so the attribute would only be dead weight there. */
  parallax?: boolean;
}

/* The width of the reading column under each template. */
export const BODY_COLUMN: Record<PostTemplate, string> = {
  classic: "max-w-[760px]",
  magazine: "max-w-[760px]",
  minimal: "max-w-[640px]",
  feature: "max-w-[820px]",
  split: "max-w-[760px]",
};

const rise = (delay: string) => ({ "--rise-delay": delay }) as CSSProperties;

function Back({ tone }: { tone: "dark" | "light" }) {
  return (
    <Link
      to="/blog"
      className={`rise-in inline-flex items-center gap-1.5 text-small font-semibold ${
        tone === "dark" ? "text-on-dark-accent hover:text-on-dark" : "text-brand hover:text-brand-hover"
      }`}
    >
      <ArrowLeft size={15} strokeWidth={2.2} />
      All articles
    </Link>
  );
}

function Meta({
  publishedAt,
  minutes,
  author,
  tone,
  center = false,
}: {
  publishedAt: string;
  minutes: number;
  author: string;
  tone: "dark" | "light";
  center?: boolean;
}) {
  const date = formatPostDate(publishedAt);
  const accent = tone === "dark" ? "text-on-dark-accent" : "text-brand";
  const muted = tone === "dark" ? "text-on-dark-muted" : "text-grey-muted";
  return (
    <p
      className={`rise-in mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption font-semibold uppercase tracking-[0.12em] ${accent} ${
        center ? "justify-center" : ""
      }`}
      style={rise("280ms")}
    >
      {date && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} strokeWidth={2.2} aria-hidden="true" />
          {date}
        </span>
      )}
      <span className={`inline-flex items-center gap-1.5 ${muted}`}>
        <Clock size={14} strokeWidth={2.2} aria-hidden="true" />
        {minutes} min read
      </span>
      {author && <span className={`normal-case tracking-normal ${muted}`}>By {author}</span>}
    </p>
  );
}

function Cover({
  image,
  imageAlt,
  parallax,
  className,
}: {
  image: string;
  imageAlt: string;
  parallax: boolean;
  className: string;
}) {
  return (
    <img
      src={image}
      alt={imageAlt}
      {...(parallax ? { "data-parallax": "0.4" } : {})}
      className={`w-full object-cover ${className}`}
    />
  );
}

/* The navy band with the title on it, shared by Classic, Feature and a
   Magazine post that has no picture yet. */
function NavyHero({
  title,
  author,
  publishedAt,
  minutes,
  backLink,
  column,
  reserve,
}: {
  title: string;
  author: string;
  publishedAt: string;
  minutes: number;
  backLink: boolean;
  column: string;
  /* Leave room at the foot for a cover that straddles the edge. */
  reserve: boolean;
}) {
  return (
    <section className="bg-wash relative overflow-hidden">
      <Blob tone="brand" strength={0.15} blur={44} size={420} duration="22s" className="-left-[150px] -top-[160px]" />
      <Grain opacity={0.05} />
      <Container className={`relative ${column} py-10 md:py-14 ${reserve ? "pb-24 md:pb-28" : ""}`}>
        {backLink && <Back tone="dark" />}
        <h1
          className={`rise-in font-display text-h1 font-bold leading-[1.12] text-on-dark ${backLink ? "mt-5" : ""}`}
          style={rise("140ms")}
        >
          {title}
        </h1>
        <Meta publishedAt={publishedAt} minutes={minutes} author={author} tone="dark" />
      </Container>
    </section>
  );
}

export default function ArticleHeader({
  title,
  excerpt,
  author,
  publishedAt,
  minutes,
  image,
  imageAlt,
  template,
  backLink = true,
  parallax = true,
}: ArticleHeaderProps) {
  const meta = { publishedAt, minutes, author };

  /* Minimal: no picture at all. A centred title on the light canvas and a
     narrow column below. The picture still feeds the cards and the link
     preview; it is only the article that goes without. */
  if (template === "minimal") {
    return (
      <section className="relative overflow-hidden">
        <Container className="relative max-w-[720px] py-12 text-center md:py-16">
          {backLink && <Back tone="light" />}
          <h1
            className={`rise-in font-display text-display font-bold leading-[1.08] text-ink ${backLink ? "mt-6" : ""}`}
            style={rise("140ms")}
          >
            {title}
          </h1>
          {excerpt && (
            <p
              className="rise-in mx-auto mt-5 max-w-[56ch] text-body-lg leading-relaxed text-grey-dark"
              style={rise("220ms")}
            >
              {excerpt}
            </p>
          )}
          <Meta {...meta} tone="light" center />
        </Container>
      </section>
    );
  }

  /* Magazine: the picture is the header, full width, with the title laid
     over its foot on a navy fade. On a phone the crop is taller so the title
     has room. Without a picture it falls back to the navy band. */
  if (template === "magazine") {
    if (!image) {
      return (
        <NavyHero
          title={title}
          {...meta}
          backLink={backLink}
          column={BODY_COLUMN.magazine}
          reserve={false}
        />
      );
    }
    return (
      <section className="relative overflow-hidden bg-brand-deep text-on-dark">
        {backLink && (
          <Container wide className="relative pt-6">
            <Back tone="dark" />
          </Container>
        )}
        <div
          data-reveal={0}
          className={`reveal-blur reveal-glacial relative overflow-hidden ${backLink ? "mt-4" : ""}`}
        >
          <Cover
            image={image}
            imageAlt={imageAlt}
            parallax={parallax}
            className="aspect-[4/5] max-h-[72vh] sm:aspect-[16/9] lg:aspect-[21/9]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-brand-deep via-brand-deep/60 to-transparent"
          />
          <Container wide className="absolute inset-x-0 bottom-0 pb-8 md:pb-12">
            <h1
              className="rise-in max-w-[22ch] font-display text-h2 font-bold leading-[1.1] text-on-dark md:text-h1"
              style={rise("140ms")}
            >
              {title}
            </h1>
            <Meta {...meta} tone="dark" />
          </Container>
        </div>
      </section>
    );
  }

  /* Split: title on the left, picture on the right, from the two column
     width up. Below that the picture follows the title. */
  if (template === "split") {
    return (
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.15} blur={44} size={420} duration="22s" className="-left-[150px] -top-[160px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative py-10 md:py-16">
          {backLink && <Back tone="dark" />}
          <div
            className={`grid gap-8 ${image ? "lg:grid-cols-2 lg:items-center" : ""} ${backLink ? "mt-5" : ""}`}
          >
            <div>
              <h1
                className="rise-in font-display text-h1 font-bold leading-[1.12] text-on-dark"
                style={rise("140ms")}
              >
                {title}
              </h1>
              {excerpt && (
                <p
                  className="rise-in mt-4 max-w-[52ch] text-body-lg leading-relaxed text-on-dark-brand"
                  style={rise("220ms")}
                >
                  {excerpt}
                </p>
              )}
              <Meta {...meta} tone="dark" />
            </div>
            {image && (
              <div
                data-reveal={0}
                className="reveal-swing-left reveal-slow overflow-hidden rounded-[24px] shadow-overlay"
              >
                <Cover
                  image={image}
                  imageAlt={imageAlt}
                  parallax={parallax}
                  className="aspect-[4/5] lg:aspect-[4/3]"
                />
              </div>
            )}
          </div>
        </Container>
      </section>
    );
  }

  /* Classic and Feature: the navy band, then a framed picture that straddles
     its lower edge. Feature simply gives the picture and the column more
     room. */
  const feature = template === "feature";
  const column = feature ? BODY_COLUMN.feature : BODY_COLUMN.classic;

  return (
    <>
      <NavyHero
        title={title}
        {...meta}
        backLink={backLink}
        column={column}
        reserve={Boolean(image)}
      />
      {image && (
        <Container className={feature ? "max-w-[1100px]" : "max-w-[900px]"}>
          <div
            data-reveal={0}
            className="reveal-curtain reveal-glacial -mt-16 overflow-hidden rounded-[24px] shadow-overlay md:-mt-20"
          >
            <div>
              <Cover
                image={image}
                imageAlt={imageAlt}
                parallax={parallax}
                className={feature ? "aspect-[16/9] lg:aspect-[21/9]" : "aspect-[16/9]"}
              />
            </div>
          </div>
        </Container>
      )}
    </>
  );
}
