import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_SITE_DATA,
  isLiveContentConfigured,
  loadSiteData,
  readCache,
  resolveText,
  writeCache,
  type SiteData,
  type ThemeOverrides,
} from "./siteContent";
import { defaultsFor, type PageId } from "../content/schema";
import type { ProductLine } from "../data/products";

/*
  Makes the client's saved content available to every page.

  The provider serves three states in order, and a page never has to know
  which one it is looking at:

    1. The wording compiled into the build. Always present, always correct,
       shown instantly on first paint.
    2. Whatever was cached in this tab, applied synchronously so a second page
       view does not flicker back to the built-in wording.
    3. The live documents, fetched once per tab session in the background.

  Nothing here blocks rendering and nothing here can throw into the tree.
*/

const SiteDataContext = createContext<SiteData>(EMPTY_SITE_DATA);

/* Colour overrides are written onto the root element as the same custom
   properties the stylesheet already reads, so one assignment restyles the
   whole site without a single component knowing about it. */
const THEME_VARIABLES: Record<keyof ThemeOverrides, string[]> = {
  brand: ["--color-brand"],
  brandBright: ["--color-brand-bright", "--color-accent"],
  cta: ["--color-cta"],
  ink: ["--color-ink"],
  surface: ["--color-surface"],
};

function applyTheme(theme: ThemeOverrides) {
  const root = document.documentElement;
  for (const [key, variables] of Object.entries(THEME_VARIABLES)) {
    const value = theme[key as keyof ThemeOverrides];
    for (const variable of variables) {
      if (value) root.style.setProperty(variable, value);
      else root.style.removeProperty(variable);
    }
  }
}

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SiteData>(() => readCache() ?? EMPTY_SITE_DATA);
  const applied = useRef(false);

  /* Paint the cached colours before the browser shows anything, so a themed
     site never flashes the default palette first. */
  if (!applied.current && typeof document !== "undefined") {
    applied.current = true;
    applyTheme(data.theme);
  }

  useEffect(() => {
    if (!isLiveContentConfigured()) return;
    const controller = new AbortController();

    loadSiteData(controller.signal)
      .then((fresh) => {
        if (controller.signal.aborted) return;
        setData(fresh);
        writeCache(fresh);
        applyTheme(fresh.theme);
      })
      .catch(() => {
        /* Offline, blocked, or misconfigured. The built-in content stands. */
      });

    return () => controller.abort();
  }, []);

  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData() {
  return useContext(SiteDataContext);
}

/*
  Page copy. `text` returns the saved value or the built-in wording, and
  `parts` splits a heading on *asterisks* so the client can choose which words
  carry the accent colour without writing any markup.
*/
export function usePageText(pageId: PageId) {
  const { content } = useSiteData();

  return useMemo(() => {
    const fallbacks = defaultsFor(pageId);

    const text = (path: string) => resolveText(content, pageId, path);

    const parts = (path: string) => {
      const raw = text(path) || fallbacks[path] || "";
      return raw.split(/\*([^*]+)\*/g).map((chunk, index) => ({
        value: chunk,
        accent: index % 2 === 1,
      }));
    };

    return { text, parts };
  }, [content, pageId]);
}

/* Products, faqs and testimonials for the public pages. */

export function useProducts() {
  return useSiteData().products;
}

/* One product by slug, from the live catalog rather than the built-in list,
   so a product the client added is reachable at its own address. */
export function useProduct(slug: string | undefined) {
  const products = useProducts();
  return useMemo(
    () => (slug ? products.find((product) => product.slug === slug) : undefined),
    [products, slug],
  );
}

/* Everything in one product line, in catalog order. */
export function useLineProducts(line: ProductLine) {
  const products = useProducts();
  return useMemo(() => products.filter((product) => product.line === line), [products, line]);
}

export function useFaqs() {
  return useSiteData().faqs;
}

export function useTestimonials() {
  return useSiteData().testimonials;
}

/* Published blog posts, newest first. */
export function usePosts() {
  return useSiteData().posts;
}

export function usePost(slug: string | undefined) {
  const posts = usePosts();
  return useMemo(
    () => (slug ? posts.find((post) => post.slug === slug) : undefined),
    [posts, slug],
  );
}
