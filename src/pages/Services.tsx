import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

/*
  Our Services: the customer journey as one flowing path.

  The factual source is the ten-stage Medville DME customer journey
  document. The page tells it as four illustrated chapters joined by a
  single organic line that draws itself as the visitor scrolls; the ten
  operational stages are quiet interactive points that reveal one sentence
  each. Nothing here promises approval, coverage, or delivery times.

  Design rules for this page: one visual metaphor (the path), one
  illustration system (round-capped strokes over soft tinted shapes),
  sentence-case type, generous whitespace, no cards, no chips, no
  continuous motion.
*/

type Stage = { name: string; copy: string; icon: React.ReactNode };

type Chapter = {
  numeral: string;
  title: string;
  copy: string;
  illustration: React.ReactNode;
  stages: Stage[];
};

/* ---- the illustration system: 3px round strokes over soft shapes ---- */

const STROKE = {
  fill: "none",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* a filled, unmistakably human silhouette: head resting on shoulders */
function GlyphPerson({ x, y, tone, scale = 1 }: { x: number; y: number; tone: string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={tone} {...STROKE}>
      <circle cx="0" cy="-30" r="14" fill="var(--color-canvas)" />
      <path d="M -24 28 C -24 0 -12 -10 0 -10 C 12 -10 24 0 24 28 Z" fill="var(--color-canvas)" />
    </g>
  );
}

/* 01 - two people, one connection */
function IlloGetStarted() {
  return (
    <svg viewBox="0 0 260 220" role="img" aria-label="Two people joined by a line of care." className="w-full max-w-[300px]">
      <circle cx="130" cy="112" r="96" fill="var(--color-brand-soft)" />
      <path d="M 92 74 C 112 52 148 52 168 74" stroke="var(--color-brand-bright)" strokeDasharray="1 9" {...STROKE} />
      <path
        d="M 130 52 c -3 -5 -10 -5 -10 1 c 0 5 10 10 10 10 c 0 0 10 -5 10 -10 c 0 -6 -7 -6 -10 -1 Z"
        fill="var(--color-brand-bright)"
        stroke="none"
      />
      <GlyphPerson x={92} y={144} tone="var(--color-ink)" />
      <GlyphPerson x={168} y={148} tone="var(--color-brand)" scale={0.92} />
    </svg>
  );
}

/* 02 - a document under a shield */
function IlloGetApproved() {
  return (
    <svg viewBox="0 0 260 220" role="img" aria-label="A document with a shield of verification." className="w-full max-w-[300px]">
      <circle cx="130" cy="112" r="96" fill="var(--color-brand-soft)" />
      <g stroke="var(--color-ink)" {...STROKE}>
        <path d="M 88 48 h 62 l 22 22 v 92 a 8 8 0 0 1 -8 8 h -76 a 8 8 0 0 1 -8 -8 v -106 a 8 8 0 0 1 8 -8 Z" fill="var(--color-canvas)" />
        <path d="M 150 48 v 22 h 22" />
      </g>
      <g stroke="var(--color-line-strong)" {...STROKE}>
        <path d="M 96 92 h 52" />
        <path d="M 96 110 h 60" />
        <path d="M 96 128 h 40" />
      </g>
      <g transform="translate(168 138)">
        <path
          d="M 0 -26 L 24 -16 V 4 C 24 20 0 30 0 30 C 0 30 -24 20 -24 4 V -16 Z"
          fill="var(--color-brand)"
          stroke="none"
        />
        <path d="M -9 1 l 7 8 l 13 -15" stroke="var(--color-on-dark)" {...STROKE} />
      </g>
    </svg>
  );
}

/* 03 - a sensor leaving the box for home */
function IlloGetCgm() {
  return (
    <svg viewBox="0 0 260 220" role="img" aria-label="A sensor beside its delivery box, on the way to a home." className="w-full max-w-[300px]">
      <circle cx="130" cy="112" r="96" fill="var(--color-brand-soft)" />
      <g stroke="var(--color-ink)" {...STROKE}>
        <path d="M 62 104 l 44 -18 l 44 18 v 48 l -44 18 l -44 -18 Z" fill="var(--color-canvas)" />
        <path d="M 62 104 l 44 16 l 44 -16" />
        <path d="M 106 120 v 50" />
      </g>
      <g>
        <circle cx="172" cy="84" r="26" fill="var(--color-canvas)" stroke="var(--color-ink)" strokeWidth="3" />
        <circle cx="172" cy="84" r="16" fill="none" stroke="var(--color-brand-mint)" strokeWidth="3" />
        <circle cx="172" cy="84" r="4" fill="var(--color-brand)" />
      </g>
      <path d="M 196 106 C 216 120 220 134 216 150" stroke="var(--color-brand-bright)" strokeDasharray="1 9" {...STROKE} />
      <g stroke="var(--color-brand)" {...STROKE}>
        <path d="M 200 168 l 16 -13 l 16 13 v 18 h -32 Z" fill="var(--color-canvas)" />
      </g>
    </svg>
  );
}

/* 04 - conversation that keeps circling back */
function IlloStaySupported() {
  return (
    <svg viewBox="0 0 260 220" role="img" aria-label="A conversation bubble inside a circle of renewal." className="w-full max-w-[300px]">
      <circle cx="130" cy="112" r="96" fill="var(--color-brand-soft)" />
      <g stroke="var(--color-brand)" {...STROKE}>
        <path d="M 130 34 A 78 78 0 0 1 205 92" />
        <path d="M 198 74 l 7 18 l -19 6" />
        <path d="M 130 190 A 78 78 0 0 1 55 132" />
        <path d="M 62 150 l -7 -18 l 19 -6" />
      </g>
      <g stroke="var(--color-ink)" {...STROKE}>
        <path
          d="M 92 88 h 76 a 10 10 0 0 1 10 10 v 34 a 10 10 0 0 1 -10 10 h -40 l -20 16 v -16 h -16 a 10 10 0 0 1 -10 -10 v -34 a 10 10 0 0 1 10 -10 Z"
          fill="var(--color-canvas)"
        />
      </g>
      <g fill="var(--color-brand-bright)">
        <circle cx="114" cy="115" r="4" />
        <circle cx="130" cy="115" r="4" />
        <circle cx="146" cy="115" r="4" />
      </g>
    </svg>
  );
}

/* the hero: one still, premium sensor */
function IlloHero() {
  return (
    <svg viewBox="0 0 320 300" role="img" aria-label="A continuous glucose monitor sensor." className="w-full max-w-[360px]">
      <circle cx="160" cy="146" r="120" fill="var(--color-brand-soft)" />
      <ellipse cx="160" cy="190" rx="86" ry="30" fill="var(--color-brand-mint)" opacity="0.55" />
      <circle cx="160" cy="138" r="62" fill="var(--color-canvas)" stroke="var(--color-ink)" strokeWidth="3" />
      <circle cx="160" cy="138" r="40" fill="none" stroke="var(--color-brand-mint)" strokeWidth="3" />
      <circle cx="160" cy="138" r="7" fill="var(--color-brand)" />
      <path d="M 236 84 a 44 44 0 0 1 12 26" stroke="var(--color-brand-bright)" strokeDasharray="1 9" {...STROKE} />
      <path d="M 72 190 a 44 44 0 0 0 12 26" stroke="var(--color-brand-bright)" strokeDasharray="1 9" {...STROKE} />
    </svg>
  );
}

/* stage marks reuse the same stroke language at a small size */
function markPath(d: string) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" stroke="currentColor" {...STROKE} strokeWidth={2.2}>
      {d.split("|").map((part) => (
        <path key={part} d={part} fill="none" />
      ))}
    </svg>
  );
}

