/*
  The editable content schema.

  One file describes every field the client can change from the dashboard.
  The website reads values from it, and the dashboard builds its editor from
  it, so the two can never disagree about what exists or what a field is
  called. Adding a field here makes it appear in the dashboard automatically.

  Every field carries its current wording as `fallback`. A page renders the
  fallback until the client saves something over it, which means the site is
  never blank, never depends on Firestore being reachable, and looks exactly
  as it does today on the day this ships.

  Copy rules from CLAUDE.md apply to every fallback string here: plain
  English, no contractions, short sentences.
*/

export type FieldKind = "text" | "longText" | "image";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /* What the site shows when the client has not overridden this field. */
  fallback: string;
  help?: string;
  max?: number;
}

export interface BlockDef {
  id: string;
  label: string;
  fields: FieldDef[];
  hideable?: boolean;
  elements?: ElementDef[];
}

export type ElementKind = "copy" | "picture" | "action" | "content";

export interface ElementDef {
  id: string;
  label: string;
  kind: ElementKind;
  help?: string;
}

export interface PageDef {
  id: PageId;
  label: string;
  path: string;
  blocks: BlockDef[];
}

export type PageId =
  | "home"
  | "products"
  | "services"
  | "blog"
  | "qualify"
  | "refer"
  | "about"
  | "contact";

/* A saved page document is a flat map of "blockId.fieldKey" to the value. */
export type PageValues = Record<string, string>;
export type SiteContent = Partial<Record<PageId, PageValues>>;

export const PAGE_VISIBILITY_KEY = "__visibility.page";

export function sectionVisibilityKey(blockId: string) {
  return `__visibility.section.${blockId}`;
}

export function elementVisibilityKey(blockId: string, elementId: string) {
  return `__visibility.element.${blockId}.${elementId}`;
}

export function pageIsVisible(values: PageValues | undefined) {
  return values?.[PAGE_VISIBILITY_KEY] !== "hidden";
}

export function sectionIsVisible(values: PageValues | undefined, blockId: string) {
  return values?.[sectionVisibilityKey(blockId)] !== "hidden";
}

export function elementIsVisible(
  values: PageValues | undefined,
  blockId: string,
  elementId: string,
) {
  return values?.[elementVisibilityKey(blockId, elementId)] !== "hidden";
}

