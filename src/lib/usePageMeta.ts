import { useEffect } from "react";
import { SITE_ORIGIN } from "../data/pageMeta";

/*
  Sets everything a search engine or a link preview reads off a page.

  scripts/prerender.mjs writes these same tags into a real file per address,
  and that file is what a crawler is served, so this hook is not what makes
  the site indexable. It matters for the second visit: React Router changes
  the address without reloading, and a tag left holding the previous page's
  value is worse than no tag at all. A visitor who lands on the home page,
  moves to a product, and then copies the address out of the bar would
  otherwise share a card describing the home page.

  Every field is written on every page, including back to its default, so a
  value can never survive a navigation. The 404 depends on that: it is the
  one page that sets noindex, and the directive has to disappear the moment
  the visitor moves on.
*/

export interface PageMeta {
  title: string;
  description?: string;
  /* Link preview picture. Root-relative is made absolute; crawlers reject a
     relative address. Defaults to the home page hero card. */
  image?: string;
  /* "article" for a published post. Everything else on this site is a page. */
  type?: "website" | "article";
  /* The unknown-address page. Firebase rewrites every path to the app, so a
     mistyped address answers 200 and would otherwise be indexed as another
     copy of the home page. */
  noindex?: boolean;
  /* The address this page should be indexed under, when it is not the one in
     the bar. Rarely needed; a product page is its own canonical. */
  canonicalPath?: string;
}

const DEFAULT_IMAGE = "/og-image.jpg";

/* A meta or link tag is created the first time it is asked for, so a page can
   set something index.html does not declare. */
function tag(selector: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el as HTMLElement;
}

function meta(kind: "name" | "property", key: string, value: string) {
  const el = tag(`meta[${kind}="${key}"]`, () => {
    const node = document.createElement("meta");
    node.setAttribute(kind, key);
    return node;
  });
  el.setAttribute("content", value);
}

function absolute(path: string) {
  return /^https?:\/\//.test(path) ? path : `${SITE_ORIGIN}${path}`;
}

export function usePageMeta(
  titleOrMeta: string | PageMeta,
  maybeDescription?: string,
) {
  const input: PageMeta =
    typeof titleOrMeta === "string"
      ? { title: titleOrMeta, description: maybeDescription }
      : titleOrMeta;

  const { title, description, image, type, noindex, canonicalPath } = input;

  useEffect(() => {
    document.title = title;

    const path = canonicalPath ?? window.location.pathname;
    /* One address per page. A trailing slash on anything but the root would
       be a second address for the same content. */
    const url = `${SITE_ORIGIN}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
    const picture = absolute(image || DEFAULT_IMAGE);

    if (description) {
      meta("name", "description", description);
      meta("property", "og:description", description);
      meta("name", "twitter:description", description);
    }

    meta("property", "og:title", title);
    meta("name", "twitter:title", title);
    meta("property", "og:url", url);
    meta("property", "og:type", type ?? "website");
    meta("property", "og:image", picture);
    meta("name", "twitter:image", picture);

    /* index.html declares the size and wording of the home page's card. A
       page with a picture of its own matches neither, and a declared size
       that does not match the file makes a preview crop badly, so those
       tags are removed rather than left to describe the wrong picture. */
    const custom = Boolean(image);
    for (const key of ["og:image:type", "og:image:width", "og:image:height"]) {
      const el = document.head.querySelector(`meta[property="${key}"]`);
      if (custom) el?.remove();
    }
    if (custom) meta("property", "og:image:alt", title);

    const canonical = tag('link[rel="canonical"]', () => {
      const node = document.createElement("link");
      node.setAttribute("rel", "canonical");
      return node;
    });
    canonical.setAttribute("href", url);

    /* Written on every page rather than only on the 404, so the directive
       cannot outlive the page that asked for it. "follow" keeps the links on
       the page worth crawling even though the page itself is not. */
    meta("name", "robots", noindex ? "noindex, follow" : "index, follow");

    /* A page opened at a fragment, such as the footer's link to the
       questions band, must not be yanked back to the top before
       ScrollToHash can reach its target. */
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [title, description, image, type, noindex, canonicalPath]);
}