const CHAPTERS: Chapter[] = [
  {
    numeral: "01",
    title: "Get started",
    copy: "We begin by gathering the information needed to start your CGM journey.",
    illustration: <IlloGetStarted />,
    stages: [
      {
        name: "Connect",
        icon: markPath("M12 3a4 4 0 1 0 0 8 a4 4 0 0 0 0-8|M4 21c0-4.4 16-4.4 16 0"),
        copy: "We collect your information and introduce the CGM process.",
      },
      {
        name: "Verify",
        icon: markPath("M6 3v5a6 6 0 0 0 12 0V3|M12 14v3a4 4 0 0 0 8 0v-1|M20 13a2 2 0 1 0 0 4"),
        copy: "We verify your information with your healthcare provider.",
      },
    ],
  },
  {
    numeral: "02",
    title: "Get approved",
    copy: "We work through the clinical, documentation, and insurance requirements.",
    illustration: <IlloGetApproved />,
    stages: [
      {
        name: "Qualify",
        icon: markPath("M9 3a4 4 0 1 0 0 8 a4 4 0 0 0 0-8|M2 21c0-4.4 14-4.4 14 0|M16 10l2.5 2.5L23 8"),
        copy: "We evaluate clinical and insurance information for applicable CGM coverage requirements.",
      },
      {
        name: "Documentation",
        icon: markPath("M6 2h9l4 4v16H6z|M15 2v4h4|M9 12h6|M9 16h4"),
        copy: "We request the required medical records, prescription, and supporting documentation.",
      },
      {
        name: "Review",
        icon: markPath("M10 3a7 7 0 1 0 0 14 a7 7 0 0 0 0-14|M15 15l6 6"),
        copy: "We review documentation for completeness, accuracy, and payer requirements.",
      },
      {
        name: "Insurance",
        icon: markPath("M12 2l8 3.5V12c0 5-8 9-8 9s-8-4-8-9V5.5z|M8.5 11.5l2.5 2.5 4.5-5"),
        copy: "We verify insurance coverage and obtain authorization or additional information when required.",
      },
    ],
  },
  {
    numeral: "03",
    title: "Get your CGM",
    copy: "Once requirements are met, we move your order through processing and delivery.",
    illustration: <IlloGetCgm />,
    stages: [
      {
        name: "Order",
        icon: markPath("M3 8l9-4 9 4v9l-9 4-9-4z|M3 8l9 4 9-4|M12 12v9"),
        copy: "Your appropriate CGM and supplies are processed once requirements are met.",
      },
      {
        name: "Delivery",
        icon: markPath("M2 6h12v11H2z|M14 10h4l4 4v3h-8|M6 20a2 2 0 1 0 0-4 a2 2 0 0 0 0 4|M17 20a2 2 0 1 0 0-4 a2 2 0 0 0 0 4"),
        copy: "Your CGM is shipped directly to you.",
      },
    ],
  },
  {
    numeral: "04",
    title: "Stay supported",
    copy: "Our relationship continues after delivery.",
    illustration: <IlloStaySupported />,
    stages: [
      {
        name: "Support",
        icon: markPath("M4 5h16v11H9l-5 4z|M8.5 10.5h.01|M12 10.5h.01|M15.5 10.5h.01"),
        copy: "We are here for questions, concerns, or issues with your equipment and supplies.",
      },
      {
        name: "Resupply",
        icon: markPath("M20 12a8 8 0 1 1-3-6.2|M17 2l1 4-4 1"),
        copy: "Your supplies continue through the recurring resupply process.",
      },
    ],
  },
];

