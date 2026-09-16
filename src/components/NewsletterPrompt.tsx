import { useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCircle2, Mail, X } from "lucide-react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "medville:blog-subscription-prompt";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type Status = "idle" | "sending" | "success" | "error";

export default function NewsletterPrompt() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const headingId = useId();
  const sending = useRef(false);
  const endpoint = (import.meta.env.VITE_NEWSLETTER_ENDPOINT as string | undefined)
    || "https://us-central1-medville-diabetes.cloudfunctions.net/blogSubscribe";

  useEffect(() => {
    if (pathname === "/qualify") return;
    let lastSeen = 0;
    try { lastSeen = Number(localStorage.getItem(STORAGE_KEY) || 0); } catch { /* private window */ }
    if (Date.now() - lastSeen < THIRTY_DAYS) return;
    const timer = window.setTimeout(() => setOpen(true), 2200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* private window */ }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending.current || !email.trim() || !consent) return;
    sending.current = true;
    setStatus("sending");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ email: email.trim(), consent, website }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus("success");
      try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* private window */ }
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  };

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="fixed bottom-4 left-4 right-4 z-[80] ml-auto max-w-[440px] rounded-[22px] border border-line-brand bg-surface-raised p-5 shadow-overlay sm:bottom-6 sm:right-6 sm:p-6"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close article updates"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-grey-muted transition-colors hover:bg-grey-light hover:text-ink"
      >
        <X size={20} aria-hidden="true" />
      </button>

      {status === "success" ? (
        <div className="pr-10">
          <CheckCircle2 size={34} className="text-brand" aria-hidden="true" />
          <h2 id={headingId} className="mt-3 font-display text-h3 font-bold text-ink">You are subscribed</h2>
          <p className="mt-2 text-small leading-relaxed text-grey-dark">
            We sent a confirmation email. You will receive an email when a new article is published.
          </p>
          <button type="button" onClick={close} className="mt-5 min-h-11 rounded-full bg-brand-bright px-5 py-2.5 font-display text-small font-semibold text-ink">
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 pr-10">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-soft text-brand">
              <Bell size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand">New article updates</p>
              <h2 id={headingId} className="mt-1 font-display text-h3 font-bold text-ink">Learn with Medville Diabetes</h2>
            </div>
          </div>
          <p className="mt-4 text-small leading-relaxed text-grey-dark">
            Subscribe to receive an email when we publish a new article about diabetes technology, health, and daily life.
          </p>
          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            <div className="relative">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-grey-muted" aria-hidden="true" />
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="min-h-[46px] w-full rounded-md border-[1.5px] border-line-input bg-surface-raised py-2.5 pl-10 pr-4 text-body text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
            <label className="flex cursor-pointer items-start gap-2.5 text-caption leading-relaxed text-grey-muted">
              <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-ink" />
              <span>I agree to receive new article emails. I can unsubscribe at any time.</span>
            </label>
            {status === "error" && <p role="alert" className="text-caption font-medium text-danger">Subscription could not be completed. Please try again.</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={status === "sending" || !consent} className="min-h-11 rounded-full bg-brand-bright px-5 py-2.5 font-display text-small font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-55">
                {status === "sending" ? "Subscribing" : "Subscribe"}
              </button>
              <button type="button" onClick={close} className="min-h-11 rounded-full border border-line-input px-5 py-2.5 font-display text-small font-semibold text-ink hover:bg-grey-light">
                Not now
              </button>
            </div>
          </form>
        </>
      )}
    </aside>
  );
}
