import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { adminDb, adminAuth } from "./auth";
import { adminApi } from "./api";
import type { PageId, PageValues } from "../content/schema";
import type { Product } from "../data/products";
import {
  DEFAULT_TEMPLATE,
  decodeBlocks,
  isPostTemplate,
  type PostBlock,
  type PostTemplate,
} from "../data/blog";

/*
  Reads and writes for everything that is not Protected Health Information.

  These go straight to Firestore from the browser, because the security rules
  can decide the question completely: is this person signed in with a content
  role. Nothing here needs an audit trail, and routing it through a function
  would only add a hop.

  Leads are the opposite case and never appear in this file. They live behind
  adminApi, where every read is recorded.
*/

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface TestimonialRecord {
  id: string;
  quote: string;
  name: string;
  location: string;
  order: number;
  published: boolean;
}

export interface PostRecord {
  /* The document id and the address. Renaming it means a new document, so the
     editor keeps it fixed once a post has been saved: a published article
     that silently changes address breaks every link to it. */
  slug: string;
  title: string;
  excerpt: string;
  body: PostBlock[];
  image: string;
  imageAlt: string;
  author: string;
  publishedAt: string;
  published: boolean;
  homeFeatured: boolean;
  /* The article's layout. Always set on this side, so the editor never has
     to guess; a document saved before layouts existed reads as Classic. */
  template: PostTemplate;
}

/* There is no button colour here. Every button is cyan or navy, on the
   client's instruction of 2026-09-02, so the buttons follow the two brand
   colours above and cannot drift from them. A `cta` value left in an older
   saved document is ignored. */
export interface ThemeRecord {
  brand: string;
  brandBright: string;
  ink: string;
  surface: string;
}

/* The palette the site ships with. The editor starts here, so "reset" always
   has somewhere true to go back to. */
export const THEME_DEFAULTS: ThemeRecord = {
  brand: "#0a6d8a",
  brandBright: "#18bada",
  ink: "#00293b",
  surface: "#d3ebf3",
};

/* ---- page content ---- */

export async function loadPage(pageId: PageId): Promise<PageValues> {
  const snapshot = await getDoc(doc(adminDb(), "siteContent", pageId));
  return snapshot.exists() ? (snapshot.data() as PageValues) : {};
}

export async function savePage(pageId: PageId, values: PageValues) {
  /* Empty means "use the built-in wording", so empties are dropped rather
     than stored as blank strings that would show as gaps on the site. */
  const clean: PageValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim() !== "") clean[key] = value.trim();
  }
  await setDoc(doc(adminDb(), "siteContent", pageId), clean);
}

/* ---- theme ---- */

export async function loadTheme(): Promise<Partial<ThemeRecord>> {
  const snapshot = await getDoc(doc(adminDb(), "siteTheme", "current"));
  return snapshot.exists() ? (snapshot.data() as Partial<ThemeRecord>) : {};
}

export async function saveTheme(theme: Partial<ThemeRecord>) {
  await setDoc(doc(adminDb(), "siteTheme", "current"), theme);
}

/* ---- products ---- */

export async function loadProducts(): Promise<Record<string, Partial<Product>>> {
  const snapshot = await getDocs(collection(adminDb(), "products"));
  const out: Record<string, Partial<Product>> = {};
  snapshot.forEach((entry) => {
    out[entry.id] = entry.data() as Partial<Product>;
  });
  return out;
}

export async function saveProduct(slug: string, product: Partial<Product>) {
  /* Firestore rejects undefined, and a price that was typed and then cleared
     arrives as exactly that. Optional fields are dropped rather than sent, the
     same way a post's blocks are below. */
  const clean = Object.fromEntries(
    Object.entries(product).filter(([, value]) => value !== undefined),
  );
  await setDoc(doc(adminDb(), "products", slug), clean, { merge: false });
}

export async function hideProduct(slug: string) {
  /* Built-in products cannot be deleted out of the code, so removing one is
     recorded as a tombstone the site knows to skip. */
  await setDoc(doc(adminDb(), "products", slug), { deleted: true });
}