const HERO_TRAIL = ["Get started", "Eligibility", "Delivery", "Ongoing support"];

/*
  The connector between chapters: one S-curve that continues the same line
  down the page. It draws itself when it enters the viewport, so scrolling
  develops the path. Mirrored on alternate chapters so the line flows from
  the illustration just passed toward the next one.
*/
function FlowConnector({ mirrored }: { mirrored?: boolean }) {
  return (
    <div data-reveal={0} aria-hidden="true" className="mx-auto hidden h-[150px] w-full max-w-4xl lg:block">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full">
        <path
          d={mirrored ? "M 27 0 C 27 16 73 14 73 30" : "M 73 0 C 73 16 27 14 27 30"}
          pathLength={1}
          className="flow-line"
          fill="none"
          stroke="var(--color-brand-mint)"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function Services() {
  usePageMeta(
    "Our Services | Medville Diabetes",
    "Your journey with Medville, from getting started to staying supplied: approval, delivery, support, and ongoing resupply.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const [openStage, setOpenStage] = useState<string | null>(null);

  return (
    <div ref={revealRef}>
      {/* ---- hero: quiet, spacious, one still illustration ---- */}
      <section className="bg-wash relative overflow-hidden">
        <Container wide className="relative grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1
              className="rise-in m-0 max-w-[14ch] font-display text-h1 font-bold leading-[1.08] text-ink"
            >
              Your Journey with Medville
            </h1>
            <p
              className="rise-in mt-5 font-display text-h3 font-medium text-brand"
              style={{ "--rise-delay": "90ms" } as React.CSSProperties}
            >
              From getting started to staying supplied.
            </p>
            <p
              className="rise-in mt-5 max-w-[46ch] text-body-lg leading-relaxed text-grey-dark"
              style={{ "--rise-delay": "180ms" } as React.CSSProperties}
            >
              We help guide the process from initial information and verification
              through delivery, support, and ongoing resupply.
            </p>
            <div
              className="rise-in mt-9 flex flex-wrap items-center gap-3.5"
              style={{ "--rise-delay": "260ms" } as React.CSSProperties}
            >
              <Button to="/qualify" variant="cta" className="min-h-[50px] px-8">
                Get Started
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <Button to="/contact" variant="ghost" className="min-h-[50px]">
                Contact Us
              </Button>
            </div>
            {/* the journey in one quiet line */}
            <p
              className="rise-in mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-grey-muted"
              style={{ "--rise-delay": "340ms" } as React.CSSProperties}
            >
              {HERO_TRAIL.map((stop, index) => (
                <span key={stop} className="flex items-center gap-3">
                  {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-line-strong" />}
                  <span className={index === 0 ? "font-semibold text-brand" : ""}>{stop}</span>
                </span>
              ))}
            </p>
          </div>
          <div
            className="rise-in mx-auto"
            style={{ "--rise-delay": "200ms" } as React.CSSProperties}
          >
            <IlloHero />
          </div>
        </Container>
      </section>

      {/* ---- the journey: four chapters on one line ---- */}
      <section className="overflow-hidden py-20 md:py-28">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[560px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-ink">
              Your journey, made simple.
            </h2>
            <p className="mt-4 text-body-lg leading-relaxed text-grey-dark">
              Four phases. We handle the details inside each one.
            </p>
          </div>

          <div className="mt-16 md:mt-20">
            {CHAPTERS.map((chapter, index) => {
              const mirrored = index % 2 === 1;
              return (
                <article key={chapter.title}>
                  {index > 0 && <FlowConnector mirrored={!mirrored} />}
                  <div
                    className={`grid items-center gap-10 py-10 md:py-14 lg:grid-cols-2 lg:gap-20 ${
                      mirrored ? "" : ""
                    }`}
                  >
                    <div data-reveal={0} className={mirrored ? "lg:order-2" : ""}>
                      <p
                        aria-hidden="true"
                        className="m-0 font-display text-[4.5rem] font-bold leading-none text-brand-soft md:text-[6rem]"
                      >
                        {chapter.numeral}
                      </p>
                      <h3 className="mt-1 font-display text-h2 font-bold text-ink">
                        {chapter.title}
                      </h3>
                      <p className="mt-4 max-w-[44ch] text-body-lg leading-relaxed text-grey-dark">
                        {chapter.copy}
                      </p>

                      {/* the stages: quiet points that open one line each */}
                      <div className="mt-8">
                        <div className="flex flex-wrap gap-x-8 gap-y-5">
                          {chapter.stages.map((stage) => {
                            const id = `${chapter.numeral}-${stage.name}`;
                            const open = openStage === id;
                            return (
                              <button
                                key={id}
                                aria-expanded={open}
                                aria-controls={`${chapter.numeral}-panel`}
                                onClick={() => setOpenStage(open ? null : id)}
                                className="group flex min-h-[44px] flex-col items-center gap-2"
                              >
                                <span
                                  className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-all duration-(--duration-base) ease-(--ease-out-quart) ${
                                    open
                                      ? "scale-105 bg-brand text-on-dark"
                                      : "bg-brand-soft text-brand group-hover:scale-105 group-hover:bg-brand-mint"
                                  }`}
                                >
                                  {stage.icon}
                                </span>
                                <span
                                  className={`text-small font-semibold ${
                                    open ? "text-brand" : "text-grey-dark"
                                  }`}
                                >
                                  {stage.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div id={`${chapter.numeral}-panel`} aria-live="polite" className="mt-4 min-h-[52px] max-w-[46ch]">
                          {chapter.stages.map((stage) => {
                            const id = `${chapter.numeral}-${stage.name}`;
                            if (openStage !== id) return null;
                            return (
                              <p key={id} className="fade-in m-0 border-l-2 border-brand-bright pl-4 text-body leading-relaxed text-grey-dark">
                                {stage.copy}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div
                      data-reveal={140}
                      className={`reveal-slow mx-auto ${mirrored ? "lg:order-1 reveal-left" : "reveal-right"}`}
                    >
                      {chapter.illustration}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ---- you and Medville, one calm contrast ---- */}
      <section className="bg-why-band py-20 md:py-28">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[560px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-ink">
              You focus on your diabetes.
            </h2>
            <p className="mt-1 font-display text-h2 font-bold text-brand">
              We handle the process.
            </p>
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
              <div className="relative">
                <svg viewBox="0 0 120 120" role="img" aria-label="Medville." className="w-[104px]">
                  <circle cx="60" cy="60" r="54" fill="var(--color-brand)" />
                  <circle cx="60" cy="60" r="26" fill="var(--color-canvas)" />
                  <circle cx="60" cy="60" r="16" fill="none" stroke="var(--color-brand-mint)" strokeWidth="3" />
                  <circle cx="60" cy="60" r="4" fill="var(--color-brand)" />
                </svg>
              </div>
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

      {/* ---- the loop after delivery ---- */}
      <section className="py-20 md:py-28">
        <Container className="grid items-center gap-14 lg:grid-cols-2">
          <div data-reveal={0}>
            <h2 className="m-0 max-w-[18ch] font-display text-h2 font-bold text-ink">
              And it does not stop at delivery.
            </h2>
            <p className="mt-4 max-w-[42ch] text-body-lg leading-relaxed text-grey-dark">
              We are here throughout your journey.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Button to="/qualify" variant="cta" className="min-h-[50px] px-8">
                Get Started
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <Button to="/contact" variant="ghost" className="min-h-[50px]">
                Contact Us
              </Button>
            </div>
          </div>

          <div data-reveal={140} className="reveal-slow mx-auto w-full max-w-[340px]">
            <svg viewBox="0 0 300 320" role="img" aria-label="Delivery leads to support, support leads to resupply, and resupply continues.">
              <path
                d="M 150 66 C 236 66 236 130 214 178 C 198 212 120 250 96 220 C 74 192 92 96 150 66"
                fill="none"
                stroke="var(--color-brand-mint)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="1 10"
                pathLength={100}
              />
              {(
                [
                  ["Delivery", 150, 52, "M-9 -4h8v8h-8z|M-1 -1h4l3 3v2h-7z|M-6 6a1.6 1.6 0 1 0 0.1 0|M2 6a1.6 1.6 0 1 0 0.1 0"],
                  ["Support", 216 , 186, "M-8 -6h16v9h-9l-4 4v-4h-3z"],
                  ["Resupply", 96, 226, "M7 0a7 7 0 1 1-2.5-5.4|M4.5 -7l1 3.5-3.5 1"],
                ] as const
              ).map(([label, cx, cy, d]) => (
                <g key={label} transform={`translate(${cx} ${cy})`}>
                  <circle r="30" fill="var(--color-canvas)" stroke="var(--color-line-brand)" strokeWidth="2" />
                  <g stroke="var(--color-brand)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(1.6)">
                    {d.split("|").map((part) => (
                      <path key={part} d={part} />
                    ))}
                  </g>
                  <text y="50" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--color-ink)" fontFamily="var(--font-display)">
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </Container>
      </section>
    </div>
  );
}
