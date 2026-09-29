import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { adminAuth } from "./auth";
import { adminFirebaseApp } from "./firebaseApp";
import { adminApi } from "./api";
import type { PageId, PageValues } from "../content/schema";
import { pageValidationError } from "../content/validation";
import { EDITORIAL_POSTS } from "../data/editorialPosts";
import { products as builtInProducts, type Product } from "../data/products";
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

export type TrashKind = "products" | "faqs" | "testimonials" | "blog";

export interface TrashRecord {
  id: string;
  kind: TrashKind;
  sourceId: string;
  label: string;
  deletedAt: string;
  deletedBy: string;
  snapshot: Record<string, unknown> | null;
  builtIn: boolean;
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

let dbInstance: Firestore | null = null;

function adminDb() {
  if (!dbInstance) dbInstance = getFirestore(adminFirebaseApp());
  return dbInstance;
}

const DATA_CACHE_MS = 60_000;
const dataCache = new Map<string, { expiresAt: number; request: Promise<unknown> }>();

function clearCachedData(key: string) {
  dataCache.delete(key);
}

function cachedData<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = dataCache.get(key);
  if (cached && cached.expiresAt > now) return cached.request as Promise<T>;
  if (cached) dataCache.delete(key);

  const request = load();
  dataCache.set(key, { expiresAt: now + DATA_CACHE_MS, request });
  request.catch(() => {
    if (dataCache.get(key)?.request === request) dataCache.delete(key);
  });
  return request;
}

/* ---- page content ---- */

export async function loadPage(pageId: PageId): Promise<PageValues> {
  return cachedData(`page:${pageId}`, async () => {
    const snapshot = await getDoc(doc(adminDb(), "siteContent", pageId));
    return snapshot.exists() ? Object.fromEntries(Object.entries(snapshot.data()).filter(([, value]) => typeof value === "string")) as PageValues : {};
  });
}

export async function savePage(pageId: PageId, values: PageValues) {
  const problem = pageValidationError(pageId, values);
  if (problem) throw new Error(problem);
  /* Empty means "use the built-in wording", so empties are dropped rather
     than stored as blank strings that would show as gaps on the site. */
  const clean: PageValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim() !== "") clean[key] = value.trim();
  }
  await setDoc(doc(adminDb(), "siteContent", pageId), clean);
  clearCachedData(`page:${pageId}`);
}

/* ---- theme ---- */

export async function loadTheme(): Promise<Partial<ThemeRecord>> {
  return cachedData("theme", async () => {
    const snapshot = await getDoc(doc(adminDb(), "siteTheme", "current"));
    return snapshot.exists() ? (snapshot.data() as Partial<ThemeRecord>) : {};
  });
}

export async function saveTheme(theme: Partial<ThemeRecord>) {
  await setDoc(doc(adminDb(), "siteTheme", "current"), theme);
  clearCachedData("theme");
}

/* ---- products ---- */

export async function loadProducts(): Promise<Record<string, Partial<Product>>> {
  return cachedData("products", async () => {
    const snapshot = await getDocs(collection(adminDb(), "products"));
    const out: Record<string, Partial<Product>> = {};
    snapshot.forEach((entry) => {
      out[entry.id] = entry.data() as Partial<Product>;
    });
    return out;
  });
}

export async function saveProduct(slug: string, product: Partial<Product>) {
  /* Firestore rejects undefined, and a price that was typed and then cleared
     arrives as exactly that. Optional fields are dropped rather than sent, the
     same way a post's blocks are below. */
  const clean = Object.fromEntries(
    Object.entries(product).filter(([, value]) => value !== undefined),
  );
  await setDoc(doc(adminDb(), "products", slug), clean, { merge: false });
  clearCachedData("products");
}

export async function hideProduct(slug: string) {
  const builtIn = builtInProducts.find((item) => item.slug === slug);
  const source = doc(adminDb(), "products", slug);
  const trash = doc(adminDb(), "dashboardTrash", `products:${slug}`);
  await runTransaction(adminDb(), async (transaction) => {
    const current = await transaction.get(source);
    const priorTrash = await transaction.get(trash);
    if (priorTrash.exists()) throw new Error("This product is already in the Recycle Bin.");
    if (!current.exists() && !builtIn) throw new Error("This product no longer exists.");
    transaction.set(trash, {
      kind: "products", sourceId: slug,
      label: String(current.data()?.name ?? builtIn?.name ?? slug),
      deletedAt: new Date().toISOString(), deletedBy: adminAuth().currentUser?.uid ?? "",
      snapshot: current.exists() ? current.data() : null, builtIn: Boolean(builtIn),
    });
    if (builtIn) transaction.set(source, { deleted: true });
    else transaction.delete(source);
  });
  clearCachedData("products");
}

