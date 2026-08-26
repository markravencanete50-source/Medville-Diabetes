import { Link } from "react-router-dom";
import Container from "./Container";
import Logo from "./Logo";
import { products } from "../data/products";

/* Replace the placeholder contact details before launch. See CLAUDE.md. */
export default function Footer() {
  const footerProducts = products.filter((p) => p.category === "System").slice(0, 6);
  return (
    <footer className="bg-ink text-on-dark">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-[36ch] text-small leading-relaxed text-on-dark-muted">
            Medville Diabetes supplies continuous glucose monitors and support
            to people living with diabetes. Your best interest is our first concern.
          </p>
        </div>

        <nav aria-label="Products">
          <h3 className="text-small font-semibold uppercase tracking-[0.14em] text-on-dark">Our Products</h3>
          <ul className="mt-4 space-y-2.5">
            {footerProducts.map((p) => (
              <li key={p.slug}>
                <Link to={`/products/${p.slug}`} className="text-small text-on-dark-muted transition-colors hover:text-on-dark">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="text-small font-semibold uppercase tracking-[0.14em] text-on-dark">Quick Links</h3>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/about" className="text-small text-on-dark-muted transition-colors hover:text-on-dark">About Us</Link></li>
            <li><Link to="/qualify" className="text-small text-on-dark-muted transition-colors hover:text-on-dark">Check if you Qualify</Link></li>
            <li><Link to="/contact" className="text-small text-on-dark-muted transition-colors hover:text-on-dark">Contact</Link></li>
            <li><span className="text-small text-on-dark-muted/60">Privacy Notice (document coming soon)</span></li>
          </ul>
        </nav>

        <div>
          <h3 className="text-small font-semibold uppercase tracking-[0.14em] text-on-dark">Contact Information</h3>
          <address className="mt-4 space-y-2.5 not-italic">
            <p className="text-small text-on-dark-muted">[Street address to be provided]</p>
            <p className="text-small text-on-dark-muted">
              <a href="mailto:info@medvillediabetes.com" className="transition-colors hover:text-on-dark">info@medvillediabetes.com</a>
            </p>
            <p className="text-small text-on-dark-muted">
              <a href="tel:8770000000" className="transition-colors hover:text-on-dark">877-000-0000</a>
            </p>
            <p className="text-small text-on-dark-muted">Monday to Friday, 8:30 AM to 5:00 PM Eastern Time</p>
          </address>
        </div>
      </Container>

      <div className="border-t border-navy-raised">
        <Container className="flex flex-col items-start justify-between gap-2 py-5 sm:flex-row sm:items-center">
          <p className="text-caption text-on-dark-muted">
            © {new Date().getFullYear()} Medville Diabetes. All rights reserved.
          </p>
          <p className="text-caption text-on-dark-muted/70">
            Product names are trademarks of their respective manufacturers.
          </p>
        </Container>
      </div>
    </footer>
  );
}
