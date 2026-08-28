import { useEffect } from "react";

/*
  Sets the document title and meta description for each page.

  Takes either two strings, for a page whose wording is built at render time
  from a product or an article, or the object from data/pageMeta.ts, which is
  the same source the prerender script reads. Fixed pages use the object so
  the tag a crawler is served and the title a visitor sees cannot drift.
*/
export function usePageMeta(
  titleOrMeta: string | { title: string; description: string },
  maybeDescription?: string,
) {
  const title = typeof titleOrMeta === "string" ? titleOrMeta : titleOrMeta.title;
  const description =
    typeof titleOrMeta === "string" ? maybeDescription : titleOrMeta.description;

  useEffect(() => {
    document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
    /* A page that was opened at a fragment, such as the footer's link to the
       guides band, must not be yanked back to the top before ScrollToHash can
       reach its target. */
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [title, description]);
}
