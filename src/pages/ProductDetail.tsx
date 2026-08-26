import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import ProductViewer from "../components/ProductViewer";
import ProductCard, { PRODUCT_TINT, PRODUCT_PILL } from "../components/ProductCard";
import QuickView from "../components/QuickView";
import { getProduct, products } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";
import NotFound from "./NotFound";

export default function ProductDetail() {
  const { slug } = useParams();
  const product = slug ? getProduct(slug) : undefined;
  const revealRef = useReveal<HTMLDivElement>();
  const [quickView, setQuickView] = useState<string | null>(null);

  usePageMeta(
    product ? `${product.name} | Medville Diabetes` : "Product not found | Medville Diabetes",
    product?.shortDescription,
  );

  if (!product) return <NotFound />;

  const related = products
    .filter((p) => p.slug !== product.slug && p.brand === product.brand)
    .slice(0, 3);

  return (
    <div ref={revealRef}>
      <section className="py-8 md:py-12">
        <Container wide>
          {/* breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-caption text-grey-muted"
          >
            <Link to="/" className="transition-colors hover:text-brand">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link to="/products" className="transition-colors hover:text-brand">Our Products</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-grey-dark">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            {/* viewer with front and back thumbnails */}
            <ProductViewer
              front={product.imageFront}
              back={product.imageBack}
              alt={product.name}
              tint={PRODUCT_TINT}
              thumbnails
              className="lg:sticky lg:top-32 lg:self-start"
            />

            {/* details */}
            <div>
              <span
                className={`inline-flex rounded-full bg-grey-light px-3.5 py-1.5 text-caption font-semibold ${PRODUCT_PILL}`}
              >
                {product.brand} · {product.category}
              </span>
              <h1 className="mt-3 font-display text-h1 font-bold leading-tight text-ink">
                {product.name}
              </h1>

              <div className="mt-5 space-y-4">
                {product.description.map((para, i) => (
                  <p key={i} className="max-w-[60ch] text-body leading-relaxed text-grey-dark">
                    {para}
                  </p>
                ))}
              </div>

              {/* fact chips */}
              <div className="mt-7">
                <h2 className="font-display text-small font-semibold uppercase tracking-[0.14em] text-ink">
                  Key facts
                </h2>
                <ul className="mt-4 flex list-none flex-wrap gap-2.5 p-0">
                  {product.keyFacts.map((fact) => (
                    <li
                      key={fact}
                      className="inline-flex items-center gap-2 rounded-full border border-brand-mint bg-brand-tint px-4 py-2 text-caption font-medium text-grey-dark"
                    >
                      <Check size={14} strokeWidth={2.4} className="flex-none text-brand-bright" aria-hidden="true" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button to="/qualify" variant="cta">Check if you Qualify</Button>
                <Button to="/contact" variant="ghost">Ask us a question</Button>
              </div>
              <p className="mt-4 max-w-[56ch] text-caption leading-relaxed text-grey-muted">
                Availability depends on your coverage and on a review by our team.
                Checking takes less than one minute and there is no cost.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line-brand bg-grey-light py-14">
          <Container wide>
            <h2 className="font-display text-h3 font-bold text-ink">
              More from {product.brand}
            </h2>
            <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
              {related.map((p, index) => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  delay={index * 120}
                  onQuickView={setQuickView}
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      <QuickView
        product={quickView ? getProduct(quickView) ?? null : null}
        onClose={() => setQuickView(null)}
      />
    </div>
  );
}
