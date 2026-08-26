import Container from "../components/Container";
import Button from "../components/Button";
import { usePageMeta } from "../lib/usePageMeta";

export default function NotFound() {
  usePageMeta("Page not found | Medville Diabetes");
  return (
    <section className="py-24 md:py-32">
      <Container className="max-w-xl text-center">
        <p className="font-display text-display font-bold text-line-strong">404</p>
        <h1 className="mt-2 font-display text-h2 font-bold text-ink">We could not find that page.</h1>
        <p className="mt-3 text-body text-ink-muted">
          The page may have moved, or the address may contain a typing mistake.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button to="/" variant="primary">Go to the home page</Button>
          <Button to="/products" variant="ghost">Browse products</Button>
        </div>
      </Container>
    </section>
  );
}
