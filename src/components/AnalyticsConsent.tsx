import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ANALYTICS_CONSENT_KEY, ANALYTICS_ID, analyticsPage } from "../lib/analytics";
import { isEditorPreview } from "../lib/editorPreview";

type Choice = "accepted" | "declined" | null;
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let tagLoaded = false;
let lastTrackedPath: string | null = null;

function storedChoice(): Choice {
  if (typeof window === "undefined") return null;
  try {
    const choice = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return choice === "accepted" || choice === "declined" ? choice : null;
  } catch {
    return null;
  }
}

function saveChoice(choice: Exclude<Choice, null>) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, choice);
  } catch {
    // Storage may be blocked; consent still applies to the current page only.
  }
}

function loadTag(path: string, title: string) {
  if (tagLoaded) return;
  tagLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (..._args: unknown[]) { window.dataLayer?.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", ANALYTICS_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: `${window.location.origin}${path}`,
    page_referrer: window.location.origin,
    page_title: title,
  });
  window.gtag("event", "page_view", {
    page_location: `${window.location.origin}${path}`,
    page_referrer: window.location.origin,
    page_title: title,
  });
  lastTrackedPath = path;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
  script.setAttribute("data-medville-analytics", "true");
  document.head.appendChild(script);
}

export default function AnalyticsConsent({ promptComplete }: { promptComplete: boolean }) {
  const location = useLocation();
  const page = analyticsPage(location.pathname);
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const preview = isEditorPreview();

  // A loaded Google tag cannot reliably be unloaded within an SPA. Move to a
  // fresh document before displaying a route outside the explicit allowlist.
  useEffect(() => {
    if (tagLoaded && (!page || location.search)) {
      window.location.replace(window.location.href);
    }
  }, [page, location.search]);

  useEffect(() => {
    setChoice(storedChoice());
    setReady(true);
  }, []);

  useEffect(() => {
    if (preview || choice !== "accepted" || !page || location.search) return;
    if (!tagLoaded) {
      loadTag(page.path, page.title);
    } else if (lastTrackedPath !== page.path) {
      window.gtag?.("event", "page_view", {
        page_location: `${window.location.origin}${page.path}`,
        page_referrer: window.location.origin,
        page_title: page.title,
      });
      lastTrackedPath = page.path;
    }
  }, [choice, page, location.search, preview]);

  useEffect(() => {
    const openChoices = () => setShowChoices(true);
    window.addEventListener("medville:analytics-choices", openChoices);
    return () => window.removeEventListener("medville:analytics-choices", openChoices);
  }, []);

  useEffect(() => {
    if (!tagLoaded) return;
    const navigateWithFreshDocument = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      // Public informational pages can use fast client navigation. A fresh
      // document is required only before entering a route where analytics
      // must not be present at all.
      if (analyticsPage(destination.pathname) && !destination.search) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(destination.href);
    };
    document.addEventListener("click", navigateWithFreshDocument, true);
    return () => document.removeEventListener("click", navigateWithFreshDocument, true);
  }, [choice]);

  if (!ready || !promptComplete || preview || (choice && !showChoices)) return null;

  const decide = (next: Exclude<Choice, null>) => {
    saveChoice(next);
    setChoice(next);
    setShowChoices(false);
    if (tagLoaded && next === "declined") window.location.reload();
  };

  return (
    <section
      aria-label="Cookies and privacy choices"
      className="fixed bottom-4 left-4 z-60 max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line-brand bg-surface-raised p-4 text-grey-dark shadow-overlay sm:bottom-6 sm:left-6 sm:p-6"
    >
      <h2 className="m-0 font-display text-lg font-semibold text-brand-deep">Cookies and privacy</h2>
      <p className="mt-2 text-small leading-snug">
        May we use optional Google Analytics on general pages? Google may receive
        device and browsing data if you agree. We keep it off health-related forms
        and pages. Read our <Link to="/privacy-policy" className="underline">privacy policy</Link> and
        Google&rsquo;s <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="underline">partner-sites information</a>.
        You can change your choice in the footer.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" aria-label="Accept optional analytics" onClick={() => decide("accepted")} className="min-h-11 min-w-[120px] rounded-full bg-brand-bright px-5 py-2.5 text-small font-semibold text-ink">Accept</button>
        <button type="button" aria-label="Reject optional analytics" onClick={() => decide("declined")} className="min-h-11 min-w-[120px] rounded-full border border-line-input px-5 py-2.5 text-small font-semibold text-ink">Reject</button>
      </div>
    </section>
  );
}
