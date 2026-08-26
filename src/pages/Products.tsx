import { useState } from "react";
import Container from "../components/Container";
import ProductCard from "../components/ProductCard";
import Button from "../components/Button";
import { products, brands, type Brand } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";

type Filter = "All" | Brand;

export default function Products() {
  usePageMeta(
    "Continuous Glucose Monitors | Medville Diabetes",
    "Browse continuous glucose monitors from FreeStyle Libre and Dexcom. Rotate each product, zoom in, and read the details in plain English."
  );
  const [filter, setFilter] = useState<Filter>("All");
  const visible = filter === "All" ? products : products.filter((p) => p.brand === filter);

  return (
    <>
      <section className="border-b border-line bg-surface py-12 md:py-16">
        <Container wide>
          <p className="text-caption font-semibold uppercase tracking-[0.22em] text-accent-deep">Our Products</p>
          <h1 className="mt-3 font-display text-h1 font-bold text-ink">Continuous Glucose Monitors</h1>
          <p className="mt-4 max-w-[62ch] text-body-lg leading-relaxed text-ink-muted">
            A continuous glucose monitoring system is a small wearable device
            that tracks your glucose in real time, 24 hours a day. It helps you
            watch your levels and trends without routine finger sticks, spend
            more time in your target range, and share your readings with the
            people who care for you. We supply the leading brands, including
            the FreeStyle Libre family and the Dexcom family.
          </p>
        </Container>
      </section>

      <section className="py-10 md:py-14">
        <Container wide>
          {/* brand filter */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter products by brand">
            {(["All", ...brands] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`min-h-11 rounded-full border px-5 text-small font-semibold transition-colors duration-(--duration-micro) ${
                  filter === f
                    ? "border-ink bg-ink text-on-dark"
                    : "border-line-strong bg-surface-raised text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
            <p className="ml-auto text-small text-ink-subtle">
              Showing {visible.length} of {products.length} products
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>

          <div className="mt-14 rounded-lg border border-line bg-surface p-7 sm:p-9">
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-h3 font-bold text-ink">Not sure which monitor fits you?</h2>
                <p className="mt-2 max-w-[54ch] text-small leading-relaxed text-ink-muted">
                  Answer a few short questions. Our team will review your
                  information and help you find the right system.
                </p>
              </div>
              <Button to="/qualify" variant="cta">Check if you Qualify</Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
