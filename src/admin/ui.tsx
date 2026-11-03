import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info, LoaderCircle, X } from "lucide-react";
import { createPortal } from "react-dom";

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
    <header className="admin-page-head">
      <div className="min-w-0">
        <h1 className="admin-page-title">{title}</h1>
        {lede && <p className="admin-page-lede">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
    <p
      className="flex items-center justify-center gap-3 px-3 py-10 text-[14px]"
      style={{ color: "var(--a-text-faint)" }}
      role="status"
    >
      <span className="admin-spin admin-spin-sm" aria-hidden="true" />
      {label}
    </p>
  );
}

/* ---- action notices ----
   Deliberately plain text. A notice must never repeat a lead's details,
   because a screenshot of a dashboard is one of the easiest ways for PHI to
   escape a screen. Messages say what happened, never to whom.

   Dashboard actions use a centred card instead of a small corner toast. The
   result is difficult to miss after saving, publishing, sending, revoking or
   deleting, and it remains keyboard accessible without interrupting the
   action that just finished. */

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "danger";
  leaving: boolean;
}

const ToastContext = createContext<(message: string, tone?: "ok" | "danger") => void>(() => {});

/* How long a notice stays, and how long it takes to leave. The countdown is
   the ring round the badge: when it has drained, the notice leaves. Pointing
   at the card or tabbing into it pauses the ring, so nobody loses a message
   while reading it. */
const NOTICE_MS = 4200;
const NOTICE_EXIT_MS = 260;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id?: number) => {
    setToasts((current) => current.map((toast) => (id === undefined || toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => !(toast.leaving && (id === undefined || toast.id === id))));
    }, NOTICE_EXIT_MS);
  }, []);

  const push = useCallback((message: string, tone: "ok" | "danger" = "ok") => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts([{ id, message, tone, leaving: false }]);
  }, []);

  const visible = toasts.slice(-1);
  const showing = visible.some((toast) => !toast.leaving);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(<div
        className={`admin-action-notices${visible.length ? " is-visible" : ""}${visible.length && !showing ? " is-leaving" : ""}`}
        aria-live="polite"
        aria-atomic="true"
        onClick={() => dismiss()}
      >
        {visible.map((toast) => (
          <section
            key={toast.id}
            role={toast.tone === "danger" ? "alert" : "status"}
            className={`admin-action-notice admin-action-notice-${toast.tone}${toast.leaving ? " is-leaving" : ""}`}
            style={{ "--notice-ms": `${NOTICE_MS}ms` } as React.CSSProperties}
            aria-label={toast.tone === "ok" ? "Action completed" : "Action needs attention"}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="admin-action-notice-motion" aria-hidden="true">
              {/* One ring: it sweeps round as the card opens, then drains as
                  the countdown, and its end closes the notice. */}
              <svg className="admin-action-notice-dial" viewBox="0 0 56 56">
                <circle className="admin-action-notice-track" cx="28" cy="28" r="25" />
                <circle
                  className="admin-action-notice-arc"
                  cx="28"
                  cy="28"
                  r="25"
                  pathLength="100"
                  onAnimationEnd={(event) => {
                    if (event.animationName === "admin-notice-countdown" && !toast.leaving) dismiss(toast.id);
                  }}
                />
              </svg>
              <span className="admin-action-notice-icon">
                {toast.tone === "ok" ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path className="admin-action-notice-tick" pathLength="1" d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : <AlertTriangle size={22} />}
              </span>
              {toast.tone === "ok" && (
                <span className="admin-action-notice-sparks">
                  {[0, 60, 120, 180, 240, 300].map((angle) => (
                    <span key={angle} style={{ "--spark-angle": `${angle}deg` } as React.CSSProperties} />
                  ))}
                </span>
              )}
            </span>
            <div className="admin-action-notice-text min-w-0 flex-1">
              <p className="admin-action-notice-title">
                <span>{toast.tone === "ok" ? "Action completed" : "Action needs attention"}</span>
              </p>
              <p className="admin-action-notice-message">{toast.message}</p>
            </div>
            <button
              type="button"
              className="admin-icon-btn flex-none"
              aria-label="Close notification"
              onClick={() => dismiss(toast.id)}
            >
              <X size={18} />
            </button>
          </section>
        ))}
      </div>, document.querySelector(".admin[data-admin-theme]") ?? document.body)}
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
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="admin-scrim" aria-label="Close" onClick={onClose} />
      <aside
        ref={dialogRef}
        tabIndex={-1}
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

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busyLabel = "Processing",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelCallback = useRef(onCancel);
  cancelCallback.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) cancelCallback.current();
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [busy, open]);

  if (!open) return null;
  return createPortal(
    <div className="admin-confirm-layer">
      <button type="button" className="admin-confirm-scrim" tabIndex={-1} aria-label="Cancel" disabled={busy} onClick={onCancel} />
      <section ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-body" className="admin-confirm-card">
        <span className={`admin-confirm-motion${busy ? " is-busy" : ""}`} aria-hidden="true">
          <span className="admin-confirm-ring" />
          <span className="admin-confirm-icon">{busy ? <LoaderCircle size={24} /> : <AlertTriangle size={24} />}</span>
        </span>
        <h2 id="admin-confirm-title" className="admin-page-title mt-4">{title}</h2>
        <div id="admin-confirm-body" className="admin-confirm-body">{body}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="admin-btn admin-btn-quiet" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className="admin-btn admin-btn-danger" disabled={busy} onClick={onConfirm}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </section>
    </div>,
    document.querySelector(".admin[data-admin-theme]") ?? document.body,
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