async function trashDocument(kind: Exclude<TrashKind, "products">, id: string, label: string) {
  const collectionName = kind === "blog" ? "posts" : kind;
  const source = doc(adminDb(), collectionName, id);
  const trash = doc(adminDb(), "dashboardTrash", `${kind}:${id}`);
  const archived = await runTransaction(adminDb(), async (transaction) => {
    const current = await transaction.get(source);
    const priorTrash = await transaction.get(trash);
    if (priorTrash.exists()) throw new Error("This item is already in the Recycle Bin.");
    if (!current.exists()) return false;
    transaction.set(trash, {
      kind, sourceId: id, label,
      deletedAt: new Date().toISOString(), deletedBy: adminAuth().currentUser?.uid ?? "",
      snapshot: current.data(), builtIn: kind === "blog" && EDITORIAL_POSTS.some((post) => post.slug === id),
    });
    transaction.delete(source);
    return true;
  });
  clearCachedData(kind === "blog" ? "posts" : kind);
  return archived;
}

export async function loadTrash(kinds: TrashKind[]): Promise<TrashRecord[]> {
  const groups = await Promise.all(kinds.map(async (kind) => {
    const snapshots = await getDocs(query(collection(adminDb(), "dashboardTrash"), where("kind", "==", kind)));
    return snapshots.docs.map((entry) => ({ id: entry.id, ...entry.data() } as TrashRecord));
  }));
  return groups.flat().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreTrash(item: TrashRecord) {
  const source = doc(adminDb(), item.kind === "blog" ? "posts" : item.kind, item.sourceId);
  const trash = doc(adminDb(), "dashboardTrash", item.id);
  await runTransaction(adminDb(), async (transaction) => {
    const archived = await transaction.get(trash);
    const current = await transaction.get(source);
    if (!archived.exists()) throw new Error("This item is no longer in the Recycle Bin.");
    const record = archived.data() as Omit<TrashRecord, "id">;
    if (record.kind !== item.kind || record.sourceId !== item.sourceId) throw new Error("The saved item changed. Refresh and try again.");
    if (item.kind === "products" && record.builtIn) {
      if (current.exists() && current.data()?.deleted !== true) throw new Error("A current product already uses this address.");
      if (record.snapshot) transaction.set(source, record.snapshot);
      else transaction.delete(source);
    } else {
      if (current.exists()) throw new Error("A current item already uses this address.");
      if (!record.snapshot) throw new Error("The saved item has no restorable content.");
      transaction.set(source, record.snapshot);
    }
    transaction.delete(trash);
  });
  clearCachedData(item.kind === "blog" ? "posts" : item.kind);
}

/* ---- faqs and testimonials ---- */

export async function loadFaqs(): Promise<FaqRecord[]> {
  return cachedData("faqs", async () => {
    const snapshot = await getDocs(collection(adminDb(), "faqs"));
    return snapshot.docs
      .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<FaqRecord, "id">) }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });
}

export async function saveFaq(record: FaqRecord) {
  const { id, ...rest } = record;
  await setDoc(doc(adminDb(), "faqs", id), rest);
  clearCachedData("faqs");
}

export async function deleteFaq(id: string, label: string) {
  return trashDocument("faqs", id, label);
}

export async function loadTestimonials(): Promise<TestimonialRecord[]> {
  return cachedData("testimonials", async () => {
    const snapshot = await getDocs(collection(adminDb(), "testimonials"));
    return snapshot.docs
      .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<TestimonialRecord, "id">) }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });
}

export async function saveTestimonial(record: TestimonialRecord) {
  const { id, ...rest } = record;
  await setDoc(doc(adminDb(), "testimonials", id), rest);
  clearCachedData("testimonials");
}

export async function deleteTestimonial(id: string, label: string) {
  return trashDocument("testimonials", id, label);
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
  return cachedData("posts", async () => {
    const snapshot = await getDocs(collection(adminDb(), "posts"));
    const live = snapshot.docs
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
    const bySlug = new Map<string, PostRecord>(EDITORIAL_POSTS.map((post) => [post.slug, { ...post, homeFeatured: post.homeFeatured ?? false, template: post.template ?? DEFAULT_TEMPLATE }]));
    for (const post of live) bySlug.set(post.slug, post);
    return [...bySlug.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });
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
  clearCachedData("posts");
}

export async function deletePost(slug: string, label: string) {
  return trashDocument("blog", slug, label);
}

export async function postSlugExists(slug: string) {
  return (await getDoc(doc(adminDb(), "posts", slug))).exists();
}
