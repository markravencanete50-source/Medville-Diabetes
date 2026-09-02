import { useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import type { Product } from "../data/products";
import { prefersReducedMotion } from "../lib/useReveal";

/*
  The hero's floating product card: a white 28px-radius card holding the
  FreeStyle Libre 3 photograph, draggable between front and back, with three
  floating benefit chips around it.

  The drag mechanics are the simple subset of ProductViewer (rotate only, no
  zoom), because the hero card is a display piece, not the full inspector.
  A tap that never travels turns the card over to its other face: on a phone
  a tap is the first thing anyone tries, and a card that ignores it reads as
  stuck.
*/

const CHIPS = [
  { text: "New reading every minute", className: "-left-[4%] top-[6%]", duration: "6s", delay: "0s" },
  { text: "Up to 14-day wear", className: "-left-[6%] bottom-[10%]", duration: "7s", delay: "0.8s" },
  { text: "No routine finger sticks", className: "-right-[4%] top-[38%]", duration: "8s", delay: "0.4s" },
];

/* Travel under this, in pixels, is a tap rather than a drag. */
const TAP_TRAVEL = 4;

export default function HeroViewer({ product }: { product: Product }) {
  const [angle, setAngle] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const drag = useRef<{ x: number; startX: number; moved: boolean } | null>(null);
  const reduced = prefersReducedMotion();

  const showingBack = Math.abs(Math.round(angle / 180)) % 2 === 1;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, startX: e.clientX, moved: false };
    setSnapping(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current.x = e.clientX;
    if (Math.abs(e.clientX - drag.current.startX) > TAP_TRAVEL) drag.current.moved = true;
    setAngle((a) => a + dx * 0.6);
  };

  const onPointerEnd = () => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    setSnapping(true);
    /* A drag settles on whichever face is nearer; a tap goes to the other. */
    setAngle((a) => Math.round(a / 180) * 180 + (current.moved ? 0 : 180));
  };

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-[10%_6%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(47,169,124,0.28) 0%, rgba(47,169,124,0) 72%)",
          filter: "blur(30px)",
        }}
      />
      <div className={`relative ${reduced ? "" : "floaty"}`}>
        <div
          role="img"
          aria-label={`${product.name} sensor. Tap or drag to see the back.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
          className="relative mx-auto max-w-[480px] cursor-grab select-none overflow-hidden rounded-sheet bg-surface-raised shadow-overlay active:cursor-grabbing"
          /* touch-action keeps the page from scrolling under a drag; the
             callout setting keeps iOS from offering to save the picture when
             a finger rests on it a moment too long. */
          style={{ touchAction: "none", WebkitTouchCallout: "none" }}
        >
          <div className="aspect-square" style={{ perspective: "1400px" }}>
            <div
              className="absolute inset-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateY(${angle}deg)`,
                transition:
                  snapping && !reduced
                    ? "transform 620ms var(--ease-out-quart)"
                    : undefined,
              }}
              onTransitionEnd={() => setSnapping(false)}
            >
              <img
                src={product.imageFront}
                alt=""
                /* The home page's largest paint. Asking for it at high
                   priority moves the request ahead of everything below. */
                fetchPriority="high"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain p-7"
                style={{ backfaceVisibility: "hidden" }}
              />
              <img
                src={product.imageBack}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain p-7"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              />
            </div>
          </div>
          <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-brand-soft px-3.5 py-1.5 text-caption font-semibold text-brand">
            {showingBack ? "Back" : "Front"}
          </span>
          <span className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3.5 py-1.5 text-[0.75rem] font-medium text-on-dark backdrop-blur-[4px]">
            <RotateCw size={13} strokeWidth={2} />
            Tap or drag to flip
          </span>
        </div>

        {CHIPS.map((chip) => (
          <div
            key={chip.text}
            className={`floaty2 absolute inline-flex items-center rounded-full bg-surface-raised px-4 py-2.5 text-caption font-semibold text-ink shadow-pill max-lg:hidden ${chip.className}`}
            style={
              {
                "--floaty-duration": chip.duration,
                "--floaty-delay": chip.delay,
              } as React.CSSProperties
            }
          >
            {chip.text}
          </div>
        ))}
      </div>
    </div>
  );
}
