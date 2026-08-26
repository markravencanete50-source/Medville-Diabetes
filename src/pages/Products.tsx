import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Container from "../components/Container";
import ProductCard from "../components/ProductCard";
import QuickView from "../components/QuickView";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { products, brands, getProduct, type Brand } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

type Filter = "All products" | Brand;

export default function Products() {
  usePageMeta(
    "Continuous Glucose Monitors | Medville Diabetes",
    "Browse continuous glucose monitors from FreeStyle Libre and Dexcom. See real photographs of every product, front and back.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const [filter, setFilter] = useState<Filter>("All products");
  const [quickView, setQuickView] = useState<string | null>(null);

  const visible =
    filter === "All products" ? products : products.filter((p) => p.brand === filter);

  return (
    <div ref={revealRef}>
      {/* gradient hero */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="green" strength={0.18} blur={40} size={420} className="-left-[120px] -top-[140px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative py-12 md:py-20">
          <p className="rise-in m-0">
            <Eyebrow>Our Products</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 font-display text-h1 font-bold text-ink"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            Continuous Glucose Monitors
          </h1>
          <p
            className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-grey-dark"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            A continuous glucose monitoring system is a small wearable device that
            tracks your glucose in real time, 24 hours a day. We supply the leading
            brands, including the FreeStyle Libre family and the Dexcom family. Hover
            any card to see the back of the product, or open a quick view.
          </p>
        </Container>
      </section>

      <section className="pb-16 pt-10 md:pb-24 md:pt-14">
        <Container wide>
          {/* brand filter pills */}
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
              Showing {visible.length} of {products.length} products
            </p>
          </div>

          <div className="mt-8 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
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
                  Not sure which monitor fits you?
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
