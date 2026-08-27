import { useEffect, useRef, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal, prefersReducedMotion } from "../lib/useReveal";

/*
  Our Services: the customer journey told as an animated story.

  The factual source is the ten-stage Medville DME customer journey document.
  The client asked for almost no reading: the page should let a visitor
  understand the whole process in seconds, through motion and cards rather
  than paragraphs.

  The signature element is the journey player. It plays the ten steps like a
  story: each step has its own animated scene, a one-line caption, and a
  story-style progress bar. It advances by itself, pauses on hover or focus,
  and any step card jumps straight to that step. Reduced-motion visitors get
  a click-through version with no autoplay and finished artwork.

  Nothing on this page promises approval, coverage, or delivery times.
*/

const STROKE = {
  fill: "none",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ---------------------------------------------------------------- glyphs */

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

/* a filled, unmistakably human silhouette: head resting on shoulders */
function GlyphPerson({ x, y, tone, scale = 1, i = 0 }: { x: number; y: number; tone: string; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <g stroke={tone} {...STROKE}>
        <circle cx="0" cy="-30" r="14" fill="var(--color-canvas)" />
        <path d="M -24 28 C -24 0 -12 -10 0 -10 C 12 -10 24 0 24 28 Z" fill="var(--color-canvas)" />
      </g>
    </Pop>
  );
}

/* a sheet of paper with text lines */
function GlyphDoc({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <g stroke="var(--color-ink)" {...STROKE}>
        <path d="M -28 -38 h 40 l 16 16 v 54 a 6 6 0 0 1 -6 6 h -50 a 6 6 0 0 1 -6 -6 v -64 a 6 6 0 0 1 6 -6 Z" fill="var(--color-canvas)" />
        <path d="M 12 -38 v 16 h 16" />
      </g>
      <g stroke="var(--color-line-strong)" {...STROKE}>
        <path d="M -22 -6 h 36" />
        <path d="M -22 8 h 40" />
        <path d="M -22 22 h 28" />
      </g>
    </Pop>
  );
}

/* the shield of verification with its check */
function GlyphShield({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <path d="M 0 -30 L 26 -19 V 3 C 26 21 0 32 0 32 C 0 32 -26 21 -26 3 V -19 Z" fill="var(--color-brand)" stroke="none" />
      <path d="M -10 1 l 8 9 l 14 -16" stroke="var(--color-on-dark)" {...STROKE} />
    </Pop>
  );
}

/* the CGM sensor: two rings and a centre */
function GlyphSensor({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <circle r="26" fill="var(--color-canvas)" stroke="var(--color-ink)" strokeWidth="3" />
      <circle r="16" fill="none" stroke="var(--color-brand-mint)" strokeWidth="3" />
      <circle r="4" fill="var(--color-brand)" />
    </Pop>
  );
}

/* a house with a pitched roof */
function GlyphHome({ x, y, scale = 1, i = 0 }: { x: number; y: number; scale?: number; i?: number }) {
  return (
    <Pop x={x} y={y} scale={scale} i={i}>
      <g stroke="var(--color-brand)" {...STROKE}>
        <path d="M -20 4 l 20 -17 l 20 17 v 22 h -40 Z" fill="var(--color-canvas)" />
        <path d="M -5 26 v -12 h 10 v 12" />
      </g>
    </Pop>
  );
}

/* a small check badge that lands on top of other artwork */
function GlyphCheck({ x, y, i = 0 }: { x: number; y: number; i?: number }) {
  return (
    <Pop x={x} y={y} i={i}>
      <circle r="16" fill="var(--color-brand-bright)" />
      <path d="M -7 0 l 5 6 l 9 -11" stroke="var(--color-ink)" {...STROKE} />
    </Pop>
  );
}

/* a dashed connector whose dashes crawl, so hand-off reads as movement */
function FlowPath({ d }: { d: string }) {
  return (
    <path
      d={d}
      className="dash-flow"
      stroke="var(--color-brand-bright)"
      strokeDasharray="1 9"
      {...STROKE}
    />
  );
}

/* every scene sits on the same soft circular stage */
function Scene({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 280 220" role="img" aria-label={label} className="w-full max-w-[340px]">
      <circle cx="140" cy="110" r="92" fill="var(--color-brand-soft)" />
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- scenes */

/* 1 - two people, one conversation */
function SceneReachOut() {
  return (
    <Scene label="Two people joined by a line of conversation.">
      <FlowPath d="M 100 78 C 120 54 160 54 180 78" />
      <GlyphPerson x={100} y={146} tone="var(--color-ink)" i={0} />
      <GlyphPerson x={180} y={150} tone="var(--color-brand)" scale={0.92} i={1} />
      <Pop x={140} y={52} i={3}>
        <path
          d="M 0 0 c -3 -5 -10 -5 -10 1 c 0 5 10 10 10 10 c 0 0 10 -5 10 -10 c 0 -6 -7 -6 -10 -1 Z"
          fill="var(--color-brand-bright)"
        />
      </Pop>
    </Scene>
  );
}

/* 2 - the clinic confirms the patient's care */
function SceneDoctorCheck() {
  return (
    <Scene label="A clinic building confirming a patient's care.">
      <g className="scene-pop" stroke="var(--color-ink)" {...STROKE}>
        <path d="M 74 160 v -66 l 34 -22 l 34 22 v 66 Z" fill="var(--color-canvas)" />
        <path d="M 108 92 v 16 M 100 100 h 16" stroke="var(--color-brand)" />
        <path d="M 98 160 v -20 h 20 v 20" />
      </g>
      <FlowPath d="M 148 108 C 172 92 186 96 200 112" />
      <GlyphPerson x={206} y={158} tone="var(--color-brand)" scale={0.9} i={1} />
      <GlyphCheck x={206} y={100} i={3} />
    </Scene>
  );
}

/* 3 - coverage requirements are checked */
function SceneQualify() {
  return (
    <Scene label="A checklist reviewed against coverage requirements.">
      <GlyphDoc x={122} y={110} i={0} />
      <g stroke="var(--color-brand)" {...STROKE}>
        <path className="scene-draw" style={{ "--i": 1 } as React.CSSProperties} pathLength={1} d="M 92 104 l 5 6 l 9 -10" />
        <path className="scene-draw" style={{ "--i": 2 } as React.CSSProperties} pathLength={1} d="M 92 118 l 5 6 l 9 -10" />
      </g>
      <GlyphShield x={186} y={130} i={3} />
    </Scene>
  );
}

/* 4 - records travel from the clinic to Medville */
function SceneRecords() {
  return (
    <Scene label="Medical records travelling from the clinic.">
      <GlyphDoc x={104} y={116} scale={0.85} i={0} />
      <GlyphDoc x={130} y={104} scale={0.85} i={1} />
      <FlowPath d="M 162 130 C 180 138 190 138 206 130" />
      <Pop x={196} y={96} i={2}>
        <g stroke="var(--color-brand)" {...STROKE}>
          <rect x="-24" y="-18" width="48" height="36" rx="6" fill="var(--color-canvas)" />
          <path d="M -24 -12 L 0 6 L 24 -12" />
        </g>
      </Pop>
    </Scene>
  );
}

/* 5 - everything is read closely */
function SceneReview() {
  return (
    <Scene label="A magnifying glass reading a document closely.">
      <GlyphDoc x={124} y={110} i={0} />
      <g className="scene-pop" style={{ "--i": 2 } as React.CSSProperties}>
        <circle cx="176" cy="130" r="24" fill="var(--color-brand-soft)" fillOpacity="0.9" stroke="var(--color-brand)" strokeWidth="3" />
        <path d="M 193 147 L 210 164" stroke="var(--color-brand)" {...STROKE} strokeWidth={5} />
        <path d="M 168 130 l 6 7 l 11 -13" stroke="var(--color-brand)" {...STROKE} />
      </g>
    </Scene>
  );
}

/* 6 - coverage is verified */
function SceneInsurance() {
  return (
    <Scene label="An insurance card protected by a shield.">
      <Pop x={118} y={112}>
        <g stroke="var(--color-ink)" {...STROKE}>
          <rect x="-38" y="-26" width="76" height="52" rx="8" fill="var(--color-canvas)" />
          <path d="M -38 -10 h 76" />
          <path d="M -26 8 h 24" stroke="var(--color-line-strong)" />
        </g>
      </Pop>
      <GlyphShield x={184} y={126} i={2} />
    </Scene>
  );
}

/* 7 - the order comes together */
function SceneOrder() {
  return (
    <Scene label="A sensor placed into its delivery box.">
      <g className="scene-pop" stroke="var(--color-ink)" {...STROKE}>
        <path d="M 96 118 l 44 -18 l 44 18 v 44 l -44 18 l -44 -18 Z" fill="var(--color-canvas)" />
        <path d="M 96 118 l 44 16 l 44 -16" />
        <path d="M 140 134 v 46" />
      </g>
      <GlyphSensor x={140} y={70} scale={0.9} i={2} />
      <FlowPath d="M 140 92 v 16" />
    </Scene>
  );
}

/* 8 - straight to the door */
function SceneDelivery() {
  return (
    <Scene label="A delivery van driving toward a home.">
      <Pop x={104} y={120}>
        <g stroke="var(--color-ink)" {...STROKE}>
          <rect x="-38" y="-24" width="52" height="34" rx="4" fill="var(--color-canvas)" />
          <path d="M 14 -14 h 16 l 12 12 v 12 h -28 Z" fill="var(--color-canvas)" />
          <circle cx="-20" cy="14" r="7" fill="var(--color-canvas)" />
          <circle cx="26" cy="14" r="7" fill="var(--color-canvas)" />
        </g>
      </Pop>
      <FlowPath d="M 150 152 C 170 160 186 160 204 150" />
      <GlyphHome x={210} y={116} i={2} />
    </Scene>
  );
}

/* 9 - a conversation that stays open */
function SceneSupport() {
  return (
    <Scene label="A conversation bubble with a reply on the way.">
      <g className="scene-pop" stroke="var(--color-ink)" {...STROKE}>
        <path
          d="M 102 74 h 76 a 10 10 0 0 1 10 10 v 34 a 10 10 0 0 1 -10 10 h -40 l -20 16 v -16 h -16 a 10 10 0 0 1 -10 -10 v -34 a 10 10 0 0 1 10 -10 Z"
          fill="var(--color-canvas)"
        />
      </g>
      <g fill="var(--color-brand-bright)">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="dot-pulse" style={{ "--i": i } as React.CSSProperties} cx={124 + i * 16} cy={101} r="4" />
        ))}
      </g>
      <GlyphPerson x={140} y={186} tone="var(--color-brand)" scale={0.7} i={1} />
    </Scene>
  );
}

