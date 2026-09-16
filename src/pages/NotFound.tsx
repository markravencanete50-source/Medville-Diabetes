import Container from "../components/Container";
import Button from "../components/Button";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";

/*
  The build writes this page to 404.html, which Firebase serves with a real
  404 status for an unknown direct request. The directive also protects the
  client-rendered branch used after an in-app navigation to a stale address.
*/
export default function NotFound() {
  usePageMeta({ ...metaFor("/404"), noindex: true });
  return (
    <section className="py-24 md:py-32">
      <Container className="max-w-xl text-center">
        <p className="rise-in font-display text-display font-bold text-line-strong">404</p>
        <h1
          className="rise-in mt-2 font-display text-h2 font-bold text-ink"
          style={{ "--rise-delay": "150ms" } as React.CSSProperties}
        >
          Looks Like This Page Got Lost.
        </h1>
        <p
          className="rise-in mt-3 text-body leading-relaxed text-ink-muted"
          style={{ "--rise-delay": "320ms" } as React.CSSProperties}
        >
          The page you are looking for may have moved or no longer exists. Head back
          home or explore our diabetes products to find what you need.
        </p>
        <div
          className="rise-in mt-8 flex flex-wrap justify-center gap-3"
          style={{ "--rise-delay": "480ms" } as React.CSSProperties}
        >
          <Button to="/" variant="primary">Back to Home</Button>
          <Button to="/products" variant="ghost">Explore Products</Button>
        </div>
      </Container>
    </section>
  );
}
