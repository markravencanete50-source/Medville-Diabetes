import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Container from "../components/Container";
import ProductCard from "../components/ProductCard";
import QuickView from "../components/QuickView";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import {
  brands,
  getProduct,
  type Brand,
  type ProductLine,
} from "../data/products";
import { PRODUCT_DISCLAIMER } from "../data/company";
import { useLineProducts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useReveal } from "../lib/useReveal";

type Filter = "All Products" | Brand;

/* Copy for each product line, from the client's copy document. Everything
   else on the page is shared between the two listings. The search title and
   description are not here: they live in data/pageMeta.ts, which the
   prerender script reads too, so the two can never disagree. */
const LINE_COPY: Record<
  ProductLine,
  {
    eyebrow: string;
    title: string;
    intro: string[];
    closingTitle: string;
    closingBody: string;
    closingCta: string;
    closingTo: string;
  }
> = {
  cgm: {
    eyebrow: "Continuous Glucose Monitors",
    title: "Find a CGM That Fits Your Day",
    intro: [
      "Explore CGM systems, sensors, and accessories from FreeStyle Libre and Dexcom. Compare available products and find the technology that may fit your diabetes care and daily routine.",
    ],
    closingTitle: "Not Sure Where to Start?",
    closingBody:
      "Tell us a little about yourself and our team can help you understand your potential CGM eligibility and available next steps.",
    closingCta: "Check My Eligibility",
    closingTo: "/qualify",
  },
  "insulin-pump": {
    eyebrow: "Insulin Pumps",
    title: "Insulin Delivery Designed Around Your Day",
    intro: [
      "Explore insulin pump technology designed to provide continuous insulin delivery and work with compatible diabetes management systems.",
      "Insulin pumps require a prescription and should be used under the direction of a qualified healthcare professional.",
    ],
    closingTitle: "Have Questions About Getting Started?",
    closingBody:
      "Our team can help with supply-related questions and explain what to expect when accessing available insulin pump technology.",
    closingCta: "Contact Our Team",
    closingTo: "/contact",
  },
};

export default function Products({ line }: { line: ProductLine }) {
  const copy = LINE_COPY[line];
  usePageMeta(metaFor(line === "cgm" ? "/products/cgm" : "/products/insulin-pumps"));

  const revealRef = useReveal<HTMLDivElement>();
  const [filter, setFilter] = useState<Filter>("All Products");
  const [quickView, setQuickView] = useState<string | null>(null);

  const catalogue = useLineProducts(line);
  const visible =
    filter === "All Products" ? catalogue : catalogue.filter((p) => p.brand === filter);
  /* Brand pills only earn their place when there is more than one brand. */
  const showFilter = line === "cgm";

  /* The grid arrives in a rotation of three shapes rather than one repeated
     slide, so a long listing keeps some variety as it scrolls past. */
  const SHAPES = ["reveal-tilt", "reveal-zoom", "reveal-blur"];

  return (
    <div ref={revealRef} key={line}>
      {/* gradient hero */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.18} blur={40} size={420} duration="20s" className="-left-[120px] -top-[140px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative py-12 md:py-20">
          <p className="rise-in m-0">
            <Link
              to="/products"
              className="mb-4 inline-flex items-center gap-1.5 py-1 text-small font-semibold text-on-dark-accent hover:text-on-dark"
            >
              <ArrowLeft size={15} strokeWidth={2.2} />
              All product types
            </Link>
          </p>
          <p className="rise-in m-0" style={{ "--rise-delay": "90ms" } as React.CSSProperties}>
            <Eyebrow onDark>{copy.eyebrow}</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 max-w-[22ch] font-display text-h1 font-bold text-on-dark"
            style={{ "--rise-delay": "200ms" } as React.CSSProperties}
          >
            {copy.title}
          </h1>
          {copy.intro.map((paragraph, index) => (
            <p
              key={paragraph}
              className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-on-dark-brand"
              style={{ "--rise-delay": `${340 + index * 130}ms` } as React.CSSProperties}
            >
              {paragraph}
            </p>
          ))}
        </Container>
      </section>

      <section className="pb-16 pt-10 md:pb-24 md:pt-14">
        <Container wide>
          {showFilter && (
            <div
              data-reveal={0}
              className="reveal-drop flex flex-wrap items-center gap-2.5"
              role="group"
              aria-label="Filter products by brand"
            >
              {(["All Products", ...brands] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`min-h-[46px] rounded-full border-[1.5px] px-6 font-display text-small font-semibold transition-all duration-[200ms] ease-(--ease-out-quart) ${
                    filter === f
                      ? "border-ink bg-ink text-on-dark"
                      : "border-ink/30 bg-surface-raised text-ink hover:border-ink"
                  }`}
                >
                  {f}
                </button>
              ))}
              <p className="m-0 ml-auto text-small text-grey-muted">
                Showing {visible.length} of {catalogue.length} products
              </p>
            </div>
          )}

          {/* The cards are h3. Without this the outline runs h1 straight to h3,
              which reads to a screen reader as a missing level. */}
          <h2 className="sr-only">{copy.title}</h2>
          <div className={`${showFilter ? "mt-8" : ""} grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]`}>
            {visible.map((product, index) => (
              <ProductCard
                key={product.slug}
                product={product}
                delay={(index % 3) * 170}
                motion={`${SHAPES[index % SHAPES.length]} reveal-slow`}
                priority={index === 0}
                eager={index < 4}
                onQuickView={setQuickView}
              />
            ))}
          </div>

          {/* closing prompt */}
          <div
            data-reveal={0}
            className="bg-cta-band reveal-blur reveal-glacial relative mt-14 overflow-hidden rounded-[24px] p-8 md:p-12"
          >
            <Grain opacity={0.07} />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="m-0 font-display text-h3 font-bold text-on-dark">
                  {copy.closingTitle}
                </h2>
                <p className="mt-2 max-w-[58ch] text-small leading-relaxed text-on-dark-brand">
                  {copy.closingBody}
                </p>
              </div>
              <Button to={copy.closingTo} variant="on-band" className="flex-none">
                {copy.closingCta}
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </div>

          <p
            data-reveal={160}
            className="reveal-settle mx-auto mt-12 max-w-[78ch] text-center text-caption leading-relaxed text-grey-faint"
          >
            {PRODUCT_DISCLAIMER}
          </p>
        </Container>
      </section>

      <QuickView
        product={quickView ? getProduct(quickView) ?? null : null}
        onClose={() => setQuickView(null)}
      />
    </div>
  );
}
