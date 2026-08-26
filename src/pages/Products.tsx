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
  lineProducts,
  type Brand,
  type ProductLine,
} from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

type Filter = "All products" | Brand;

/* Copy for each product line. Everything else on the page is shared. */
const LINE_COPY: Record<
  ProductLine,
  { title: string; metaDescription: string; intro: string; helpTitle: string }
> = {
  cgm: {
    title: "Continuous Glucose Monitors",
    metaDescription:
      "Browse continuous glucose monitors from FreeStyle Libre and Dexcom. See real photographs of every product, front and back.",
    intro:
      "A continuous glucose monitoring system is a small wearable device that tracks your glucose in real time, 24 hours a day. We supply the leading brands, including the FreeStyle Libre family and the Dexcom family. Hover any card to see the back of the product, or open a quick view.",
    helpTitle: "Not sure which monitor fits you?",
  },
  "insulin-pump": {
    title: "Insulin Pumps",
    metaDescription:
      "Browse insulin pumps, including the Tandem t:slim X2. See what each pump does and check whether you qualify.",
    intro:
      "An insulin pump is a small device that delivers insulin through a thin tube. It replaces most daily injections. Some pumps can also connect to a continuous glucose monitor and adjust your insulin automatically. Hover any card to see the back of the product, or open a quick view.",
    helpTitle: "Not sure whether a pump fits you?",
  },
};

export default function Products({ line }: { line: ProductLine }) {
  const copy = LINE_COPY[line];
  usePageMeta(`${copy.title} | Medville Diabetes`, copy.metaDescription);

  const revealRef = useReveal<HTMLDivElement>();
  const [filter, setFilter] = useState<Filter>("All products");
  const [quickView, setQuickView] = useState<string | null>(null);

  const catalogue = lineProducts(line);
  const visible =
    filter === "All products" ? catalogue : catalogue.filter((p) => p.brand === filter);
  /* Brand pills only earn their place when there is more than one brand. */
  const showFilter = line === "cgm";

  return (
    <div ref={revealRef} key={line}>
      {/* gradient hero */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="green" strength={0.18} blur={40} size={420} className="-left-[120px] -top-[140px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative py-12 md:py-20">
          <p className="rise-in m-0">
            <Link
              to="/products"
              className="mb-4 inline-flex items-center gap-1.5 text-small font-semibold text-green"
            >
              <ArrowLeft size={15} strokeWidth={2.2} />
              All product types
            </Link>
          </p>
          <p className="rise-in m-0">
            <Eyebrow>Our Products</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 font-display text-h1 font-bold text-ink"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            {copy.title}
          </h1>
          <p
            className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-grey-dark"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            {copy.intro}
          </p>
        </Container>
      </section>

      <section className="pb-16 pt-10 md:pb-24 md:pt-14">
        <Container wide>
          {showFilter && (
            <div
              className="flex flex-wrap items-center gap-2.5"
              role="group"
              aria-label="Filter products by brand"
            >
              {(["All products", ...brands] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`min-h-[46px] rounded-full border-[1.5px] px-6 font-display text-small font-semibold transition-all duration-[200ms] ease-(--ease-out-quart) ${
                    filter === f
                      ? "border-green bg-green text-on-dark"
                      : "border-line-filter bg-surface-raised text-grey-dark hover:border-green hover:text-green"
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

          <div className={`${showFilter ? "mt-8" : ""} grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]`}>
            {visible.map((product) => (
              <ProductCard key={product.slug} product={product} onQuickView={setQuickView} />
            ))}
          </div>

          {/* not sure panel */}
          <div className="bg-green-band relative mt-14 overflow-hidden rounded-[24px] p-8 md:p-12">
            <Grain opacity={0.07} />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="m-0 font-display text-h3 font-bold text-on-dark">
                  {copy.helpTitle}
                </h2>
                <p className="mt-2 max-w-[54ch] text-small leading-relaxed text-on-dark-green">
                  Answer a few short questions. Our team will review your information
                  and help you find the right system.
                </p>
              </div>
              <Button to="/qualify" variant="on-green" className="flex-none">
                Check if you Qualify
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <QuickView
        product={quickView ? getProduct(quickView) ?? null : null}
        onClose={() => setQuickView(null)}
      />
    </div>
  );
}
