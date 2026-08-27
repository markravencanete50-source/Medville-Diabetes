import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  FileText,
  Handshake,
  MessagesSquare,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Truck,
  UserCheck,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal, prefersReducedMotion } from "../lib/useReveal";

/*
  Our Services: the customer journey, told as one guided path.

  The source is the ten-stage Medville DME workflow (see the 2026-08-27
  customer journey document). Visitors never see ten steps at once: the
  page groups them into four phases and reveals each stage on interaction,
  per the client's brief. Facts come from the document only; nothing here
  promises approval, coverage, or delivery times.
*/

type Stage = {
  number: string;
  name: string;
  icon: typeof Handshake;
  copy: string;
};

type Phase = {
  number: string;
  title: string;
  copy: string;
  icon: typeof Handshake;
  stages: Stage[];
};

const PHASES: Phase[] = [
  {
    number: "01",
    title: "Get Started",
    copy: "We begin by gathering the information needed to start your CGM journey.",
    icon: Handshake,
    stages: [
      {
        number: "01",
        name: "Connect",
        icon: Handshake,
        copy: "We collect your information and introduce the CGM process.",
      },
      {
        number: "02",
        name: "Verify",
        icon: Stethoscope,
        copy: "We verify your information with your healthcare provider.",
      },
    ],
  },
  {
    number: "02",
    title: "Get Approved",
    copy: "We work through the clinical, documentation, and insurance requirements.",
    icon: ShieldCheck,
    stages: [
      {
        number: "03",
        name: "Qualify",
        icon: UserCheck,
        copy: "We evaluate clinical and insurance information for applicable CGM coverage requirements.",
      },
      {
        number: "04",
        name: "Documentation",
        icon: FileText,
        copy: "We request the required medical records, prescription, and supporting documentation.",
      },
      {
        number: "05",
        name: "Review",
        icon: Search,
        copy: "We review documentation for completeness, accuracy, and payer requirements.",
      },
      {
        number: "06",
        name: "Insurance",
        icon: ShieldCheck,
        copy: "We verify insurance coverage and obtain authorization or additional information when required.",
      },
    ],
  },
  {
    number: "03",
    title: "Get Your CGM",
    copy: "Once requirements are met, we move your order through processing and delivery.",
    icon: Package,
    stages: [
      {
        number: "07",
        name: "Order",
        icon: Package,
        copy: "Your appropriate CGM and supplies are processed once requirements are met.",
      },
      {
        number: "08",
        name: "Delivery",
        icon: Truck,
        copy: "Your CGM is shipped directly to you.",
      },
    ],
  },
  {
    number: "04",
    title: "Stay Supported",
    copy: "Our relationship continues after delivery.",
    icon: MessagesSquare,
    stages: [
      {
        number: "09",
        name: "Support",
        icon: MessagesSquare,
        copy: "We are here for questions, concerns, or issues with your equipment and supplies.",
      },
      {
        number: "10",
        name: "Resupply",
        icon: RefreshCw,
        copy: "Your supplies continue through the recurring resupply process.",
      },
    ],
  },
];

/* The ten operational stages, shown when the visitor flips the toggle. */
const HANDLED = [
  "Information Collection",
  "Doctor Verification",
  "Qualification",
  "Documentation",
  "Compliance Review",
  "Insurance Verification",
  "Order Processing",
  "Shipping",
  "Support",
  "Resupply",
];

const HERO_PATH = ["Start", "Approval", "Delivery", "Ongoing support"];

/*
  Scroll progress for the journey rail. Progress runs from the moment the
  section enters the lower viewport to the moment it leaves the upper part,
  so the puck arrives at each phase roughly as the visitor reads it. With
  reduced motion the rail is simply full and static.
*/
function useJourneyProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.setProperty("--jp", "1");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport * 0.4;
      const passed = viewport * 0.7 - rect.top;
      const progress = Math.min(1, Math.max(0, passed / total));
      el.style.setProperty("--jp", progress.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}

