import { useEffect } from "react";

/* Sets the document title and meta description for each page. */
export function usePageMeta(title: string, description?: string) {
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
