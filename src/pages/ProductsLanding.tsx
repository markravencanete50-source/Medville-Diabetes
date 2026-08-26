import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Container from "../components/Container";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { lineProducts, type ProductLine } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

/* The two product lines a visitor can browse. Each card routes to the
   listing for that line. */
const LINES: {
  line: ProductLine;
  to: string;
  title: string;
  body: string;
  image: string;
  alt: string;
}[] = [
  {
    line: "cgm",
    to: "/products/cgm",
    title: "Continuous Glucose Monitors",
    body: "Small wearable sensors that track your glucose day and night, without routine finger sticks. Readings go straight to your phone.",
    image: "/products/freestyle-libre-3-front.webp",
    alt: "A FreeStyle Libre 3 continuous glucose monitor box and sensor.",
  },
  {
    line: "insulin-pump",
    to: "/products/insulin-pumps",
    title: "Insulin Pumps",
    body: "Small devices that deliver insulin through a thin tube, so you need fewer injections. Some pumps adjust your insulin automatically.",
    image: "/products/tandem-tslim-x2-front.webp",
    alt: "A Tandem t:slim X2 insulin pump with a touchscreen, next to a sensor.",
  },
];

export default function ProductsLanding() {
  usePageMeta(
    "Our Products | Medville Diabetes",
    "Browse our continuous glucose monitors and insulin pumps. Pick a product type to see everything we supply.",
  );
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      {/* gradient hero */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.18} blur={40} size={420} className="-left-[120px] -top-[140px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative py-12 md:py-20">
          <p className="rise-in m-0">
            <Eyebrow>Our Products</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 font-display text-h1 font-bold text-ink"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            What are you looking for?
          </h1>
          <p
            className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-grey-dark"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            We supply two types of diabetes devices: continuous glucose monitors
            and insulin pumps. Pick a type to see every product we carry.
          </p>
        </Container>
      </section>

      <section className="pb-16 pt-10 md:pb-24 md:pt-14">
        <Container wide>
          <div className="grid gap-6 md:grid-cols-2">
            {LINES.map((entry, index) => {
              const count = lineProducts(entry.line).length;
              return (
                <Link
                  key={entry.line}
                  to={entry.to}
                  data-reveal={index * 140}
                  className={`${
                    index === 0 ? "reveal-left" : "reveal-right"
                  } group flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover`}
                >
                  <div className="tint-libre aspect-[16/9] overflow-hidden">
                    <img
                      src={entry.image}
                      alt={entry.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-(--ease-out-quart) group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-8">
                    <p className="m-0 text-caption font-bold uppercase tracking-[0.14em] text-brand-bright">
                      {count} {count === 1 ? "product" : "products"}
                    </p>
                    <h2 className="mt-2 font-display text-h3 font-bold text-ink">
                      {entry.title}
                    </h2>
                    <p className="mt-2.5 text-body leading-relaxed text-grey-dark">
                      {entry.body}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-small font-semibold text-brand">
                      View products
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
        </Container>
      </section>
    </div>
  );
}
