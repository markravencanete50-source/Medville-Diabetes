import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./useReveal";

/*
  Counts a set of numbers up from zero when the band holding them becomes
  30 percent visible. Runs once. Under reduced motion the final values are
  set immediately, so the numbers are still correct and still readable.

  Duration is 1300ms on a cubic ease out, matching the design.
*/
export function useCountUp<T extends Record<string, number>>(targets: T) {
  const ref = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<T>(() => {
    const zeroed = {} as T;
    for (const key of Object.keys(targets) as (keyof T)[]) {
      zeroed[key] = 0 as T[keyof T];
    }
    return zeroed;
  });

  /* Read targets through a ref so a new object literal each render does not
     restart the animation. */
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    const band = ref.current;
    if (!band) return;

    const settle = () => setValues({ ...targetsRef.current });

    if (prefersReducedMotion()) {
      settle();
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const duration = 1300;
        const step = (now: number) => {
          const k = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - k, 3);
          const next = {} as T;
          for (const key of Object.keys(targetsRef.current) as (keyof T)[]) {
            next[key] = Math.round(targetsRef.current[key] * eased) as T[keyof T];
          }
          setValues(next);
          if (k < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.3 },
    );

    observer.observe(band);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, values };
}
