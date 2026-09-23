import { useState } from "react";
import { Link } from "react-router-dom";

const ACKNOWLEDGED_KEY = "medville:privacy-notice-acknowledged:v1";

export default function CookieNotice() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(ACKNOWLEDGED_KEY) !== "1"; }
    catch { return true; }
  });

  if (!visible) return null;

  const acknowledge = () => {
    try { localStorage.setItem(ACKNOWLEDGED_KEY, "1"); }
    catch { /* Keep this notice dismissible when browser storage is unavailable. */ }
    setVisible(false);
  };

  return (
    <aside
      role="region"
      aria-label="Cookies and privacy notice"
      className="fixed inset-x-4 bottom-4 z-[110] mx-auto flex max-w-[860px] flex-col gap-4 rounded-lg border border-line-brand bg-surface-raised p-4 shadow-overlay sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex-1 text-small leading-relaxed text-grey-dark">
        <p className="font-semibold text-ink">Cookies and privacy</p>
        <p className="mt-1">We use browser storage to keep the site working and remember your choices. Read our <Link to="/privacy-policy" className="font-semibold text-brand underline">Privacy Policy</Link> for more information.</p>
      </div>
      <button type="button" onClick={acknowledge} className="min-h-11 shrink-0 rounded-full bg-brand-bright px-5 py-2.5 font-display text-small font-semibold text-ink">Got it</button>
    </aside>
  );
}
