import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal, prefersReducedMotion } from "../lib/useReveal";

/*
  Our Services: the customer journey told as a scroll-driven story.

  The factual source is the ten-stage Medville DME customer journey document.
  The client asked for almost no reading, real 3D imagery, and a scroll
  effect: scrolling through the section IS the journey. The player card
  pins to the screen while the page scrolls, and each stretch of scroll
  advances one step, fills its progress bar, and swaps in that step's
  artwork and one-line caption.

  Artwork: each step points at a rendered 3D image in /services (produced
  in the client's Canva account). Until a file is present the step falls
  back to a dimensional vector version of the same subject, so the page
  never shows a broken image. Swap-in requires no code change: drop the
  file at the path named in STAGES.

  Nothing on this page promises approval, coverage, or delivery times.
*/

const STROKE = {
  fill: "none",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ------------------------------------------------------------ 3D palette */

/*
  Shared gradients give the vector fallbacks a moulded, lit look instead of
  a line-drawn one. IDs are document-global; every Scene emits the same
  defs, and since only one scene is mounted at a time (plus the hero, which
  uses its own prefixed IDs) the duplicates resolve identically.
*/
function SceneDefs() {
  return (
    <defs>
      <linearGradient id="g-navy" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" style={{ stopColor: "var(--color-brand)" }} />
        <stop offset="1" style={{ stopColor: "var(--color-brand-deep)" }} />
      </linearGradient>
      <linearGradient id="g-cyan" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" style={{ stopColor: "var(--color-brand-mint)" }} />
        <stop offset="1" style={{ stopColor: "var(--color-brand-bright)" }} />
      </linearGradient>
      <linearGradient id="g-paper" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" style={{ stopColor: "var(--color-canvas)" }} />
        <stop offset="1" style={{ stopColor: "var(--color-surface)" }} />
      </linearGradient>
      <linearGradient id="g-orange" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" style={{ stopColor: "var(--color-cta)" }} />
        <stop offset="1" style={{ stopColor: "var(--color-cta-hover)" }} />
      </linearGradient>
    </defs>
  );
}

/* a soft contact shadow that grounds every object */
function Floor({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.16} fill="var(--color-brand-deep)" opacity="0.1" />;
}

/* a small highlight that sells the moulded surface */
function Gloss({ cx, cy, rx, ry, rotate = -24 }: { cx: number; cy: number; rx: number; ry: number; rotate?: number }) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      transform={`rotate(${rotate} ${cx} ${cy})`}
      fill="var(--color-canvas)"
      opacity="0.45"
    />
  );
}

/*
  Pop places artwork and animates its arrival. The position lives on the
  outer group and the scene-pop animation on an inner group, because the
  animation's transform keyframes would otherwise override the positioning
  transform attribute and collapse the artwork onto the origin.
*/
function Pop({ x = 0, y = 0, scale = 1, i = 0, children }: { x?: number; y?: number; scale?: number; i?: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="scene-pop" style={{ "--i": i } as React.CSSProperties}>
        {children}
      </g>
    </g>
  );
}

/* a moulded human figure */
function GlyphPerson({ x, y, fill = "url(#g-navy)", scale = 1, i = 0 }: { x: number; y: number; fill?: string; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <path d="M -24 28 C -24 0 -12 -10 0 -10 C 12 -10 24 0 24 28 Z" fill={fill} />
      <circle cx="0" cy="-30" r="14" fill={fill} />
      <Gloss cx={-5} cy={-34} rx={6} ry={3.5} />
    </Pop>
  );
}

/* a moulded sheet of paper with soft line detail */
function GlyphDoc({ x, y, scale = 1, i = 0, rotate = 0 }: { x: number; y: number; scale?: number; i?: number; rotate?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <g transform={`rotate(${rotate})`}>
        <path d="M -28 -38 h 40 l 16 16 v 54 a 8 8 0 0 1 -8 8 h -48 a 8 8 0 0 1 -8 -8 v -62 a 8 8 0 0 1 8 -8 Z" fill="url(#g-paper)" />
        <path d="M 12 -38 v 10 a 6 6 0 0 0 6 6 h 10 Z" fill="var(--color-brand-mint)" />
        <g stroke="var(--color-brand-mint)" strokeWidth="5" strokeLinecap="round">
          <path d="M -18 -8 h 32" />
          <path d="M -18 6 h 36" />
          <path d="M -18 20 h 24" />
        </g>
      </g>
    </Pop>
  );
}

