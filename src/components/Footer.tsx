import { Link } from "react-router-dom";
import Container from "./Container";
import Logo from "./Logo";
import { products } from "../data/products";

/* Replace the placeholder contact details before launch. See CLAUDE.md. */

const linkClass =
  "text-small text-on-dark-brand transition-colors duration-(--duration-micro) hover:text-on-dark";
const headingClass =
  "m-0 font-display text-caption font-semibold uppercase tracking-[0.16em] text-on-dark-accent";

export default function Footer() {
  const footerProducts = products.filter((p) => p.category === "System").slice(0, 6);

  return (
    <footer className="relative">
      {/*
        Wave divider. The ground above the wave is transparent rather than a
        fixed grey, so the footer sits correctly under any section: the grey
        resources band on the home page, plain white elsewhere.
      */}
      <div aria-hidden="true" className="h-16 overflow-hidden">
        <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="block h-full w-full">
          <path
            d="M0,32 C240,64 480,0 720,16 C960,32 1200,64 1440,24 L1440,64 L0,64 Z"
            fill="var(--color-brand-abyss)"
          />
          <path
            d="M0,40 C240,68 480,10 720,24 C960,38 1200,66 1440,32 L1440,64 L0,64 Z"
            fill="var(--color-brand-deep)"
            opacity="0.85"
          />
        </svg>
      </div>

      <div className="bg-[linear-gradient(135deg,#0a3d2e_0%,#00293b_100%)]">
        <Container
          wide
          className="grid gap-10 pb-12 pt-14 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]"
        >
          <div>
            <Logo dark />
            <p className="mt-4 max-w-[36ch] text-small leading-relaxed text-on-dark-muted">
              Medville Diabetes supplies continuous glucose monitors and support to
              people living with diabetes. Your best interest is our first concern.
            </p>
          </div>

          <nav aria-label="Products">
            <h3 className={headingClass}>Our Products</h3>
            <ul className="mt-4.5 flex list-none flex-col gap-2.5 p-0">
              {footerProducts.map((p) => (
                <li key={p.slug}>
                  <Link to={`/products/${p.slug}`} className={linkClass}>
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className={headingClass}>Quick Links</h3>
            <ul className="mt-4.5 flex list-none flex-col gap-2.5 p-0">
              <li><Link to="/about" className={linkClass}>About Us</Link></li>
              <li><Link to="/qualify" className={linkClass}>Check if you Qualify</Link></li>
              <li><Link to="/contact" className={linkClass}>Contact</Link></li>
              <li><Link to="/privacy-policy" className={linkClass}>Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className={linkClass}>Terms of Service</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className={headingClass}>Contact Information</h3>
            <address className="mt-4.5 flex flex-col gap-2.5 not-italic">
              <p className="m-0 text-small text-on-dark-brand">[Street address to be provided]</p>
              <p className="m-0 text-small text-on-dark-brand">
                <a href="mailto:info@medvillediabetes.com" className={linkClass}>
                  info@medvillediabetes.com
                </a>
              </p>
              <p className="m-0 text-small text-on-dark-brand">
                <a href="tel:+18885642595" className={linkClass}>888-564-2595</a>
              </p>
              <p className="m-0 text-small text-on-dark-brand">
                Monday to Friday, 8:30 AM to 5:00 PM Eastern Time
              </p>
            </address>
          </div>
        </Container>

        <div className="border-t border-on-dark-accent/15">
          <Container
            wide
            className="flex flex-col items-start justify-between gap-2 py-5 sm:flex-row sm:items-center"
          >
            <p className="m-0 text-caption text-on-dark-muted">
              © {new Date().getFullYear()} Medville Diabetes. All rights reserved.
            </p>
            <p className="m-0 text-caption text-on-dark-muted/70">
              Product names are trademarks of their respective manufacturers.
            </p>
          </Container>
        </div>
      </div>
    </footer>
  );
}
