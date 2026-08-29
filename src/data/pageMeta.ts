/*
  The title and search description for every fixed page, in one place.

  Two things read this and they must never disagree:

  1. The pages themselves, through usePageMeta, which sets the title in the
     browser tab once React has run.
  2. scripts/prerender.mjs, which writes a real HTML file per address at build
     time.

  The second is the one that matters for search. This is a single-page app, so
  every address is served the same index.html and a crawler that does not run
  JavaScript sees the same title on all sixteen pages. Google does render
  JavaScript, but it renders late and inconsistently, and the crawlers behind
  link previews on WhatsApp, Slack, LinkedIn and iMessage do not render at all.
  Writing the tags into the file removes the question.

  Copy rules from CLAUDE.md apply. A description is a sentence a person would
  read in a results page, around 150 characters, and never a list of keywords.

  Product and article pages are not here: their wording comes from the product
  catalog and from what the client has written, and the prerender script builds
  those addresses from the same sources the site uses.
*/

export interface PageMeta {
  title: string;
  description: string;
}

export const SITE_ORIGIN = "https://www.medvillediabetes.com";
export const SITE_NAME = "Medville Diabetes";

export const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: "Medville Diabetes | CGMs & Diabetes Supplies Made Simpler",
    description:
      "Explore CGMs, insulin pumps, and diabetes supplies with support from Medville Diabetes. Check your potential CGM eligibility and learn what comes next.",
  },
  "/products": {
    title: "CGMs, Insulin Pumps & Diabetes Supplies | Medville Diabetes",
    description:
      "Explore continuous glucose monitors, CGM sensors, accessories, and insulin pump technology available through Medville Diabetes.",
  },
  "/products/cgm": {
    title: "Continuous Glucose Monitors (CGM) | Medville Diabetes",
    description:
      "Explore FreeStyle Libre and Dexcom continuous glucose monitors, sensors, and CGM supplies through Medville Diabetes.",
  },
  "/products/insulin-pumps": {
    title: "Insulin Pumps & Diabetes Technology | Medville Diabetes",
    description:
      "Explore insulin pump technology available through Medville Diabetes, including the Tandem t:slim X2 insulin pump.",
  },
  "/services": {
    title: "Our Services | Medville Diabetes",
    description:
      "See the ten steps Medville handles from your first conversation to ongoing CGM supplies, including insurance coordination and delivery.",
  },
  "/refer-a-patient": {
    title: "Refer a Patient | Medville Diabetes",
    description:
      "Refer patients to Medville Diabetes for CGMs and diabetes supplies. Download the referral form and requirements and send your referral through our secure process.",
  },
  "/blog": {
    title: "Blog | Medville Diabetes",
    description:
      "Plain English articles about continuous glucose monitors, insurance coverage, and living with diabetes, from the team at Medville Diabetes.",
  },
  "/qualify": {
    title: "Check Your Potential Eligibility | Medville Diabetes",
    description:
      "Complete the short Medville Diabetes eligibility form. Our team will review your information and explain your potential eligibility and next steps.",
  },
  "/about": {
    title: "About Medville Diabetes | CGMs & Diabetes Supplies",
    description:
      "Medville Diabetes brings the medical supply experience of Medville into a service focused on diabetes, making access to CGMs and supplies simpler.",
  },
  "/contact": {
    title: "Contact Medville Diabetes | CGM & Diabetes Supply Support",
    description:
      "Contact Medville Diabetes for help with continuous glucose monitors, diabetes supplies, potential eligibility, and next steps.",
  },
  "/404": {
    title: "Page Not Found | Medville Diabetes",
    description:
      "This address does not match a page on the Medville Diabetes website. Return to the home page or browse continuous glucose monitors and diabetes supplies.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Medville Diabetes",
    description:
      "How Medville Diabetes collects, uses and protects the information you provide through this website.",
  },
  "/terms-of-service": {
    title: "Terms of Service | Medville Diabetes",
    description:
      "The terms that apply to using the Medville Diabetes website and the products and services described on it.",
  },
};

/* A page asks for its own wording by address, so a typo is a build error
   rather than a silently empty tag. */
export function metaFor(path: keyof typeof PAGE_META | string): PageMeta {
  return (
    PAGE_META[path] ?? {
      title: `${SITE_NAME} | CGMs & Diabetes Supplies Made Simpler`,
      description: PAGE_META["/"].description,
    }
  );
}
