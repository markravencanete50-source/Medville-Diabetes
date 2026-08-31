import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { adminDb, adminStorage } from "./auth";
import type { PageId, PageValues } from "../content/schema";
import type { Product } from "../data/products";
import { decodeBlocks, type PostBlock } from "../data/blog";

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
}

export interface ThemeRecord {
  brand: string;
  brandBright: string;
  cta: string;
  ink: string;
  surface: string;
}

/* The palette the site ships with. The editor starts here, so "reset" always
   has somewhere true to go back to. */
export const THEME_DEFAULTS: ThemeRecord = {
  brand: "#0a6d8a",
  brandBright: "#18bada",
  cta: "#ff9e1b",
  ink: "#00293b",
  surface: "#f0f7fa",
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
  await setDoc(doc(adminDb(), "products", slug), product, { merge: false });
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
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is larger than 5 MB. Please use a smaller file.");
  }
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
  const path = `site/${folder}/${Date.now()}-${safeName}`;
  const target = ref(adminStorage(), path);
  await uploadBytes(target, file, { cacheControl: "public, max-age=31536000, immutable" });
  return getDownloadURL(target);
}

/*
  Uploading needs a Cloud Storage bucket, and a project on the free tier does
  not have one: Firebase only creates the default bucket on the Blaze plan. So
  every picture on the dashboard can also be given as a web address, which
  needs nothing enabled and works today. When Storage is switched on, upload
  starts working with no change to any screen.

  This wording used to live in the blog editor alone, which is how the product
  form ended up with no web-address field and no explanation: the client could
  pick a file, watch it fail, and had no other route to a picture. One copy
  here, used by both.
*/
export const UPLOAD_HELP =
  "Upload needs Cloud Storage, which is not switched on for this project yet. Paste a web address instead, or ask for Storage to be enabled.";

export function uploadProblem(problem: unknown) {
  const message = problem instanceof Error ? problem.message : "";
  /* A missing bucket surfaces as an unhelpful storage error, and a retry that
     runs out of time surfaces as a timeout. Both mean the same thing to the
     person at the screen, so say the useful sentence rather than repeat it. */
  return /bucket|not found|404|unknown|retry|timeout|exceeded/i.test(message)
    ? UPLOAD_HELP
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
      };
    })
    /* Newest first, and drafts with no date yet sort to the top where the
       author will see them. */
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function savePost(record: PostRecord) {
  const { slug, ...rest } = record;
  /* Blocks are stored as plain objects. Firestore rejects undefined, so every
     optional field is dropped rather than sent as undefined. */
  const body = rest.body.map((block) =>
    Object.fromEntries(Object.entries(block).filter(([, value]) => value !== undefined)),
  );
  await setDoc(doc(adminDb(), "posts", slug), { ...rest, body }, { merge: false });
}

export async function deletePost(slug: string) {
  await deleteDoc(doc(adminDb(), "posts", slug));
}

export async function postSlugExists(slug: string) {
  return (await getDoc(doc(adminDb(), "posts", slug))).exists();
}
