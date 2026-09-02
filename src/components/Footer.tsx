import { Link } from "react-router-dom";
import Container from "./Container";
import Logo from "./Logo";
import {
  ADDRESS_LINE_1,
  ADDRESS_LINE_2,
  EMAIL,
  EMAIL_HREF,
  HOURS_SHORT,
  PHONE_DISPLAY,
  PHONE_TEL,
} from "../data/company";

/*
  Global footer, laid out as the four columns the client's copy document
  specifies: Explore, Products, Resources and Contact Information.

  The blog is a page of its own at /blog. FAQs are a section of the home page,
  so that link carries a fragment; React Router does not scroll to a fragment
  by itself, which is why the target has an id and a scroll margin clearing
  the sticky header.
*/

/* inline-block with vertical padding, because the text alone is 16px tall and
   a touch target should be at least 24. The list gap comes down to match, so
   the footer looks the same while the tappable area grows. */
const linkClass =
  "inline-block py-1.5 text-small text-on-dark-brand transition-colors duration-(--duration-micro) hover:text-on-dark";
const headingClass =
  "m-0 font-display text-caption font-semibold uppercase tracking-[0.16em] text-on-dark-accent";

const EXPLORE = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
  { to: "/qualify", label: "Check Eligibility" },
  { to: "/refer-a-patient", label: "Refer a Patient" },
];

const PRODUCTS = [
  { to: "/products/cgm", label: "Continuous Glucose Monitors" },
  { to: "/products/insulin-pumps", label: "Insulin Pumps" },
  { to: "/products", label: "All Products" },
];

const RESOURCES = [
  { to: "/blog", label: "Blog" },
  { to: "/#faqs", label: "FAQs" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-of-service", label: "Terms of Service" },
];

export default function Footer() {
  return (
    <footer className="relative">
      {/*
        Wave divider. The ground above the wave is transparent rather than a
        fixed tint, so the footer sits correctly under any section: the
        deeper band on the home page, the plain canvas elsewhere.
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

      <div className="bg-dark-band">
        <Container
          wide
          className="grid gap-10 pb-12 pt-14 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]"
        >
          <div>
            <Logo className="h-14" onDark loading="lazy" />
            <p className="mt-4 max-w-[36ch] text-small leading-relaxed text-on-dark-muted">
              Medville Diabetes helps make getting the diabetes supplies you rely on
              simpler, with dependable products and support along the way.
            </p>
          </div>

          <nav aria-label="Explore">
            <h3 className={headingClass}>Explore</h3>
            <ul className="mt-3 flex list-none flex-col gap-0.5 p-0">
              {EXPLORE.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Products">
            <h3 className={headingClass}>Products</h3>
            <ul className="mt-3 flex list-none flex-col gap-0.5 p-0">
              {PRODUCTS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h3 className={headingClass}>Resources</h3>
            <ul className="mt-3 flex list-none flex-col gap-0.5 p-0">
              {RESOURCES.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className={headingClass}>Contact Information</h3>
            <address className="mt-4.5 flex flex-col gap-2.5 not-italic">
              <p className="m-0 text-small text-on-dark-brand">
                {ADDRESS_LINE_1}
                <br />
                {ADDRESS_LINE_2}
              </p>
              <p className="m-0 text-small text-on-dark-brand">
                <a href={EMAIL_HREF} className={linkClass}>
                  {EMAIL}
                </a>
              </p>
              <p className="m-0 text-small text-on-dark-brand">
                <a href={PHONE_TEL} className={linkClass}>
                  {PHONE_DISPLAY}
                </a>
              </p>
              <p className="m-0 text-small text-on-dark-brand">{HOURS_SHORT}</p>
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
            <p className="m-0 max-w-[62ch] text-caption text-on-dark-muted/70">
              All product names, logos, trademarks, and registered trademarks are the
              property of their respective owners.
            </p>
          </Container>
        </div>
      </div>
    </footer>
  );
}