/* the moulded shield of verification */
function GlyphShield({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <path d="M 0 -30 L 26 -19 V 3 C 26 21 0 32 0 32 C 0 32 -26 21 -26 3 V -19 Z" fill="url(#g-navy)" />
      <path d="M -10 1 l 8 9 l 14 -16" stroke="var(--color-on-dark)" {...STROKE} strokeWidth={4} />
      <Gloss cx={-10} cy={-18} rx={7} ry={3.5} />
    </Pop>
  );
}

/* a dimensional shipping box: lit top, shaded sides */
function GlyphBox({ x, y, scale = 1, i = 0, open = false }: { x: number; y: number; scale?: number; i?: number; open?: boolean }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      {/* left face, right face, top face */}
      <path d="M -34 -6 L 0 8 V 46 L -34 32 Z" fill="url(#g-paper)" />
      <path d="M 34 -6 L 0 8 V 46 L 34 32 Z" fill="var(--color-line-strong)" />
      <path d="M -34 -6 L 0 -20 L 34 -6 L 0 8 Z" fill={open ? "var(--color-brand-mint)" : "var(--color-brand-soft)"} />
      {open && <path d="M -34 -6 L -14 -30 L 14 -30 L 34 -6 L 0 -18 Z" fill="var(--color-brand-mint)" opacity="0.55" />}
      <path d="M -3 7 L -3 45 L 3 45 L 3 7 Z" fill="var(--color-cta)" opacity="0.85" />
    </Pop>
  );
}

/* the CGM sensor: a glossy white disc */
function GlyphSensor({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <circle r="26" fill="url(#g-paper)" />
      <circle r="16" fill="none" stroke="url(#g-cyan)" strokeWidth="5" />
      <circle r="5" fill="url(#g-navy)" />
      <Gloss cx={-9} cy={-12} rx={8} ry={4} />
    </Pop>
  );
}

/* a moulded home */
function GlyphHome({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <path d="M -22 4 h 44 v 24 a 4 4 0 0 1 -4 4 h -36 a 4 4 0 0 1 -4 -4 Z" fill="url(#g-paper)" />
      <path d="M -28 6 L 0 -18 L 28 6 Z" fill="url(#g-navy)" />
      <path d="M -6 32 v -14 a 6 6 0 0 1 12 0 v 14 Z" fill="url(#g-cyan)" />
    </Pop>
  );
}

/* a small floating check badge */
function GlyphCheck({ x, y, i = 0 }: { x: number; y: number; i?: number }) {
  return (
    <Pop x={x} y={y} i={i}>
      <circle r="16" fill="url(#g-cyan)" />
      <path d="M -7 0 l 5 6 l 9 -11" stroke="var(--color-canvas)" {...STROKE} strokeWidth={4} />
      <Gloss cx={-5} cy={-7} rx={5} ry={2.5} />
    </Pop>
  );
}

/* a dashed connector whose dashes crawl, so hand-off reads as movement */
function FlowPath({ d }: { d: string }) {
  return (
    <path d={d} className="dash-flow" stroke="var(--color-brand-bright)" strokeDasharray="1 9" {...STROKE} />
  );
}

/* every scene sits on the same soft circular stage */
function Scene({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 280 220" role="img" aria-label={label} className="h-full w-full">
      <SceneDefs />
      <circle cx="140" cy="110" r="92" fill="var(--color-brand-soft)" />
      {children}
    </svg>
  );
}

/* ------------------------------------------------- vector fallback scenes */