/* The small sensor disc that rides the rail and sits in the hero visual. */
function SensorPuck({ size = 44, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center rounded-full bg-canvas ${
        glow ? "shadow-[0_0_0_6px_rgb(24_186_218/0.18),0_4px_14px_rgb(0_41_59/0.25)]" : "shadow-soft"
      }`}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-[18%] rounded-full border-2 border-brand-mint" />
      <span className="h-[14%] w-[14%] rounded-full bg-brand" />
    </span>
  );
}

export default function Services() {
  usePageMeta(
    "Our Services | Medville Diabetes",
    "Your journey with Medville, from getting started to staying supplied: approval, delivery, support, and ongoing resupply.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const journeyRef = useJourneyProgress<HTMLDivElement>();
  const [view, setView] = useState<"journey" | "handled">("journey");
  const [openStage, setOpenStage] = useState<string | null>(null);

  return (
    <div ref={revealRef}>
      {/* ---- hero ---- */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.16} blur={44} size={440} className="-right-[140px] -top-[160px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="rise-in m-0">
              <Eyebrow>Our Services</Eyebrow>
            </p>
            <h1
              className="rise-in mt-3 max-w-[16ch] font-display text-h1 font-bold leading-[1.08] text-ink"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              Your Journey <span className="text-teal">with Medville</span>
            </h1>
            <p
              className="rise-in mt-4 font-display text-h3 font-semibold text-brand"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              From getting started to staying supplied.
            </p>
            <p
              className="rise-in mt-4 max-w-[50ch] text-body-lg leading-relaxed text-grey-dark"
              style={{ "--rise-delay": "200ms" } as React.CSSProperties}
            >
              We help guide the process from initial information and verification
              through delivery, support, and ongoing resupply.
            </p>
            <p
              className="rise-in mt-7 inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-canvas/70 px-5 py-4 font-display text-[1.05rem] font-semibold text-ink shadow-soft"
              style={{ "--rise-delay": "260ms" } as React.CSSProperties}
            >
              Your focus is on managing your diabetes.
              <span className="text-brand">We handle the process.</span>
            </p>
          </div>

          {/* sensor visual with the four-stop mini path */}
          <div
            className="rise-in relative mx-auto flex w-full max-w-[380px] flex-col items-center"
            style={{ "--rise-delay": "220ms" } as React.CSSProperties}
          >
            <div aria-hidden="true" className="sensor-stage relative flex items-center justify-center">
              <span className="sensor-ring sensor-ring-a" />
              <span className="sensor-ring sensor-ring-b" />
              <span className="sensor-orbit">
                <span className="sensor-orbit-dot" />
              </span>
              <SensorPuck size={116} />
            </div>
            <ol className="m-0 mt-8 flex w-full list-none flex-col gap-0 p-0">
              {HERO_PATH.map((stop, index) => (
                <li key={stop} className="flex flex-col items-center">
                  {index > 0 && (
                    <span aria-hidden="true" className="h-5 w-px bg-brand-bright/50" />
                  )}
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-caption font-bold uppercase tracking-[0.14em] ${
                      index === 0 ? "bg-brand text-on-dark" : "bg-canvas/80 text-brand shadow-[0_1px_3px_rgb(0_41_59/0.1)]"
                    }`}
                  >
                    {index > 0 && <ArrowDown size={12} strokeWidth={2.5} aria-hidden="true" />}
                    {stop}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ---- your journey vs what we handle ---- */}
      <section className="py-14 md:py-20">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[620px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-ink">
              One simple journey
            </h2>
            <p className="mt-3 text-body leading-relaxed text-grey-dark">
              You see four easy phases. Behind them, our team works through every
              operational step. You do not have to navigate the complexity alone.
            </p>
          </div>

          <div data-reveal={120} className="mt-8 flex justify-center">
            <div role="tablist" aria-label="Journey view" className="inline-flex rounded-full bg-grey-light p-1.5">
              {(
                [
                  ["journey", "Your Journey"],
                  ["handled", "What We Handle"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={`rounded-full px-6 py-2.5 font-display text-small font-semibold transition-all duration-(--duration-base) ease-(--ease-out-quart) ${
                    view === key
                      ? "bg-brand text-on-dark shadow-pill"
                      : "text-grey-muted hover:text-brand"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10">
            {view === "journey" ? (
              <ol className="fade-in m-0 flex list-none flex-wrap items-center justify-center gap-3 p-0">
                <li className="rounded-full bg-ink px-5 py-2.5 font-display text-small font-bold uppercase tracking-[0.1em] text-on-dark">
                  You
                </li>
                {PHASES.map((phase) => (
                  <li key={phase.title} className="flex items-center gap-3">
                    <ArrowRight size={16} strokeWidth={2.4} className="text-brand-bright" aria-hidden="true" />
                    <span className="inline-flex items-center gap-2.5 rounded-full bg-brand-soft px-5 py-2.5 font-display text-small font-semibold text-brand">
                      <phase.icon size={16} strokeWidth={2.2} aria-hidden="true" />
                      {phase.title}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="fade-in m-0 flex list-none flex-wrap items-center justify-center gap-y-3 p-0">
                {HANDLED.map((step, index) => (
                  <li key={step} className="flex items-center">
                    {index > 0 && (
                      <ArrowRight size={13} strokeWidth={2.4} className="mx-2 text-brand-bright/70" aria-hidden="true" />
                    )}
                    <span className="rounded-full border border-line-brand bg-canvas px-3.5 py-1.5 text-caption font-semibold text-grey-dark">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Container>
      </section>

      {/* ---- the journey rail ---- */}
      <section className="bg-why-band relative overflow-hidden py-16 md:py-24">
        <Grain opacity={0.04} />
        <Container wide className="relative">
          <div data-reveal={0} className="max-w-[560px]">
            <Eyebrow>The journey</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              Four phases. One path.
            </h2>
            <p className="mt-3 text-body leading-relaxed text-grey-dark">
              Follow the path. Select any phase to see the steps our team handles
              inside it.
            </p>
          </div>

          <div ref={journeyRef} className="journey relative mt-12">
            {/* the rail and its illuminated fill */}
            <div aria-hidden="true" className="journey-rail">
              <div className="journey-rail-fill" />
              <div className="journey-puck">
                <SensorPuck size={40} />
              </div>
            </div>

            <ol className="m-0 flex list-none flex-col gap-10 p-0 md:gap-14">
              {PHASES.map((phase, index) => (
                <li key={phase.title} data-reveal={index * 90} className="journey-phase relative">
                  <span aria-hidden="true" className="journey-node">
                    <phase.icon size={19} strokeWidth={2.2} />
                  </span>
                  <div className="journey-card rounded-lg bg-surface-raised p-7 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover md:p-9">
                    <p className="m-0 font-display text-[2.2rem] font-bold leading-none text-brand-mint">
                      {phase.number}
                    </p>
                    <h3 className="mt-2 font-display text-h3 font-bold text-ink">{phase.title}</h3>
                    <p className="mt-2 max-w-[52ch] text-body leading-relaxed text-grey-dark">
                      {phase.copy}
                    </p>
                    <ul className="m-0 mt-5 flex list-none flex-wrap gap-2.5 p-0">
                      {phase.stages.map((stage) => {
                        const id = `stage-${stage.number}`;
                        const open = openStage === id;
                        return (
                          <li key={id} className={open ? "w-full" : ""}>
                            <button
                              aria-expanded={open}
                              aria-controls={`${id}-panel`}
                              onClick={() => setOpenStage(open ? null : id)}
                              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4.5 py-2 font-display text-small font-semibold transition-all duration-(--duration-base) ease-(--ease-out-quart) ${
                                open
                                  ? "bg-brand text-on-dark shadow-pill"
                                  : "bg-brand-soft text-brand hover:bg-brand-mint"
                              }`}
                            >
                              <stage.icon size={15} strokeWidth={2.2} aria-hidden="true" />
                              <span className="text-caption font-bold opacity-60">{stage.number}</span>
                              {stage.name}
                            </button>
                            {open && (
                              <p
                                id={`${id}-panel`}
                                className="fade-in mb-1 mt-3 max-w-[52ch] rounded-md bg-brand-tint px-4 py-3 text-small leading-relaxed text-grey-dark"
                              >
                                {stage.copy}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ---- you focus, we handle ---- */}
      <section className="bg-dark-band relative overflow-hidden py-16 md:py-24">
        <Grain opacity={0.06} />
        {/* the operational work, ghosted behind the simple journey */}
        <div aria-hidden="true" className="ghost-steps pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-4 p-8 opacity-[0.15]">
          {HANDLED.map((step) => (
            <span key={step} className="rounded-full border border-on-dark-muted px-5 py-2 font-display text-body font-semibold text-on-dark">
              {step}
            </span>
          ))}
        </div>
        <Container className="relative">
          <div data-reveal={0} className="mx-auto max-w-[640px] text-center">
            <h2 className="m-0 font-display text-h2 font-bold text-on-dark">
              You focus on your diabetes.
              <br />
              We handle the process.
            </h2>
          </div>
          <div data-reveal={140} className="reveal-zoom mx-auto mt-9 flex max-w-[560px] flex-wrap items-center justify-center gap-3 rounded-lg bg-canvas/95 p-6 shadow-overlay backdrop-blur-sm">
            <span className="rounded-full bg-ink px-5 py-2.5 font-display text-small font-bold uppercase tracking-[0.1em] text-on-dark">
              Patient
            </span>
            <ArrowRight size={16} strokeWidth={2.4} className="text-brand-bright" aria-hidden="true" />
            <span className="inline-flex items-center gap-2.5 rounded-full bg-brand-soft px-5 py-2.5 font-display text-small font-semibold text-brand">
              <SensorPuck size={22} glow={false} />
              One simple journey
            </span>
          </div>
        </Container>
      </section>

      {/* ---- the loop that does not end ---- */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal={0}>
            <Eyebrow>After delivery</Eyebrow>
            <h2 className="mt-3 max-w-[18ch] font-display text-h2 font-bold text-ink">
              And it does not stop at delivery.
            </h2>
            <p className="mt-4 max-w-[46ch] text-body-lg leading-relaxed text-grey-dark">
              We are here throughout your journey.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Button to="/qualify" variant="cta" className="min-h-[50px] px-8">
                Get Started
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <Button to="/contact" variant="ghost" className="min-h-[50px]">
                Contact Us
              </Button>
            </div>
          </div>

          {/* delivery → support → resupply loop */}
          <div data-reveal={140} className="reveal-zoom reveal-slow relative mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center">
            <span aria-hidden="true" className="loop-ring" />
            <span className="font-display text-[3rem] font-bold text-brand-mint" aria-hidden="true">
              &#8734;
            </span>
            {(
              [
                [Truck, "Delivery", "loop-stop-a"],
                [MessagesSquare, "Support", "loop-stop-b"],
                [RefreshCw, "Resupply", "loop-stop-c"],
              ] as const
            ).map(([Icon, label, position]) => (
              <span
                key={label}
                className={`loop-stop ${position} inline-flex flex-col items-center gap-1.5`}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-brand shadow-pill">
                  <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className="rounded-full bg-canvas/90 px-2.5 py-0.5 text-caption font-semibold text-ink">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