/* 10 - the loop that keeps going */
function SceneResupply() {
  return (
    <Scene label="A box inside a circle of renewal.">
      <g className="spin-slow">
        <circle
          cx="140"
          cy="110"
          r="66"
          fill="none"
          stroke="var(--color-brand-bright)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 12"
        />
      </g>
      <Pop x={140} y={110} i={1}>
        <g stroke="var(--color-ink)" {...STROKE}>
          <path d="M -30 -8 l 30 -13 l 30 13 v 30 l -30 13 l -30 -13 Z" fill="var(--color-canvas)" />
          <path d="M -30 -8 l 30 11 l 30 -11" />
          <path d="M 0 3 v 32" />
        </g>
      </Pop>
      <GlyphCheck x={196} y={62} i={3} />
    </Scene>
  );
}

/* ------------------------------------------------------------ the story */

type Stage = {
  name: string;
  caption: string;
  scene: () => React.ReactNode;
};

const STAGES: Stage[] = [
  { name: "Reach out", caption: "A short conversation starts everything.", scene: SceneReachOut },
  { name: "Doctor check", caption: "We confirm your care with your clinic.", scene: SceneDoctorCheck },
  { name: "Qualify", caption: "We check CGM coverage requirements.", scene: SceneQualify },
  { name: "Records", caption: "We collect records from your provider.", scene: SceneRecords },
  { name: "Review", caption: "We make sure everything is complete.", scene: SceneReview },
  { name: "Insurance", caption: "We verify coverage and authorization.", scene: SceneInsurance },
  { name: "Order", caption: "We prepare your CGM and supplies.", scene: SceneOrder },
  { name: "Delivery", caption: "Your CGM ships to your door.", scene: SceneDelivery },
  { name: "Support", caption: "We help with questions and supplies.", scene: SceneSupport },
  { name: "Resupply", caption: "Refills continue on a regular schedule.", scene: SceneResupply },
];