function SceneReachOut() {
  return (
    <Scene label="Two people joined by a line of conversation.">
      <Floor cx={140} cy={172} rx={64} />
      <FlowPath d="M 100 78 C 120 54 160 54 180 78" />
      <GlyphPerson x={100} y={146} i={0} />
      <GlyphPerson x={180} y={150} fill="url(#g-cyan)" scale={0.92} i={1} />
      <Pop x={140} y={52} i={3}>
        <path
          d="M 0 0 c -3 -5 -10 -5 -10 1 c 0 5 10 10 10 10 c 0 0 10 -5 10 -10 c 0 -6 -7 -6 -10 -1 Z"
          fill="url(#g-orange)"
        />
      </Pop>
    </Scene>
  );
}

function SceneDoctorCheck() {
  return (
    <Scene label="A clinic confirming a patient's care.">
      <Floor cx={130} cy={168} rx={70} />
      <Pop x={108} y={122} i={0}>
        <path d="M -34 38 v -60 l 34 -24 l 34 24 v 60 Z" fill="url(#g-paper)" />
        <path d="M -40 -18 L 0 -46 L 40 -18 L 34 -10 L 0 -34 L -34 -10 Z" fill="url(#g-navy)" />
        <rect x="-6" y="-22" width="12" height="28" rx="3" fill="url(#g-cyan)" />
        <rect x="-16" y="-12" width="32" height="10" rx="3" fill="url(#g-cyan)" />
        <path d="M -10 38 v -18 a 10 10 0 0 1 20 0 v 18 Z" fill="url(#g-navy)" />
      </Pop>
      <FlowPath d="M 152 108 C 172 94 186 96 198 110" />
      <GlyphPerson x={206} y={156} fill="url(#g-cyan)" scale={0.85} i={1} />
      <GlyphCheck x={206} y={98} i={3} />
    </Scene>
  );
}

function SceneQualify() {
  return (
    <Scene label="A checklist reviewed against coverage requirements.">
      <Floor cx={140} cy={172} rx={64} />
      <GlyphDoc x={122} y={110} i={0} rotate={-4} />
      <g stroke="var(--color-brand)" {...STROKE} strokeWidth={4}>
        <path className="scene-draw" style={{ "--i": 1 } as React.CSSProperties} pathLength={1} d="M 96 102 l 5 6 l 9 -10" />
        <path className="scene-draw" style={{ "--i": 2 } as React.CSSProperties} pathLength={1} d="M 96 118 l 5 6 l 9 -10" />
      </g>
      <GlyphShield x={186} y={130} i={3} />
    </Scene>
  );
}

function SceneRecords() {
  return (
    <Scene label="Medical records travelling from the clinic.">
      <Floor cx={140} cy={170} rx={66} />
      <GlyphDoc x={104} y={116} scale={0.85} i={0} rotate={-8} />
      <GlyphDoc x={130} y={104} scale={0.85} i={1} rotate={3} />
      <FlowPath d="M 160 130 C 178 140 188 140 202 132" />
      <Pop x={198} y={94} i={2}>
        <rect x="-26" y="-18" width="52" height="38" rx="7" fill="url(#g-paper)" />
        <path d="M -26 -14 L 0 8 L 26 -14 L 26 -11 L 0 12 L -26 -11 Z" fill="url(#g-navy)" />
        <path d="M -26 -18 h 52 l -26 20 Z" fill="url(#g-cyan)" />
      </Pop>
    </Scene>
  );
}

function SceneReview() {
  return (
    <Scene label="A close reading of every page.">
      <Floor cx={140} cy={172} rx={62} />
      <GlyphDoc x={124} y={110} i={0} rotate={-3} />
      <Pop x={176} y={130} i={2}>
        <circle r="24" fill="var(--color-brand-soft)" opacity="0.92" />
        <circle r="24" fill="none" stroke="url(#g-navy)" strokeWidth="6" />
        <path d="M 17 17 L 34 34" stroke="url(#g-navy)" strokeWidth="9" strokeLinecap="round" />
        <path d="M -8 0 l 6 7 l 11 -13" stroke="var(--color-brand)" {...STROKE} strokeWidth={4} />
        <Gloss cx={-8} cy={-11} rx={8} ry={4} />
      </Pop>
    </Scene>
  );
}

