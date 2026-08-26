import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/*
  Scroll reveal, shared by every page of the redesign.

  Elements start at opacity 0 and 26px down, then transition in over 700ms
  once 12 percent of them has entered the viewport. Each element reveals once
  and is then unobserved.

  The starting state is applied by this hook rather than in the markup. If
  JavaScript never runs, or the visitor prefers reduced motion, the content
  stays visible instead of being stranded invisible.
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

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (targets.length === 0) return;

    targets.forEach((el) => el.classList.add("reveal-start"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.reveal ?? 0);
          window.setTimeout(() => {
            el.classList.add("reveal-in");
            el.classList.remove("reveal-start");
          }, delay);
          observer.unobserve(el);
        });
      },
      { threshold: 0.12 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
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