export const PAGES: PageDef[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    blocks: [
      {
        id: "meta",
        label: "Search engine listing",
        hideable: false,
        fields: [
          {
            key: "title",
            label: "Browser and search title",
            kind: "text",
            max: 70,
            fallback: "Medville Diabetes | CGMs & Diabetes Supplies Made Simpler",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            help: "Around 150 characters reads best in search results.",
            fallback:
              "Explore CGMs, insulin pumps, and diabetes supplies with support from Medville Diabetes. Check your potential CGM eligibility and learn what comes next.",
          },
        ],
      },
      {
        id: "hero",
        label: "Opening banner",
        elements: [
          { id: "copy", label: "Heading and introduction", kind: "copy" },
          { id: "actions", label: "Eligibility and products buttons", kind: "action" },
          { id: "note", label: "Note below the buttons", kind: "copy" },
          { id: "picture", label: "Interactive product picture", kind: "picture" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "Diabetes supplies made simpler",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            help: "Wrap the words you want in brand colour with *asterisks*.",
            fallback: "Manage Less. *Live More.*",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Getting the diabetes supplies you rely on should not add more to your day. Medville Diabetes helps make access to CGMs and diabetes supplies simpler, with dependable support along the way.",
          },
          {
            key: "primaryCta",
            label: "Main button",
            kind: "text",
            max: 32,
            fallback: "Check My Eligibility",
          },
          {
            key: "secondaryCta",
            label: "Second button",
            kind: "text",
            max: 32,
            fallback: "Explore Products",
          },
          {
            key: "note",
            label: "Line under the buttons",
            kind: "text",
            max: 90,
            fallback: "Quick to get started. No obligation. Coverage and eligibility vary by plan.",
          },
        ],
      },
      { id: "stats", label: "Experience numbers", fields: [], elements: [
        { id: "numbers", label: "All experience numbers", kind: "content" },
      ] },
      { id: "process", label: "How it works", fields: [], elements: [
        { id: "intro", label: "Section heading and introduction", kind: "copy" },
        { id: "cards", label: "Three process cards", kind: "content" },
        { id: "pictures", label: "Pictures inside the process cards", kind: "picture" },
      ] },
      { id: "products", label: "Featured products", fields: [], elements: [
        { id: "intro", label: "Section heading and introduction", kind: "copy" },
        { id: "cards", label: "Featured product cards", kind: "content" },
        { id: "viewAll", label: "View all products link", kind: "action" },
      ] },
      { id: "whyCgm", label: "Why continuous monitoring", fields: [], elements: [
        { id: "benefits", label: "Heading and benefit list", kind: "copy" },
        { id: "picture", label: "Continuous monitoring picture", kind: "picture" },
        { id: "captions", label: "Three supporting points", kind: "content" },
      ] },
      { id: "testimonials", label: "Customer experiences", fields: [], elements: [
        { id: "heading", label: "Section heading", kind: "copy" },
        { id: "cards", label: "Published customer reviews", kind: "content" },
        { id: "disclaimer", label: "Results disclaimer", kind: "copy" },
      ] },
      { id: "cta", label: "Eligibility banner", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "button", label: "Eligibility button", kind: "action" },
        { id: "privacy", label: "Privacy note", kind: "copy" },
      ] },
      {
        id: "blog",
        label: "Health and lifestyle articles",
        elements: [
          { id: "intro", label: "Section heading and introduction", kind: "copy" },
          { id: "cards", label: "Article cards", kind: "content" },
          { id: "pictures", label: "Article pictures", kind: "picture" },
          { id: "readAll", label: "Read our blog link", kind: "action" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "Learn for daily life",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Practical Guides for Your Health and Lifestyle",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 360,
            fallback:
              "Explore clear articles about nutrition, activity, sleep, glucose patterns, and diabetes technology. Use them to build questions for your healthcare team and make informed choices in daily life.",
          },
        ],
      },
      { id: "faqs", label: "Common questions", fields: [], elements: [
        { id: "heading", label: "Section heading", kind: "copy" },
        { id: "questions", label: "Question list", kind: "content" },
      ] },
    ],
  },

  {
    id: "products",
    label: "Our Products",
    path: "/products",
    blocks: [
      {
        id: "meta",
        label: "Search engine listing",
        hideable: false,
        fields: [
          {
            key: "title",
            label: "Browser and search title",
            kind: "text",
            max: 70,
            fallback: "CGMs, Insulin Pumps & Diabetes Supplies | Medville Diabetes",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "Explore continuous glucose monitors, CGM sensors, accessories, and insulin pump technology available through Medville Diabetes.",
          },
        ],
      },
      {
        id: "hero",
        label: "Opening banner",
        elements: [
          { id: "copy", label: "Heading and introduction", kind: "copy" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "Our Products",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Diabetes Technology That Fits Into Real Life",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Explore continuous glucose monitors, sensors, supplies, and insulin delivery technology from leading diabetes brands, backed by support to help make getting what you need easier.",
          },
        ],
      },
      { id: "catalog", label: "Product categories and catalog", fields: [], elements: [
        { id: "pictures", label: "Product category pictures", kind: "picture" },
        { id: "cards", label: "Product category cards", kind: "content" },
        { id: "disclaimer", label: "Product disclaimer", kind: "copy" },
      ] },
    ],
  },

  {
    id: "services",
    label: "Our Services",
    path: "/services",
    blocks: [
      {
        id: "meta",
        label: "Search engine listing",
        hideable: false,
        fields: [
          {
            key: "title",
            label: "Browser and search title",
            kind: "text",
            max: 70,
            fallback: "Our Services | Medville Diabetes",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "See the ten steps Medville handles from your first conversation to ongoing CGM supplies.",
          },
        ],
      },
      {
        id: "hero",
        label: "Opening banner",
        elements: [
          { id: "copy", label: "Heading and introduction", kind: "copy" },
          { id: "picture", label: "Opening banner photograph", kind: "picture" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "How the process works",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            help: "Wrap the words you want in brand colour with *asterisks*.",
            fallback: "From your first call to *every supply delivery.*",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Medville handles the coordination with your doctor and insurance provider, making the process simple from start to finish.",
          },
          {
            key: "image",
            label: "Banner photograph",
            kind: "image",
            fallback: "/services/journey/journey-hero.webp",
          },
          {
            key: "imageAlt",
            label: "Description of the photograph",
            kind: "text",
            max: 140,
            help: "Read aloud by screen readers. Describe what is in the picture.",
            fallback:
              "A woman at home checks her phone while wearing a continuous glucose monitor.",
          },
        ],
      },
      {
        id: "cycle",
        label: "The process at a glance",
        elements: [
          { id: "copy", label: "Heading and introduction", kind: "copy" },
          { id: "graphic", label: "Interactive process graphic", kind: "picture" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "The process at a glance",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "One simple process. *Every step coordinated.*",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Get a clear view of the journey, from your initial call through insurance coordination and ongoing supply deliveries.",
          },
        ],
      },
      {
        id: "stages",
        label: "The detailed process",
        elements: [
          { id: "intro", label: "Section heading and introduction", kind: "copy" },
          { id: "cards", label: "Process stage cards", kind: "content" },
          { id: "pictures", label: "Process stage pictures", kind: "picture" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "The detailed process",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Four clear stages. *Every step, clearly explained.*",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Each stage outlines the work our team completes to keep your CGM supplies moving forward.",
          },
        ],
      },
      {
        id: "closing",
        label: "Closing banner",
        elements: [
          { id: "copy", label: "Heading and introduction", kind: "copy" },
          { id: "button", label: "Eligibility button", kind: "action" },
        ],
        fields: [
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "We handle the process. *You focus on your health.*",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Medville stays with your order from the first conversation through recurring deliveries.",
          },
          {
            key: "cta",
            label: "Button",
            kind: "text",
            max: 32,
            fallback: "Check My Eligibility",
          },
        ],
      },
    ],
  },

  {
    id: "about",
    label: "About Us",
    path: "/about",
    blocks: [
      {
        id: "meta",
        label: "Search engine listing",
        hideable: false,
        fields: [
          {
            key: "title",
            label: "Browser and search title",
            kind: "text",
            max: 70,
            fallback: "About Medville Diabetes | CGMs & Diabetes Supplies",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "Medville Diabetes brings the medical supply experience of Medville into a service focused on diabetes, making access to CGMs and supplies simpler.",
          },
        ],
      },
      {
        id: "hero",
        label: "Opening banner",
        elements: [
          { id: "copy", label: "Heading and introduction", kind: "copy" },
          { id: "picture", label: "Opening banner photograph", kind: "picture" },
          { id: "promises", label: "Four service promises", kind: "content" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "About Medville Diabetes",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Making Diabetes Supply One Less Thing to Manage",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 400,
            fallback:
              "Living with diabetes comes with enough routines, decisions, and responsibilities. Getting the supplies you rely on should not make your day more complicated.",
          },
          {
            key: "image",
            label: "Banner photograph",
            kind: "image",
            fallback: "/about/about-hero.webp",
          },
        ],
      },
      { id: "missionVision", label: "Mission and vision", fields: [], elements: [
        { id: "heading", label: "Section heading", kind: "copy" },
        { id: "cards", label: "Mission and vision cards", kind: "content" },
        { id: "pictures", label: "Mission and vision photographs", kind: "picture" },
      ] },
      { id: "story", label: "Company story", fields: [], elements: [
        { id: "heading", label: "Section heading", kind: "copy" },
        { id: "paragraphs", label: "Company story paragraphs", kind: "copy" },
        { id: "statement", label: "Highlighted closing statement", kind: "copy" },
      ] },
      { id: "promises", label: "What you can expect", fields: [], elements: [
        { id: "heading", label: "Section heading", kind: "copy" },
        { id: "cards", label: "Three promise cards", kind: "content" },
        { id: "pictures", label: "Pictures inside promise cards", kind: "picture" },
      ] },
      { id: "closing", label: "Closing banner", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "button", label: "Eligibility button", kind: "action" },
      ] },
    ],
  },

  {
    id: "contact",
    label: "Contact",
    path: "/contact",
    blocks: [
      {
        id: "meta",
        label: "Search engine listing",
        hideable: false,
        fields: [
          {
            key: "title",
            label: "Browser and search title",
            kind: "text",
            max: 70,
            fallback: "Contact Medville Diabetes | CGM & Diabetes Supply Support",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "Contact Medville Diabetes for help with continuous glucose monitors, diabetes supplies, potential eligibility, and next steps.",
          },
        ],
      },
      {
        id: "hero",
        label: "Opening banner",
        elements: [
          { id: "intro", label: "Heading and introduction", kind: "copy" },
          { id: "privacy", label: "Privacy reminder card", kind: "content" },
          { id: "phone", label: "Phone contact card", kind: "content" },
        ],
        fields: [
          {
            key: "eyebrow",
            label: "Small label above the heading",
            kind: "text",
            max: 40,
            fallback: "Contact Us",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Need Help? Start Here.",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Have a question about a product, your eligibility submission, supplies, or next steps? Reach out to the Medville Diabetes team and we will help point you in the right direction.",
          },
        ],
      },
      {
        id: "details",
        label: "Contact details",
        fields: [
          { key: "phone", label: "Phone number", kind: "text", max: 24, fallback: "888-564-2595" },
          {
            key: "email",
            label: "Email address",
            kind: "text",
            max: 120,
            fallback: "info@medvillediabetes.com",
          },
          {
            key: "address",
            label: "Postal address",
            kind: "longText",
            max: 200,
            fallback: "28863 Industry Dr\nValencia, CA 91355",
          },
          {
            key: "hours",
            label: "Opening hours",
            kind: "text",
            max: 120,
            fallback: "Monday to Friday 8AM to 5PM Pacific Standard Time",
          },
        ],
      },
      { id: "form", label: "General enquiry form", fields: [], elements: [
        { id: "heading", label: "Form heading and required note", kind: "copy" },
        { id: "fields", label: "Contact information fields", kind: "content" },
        { id: "message", label: "Question field", kind: "content" },
        { id: "consent", label: "Privacy confirmation", kind: "content" },
        { id: "button", label: "Send message button", kind: "action" },
      ] },
    ],
  },
  {
    id: "blog",
    label: "Blog",
    path: "/blog",
    blocks: [
      { id: "hero", label: "Opening banner", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
      ] },
      { id: "articles", label: "Article library", fields: [], elements: [
        { id: "topics", label: "Topic navigation", kind: "action" },
        { id: "featured", label: "Featured article", kind: "content" },
        { id: "lists", label: "Topic article lists", kind: "content" },
        { id: "pictures", label: "All article pictures", kind: "picture" },
      ] },
      { id: "closing", label: "Help with supplies banner", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "buttons", label: "Products and services buttons", kind: "action" },
      ] },
    ],
  },
  {
    id: "qualify",
    label: "Eligibility Form",
    path: "/qualify",
    blocks: [{ id: "form", label: "Eligibility form", fields: [], elements: [
      { id: "intro", label: "Heading and introduction", kind: "copy" },
      { id: "steps", label: "Three form steps", kind: "content" },
      { id: "privacy", label: "Privacy notice", kind: "content" },
      { id: "fields", label: "Contact and eligibility fields", kind: "content" },
      { id: "product", label: "Selected product picture and education", kind: "picture" },
      { id: "consent", label: "Consent checkbox and terms", kind: "content" },
      { id: "button", label: "Submission button", kind: "action" },
    ] }],
  },
  {
    id: "refer",
    label: "Refer a Patient",
    path: "/refer-a-patient",
    blocks: [
      { id: "hero", label: "Opening banner", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "buttons", label: "Download and contact buttons", kind: "action" },
        { id: "note", label: "Referral note", kind: "copy" },
        { id: "picture", label: "Provider photograph", kind: "picture" },
      ] },
      { id: "steps", label: "How referrals work", fields: [], elements: [
        { id: "heading", label: "Section heading", kind: "copy" },
        { id: "cards", label: "Three referral steps", kind: "content" },
        { id: "button", label: "Download button", kind: "action" },
      ] },
      { id: "video", label: "Referral video", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "player", label: "Video or placeholder", kind: "picture" },
      ] },
      { id: "download", label: "Referral download panel", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "button", label: "Download button", kind: "action" },
        { id: "contact", label: "Email and phone details", kind: "content" },
      ] },
      { id: "support", label: "Provider support banner", fields: [], elements: [
        { id: "copy", label: "Heading and introduction", kind: "copy" },
        { id: "button", label: "Contact button", kind: "action" },
      ] },
    ],
  },
];

/* Lookup helpers used by both the website and the dashboard. */

export const PAGE_BY_ID = new Map(PAGES.map((page) => [page.id, page]));

export function fieldPath(blockId: string, fieldKey: string) {
  return `${blockId}.${fieldKey}`;
}

/* Every fallback, flattened, so a page can resolve a value without walking
   the schema on every render. */
export function defaultsFor(pageId: PageId): PageValues {
  const page = PAGE_BY_ID.get(pageId);
  if (!page) return {};
  const values: PageValues = {};
  for (const block of page.blocks) {
    for (const field of block.fields) {
      values[fieldPath(block.id, field.key)] = field.fallback;
    }
  }
  return values;
}
