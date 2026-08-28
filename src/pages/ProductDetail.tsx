import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import ProductViewer from "../components/ProductViewer";
import ProductCard, { PRODUCT_TINT, PRODUCT_PILL } from "../components/ProductCard";
import QuickView from "../components/QuickView";
import { isEnquirable, PRODUCT_STATUS_LABEL } from "../data/products";
import { PRODUCT_DISCLAIMER } from "../data/company";
import { useProduct, useProducts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { useParallax, useReveal } from "../lib/useReveal";
import NotFound from "./NotFound";

export default function ProductDetail() {
  const { slug } = useParams();
  const products = useProducts();
  const product = useProduct(slug);
  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();
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
      <section ref={parallaxRef} className="py-8 md:py-12">
        <Container wide>
          {/* breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 py-1 text-caption text-grey-muted"
          >
            <Link to="/" className="inline-block py-1 transition-colors hover:text-brand">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link to="/products" className="inline-block py-1 transition-colors hover:text-brand">
              Our Products
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-grey-dark">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            {/* viewer with front and back thumbnails */}
            <ProductViewer
              revealDelay={0}
              revealMotion="reveal-swing-left reveal-slow"
              front={product.imageFront}
              back={product.imageBack}
              alt={product.name}
              tint={PRODUCT_TINT}
              thumbnails
              className="lg:sticky lg:top-32 lg:self-start"
            />

            {/* details */}
            <div data-reveal={180} className="reveal-right reveal-slow">
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
                {isEnquirable(product) ? (
                  <Button to="/qualify" state={{ product: product.slug }} variant="cta">
                    Check My Eligibility
                  </Button>
                ) : (
                  <span className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-grey-light px-7 font-display text-small font-semibold text-grey-muted">
                    {PRODUCT_STATUS_LABEL[product.status ?? "available"]}
                  </span>
                )}
                <Button to="/contact" variant="ghost">Contact Our Team</Button>
              </div>
              <p className="mt-4 max-w-[56ch] text-caption leading-relaxed text-grey-muted">
                {isEnquirable(product)
                  ? "Submitting the eligibility form does not guarantee eligibility, insurance coverage, or receipt of a product. Our team will review your information and explain what comes next."
                  : product.status === "coming-soon"
                    ? "This product is not available to order yet. Contact us and we will tell you when it is."
                    : "This product is out of stock. Contact us and we will suggest an alternative."}
              </p>
            </div>
          </div>

          <p
            data-reveal={0}
            className="reveal-settle mt-12 border-t border-line-brand pt-7 text-caption leading-relaxed text-grey-faint"
          >
            {PRODUCT_DISCLAIMER}
          </p>
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
                  delay={index * 180}
                  motion="reveal-tilt reveal-slow"
                  onQuickView={setQuickView}
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      <QuickView
        product={quickView ? products.find((p) => p.slug === quickView) ?? null : null}
        onClose={() => setQuickView(null)}
      />
    </div>
  );
}
