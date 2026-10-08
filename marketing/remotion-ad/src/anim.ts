import { Easing } from "remotion";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Progress of t through [a, b], clamped to 0..1. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  soft: Easing.bezier(0.37, 0, 0.63, 1),
  back: (p: number) => {
    const c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
};

/** Eased progress through [a, b]. */
export const ep = (t: number, a: number, b: number, e: (p: number) => number = ease.out) => e(prog(t, a, b));

/** A gentle hand held drift, in pixels and degrees, for scenes shot "on camera". */
export function handheld(t: number, amount = 1) {
  const x = (Math.sin(t * 1.3) * 3 + Math.sin(t * 2.9 + 1) * 1.5) * amount;
  const y = (Math.cos(t * 1.1) * 2.5 + Math.sin(t * 3.7) * 1.2) * amount;
  const r = Math.sin(t * 0.9 + 2) * 0.25 * amount;
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
}

/** Spread items across [a, b] for staggered entrances. */
export const stagger = (i: number, start: number, gap: number) => start + i * gap;
