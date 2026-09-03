/*
  Live content for the public website.

  The dashboard writes page copy, theme colours and products into Firestore.
  This module reads them back on the public site.

  Two decisions worth keeping:

  1. It talks to the Firestore REST API rather than the Firebase SDK. The SDK
     is around 90 kB gzipped and every marketing visitor would pay for it on
     first load, for data that is a few kilobytes of text. The dashboard,
     which is lazy-loaded and used by a handful of people, uses the real SDK.

  2. Nothing here can break the site. If the environment is not configured, if
     the network fails, if a document is missing or malformed, every reader
     falls back to the wording compiled into the build. The site renders the
     same as it does today until the client saves an edit.

  No personal data is ever read through this path. Leads live behind the
  adminApi function and are never exposed to a browser without a token.
*/

import { defaultsFor, type PageId, type PageValues, type SiteContent } from "../content/schema";
import { decodeBlocks, isPostTemplate, type Post } from "../data/blog";
import type { Product } from "../data/products";
import { products as builtInProducts } from "../data/products";
import { firebaseConfig } from "./firebaseConfig";

const PROJECT_ID = firebaseConfig.projectId;
const API_KEY = firebaseConfig.apiKey;

/* Content changes rarely and a stale minute is harmless, so one fetch per tab
   session is plenty. This also keeps Firestore reads far inside the free tier
   and protects the 0 to 5 USD per month ceiling in Section 7.3. */
const CACHE_KEY = "medville:site-content:v1";

export interface ThemeOverrides {
  brand?: string;
  brandBright?: string;
  ink?: string;
  surface?: string;
}

export interface SiteData {
  content: SiteContent;
  theme: ThemeOverrides;
  products: Product[];
  faqs: { id: string; question: string; answer: string; order: number }[];
  testimonials: {
    id: string;
    quote: string;
    name: string;
    location: string;
    order: number;
    published: boolean;
  }[];
  posts: Post[];
}

export const EMPTY_SITE_DATA: SiteData = {
  content: {},
  theme: {},
  products: builtInProducts,
  faqs: [],
  testimonials: [],
  posts: [],
};

export function isLiveContentConfigured() {
  return Boolean(PROJECT_ID && API_KEY);
}

/* ---- Firestore REST decoding ----
   The REST API returns values wrapped in a type tag. This turns them back
   into plain JavaScript. Unknown types decode to undefined rather than
   throwing, so one odd field cannot take the page down. */

type RestValue = Record<string, unknown>;

function decodeValue(value: RestValue | undefined): unknown {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    const inner = (value.arrayValue as { values?: RestValue[] })?.values ?? [];
    return inner.map(decodeValue);
  }
  if ("mapValue" in value) {
    return decodeFields((value.mapValue as { fields?: Record<string, RestValue> })?.fields);
  }
  return undefined;
}

function decodeFields(fields: Record<string, RestValue> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    const decoded = decodeValue(value);
    if (decoded !== undefined) out[key] = decoded;
  }
  return out;
}

interface RestDocument {
  name?: string;
  fields?: Record<string, RestValue>;
}

function documentId(doc: RestDocument) {
  return (doc.name ?? "").split("/").pop() ?? "";
}

