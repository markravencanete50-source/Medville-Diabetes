import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/*
  Scroll motion, shared by every page of the site.

  Two independent systems live here.

  1. useReveal. Any element inside the container that carries `data-reveal`
     starts hidden and arrives once it enters the viewport. The number in the
     attribute is the delay in milliseconds, which is how a group of cards is
     staggered. A second class on the element picks the shape of the arrival:
     reveal-left, reveal-zoom, reveal-blur, reveal-tilt, reveal-wipe and the
     others listed in index.css. The point of having many is that no two
     sections of a page should arrive the same way.

  2. useParallax. Any element carrying `data-parallax` drifts slowly against
     the scroll while it is on screen. The number in the attribute is the
     strength. This is the slow, continuous motion under the one-time reveals.

  Both systems apply their starting state from JavaScript rather than from the
  markup. If a script never runs, or the visitor prefers reduced motion, the
  content simply stays visible instead of being stranded invisible.

  An element should carry either data-reveal or data-parallax, never both:
  both write to the same transform.
*/
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    /*
      New nodes appear after the first pass on pages that filter a grid or
      load their catalog from Firestore, so the set is re-scanned whenever the
      subtree changes rather than only once on mount.
    */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.reveal ?? 0);
          window.setTimeout(() => {
            el.classList.add("reveal-in");
            el.classList.remove("reveal-start");
            /*
              Once the arrival has finished, hand the element back to its own
              stylesheet. The reveal transition covers transform and opacity
              for over a second, and leaving it in place would stretch every
              later hover lift on the same element to that same length. The
              wait clears the slowest variant with room to spare.
            */
            window.setTimeout(() => {
              el.classList.add("reveal-done");
              el.classList.remove("reveal-in");
            }, 2200);
          }, delay);
          observer.unobserve(el);
        });
      },
      /*
        A low threshold with a bottom margin starts the arrival slightly
        before the element is fully in view. The reveals run for around a
        second, so beginning early is what lets a visitor watch one finish
        rather than meet it already settled.
      */
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    const seen = new WeakSet<HTMLElement>();

    const scan = () => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (seen.has(el) || el.classList.contains("reveal-in")) return;
        if (el.classList.contains("reveal-done")) return;
        seen.add(el);
        el.classList.add("reveal-start");
        observer.observe(el);
      });
    };

    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return ref;
}

/*
  Slow drift against the scroll.

  The offset is driven by how far the element sits from the middle of the
  viewport, so a photograph moves through its own frame as the page passes
  it. Strength 1 is roughly 46 pixels of travel end to end; media that is
  scaled up in CSS can take more without showing an edge.

  Everything is written to a custom property and read back by one CSS rule,
  and the whole pass runs inside a single animation frame per scroll event.
*/
export function useParallax<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    let targets: HTMLElement[] = [];
    let frame = 0;

    const collect = () => {
      targets = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    };

    const paint = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      for (const el of targets) {
        const box = el.getBoundingClientRect();
        /* Skip anything well outside the viewport: no work for a photograph
           nobody can see. */
        if (box.bottom < -200 || box.top > window.innerHeight + 200) continue;
        const strength = Number(el.dataset.parallax) || 1;
        const centre = box.top + box.height / 2;
        const distance = (centre - middle) / window.innerHeight;
        const offset = Math.max(-1, Math.min(1, distance)) * 46 * strength;
        el.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      }
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    collect();
    paint();

    const mutations = new MutationObserver(() => {
      collect();
      request();
    });
    mutations.observe(root, { childList: true, subtree: true });

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    return () => {
      mutations.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

/* Stagger helper so pages express delay in the markup without raw numbers. */
export function reveal(delay = 0): { "data-reveal": number } {
  return { "data-reveal": delay };
}

/* Shared inline style for the blurred colour blobs behind gradient sections. */
export function blobStyle(color: string, blur: number): CSSProperties {
  return {
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    filter: `blur(${blur}px)`,
  };
}
