import { useState } from "react";
import { Link } from "react-router-dom";

const PREFERENCE_KEY = "medville:optional-storage-preference:v1";
type Preference = "accepted" | "rejected";

/* No optional trackers are loaded. A future tracker requires a new notice and policy review. */

export default function CookieNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      const preference = localStorage.getItem(PREFERENCE_KEY);
      return preference !== "accepted" && preference !== "rejected";
    }
    catch { return true; }
  });

  if (!visible) return null;

  const choose = (preference: Preference) => {
    try { localStorage.setItem(PREFERENCE_KEY, preference); }
    catch { /* Keep this notice dismissible when browser storage is unavailable. */ }
    setVisible(false);
  };

  return (
    <aside
      role="region"
      aria-label="Cookies and privacy notice"
      className="fixed inset-x-4 bottom-4 z-[110] flex flex-col gap-5 rounded-lg border border-line-brand bg-surface-raised p-5 shadow-overlay sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[620px] sm:max-w-[calc(100vw-48px)] sm:gap-6 sm:p-7"
    >
      <div className="text-small leading-relaxed text-grey-dark sm:text-body">
        <p className="font-display text-body font-semibold text-ink sm:text-lg">Cookies and privacy</p>
        <p className="mt-2">Necessary browser storage stays on to keep the site working. We do not currently use optional tracking cookies. Your choice records your preference. Read our <Link to="/privacy-policy" className="font-semibold text-brand underline">Privacy Policy</Link>.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => choose("accepted")} className="min-h-11 min-w-[120px] rounded-full bg-brand-bright px-5 py-2.5 font-display text-small font-semibold text-ink">Accept</button>
        <button type="button" onClick={() => choose("rejected")} className="min-h-11 min-w-[120px] rounded-full border border-line-input px-5 py-2.5 font-display text-small font-semibold text-ink hover:bg-grey-light">Reject</button>
      </div>
    </aside>
  );
}
