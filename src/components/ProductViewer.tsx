import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCw, ZoomIn, ZoomOut, RefreshCcw } from "lucide-react";

/*
  ProductViewer
  - Drag left or right to rotate the product between its front and its back.
  - Scroll, pinch, or use the buttons to zoom. Drag to move around while zoomed.
  - Double click or double tap to zoom in and out quickly.
  - Keyboard: Left and Right arrows rotate, plus and minus zoom, 0 resets.
  All motion uses transform only and respects prefers-reduced-motion.
*/

interface ProductViewerProps {
  front: string;
  back: string;
  alt: string;
  className?: string;
  /* Tint class for the stage, from PRODUCT_TINT in ProductCard. */
  tint?: string;
  /* Front and back thumbnails under the stage, per the redesign. */
  thumbnails?: boolean;
  /* Scroll-reveal wiring, so a page can choose how the viewer arrives.
     Leaving revealMotion empty keeps the viewer out of the reveal pass. */
  revealMotion?: string;
  revealDelay?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;

export default function ProductViewer({
  front,
  back,
  alt,
  className = "",
  tint = "tint-product",
  thumbnails = false,
  revealMotion = "",
  revealDelay = 0,
}: ProductViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snapping, setSnapping] = useState(false);

  const drag = useRef<{ active: boolean; x: number; y: number; moved: boolean }>({
    active: false, x: 0, y: 0, moved: false,
  });
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastTap = useRef(0);

  const reduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const el = stageRef.current;
    if (!el || z <= 1) return { x: 0, y: 0 };
    const maxX = (el.clientWidth * (z - 1)) / 2;
    const maxY = (el.clientHeight * (z - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, p.x)),
      y: Math.max(-maxY, Math.min(maxY, p.y)),
    };
  }, []);

  const applyZoom = useCallback((next: number) => {
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    setZoom(z);
    setPan((p) => clampPan(p, z));
  }, [clampPan]);

  const snapToFace = useCallback((a: number) => {
    const snapped = Math.round(a / 180) * 180;
    if (!reduced) setSnapping(true);
    setAngle(snapped);
  }, [reduced]);

  /* Wheel zoom: registered manually so preventDefault works. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? 0.18 : -0.18));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, applyZoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current.active = false;
      return;
    }
    drag.current = { active: true, x: e.clientX, y: e.clientY, moved: false };
    setSnapping(false);

    /* Double tap or double click toggles zoom. */
    const now = Date.now();
    if (now - lastTap.current < 300) {
      applyZoom(zoom > 1 ? 1 : 2);
      drag.current.active = false;
    }
    lastTap.current = now;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      applyZoom(pinch.current.zoom * (dist / pinch.current.dist));
      return;
    }
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    if (zoom > 1) {
      setPan((p) => clampPan({ x: p.x + dx, y: p.y + dy }, zoom));
    } else {
      setAngle((a) => a + dx * 0.6);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag.current.active && zoom <= 1 && drag.current.moved) {
      snapToFace(angle);
    }
    drag.current.active = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setSnapping(true); setAngle((a) => a - 180); }
    if (e.key === "ArrowRight") { e.preventDefault(); setSnapping(true); setAngle((a) => a + 180); }
    if (e.key === "+" || e.key === "=") { e.preventDefault(); applyZoom(zoom + 0.25); }
    if (e.key === "-") { e.preventDefault(); applyZoom(zoom - 0.25); }
    if (e.key === "0") { e.preventDefault(); applyZoom(1); setSnapping(true); setAngle(0); }
  };

  const showingBack = Math.abs(Math.round(angle / 180)) % 2 === 1;

  return (
    <div
      className={`${revealMotion} ${className}`}
      {...(revealMotion ? { "data-reveal": revealDelay } : {})}
    >
      <div
        ref={stageRef}
        role="img"
        aria-label={`${alt}. Showing the ${showingBack ? "back" : "front"}. Drag to rotate. Use plus and minus to zoom.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        className={`relative aspect-square w-full cursor-grab select-none overflow-hidden rounded-well active:cursor-grabbing ${tint}`}
        style={{ touchAction: "none" }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: snapping && !reduced ? "transform var(--duration-base) var(--ease-out-quart)" : undefined,
          }}
        >
          <div className="absolute inset-0" style={{ perspective: "1400px" }}>
            <div
              className="absolute inset-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateY(${angle}deg)`,
                transition: snapping && !reduced ? "transform var(--duration-base) var(--ease-out-quart)" : undefined,
              }}
              onTransitionEnd={() => setSnapping(false)}
            >
              <img
                src={front}
                alt=""
                fetchPriority="high"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain p-6"
                style={{ backfaceVisibility: "hidden" }}
              />
              <img
                src={back}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain p-6"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              />
            </div>
          </div>
        </div>

        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-canvas/90 px-3.5 py-1.5 text-caption font-semibold text-brand shadow-[0_1px_2px_rgb(0_41_59/0.08)]">
          {showingBack ? "Back" : "Front"}
        </span>
      </div>

      {thumbnails && (
        <div className="mt-3.5 flex justify-center gap-3">
          {([
            { src: front, label: "Front", targetBack: false },
            { src: back, label: "Back", targetBack: true },
          ] as const).map((thumb) => {
            const active = showingBack === thumb.targetBack;
            return (
              <button
                key={thumb.label}
                type="button"
                aria-label={`Show the ${thumb.label.toLowerCase()} of the product`}
                aria-pressed={active}
                onClick={() => {
                  setSnapping(true);
                  setAngle(thumb.targetBack ? 180 : 0);
                }}
                className={`h-20 w-20 overflow-hidden rounded-md border-2 p-1.5 transition-colors duration-(--duration-micro) ${
                  active ? "border-brand" : "border-line-filter hover:border-brand-mint"
                } ${tint}`}
              >
                <img src={thumb.src} alt="" width={1200}
                height={800}
                className="h-full w-full object-contain" />
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-3">
        <p className="text-caption text-grey-muted">
          Drag to rotate. Scroll or pinch to zoom.
        </p>
        <div className="flex items-center gap-1.5">
          <ViewerButton label="Rotate the product" onClick={() => { setSnapping(true); setAngle((a) => a + 180); }}>
            <RotateCw size={16} strokeWidth={2} />
          </ViewerButton>
          <ViewerButton label="Zoom in" onClick={() => applyZoom(zoom + 0.35)}>
            <ZoomIn size={16} strokeWidth={2} />
          </ViewerButton>
          <ViewerButton label="Zoom out" onClick={() => applyZoom(zoom - 0.35)}>
            <ZoomOut size={16} strokeWidth={2} />
          </ViewerButton>
          <ViewerButton label="Reset the view" onClick={() => { applyZoom(1); setSnapping(true); setAngle(0); }}>
            <RefreshCcw size={16} strokeWidth={2} />
          </ViewerButton>
        </div>
      </div>
    </div>
  );
}

function ViewerButton({ label, onClick, children }: {
  label: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line-filter bg-surface-raised text-grey-dark shadow-soft transition-colors duration-(--duration-micro) hover:border-brand hover:text-brand"
    >
      {children}
    </button>
  );
}
