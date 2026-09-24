// Analytics is deliberately limited to non-intake, general-information pages.
// Do not add patient, product, service, contact, or article routes here without
// a privacy/compliance review. Never pass URL search, hash, form, or user data.
export const ANALYTICS_ID = "G-FKL260647Z";
export const ANALYTICS_CONSENT_KEY = "medville-analytics-consent";

const PAGE_TITLES: Record<string, string> = {
  "/": "Medville Diabetes | Home",
  "/about": "Medville Diabetes | About",
  "/blog": "Medville Diabetes | Blog",
  "/privacy-policy": "Medville Diabetes | Privacy Policy",
  "/terms-of-service": "Medville Diabetes | Terms of Service",
};

export function analyticsPage(pathname: string) {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const title = PAGE_TITLES[path];
  return title ? { path, title } : null;
}
