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
}

export interface PageDef {
  id: PageId;
  label: string;
  path: string;
  blocks: BlockDef[];
}

export type PageId = "home" | "products" | "services" | "about" | "contact";

/* A saved page document is a flat map of "blockId.fieldKey" to the value. */
export type PageValues = Record<string, string>;
export type SiteContent = Partial<Record<PageId, PageValues>>;

export const PAGES: PageDef[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    blocks: [
      {
        id: "meta",
        label: "Search engine listing",
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
          { key: "phone", label: "Phone number", kind: "text", max: 24, fallback: "800-394-3917" },
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