function SceneInsurance() {
  return (
    <Scene label="Coverage verified and protected.">
      <Floor cx={140} cy={168} rx={64} />
      <Pop x={118} y={112} i={0}>
        <rect x="-38" y="-26" width="76" height="52" rx="9" fill="url(#g-paper)" />
        <rect x="-38" y="-26" width="76" height="15" rx="9" fill="url(#g-cyan)" />
        <rect x="-26" y="2" width="30" height="7" rx="3.5" fill="var(--color-line-strong)" />
        <circle cx="26" cy="8" r="6" fill="url(#g-orange)" />
      </Pop>
      <GlyphShield x={184} y={126} scale={1.1} i={2} />
    </Scene>
  );
}

function SceneOrder() {
  return (
    <Scene label="A sensor placed into its delivery box.">
      <Floor cx={140} cy={176} rx={62} />
      <GlyphBox x={140} y={130} i={0} open />
      <GlyphSensor x={140} y={64} scale={0.85} i={2} />
      <FlowPath d="M 140 90 v 16" />
    </Scene>
  );
}

function SceneDelivery() {
  return (
    <Scene label="A delivery van on its way to a home.">
      <Floor cx={112} cy={158} rx={60} />
      <Pop x={104} y={120} i={0}>
        <rect x="-40" y="-26" width="54" height="38" rx="7" fill="url(#g-navy)" />
        <path d="M 14 -16 h 17 a 6 6 0 0 1 4.6 2.2 l 8.4 10.2 a 6 6 0 0 1 1.4 3.8 V 8 a 4 4 0 0 1 -4 4 H 14 Z" fill="url(#g-cyan)" />
        <path d="M 18 -11 h 11 l 7 9 h -18 Z" fill="var(--color-canvas)" opacity="0.85" />
        <rect x="-40" y="2" width="85" height="5" rx="2.5" fill="var(--color-brand-bright)" />
        <circle cx="-20" cy="14" r="9" fill="var(--color-brand-deep)" />
        <circle cx="-20" cy="14" r="4" fill="var(--color-canvas)" />
        <circle cx="26" cy="14" r="9" fill="var(--color-brand-deep)" />
        <circle cx="26" cy="14" r="4" fill="var(--color-canvas)" />
        <circle cx="42" cy="-2" r="3.5" fill="url(#g-orange)" />
        <Gloss cx={-24} cy={-20} rx={10} ry={4} />
      </Pop>
      <FlowPath d="M 152 152 C 172 160 186 160 202 150" />
      <GlyphHome x={210} y={112} i={2} />
    </Scene>
  );
}

function SceneSupport() {
  return (
    <Scene label="A conversation that stays open.">
      <Floor cx={140} cy={176} rx={58} />
      <Pop x={140} y={104} i={0}>
        <path
          d="M -38 -30 h 76 a 10 10 0 0 1 10 10 v 34 a 10 10 0 0 1 -10 10 h -40 l -20 16 v -16 h -16 a 10 10 0 0 1 -10 -10 v -34 a 10 10 0 0 1 10 -10 Z"
          fill="url(#g-navy)"
        />
        <Gloss cx={-20} cy={-20} rx={12} ry={5} />
      </Pop>
      <g fill="var(--color-canvas)">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="dot-pulse" style={{ "--i": i } as React.CSSProperties} cx={124 + i * 16} cy={101} r="5" />
        ))}
      </g>
      <GlyphPerson x={140} y={188} fill="url(#g-cyan)" scale={0.68} i={1} />
    </Scene>
  );
}

function SceneResupply() {
  return (
    <Scene label="Supplies that keep coming.">
      <Floor cx={140} cy={176} rx={60} />
      <g className="spin-slow">
        <circle
          cx="140"
          cy="110"
          r="66"
          fill="none"
          stroke="url(#g-cyan)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 14"
        />
      </g>
      <GlyphBox x={140} y={110} i={1} />
      <GlyphCheck x={196} y={62} i={3} />
    </Scene>
  );
}

