import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, Menu, X, Phone } from "lucide-react";
import Container from "./Container";
import Logo from "./Logo";
import Button from "./Button";

const PHONE_DISPLAY = "888-564-2595";
const PHONE_TEL = "tel:+18885642595";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Our Products" },
  { to: "/services", label: "Our Services" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            {links.map((l) => (
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

          <div className="hidden md:block">
            <Button to="/qualify" variant="cta" className="px-6 text-[0.875rem]">
              Check if you Qualify
              <ArrowRight size={15} strokeWidth={2.2} />
            </Button>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink md:hidden"
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
        <div className="fixed inset-0 z-50 md:hidden">
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
              <Logo />
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
              {links.map((l) => (
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
              <Button to="/qualify" variant="cta" className="w-full">
                Check if you Qualify
              </Button>
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
