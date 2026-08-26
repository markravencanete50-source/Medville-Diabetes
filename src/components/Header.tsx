import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import Container from "./Container";
import Logo from "./Logo";
import Button from "./Button";

/* Replace the placeholder phone number before launch. See CLAUDE.md. */
const PHONE_DISPLAY = "877-000-0000";
const PHONE_TEL = "tel:8770000000";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Our Products" },
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

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-small font-medium transition-colors duration-(--duration-micro) ${
      isActive ? "text-accent-deep" : "text-ink-muted hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-40">
      {/* top strip */}
      <div className="bg-ink text-on-dark">
        <Container className="flex h-9 items-center justify-between">
          <a href={PHONE_TEL} className="inline-flex items-center gap-2 text-caption font-medium text-on-dark-muted hover:text-on-dark">
            <Phone size={13} strokeWidth={2.5} />
            Call us today: <span className="text-on-dark">{PHONE_DISPLAY}</span>
          </a>
          <span className="hidden text-caption text-on-dark-muted sm:block">
            Monday to Friday, 8:30 AM to 5:00 PM Eastern Time
          </span>
        </Container>
      </div>

      {/* main bar */}
      <div className="border-b border-line bg-canvas/95 backdrop-blur">
        <Container className="flex h-[4.25rem] items-center justify-between gap-6">
          <Link to="/" aria-label="Medville Diabetes home page">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass} end={l.to === "/"}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button to="/qualify" variant="cta">Check if you Qualify</Button>
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
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-menu"
            ref={panelRef}
            className="absolute right-0 top-0 flex h-full w-[84%] max-w-sm flex-col bg-canvas shadow-overlay"
          >
            <div className="flex h-[4.25rem] items-center justify-between border-b border-line px-5">
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
                      isActive ? "bg-accent-soft text-accent-deep" : "text-ink hover:bg-surface"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto space-y-3 border-t border-line p-5">
              <Button to="/qualify" variant="cta" className="w-full" >
                Check if you Qualify
              </Button>
              <a href={PHONE_TEL} className="flex items-center justify-center gap-2 py-2 text-small font-medium text-ink-muted">
                <Phone size={15} /> {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
