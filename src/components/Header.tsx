import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, Menu, X, Phone } from "lucide-react";
import Container from "./Container";
import Logo from "./Logo";
import Button from "./Button";

import { useCompanyDetails } from "../lib/useCompanyDetails";
import { pageIsVisible, type PageId } from "../content/schema";
import { useSiteData } from "../lib/useSiteData";

const links = [
  { to: "/", label: "Home", page: "home" },
  { to: "/products", label: "Our Products", page: "products" },
  { to: "/services", label: "How It Works", page: "services" },
  { to: "/blog", label: "Blog", page: "blog" },
  { to: "/refer-a-patient", label: "Refer a Patient", page: "refer" },
  { to: "/about", label: "About Us", page: "about" },
  { to: "/contact", label: "Contact", page: "contact" },
] satisfies { to: string; label: string; page: PageId }[];

export default function Header() {
  const { PHONE_DISPLAY, PHONE_TEL } = useCompanyDetails();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { content } = useSiteData();
  const visibleLinks = links.filter((link) => pageIsVisible(content[link.page]));
  const eligibilityVisible = pageIsVisible(content.qualify);

  /* Close the drawer with the Escape key and lock body scroll while open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40">
      {/* main bar: glass over whatever is scrolling beneath */}
      <div className="border-b border-ink/[0.08] bg-canvas/[0.86] backdrop-blur-[14px]">
        <Container wide className="flex h-[72px] items-center justify-between gap-6">
          <Link to="/" aria-label="Medville Diabetes home page">
            <Logo className="h-12" />
          </Link>

          <nav className="hidden items-center gap-6 xl:flex" aria-label="Main navigation">
            {visibleLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `relative py-1.5 text-small font-semibold transition-colors duration-(--duration-micro) ${
                    isActive ? "text-brand" : "text-grey-dark hover:text-brand"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 h-0.5 w-full rounded-sm bg-brand-bright transition-opacity duration-(--duration-micro)"
                      style={{ opacity: isActive ? 1 : 0 }}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {eligibilityVisible && <div className="hidden xl:block">
            <Button to="/qualify" variant="cta" className="px-6 text-[0.875rem]">
              Check Eligibility
              <ArrowRight size={15} strokeWidth={2.2} />
            </Button>
          </div>}

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close the menu" : "Open the menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </Container>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close the menu"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-menu"
            ref={panelRef}
            className="absolute right-0 top-0 flex h-full w-[84%] max-w-sm flex-col bg-canvas shadow-overlay"
          >
            <div className="flex h-[72px] items-center justify-between border-b border-line-brand px-5">
              <Logo className="h-11" />
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-md text-ink"
                aria-label="Close the menu"
                onClick={() => setOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
              {visibleLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-md px-4 py-3.5 font-display text-body font-semibold ${
                      isActive ? "bg-brand-soft text-brand" : "text-ink hover:bg-grey-light"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto space-y-3 border-t border-line-brand p-5">
              {eligibilityVisible && (
                <Button to="/qualify" variant="cta" className="w-full">
                  Check Eligibility
                </Button>
              )}
              <a
                href={PHONE_TEL}
                className="flex items-center justify-center gap-2 py-2 text-small font-medium text-grey-muted"
              >
                <Phone size={15} /> {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
