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
            fallback: "Medville Diabetes | Continuous Glucose Monitors",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            help: "Around 150 characters reads best in search results.",
            fallback:
              "Medville Diabetes supplies continuous glucose monitors from FreeStyle Libre and Dexcom. Check if you qualify for a CGM in under one minute.",
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
            fallback: "Continuous glucose monitors",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            help: "Wrap the words you want in brand colour with *asterisks*.",
            fallback: "Know your glucose, *every minute* of the day.",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "We supply continuous glucose monitors from the leading brands, FreeStyle Libre and Dexcom. A small sensor tracks your glucose 24 hours a day, without routine finger sticks.",
          },
          {
            key: "primaryCta",
            label: "Main button",
            kind: "text",
            max: 32,
            fallback: "Check if you Qualify",
          },
          {
            key: "secondaryCta",
            label: "Second button",
            kind: "text",
            max: 32,
            fallback: "Browse our products",
          },
          {
            key: "note",
            label: "Line under the buttons",
            kind: "text",
            max: 90,
            fallback: "It takes less than one minute. There is no cost to check.",
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
            fallback: "Our Products | Medville Diabetes",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "Browse the continuous glucose monitors and insulin pumps Medville Diabetes supplies, with plain English descriptions of every product.",
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
            fallback: "What are you looking for?",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "We supply two types of diabetes devices: continuous glucose monitors and insulin pumps. Pick a type to see every product we carry.",
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
            fallback: "Check if you Qualify",
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
            fallback: "About Us | Medville Diabetes",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "Medville Diabetes supplies continuous glucose monitors and support to people living with diabetes. Your best interest is our first concern.",
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
            fallback: "About Us",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Your best interest is our first concern.",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 400,
            fallback:
              "Medville Diabetes supplies continuous glucose monitors from the leading brands to people living with diabetes.",
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
            fallback: "Contact | Medville Diabetes",
          },
          {
            key: "description",
            label: "Search description",
            kind: "longText",
            max: 160,
            fallback:
              "Call or email Medville Diabetes with any question about our products, your order, or how to qualify.",
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
            fallback: "Contact",
          },
          {
            key: "heading",
            label: "Heading",
            kind: "text",
            max: 90,
            fallback: "Talk to a real person.",
          },
          {
            key: "body",
            label: "Paragraph",
            kind: "longText",
            max: 320,
            fallback:
              "Call or email us with any question about our products, your order, or how to qualify. We answer in plain language.",
          },
        ],
      },
      {
        id: "details",
        label: "Contact details",
        fields: [
          { key: "phone", label: "Phone number", kind: "text", max: 24, fallback: "877-000-0000" },
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
            fallback: "[Street address to be provided]",
          },
          {
            key: "hours",
            label: "Opening hours",
            kind: "text",
            max: 120,
            fallback: "Monday to Friday, 8:30 AM to 5:00 PM Eastern Time",
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