/* ------------------------------------------------------------- the story */

type Stage = {
  name: string;
  caption: string;
  image: string;
  scene: () => React.ReactNode;
};

const STAGES: Stage[] = [
  { name: "Reach out", caption: "A short conversation starts everything.", image: "/services/step-01-reach-out.webp", scene: SceneReachOut },
  { name: "Doctor check", caption: "We confirm your care with your clinic.", image: "/services/step-02-doctor-check.webp", scene: SceneDoctorCheck },
  { name: "Qualify", caption: "We check CGM coverage requirements.", image: "/services/step-03-qualify.webp", scene: SceneQualify },
  { name: "Records", caption: "We collect records from your provider.", image: "/services/step-04-records.webp", scene: SceneRecords },
  { name: "Review", caption: "We make sure everything is complete.", image: "/services/step-05-review.webp", scene: SceneReview },
  { name: "Insurance", caption: "We verify coverage and authorization.", image: "/services/step-06-insurance.webp", scene: SceneInsurance },
  { name: "Order", caption: "We prepare your CGM and supplies.", image: "/services/step-07-order.webp", scene: SceneOrder },
  { name: "Delivery", caption: "Your CGM ships to your door.", image: "/services/step-08-delivery.webp", scene: SceneDelivery },
  { name: "Support", caption: "We help with questions and supplies.", image: "/services/step-09-support.webp", scene: SceneSupport },
  { name: "Resupply", caption: "Refills continue on a regular schedule.", image: "/services/step-10-resupply.webp", scene: SceneResupply },
];

/* the four phases group the ten steps for the first glance */
const PHASES = [
  { title: "Get started", steps: "Steps 1 – 2", copy: "We reach out and confirm your care.", start: 0 },
  { title: "Get approved", steps: "Steps 3 – 6", copy: "We handle records and insurance.", start: 2 },
  { title: "Get your CGM", steps: "Steps 7 – 8", copy: "We prepare and ship your order.", start: 6 },
  { title: "Stay supported", steps: "Steps 9 – 10", copy: "We answer, and refills continue.", start: 8 },
];

/*
  Steps render their Canva-produced 3D image when the file exists, and the
  vector scene otherwise. A missed load is remembered module-wide so the
  page does not re-request a missing file every time its step returns.
*/
const missingImages = new Set<string>();

function StageVisual({ stage }: { stage: Stage }) {
  const [failed, setFailed] = useState(() => missingImages.has(stage.image));
  if (failed) return <>{stage.scene()}</>;
  return (
    <img
      src={stage.image}
      alt={stage.caption}
      className="h-full w-full rounded-lg object-contain"
      onError={() => {
        missingImages.add(stage.image);
        setFailed(true);
      }}
    />
  );
}

