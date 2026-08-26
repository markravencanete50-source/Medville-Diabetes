import { Link, useParams } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import ProductViewer from "../components/ProductViewer";
import ProductCard from "../components/ProductCard";
import { getProduct, products } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";
import NotFound from "./NotFound";

export default function ProductDetail() {
  const { slug } = useParams();
  const product = slug ? getProduct(slug) : undefined;

  usePageMeta(
    product ? `${product.name} | Medville Diabetes` : "Product not found | Medville Diabetes",
    product?.shortDescription
  );

  if (!product) return <NotFound />;

  const related = products
    .filter((p) => p.slug !== product.slug && p.brand === product.brand)
    .slice(0, 3);

  return (
    <>
      <section className="py-8 md:py-12">
        <Container wide>
          {/* breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-caption text-ink-subtle">
            <Link to="/" className="hover:text-ink">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link to="/products" className="hover:text-ink">Our Products</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-ink-muted">{product.name}</span>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            {/* viewer */}
            <ProductViewer
              front={product.imageFront}
              back={product.imageBack}
              alt={product.name}
              className="lg:sticky lg:top-28 lg:self-start"
            />

            {/* details */}
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.2em] text-accent-deep">
                {product.brand} · {product.category}
              </p>
              <h1 className="mt-2 font-display text-h1 font-bold leading-tight text-ink">
                {product.name}
              </h1>

              <div className="mt-5 space-y-4">
                {product.description.map((para, i) => (
                  <p key={i} className="max-w-[60ch] text-body leading-relaxed text-ink-muted">{para}</p>
                ))}
              </div>

              <div className="mt-7 rounded-lg border border-line bg-surface p-6">
                <h2 className="font-display text-small font-semibold uppercase tracking-[0.14em] text-ink">
                  Key facts
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {product.keyFacts.map((fact) => (
                    <li key={fact} className="flex items-start gap-2.5 text-small text-ink-muted">
                      <Check size={16} className="mt-0.5 flex-none text-accent-deep" aria-hidden="true" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button to="/qualify" variant="cta">Check if you Qualify</Button>
                <Button to="/contact" variant="ghost">Ask us a question</Button>
              </div>
              <p className="mt-4 max-w-[56ch] text-caption leading-relaxed text-ink-subtle">
                Availability depends on your coverage and on a review by our
                team. Checking takes less than one minute and there is no cost.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line bg-surface py-14">
          <Container wide>
            <h2 className="font-display text-h3 font-bold text-ink">More from {product.brand}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