export async function deleteProductDoc(slug: string) {
  await deleteDoc(doc(adminDb(), "products", slug));
}

/* ---- faqs and testimonials ---- */

export async function loadFaqs(): Promise<FaqRecord[]> {
  const snapshot = await getDocs(collection(adminDb(), "faqs"));
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<FaqRecord, "id">) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function saveFaq(record: FaqRecord) {
  const { id, ...rest } = record;
  await setDoc(doc(adminDb(), "faqs", id), rest);
}

export async function deleteFaq(id: string) {
  await deleteDoc(doc(adminDb(), "faqs", id));
}

export async function loadTestimonials(): Promise<TestimonialRecord[]> {
  const snapshot = await getDocs(collection(adminDb(), "testimonials"));
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<TestimonialRecord, "id">) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function saveTestimonial(record: TestimonialRecord) {
  const { id, ...rest } = record;
  await setDoc(doc(adminDb(), "testimonials", id), rest);
}

export async function deleteTestimonial(id: string) {
  await deleteDoc(doc(adminDb(), "testimonials", id));
}

/* ---- images ---- */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) {
    throw new Error("Please choose a JPEG, PNG, WebP, GIF or AVIF image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is larger than 5 MB. Please use a smaller file.");
  }
  const signed = await adminApi.signImageUpload(async () => adminAuth().currentUser?.getIdToken(true) ?? null, folder);
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signed.apiKey);
  form.set("signature", signed.signature);
  for (const [key, value] of Object.entries(signed.params)) form.set(key, value);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: "POST", body: form, signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error("Image upload failed. Please try again.");
  const result = await response.json();
  if (typeof result.secure_url !== "string" || !result.secure_url.startsWith(`https://res.cloudinary.com/${signed.cloudName}/image/upload/`)) {
    throw new Error("The image service returned an invalid image address.");
  }
  return result.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1920/");
}

/* One shared explanation for all editors. Upload authorization is server-side. */
export const UPLOAD_HELP =
  "Upload a JPEG, PNG, WebP, GIF or AVIF image up to 5 MB to Cloudinary, or paste an image address.";

export function uploadProblem(problem: unknown) {
  const message = problem instanceof Error ? problem.message : "";
  return /timeout|exceeded/i.test(message)
    ? "The image upload timed out. Please try again with a smaller image."
    : message || UPLOAD_HELP;
}

/* Only a real web address is accepted, so a stray paste cannot become a
   broken picture or a javascript: address on the live site. */
export function isImageAddress(value: string) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

/* ---- slugs ---- */

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function newId() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/* ---- blog posts ---- */

export async function loadPosts(): Promise<PostRecord[]> {
  const snapshot = await getDocs(collection(adminDb(), "posts"));
  return snapshot.docs
    .map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      return {
        slug: entry.id,
        title: typeof data.title === "string" ? data.title : "",
        excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
        body: decodeBlocks(data.body),
        image: typeof data.image === "string" ? data.image : "",
        imageAlt: typeof data.imageAlt === "string" ? data.imageAlt : "",
        author: typeof data.author === "string" ? data.author : "",
        publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : "",
        published: data.published === true,
        homeFeatured: data.homeFeatured === true,
        template: isPostTemplate(data.template) ? data.template : DEFAULT_TEMPLATE,
      };
    })
    /* Newest first, and drafts with no date yet sort to the top where the
       author will see them. */
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/* Firestore rejects undefined anywhere in a document, so every optional field
   is dropped rather than sent as undefined, at every depth: a block's colour,
   an animation's pace, all of it. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)]),
    ) as T;
  }
  return value;
}

export async function savePost(record: PostRecord) {
  const { slug, ...rest } = record;
  await setDoc(doc(adminDb(), "posts", slug), stripUndefined(rest), { merge: false });
}

export async function deletePost(slug: string) {
  await deleteDoc(doc(adminDb(), "posts", slug));
}

export async function postSlugExists(slug: string) {
  return (await getDoc(doc(adminDb(), "posts", slug))).exists();
}