async function fetchCollection(path: string, signal: AbortSignal): Promise<RestDocument[]> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/${path}?key=${API_KEY}&pageSize=300`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const body = (await res.json()) as { documents?: RestDocument[] };
  return body.documents ?? [];
}

/* ---- readers for each collection ---- */

function readContent(docs: RestDocument[]): SiteContent {
  const content: SiteContent = {};
  for (const doc of docs) {
    const id = documentId(doc) as PageId;
    const fields = decodeFields(doc.fields);
    const values: PageValues = {};
    for (const [key, value] of Object.entries(fields)) {
      /* Only non-empty strings override the build. An empty box in the
         dashboard means "use the built-in wording", not "show nothing". */
      if (typeof value === "string" && value.trim() !== "") values[key] = value;
    }
    if (Object.keys(values).length) content[id] = values;
  }
  return content;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function readTheme(docs: RestDocument[]): ThemeOverrides {
  const current = docs.find((doc) => documentId(doc) === "current");
  if (!current) return {};
  const fields = decodeFields(current.fields);
  const theme: ThemeOverrides = {};
  /* An older document may still carry a `cta` value; there is no button
     colour any more, so it is simply never read. */
  for (const key of ["brand", "brandBright", "ink", "surface"] as const) {
    const value = fields[key];
    /* A malformed colour is ignored rather than written into the page. */
    if (typeof value === "string" && HEX.test(value)) theme[key] = value;
  }
  return theme;
}

function readProducts(docs: RestDocument[]): Product[] {
  if (!docs.length) return builtInProducts;

  const bySlug = new Map(builtInProducts.map((product) => [product.slug, product]));

  for (const doc of docs) {
    const slug = documentId(doc);
    if (!slug) continue;
    const fields = decodeFields(doc.fields) as Partial<Product> & { deleted?: boolean };
    if (fields.deleted) {
      bySlug.delete(slug);
      continue;
    }
    const existing = bySlug.get(slug);
    const merged = { ...(existing ?? {}), ...fields, slug } as Product;
    /* A product is only usable if it has the fields the cards render. */
    if (!merged.name || !merged.imageFront) continue;
    bySlug.set(slug, merged);
  }

  return [...bySlug.values()];
}

function readFaqs(docs: RestDocument[]): SiteData["faqs"] {
  return docs
    .map((doc) => {
      const f = decodeFields(doc.fields);
      return {
        id: documentId(doc),
        question: typeof f.question === "string" ? f.question : "",
        answer: typeof f.answer === "string" ? f.answer : "",
        order: typeof f.order === "number" ? f.order : 0,
      };
    })
    .filter((faq) => faq.question && faq.answer)
    .sort((a, b) => a.order - b.order);
}

function readTestimonials(docs: RestDocument[]): SiteData["testimonials"] {
  return docs
    .map((doc) => {
      const f = decodeFields(doc.fields);
      return {
        id: documentId(doc),
        quote: typeof f.quote === "string" ? f.quote : "",
        name: typeof f.name === "string" ? f.name : "",
        location: typeof f.location === "string" ? f.location : "",
        order: typeof f.order === "number" ? f.order : 0,
        published: f.published !== false,
      };
    })
    .filter((item) => item.quote && item.published)
    .sort((a, b) => a.order - b.order);
}

/*
  Blog posts. Only published ones are returned, because this list is read by
  the public site and a draft is not for readers. Newest first.

  A post with no title or no address is skipped rather than rendered as a
  blank card: a half-saved record should be invisible, not broken.
*/
function readPosts(docs: RestDocument[]): Post[] {
  return docs
    .map((doc) => {
      const f = decodeFields(doc.fields);
      return {
        slug: documentId(doc),
        title: typeof f.title === "string" ? f.title : "",
        excerpt: typeof f.excerpt === "string" ? f.excerpt : "",
        body: decodeBlocks(f.body),
        image: typeof f.image === "string" ? f.image : "",
        imageAlt: typeof f.imageAlt === "string" ? f.imageAlt : "",
        author: typeof f.author === "string" ? f.author : "",
        publishedAt: typeof f.publishedAt === "string" ? f.publishedAt : "",
        published: f.published === true,
        template: isPostTemplate(f.template) ? f.template : undefined,
      };
    })
    .filter((post) => post.published && post.slug && post.title)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/* ---- the one public entry point ---- */

export async function loadSiteData(signal: AbortSignal): Promise<SiteData> {
  if (!isLiveContentConfigured()) return EMPTY_SITE_DATA;

  const [contentDocs, themeDocs, productDocs, faqDocs, testimonialDocs, postDocs] =
    await Promise.all([
      fetchCollection("siteContent", signal).catch(() => []),
      fetchCollection("siteTheme", signal).catch(() => []),
      fetchCollection("products", signal).catch(() => []),
      fetchCollection("faqs", signal).catch(() => []),
      fetchCollection("testimonials", signal).catch(() => []),
      fetchCollection("posts", signal).catch(() => []),
    ]);

  return {
    content: readContent(contentDocs),
    theme: readTheme(themeDocs),
    products: readProducts(productDocs),
    faqs: readFaqs(faqDocs),
    testimonials: readTestimonials(testimonialDocs),
    posts: readPosts(postDocs),
  };
}

export function readCache(): SiteData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SiteData) : null;
  } catch {
    return null;
  }
}

export function writeCache(data: SiteData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* A private window with no storage quota is not a reason to fail. */
  }
}

export function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/* Resolves one field, preferring the saved value and falling back to the
   wording compiled into the build. */
export function resolveText(content: SiteContent, pageId: PageId, path: string): string {
  const saved = content[pageId]?.[path];
  if (typeof saved === "string" && saved.trim() !== "") return saved;
  return defaultsFor(pageId)[path] ?? "";
}
