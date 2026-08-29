import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Container from "../components/Container";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import type { ProductLine } from "../data/products";
import { PRODUCT_DISCLAIMER } from "../data/company";
import { useProducts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useParallax, useReveal } from "../lib/useReveal";

/* The two product lines a visitor can browse. Each card routes to the
   listing for that line. Wording follows the client's copy document. */
const LINES: {
  line: ProductLine;
  to: string;
  title: string;
  body: string[];
  cta: string;
  image: string;
  alt: string;
}[] = [
  {
    line: "cgm",
    to: "/products/cgm",
    title: "Continuous Glucose Monitors",
    body: [
      "See your glucose information and trends throughout the day with CGM technology from FreeStyle Libre and Dexcom.",
      "Whether you are exploring CGM for the first time or looking for ongoing supplies, browse the systems and sensors available through Medville Diabetes.",
    ],
    cta: "Explore CGMs",
    image: "/products/freestyle-libre-3-front.webp",
    alt: "A FreeStyle Libre 3 continuous glucose monitor box and sensor.",
  },
  {
    line: "insulin-pump",
    to: "/products/insulin-pumps",
    title: "Insulin Pumps",
    body: [
      "Explore insulin pump technology designed to provide continuous insulin delivery for people whose diabetes care requires insulin.",
    ],
    cta: "Explore Insulin Pumps",
    image: "/products/tandem-tslim-x2-front.webp",
    alt: "A Tandem t:slim X2 insulin pump with a touchscreen, next to a sensor.",
  },
];

export default function ProductsLanding() {
  usePageMeta(metaFor("/products"));
  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();
  const catalogue = useProducts();

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        {/* gradient hero */}
        <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.18} blur={40} size={420} duration="20s" className="-left-[120px] -top-[140px]" />
          <Grain opacity={0.05} />
          <Container wide className="relative py-12 md:py-20">
            <p className="rise-in m-0">
              <Eyebrow>Our Products</Eyebrow>
            </p>
            <h1
              className="rise-in mt-3 max-w-[20ch] font-display text-h1 font-bold text-ink"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              Diabetes Technology That Fits Into Real Life
            </h1>
            <p
              className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-grey-dark"
              style={{ "--rise-delay": "300ms" } as React.CSSProperties}
            >
              Explore continuous glucose monitors, sensors, supplies, and insulin
              delivery technology from leading diabetes brands, backed by support to
              help make getting what you need easier.
            </p>
          </Container>
        </section>

        <section className="pb-16 pt-10 md:pb-24 md:pt-14">
          <Container wide>
            <div className="grid gap-6 md:grid-cols-2">
              {LINES.map((entry, index) => {
                const count = catalogue.filter((p) => p.line === entry.line).length;
                return (
                  <Link
                    key={entry.line}
                    to={entry.to}
                    data-reveal={index * 220}
                    className={`${
                      index === 0 ? "reveal-swing-left" : "reveal-swing-right"
                    } reveal-slow group flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover`}
                  >
                    {/*
                      The delivered product photographs are about 4:3 and carry
                      their own white margin, so a 16:9 frame letterboxed them and
                      left a band of dead space above the copy. Matching the frame
                      to the source ratio lets the product fill the card.
                    */}
                    <div className="aspect-[4/3] overflow-hidden bg-canvas">
                      <img
                        src={entry.image}
                        alt={entry.alt}
                        /* Both cards are above the fold on a desktop, so
                           neither waits for scroll. Only the first is the
                           largest paint, so only it asks to jump the queue. */
                        loading="eager"
                        fetchPriority={index === 0 ? "high" : "auto"}
                        data-parallax="0.4"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-8">
                      <p className="m-0 text-caption font-bold uppercase tracking-[0.14em] text-brand-bright">
                        {count} {count === 1 ? "product" : "products"}
                      </p>
                      <h2 className="mt-2 font-display text-h3 font-bold text-ink">
                        {entry.title}
                      </h2>
                      {entry.body.map((paragraph) => (
                        <p
                          key={paragraph}
                          className="mt-2.5 text-body leading-relaxed text-grey-dark"
                        >
                          {paragraph}
                        </p>
                      ))}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-small font-semibold text-brand">
                        {entry.cta}
                        <ArrowRight
                          size={15}
                          strokeWidth={2.2}
                          className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <p
              data-reveal={200}
              className="reveal-settle mx-auto mt-12 max-w-[78ch] text-center text-caption leading-relaxed text-grey-faint"
            >
              {PRODUCT_DISCLAIMER}
            </p>
          </Container>
        </section>
      </div>
    </div>
  );
}
