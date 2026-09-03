import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

/*
  The small set of pieces every dashboard screen is built from. Keeping them
  here means a table, a field or a status pill looks the same everywhere and
  can be corrected in one place.
*/

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={`admin-card ${pad ? "admin-card-pad" : ""} ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        {lede && <p className="admin-page-lede">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Field({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help && <p className="admin-help">{help}</p>}
    </div>
  );
}

type BadgeTone = "new" | "ok" | "warn" | "danger" | "quiet";

export function Badge({ tone = "quiet", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "danger";
  children: React.ReactNode;
}) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div className={`admin-banner admin-banner-${tone}`} role={tone === "info" ? undefined : "alert"}>
      <Icon size={16} className="mt-0.5 flex-none" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-10 text-center text-[14px]" style={{ color: "var(--a-text-faint)" }}>
      {children}
    </p>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <p className="px-3 py-10 text-center text-[14px]" style={{ color: "var(--a-text-faint)" }}>
      {label}
    </p>
  );
}

/* ---- toasts ----
   Deliberately plain text. A toast must never repeat a lead's details,
   because a screenshot of a dashboard is one of the easiest ways for PHI to
   escape a screen. Messages say what happened, never to whom. */

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "danger";
}

const ToastContext = createContext<(message: string, tone?: "ok" | "danger") => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: "ok" | "danger" = "ok") => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="admin-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`admin-banner admin-banner-${toast.tone === "ok" ? "info" : "danger"} pointer-events-auto`}
            style={{ background: "var(--a-surface)", boxShadow: "var(--a-shadow)" }}
          >
            {toast.tone === "ok" ? (
              <Check size={16} className="mt-0.5 flex-none" style={{ color: "var(--a-ok)" }} />
            ) : (
              <AlertTriangle size={16} className="mt-0.5 flex-none" style={{ color: "var(--a-danger)" }} />
            )}
            <span style={{ color: "var(--a-text)" }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ---- drawer ----
   Used for lead detail. A drawer rather than a route, so a person's record
   never becomes a URL that could be pasted, bookmarked or logged. */

export function Drawer({
  open,
  onClose,
  title,
  children,
  /* A wider panel for the blog editor, where a block and its preview both
     need room. Everything else keeps the reading width. */
  wide = false,
  /* Actions that must stay in reach however far the body has been scrolled:
     the editor's Publish and Save buttons. Rendered as a fixed foot with the
     phone's safe area respected. */
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="admin-scrim" aria-label="Close" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`admin-drawer ${wide ? "admin-drawer-wide" : ""}`}
      >
        <header className="admin-drawer-head">
          <h2 className="admin-page-title m-0" style={{ fontSize: "1.15rem" }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="admin-icon-btn" aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="admin-drawer-body">{children}</div>
        {footer && <footer className="admin-drawer-foot">{footer}</footer>}
      </aside>
    </>
  );
}

/* ---- theme ---- */

export type AdminTheme = "light" | "dark";
const THEME_KEY = "medville:admin-theme";

export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      /* private window */
    }
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* private window */
      }
      return next;
    });
  }, []);

  return useMemo(() => ({ theme, toggle }), [theme, toggle]);
}

/* ---- formatting ---- */

export function formatDate(iso: string | null) {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