/*
  The scroll-driven journey player. The section wrapper is ten steps tall;
  the card inside it pins below the header while the wrapper scrolls past.
  Scroll progress through the wrapper selects the step: each stretch of
  scroll fills the active card's bar (written imperatively so the scrub
  stays smooth), then hands off to the next step. Tapping a step scrolls
  the page to that step's stretch, so the two controls stay one system.
*/
function JourneyPlayer({ wrapRef, goToStep }: { wrapRef: React.RefObject<HTMLDivElement | null>; goToStep: (index: number) => void }) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const barRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      const frac = progress * STAGES.length;
      const index = Math.min(STAGES.length - 1, Math.floor(frac));
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, frac - index))})`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [wrapRef]);

  /* keep the active card centred in the track on small screens */
  useEffect(() => {
    const track = trackRef.current;
    const card = cardRefs.current[active];
    if (!track || !card || track.scrollWidth <= track.clientWidth) return;
    track.scrollTo({
      left: card.offsetLeft - track.clientWidth / 2 + card.clientWidth / 2,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [active]);

  const stage = STAGES[active];

  return (
    <div className="rounded-sheet bg-surface-raised p-6 shadow-raised md:p-10">
      <div className="grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        {/* the artwork; key remounts it so each step animates in */}
        <div key={active} className="scene-swap order-2 mx-auto flex w-full max-w-[420px] items-center justify-center lg:order-1" style={{ height: "min(400px, 40vh)" }}>
          <StageVisual stage={stage} />
        </div>

        <div className="order-1 lg:order-2">
          <p aria-hidden="true" className="m-0 font-display text-[3.4rem] font-bold leading-none text-brand-bright md:text-[4.6rem]">
            {String(active + 1).padStart(2, "0")}
            <span className="text-[0.45em] font-semibold text-brand-mint"> / 10</span>
          </p>
          <div key={`copy-${active}`} className="scene-swap">
            <h3 className="mt-1 font-display text-h2 font-bold text-ink">{stage.name}</h3>
            <p className="mt-3 max-w-[36ch] text-body-lg leading-relaxed text-grey-dark">{stage.caption}</p>
          </div>
        </div>
      </div>

      {/* the ten step cards; scrolling fills them, tapping jumps */}
      <div
        ref={trackRef}
        className="scrollbar-none -mx-6 mt-7 flex snap-x gap-2.5 overflow-x-auto px-6 pb-1 md:mx-0 md:px-0 lg:grid lg:grid-cols-10"
      >
        {STAGES.map((step, index) => {
          const isActive = index === active;
          return (
            <button
              key={step.name}
              ref={(el) => { cardRefs.current[index] = el; }}
              onClick={() => goToStep(index)}
              aria-current={isActive ? "step" : undefined}
              className={`group relative min-w-[104px] shrink-0 snap-center rounded-md border p-3 text-left transition-all duration-(--duration-base) ease-(--ease-out-quart) lg:min-w-0 ${
                isActive
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-canvas hover:-translate-y-0.5 hover:border-line-strong"
              }`}
            >
              <span className={`block font-display text-caption font-bold ${isActive ? "text-brand" : "text-grey-muted"}`}>
                {index + 1}
              </span>
              <span className={`mt-0.5 block text-caption font-semibold leading-tight ${isActive ? "text-ink" : "text-grey-dark"}`}>
                {step.name}
              </span>
              <span className="sr-only">{step.caption}</span>
              {/* progress: past steps full, future empty, the active one scrubs with the scroll */}
              <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-line">
                {index < active && <span className="block h-full w-full bg-brand" />}
                {isActive && (
                  <span
                    ref={barRef}
                    className="block h-full w-full bg-brand"
                    style={{ transform: "scaleX(0)", transformOrigin: "left" }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the page */

/*
  The hero journey line. The four phase stops are moulded, lit spheres that
  float gently at their own rhythm, and a traveller sphere rides the path
  between them on a CSS motion path. The reduced-motion media rule stops
  all of it with the finished artwork in place.
*/
function HeroJourneyLine() {
  const stops = [
    { x: 48, y: 118, label: "Start", fill: "url(#h-orange)" },
    { x: 172, y: 64, label: "Approve", fill: "url(#h-navy)" },
    { x: 296, y: 118, label: "Deliver", fill: "url(#h-navy)" },
    { x: 420, y: 64, label: "Support", fill: "url(#h-cyan)" },
  ];
  const path = "M 48 118 C 96 118 124 64 172 64 C 220 64 248 118 296 118 C 344 118 372 64 420 64";
  return (
    <svg viewBox="0 0 470 178" role="img" aria-label="The journey: start, approve, deliver, support." className="w-full max-w-[620px]">
      <defs>
        <radialGradient id="h-navy" cx="0.32" cy="0.28" r="0.85">
          <stop offset="0" style={{ stopColor: "var(--color-brand)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-brand-deep)" }} />
        </radialGradient>
        <radialGradient id="h-cyan" cx="0.32" cy="0.28" r="0.85">
          <stop offset="0" style={{ stopColor: "var(--color-brand-mint)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-accent-deep)" }} />
        </radialGradient>
        <radialGradient id="h-orange" cx="0.32" cy="0.28" r="0.85">
          <stop offset="0" style={{ stopColor: "var(--color-cta)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-cta-hover)" }} />
        </radialGradient>
      </defs>
      <path d={path} className="dash-flow" stroke="var(--color-brand-mint)" strokeDasharray="1 10" {...STROKE} />
      {stops.map((stop, index) => (
        <g key={stop.label} transform={`translate(${stop.x} ${stop.y})`}>
          <ellipse cx="0" cy="30" rx="17" ry="4.5" fill="var(--color-brand-deep)" opacity="0.12" />
          <g
            className="floaty2"
            style={{ "--floaty-duration": `${5 + index}s`, "--floaty-delay": `${index * 0.7}s` } as React.CSSProperties}
          >
            <g className="scene-pop" style={{ "--i": index } as React.CSSProperties}>
              <circle r="20" fill={stop.fill} />
              <ellipse cx="-7" cy="-9" rx="7" ry="4" transform="rotate(-24 -7 -9)" fill="var(--color-canvas)" opacity="0.5" />
            </g>
          </g>
          <text y="52" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--color-ink)" fontFamily="var(--font-display)">
            {stop.label}
          </text>
        </g>
      ))}
      {/* the traveller rides the same path via CSS motion path */}
      <circle
        r="7"
        fill="url(#h-cyan)"
        className="journey-traveler"
        style={{ offsetPath: `path("${path}")` } as React.CSSProperties}
      />
    </svg>
  );
}

export default function Services() {
  usePageMeta(
    "Our Services | Medville Diabetes",
    "Scroll the Medville journey: we reach out, handle approval and insurance, ship your CGM, and keep your supplies coming.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* scroll the page to the stretch of the journey that shows this step */
  const goToStep = (index: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const total = wrap.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + ((index + 0.5) / STAGES.length) * Math.max(0, total),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div ref={revealRef}>
      {/* ---- hero: the promise in two sentences, then the journey as a line ---- */}
      <section className="bg-wash relative overflow-hidden">
        <Container wide className="relative py-16 text-center md:py-24">
          <h1 className="rise-in mx-auto m-0 max-w-[22ch] font-display text-h1 font-bold leading-[1.1] text-ink">
            From our first call to your front door.
          </h1>
          <p
            className="rise-in mx-auto mt-6 max-w-[58ch] text-body-lg leading-relaxed text-grey-dark"
            style={{ "--rise-delay": "90ms" } as React.CSSProperties}
          >
            Medville guides your CGM order through every step. We confirm your
            care with your doctor, handle the records and insurance work, ship
            your device, and stay with you for support and resupply.
          </p>
          <div
            className="rise-in mx-auto mt-10 flex justify-center"
            style={{ "--rise-delay": "180ms" } as React.CSSProperties}
          >
            <HeroJourneyLine />
          </div>
          <div
            className="rise-in mt-10 flex flex-wrap items-center justify-center gap-3.5"
            style={{ "--rise-delay": "260ms" } as React.CSSProperties}
          >
            <Button to="/qualify" variant="cta" className="min-h-[50px] px-8">
              Get Started
              <ArrowRight size={16} strokeWidth={2.2} />
            </Button>
            <Button variant="ghost" className="min-h-[50px]" onClick={() => goToStep(0)}>
              Watch the journey
            </Button>
          </div>
        </Container>
      </section>

      {/* ---- the four phases, for the first glance ---- */}
      <section className="py-16 md:py-20">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((phase, index) => (
              <button
                key={phase.title}
                data-reveal={index * 80}
                onClick={() => goToStep(phase.start)}
                className="group rounded-card border border-line bg-surface-raised p-6 text-left shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
              >
                <span className="block font-display text-caption font-bold text-brand">{phase.steps}</span>
                <span className="mt-2 block font-display text-h3 font-bold text-ink">{phase.title}</span>
                <span className="mt-2 block text-small leading-relaxed text-grey-muted">{phase.copy}</span>
                <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand transition-transform duration-(--duration-base) group-hover:translate-x-1">
                  <ArrowRight size={16} strokeWidth={2.2} />
                </span>
              </button>
            ))}
          </div>
        </Container>
      </section>

      {/* ---- the journey: scroll moves you through the ten steps ---- */}
      <section className="pb-10">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[560px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-ink">Watch how it works.</h2>
            <p className="mt-3 text-body-lg leading-relaxed text-grey-dark">
              Scroll to move through the steps, or tap any step to jump to it.
            </p>
          </div>
        </Container>
        {/* the tall wrapper is the scroll runway; the card pins inside it */}
        <div ref={wrapRef} style={{ height: `${STAGES.length * 55 + 45}vh` }}>
          <div className="sticky top-[84px] pt-4">
            <Container>
              <JourneyPlayer wrapRef={wrapRef} goToStep={goToStep} />
            </Container>
          </div>
        </div>
      </section>

      {/* ---- you and Medville, one calm contrast ---- */}
      <section className="bg-why-band py-20 md:py-28">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[560px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-ink">You focus on your diabetes.</h2>
            <p className="mt-1 font-display text-h2 font-bold text-brand">We handle the process.</p>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl items-center gap-12 md:grid-cols-[1fr_auto_1fr]">
            <figure data-reveal={80} className="m-0 flex flex-col items-center gap-4 text-center">
              <svg viewBox="0 0 120 120" role="img" aria-label="You." className="w-[104px]">
                <circle cx="60" cy="60" r="54" fill="var(--color-canvas)" />
                <g stroke="var(--color-ink)" {...STROKE}>
                  <circle cx="60" cy="46" r="15" />
                  <path d="M 34 92 C 34 68 86 68 86 92" />
                </g>
              </svg>
              <figcaption className="font-display text-body font-semibold text-ink">You</figcaption>
            </figure>

            <div data-reveal={160} aria-hidden="true" className="hidden md:block">
              <svg viewBox="0 0 80 24" className="w-20">
                <path d="M 4 12 h 60" stroke="var(--color-brand-bright)" strokeDasharray="1 8" {...STROKE} />
                <path d="M 58 5 l 10 7 l -10 7" stroke="var(--color-brand-bright)" {...STROKE} />
              </svg>
            </div>

            <figure data-reveal={220} className="m-0 flex flex-col items-center gap-4 text-center">
              <svg viewBox="0 0 120 120" role="img" aria-label="Medville." className="w-[104px]">
                <circle cx="60" cy="60" r="54" fill="var(--color-brand)" />
                <circle cx="60" cy="60" r="26" fill="var(--color-canvas)" />
                <circle cx="60" cy="60" r="16" fill="none" stroke="var(--color-brand-mint)" strokeWidth="3" />
                <circle cx="60" cy="60" r="4" fill="var(--color-brand)" />
              </svg>
              <figcaption className="font-display text-body font-semibold text-ink">Medville</figcaption>
              <ul className="m-0 flex max-w-[280px] list-none flex-wrap justify-center gap-x-4 gap-y-1.5 p-0 text-caption text-grey-muted">
                {["Verify", "Document", "Review", "Insurance", "Order", "Deliver", "Support", "Resupply"].map((word) => (
                  <li key={word}>{word}</li>
                ))}
              </ul>
            </figure>
          </div>
        </Container>
      </section>

      {/* ---- closing call to action ---- */}
      <section className="bg-cta-band relative overflow-hidden py-20 md:py-24">
        <Container className="relative text-center">
          <h2 data-reveal={0} className="m-0 font-display text-h2 font-bold text-on-dark">
            Ready for step one?
          </h2>
          <p data-reveal={80} className="mx-auto mt-3 max-w-[38ch] text-body-lg leading-relaxed text-on-dark-muted">
            It starts with a short conversation.
          </p>
          <div data-reveal={160} className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Button to="/qualify" variant="on-band" className="min-h-[50px] px-8">
              Get Started
              <ArrowRight size={16} strokeWidth={2.2} />
            </Button>
            <Button to="/contact" variant="ghost-dark" className="min-h-[50px]">
              Contact Us
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