/* the four phases group the ten steps for the first glance */
const PHASES = [
  { title: "Get started", steps: "Steps 1 – 2", copy: "We reach out and confirm your care.", start: 0 },
  { title: "Get approved", steps: "Steps 3 – 6", copy: "We handle records and insurance.", start: 2 },
  { title: "Get your CGM", steps: "Steps 7 – 8", copy: "We prepare and ship your order.", start: 6 },
  { title: "Stay supported", steps: "Steps 9 – 10", copy: "We answer, and refills continue.", start: 8 },
];

const STAGE_MS = 4200;

/*
  The journey player. One CSS animation on the active progress bar is the
  clock: when its fill completes, the page advances one stage. Pausing sets
  animation-play-state instead of tearing the bar down, so the fill freezes
  in place. Reduced-motion visitors get no autoplay and no moving fill.
*/
function JourneyPlayer() {
  const reduced = prefersReducedMotion();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [hoverPause, setHoverPause] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const running = playing && inView && !hoverPause && !reduced;

  /* the story only plays while the player is on screen */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    <div
      ref={sectionRef}
      onMouseEnter={() => setHoverPause(true)}
      onMouseLeave={() => setHoverPause(false)}
      onFocusCapture={() => setHoverPause(true)}
      onBlurCapture={() => setHoverPause(false)}
      className="rounded-sheet bg-surface-raised p-6 shadow-raised md:p-10"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        {/* the animated scene; key remounts it so each stage draws itself */}
        <div key={active} className="scene-swap order-2 mx-auto lg:order-1">
          {stage.scene()}
        </div>

        <div className="order-1 lg:order-2">
          <p aria-hidden="true" className="m-0 font-display text-[4rem] font-bold leading-none text-brand-soft md:text-[5.5rem]">
            {String(active + 1).padStart(2, "0")}
          </p>
          <div key={`copy-${active}`} className="scene-swap">
            <h3 className="mt-1 font-display text-h2 font-bold text-ink">{stage.name}</h3>
            <p className="mt-3 max-w-[36ch] text-body-lg leading-relaxed text-grey-dark">{stage.caption}</p>
          </div>
          {!reduced && (
            <button
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "Pause the journey" : "Play the journey"}
              className="mt-6 flex min-h-[44px] min-w-[44px] items-center gap-2.5 rounded-full bg-brand-soft px-5 font-display text-small font-semibold text-brand transition-colors duration-(--duration-base) hover:bg-brand-mint"
            >
              {playing ? <Pause size={16} strokeWidth={2.2} /> : <Play size={16} strokeWidth={2.2} />}
              {playing ? "Pause" : "Play"}
            </button>
          )}
        </div>
      </div>

      {/* the ten step cards with story-style progress bars */}
      <div
        ref={trackRef}
        className="scrollbar-none -mx-6 mt-8 flex snap-x gap-2.5 overflow-x-auto px-6 pb-1 md:mx-0 md:px-0 lg:grid lg:grid-cols-10"
      >
        {STAGES.map((step, index) => {
          const isActive = index === active;
          return (
            <button
              key={step.name}
              ref={(el) => { cardRefs.current[index] = el; }}
              onClick={() => setActive(index)}
              aria-current={isActive ? "step" : undefined}
              className={`group relative min-w-[104px] shrink-0 snap-center rounded-md border p-3 text-left transition-all duration-(--duration-base) ease-(--ease-out-quart) lg:min-w-0 ${
                isActive
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-canvas hover:-translate-y-0.5 hover:border-line-strong"
              }`}
            >
              <span className={`block font-display text-caption font-bold ${isActive ? "text-brand" : "text-grey-faint"}`}>
                {index + 1}
              </span>
              <span className={`mt-0.5 block text-caption font-semibold leading-tight ${isActive ? "text-ink" : "text-grey-dark"}`}>
                {step.name}
              </span>
              <span className="sr-only">{step.caption}</span>
              {/* progress: past steps full, future empty, active one filling */}
              <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-line">
                {index < active && <span className="block h-full w-full bg-brand" />}
                {isActive && !reduced && (
                  <span
                    key={`bar-${active}`}
                    onAnimationEnd={() => setActive((value) => (value + 1) % STAGES.length)}
                    className={`story-bar block h-full w-full bg-brand ${running ? "" : "story-bar-paused"}`}
                    style={{ "--story-ms": `${STAGE_MS}ms` } as React.CSSProperties}
                  />
                )}
                {isActive && reduced && <span className="block h-full w-full bg-brand" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the page */

/* the hero's one-line journey: a dot travels the path while you read */
function HeroJourneyLine() {
  const stops = [
    { x: 48, y: 112, label: "Start" },
    { x: 172, y: 62, label: "Approve" },
    { x: 296, y: 112, label: "Deliver" },
    { x: 420, y: 62, label: "Support" },
  ];
  const path = "M 48 112 C 96 112 124 62 172 62 C 220 62 248 112 296 112 C 344 112 372 62 420 62";
  return (
    <svg viewBox="0 0 470 160" role="img" aria-label="The journey: start, approve, deliver, support." className="w-full max-w-[560px]">
      <path d={path} className="dash-flow" stroke="var(--color-brand-mint)" strokeDasharray="1 10" {...STROKE} />
      {stops.map((stop, index) => (
        <Pop key={stop.label} x={stop.x} y={stop.y} i={index}>
          <circle r="17" fill="var(--color-brand-soft)" />
          <circle r="7" fill={index === 0 ? "var(--color-cta)" : "var(--color-brand)"} />
          <text y="40" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--color-ink)" fontFamily="var(--font-display)">
            {stop.label}
          </text>
        </Pop>
      ))}
      {/* the traveller rides the same path via CSS motion path; the
          reduced-motion media rule stops it with everything else */}
      <circle
        r="6"
        fill="var(--color-brand-bright)"
        className="journey-traveler"
        style={{ offsetPath: `path("${path}")` } as React.CSSProperties}
      />
    </svg>
  );
}

export default function Services() {
  usePageMeta(
    "Our Services | Medville Diabetes",
    "Watch the Medville journey: we reach out, handle approval and insurance, ship your CGM, and keep your supplies coming.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const playerRef = useRef<HTMLDivElement | null>(null);

  const goToPlayer = () => {
    playerRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div ref={revealRef}>
      {/* ---- hero: one sentence, then the journey drawn as a line ---- */}
      <section className="bg-wash relative overflow-hidden">
        <Container wide className="relative py-16 text-center md:py-24">
          <h1 className="rise-in mx-auto m-0 max-w-[18ch] font-display text-h1 font-bold leading-[1.08] text-ink">
            From first call to your front door.
          </h1>
          <p
            className="rise-in mx-auto mt-5 max-w-[38ch] text-body-lg leading-relaxed text-grey-dark"
            style={{ "--rise-delay": "90ms" } as React.CSSProperties}
          >
            Ten steps. We handle all of them.
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
            <Button variant="ghost" className="min-h-[50px]" onClick={goToPlayer}>
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
                onClick={goToPlayer}
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

      {/* ---- the journey player: the whole process, played as a story ---- */}
      <section ref={playerRef} className="scroll-mt-24 pb-20 md:pb-28">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[560px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-ink">Watch how it works.</h2>
            <p className="mt-3 text-body-lg leading-relaxed text-grey-dark">
              Tap any step, or let it play.
            </p>
          </div>
          <div data-reveal={120} className="mt-10">
            <JourneyPlayer />
          </div>
        </Container>
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
