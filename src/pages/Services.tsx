import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  Headphones,
  Pause,
  Play,
  ShieldCheck,
  Stethoscope,
  Truck,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { prefersReducedMotion, useReveal } from "../lib/useReveal";
import { usePageMeta } from "../lib/usePageMeta";

const STEPS = [
  { label: "Talk with us", caption: "We collect a few details to get started.", phase: 0, icon: Headphones },
  { label: "Confirm care", caption: "We confirm your care with your clinic.", phase: 0, icon: Stethoscope },
  { label: "Check fit", caption: "We check clinical and insurance requirements.", phase: 1, icon: ShieldCheck },
  { label: "Gather records", caption: "We request the records and prescription needed.", phase: 1, icon: FileCheck2 },
  { label: "Review documents", caption: "We check that everything is complete.", phase: 1, icon: FileCheck2 },
  { label: "Verify insurance", caption: "We handle coverage and authorization.", phase: 1, icon: ShieldCheck },
  { label: "Process order", caption: "We prepare the right CGM and supplies.", phase: 2, icon: FileCheck2 },
  { label: "Ship to you", caption: "Your order ships directly to your door.", phase: 2, icon: Truck },
  { label: "Answer questions", caption: "Our team helps with equipment and supplies.", phase: 3, icon: Headphones },
  { label: "Keep supplies coming", caption: "We manage ongoing resupply.", phase: 3, icon: Truck },
] as const;

const PHASES = [
  { label: "Start", range: "01–02", title: "Start with a conversation", copy: "Tell us a little about your care." },
  { label: "Confirm", range: "03–06", title: "We handle the paperwork", copy: "We work with your clinic and insurance." },
  { label: "Get your CGM", range: "07–08", title: "Your order comes to you", copy: "We prepare and ship your supplies." },
  { label: "Stay supported", range: "09–10", title: "Support keeps going", copy: "We help now and with future refills." },
] as const;

function HeroDepthVisual() {
  return (
    <div className="services-hero-visual relative mx-auto w-full max-w-[560px]" aria-label="A Medville patient journey from conversation to delivery">
      <div className="services-hero-glow absolute inset-[12%_8%] rounded-full" aria-hidden="true" />
      <div className="services-hero-depth relative overflow-hidden rounded-sheet shadow-overlay">
        <img
          src="/services/services-hero.png"
          alt="A woman at home checks her phone while wearing a continuous glucose monitor."
          className="aspect-[4/3] w-full object-cover"
        />
        <div className="services-hero-wash absolute inset-0" aria-hidden="true" />
        <div className="services-hero-card absolute bottom-5 left-5 right-5 rounded-card border border-on-dark/20 bg-ink/80 p-4 text-on-dark backdrop-blur-md md:bottom-7 md:left-7 md:right-auto md:w-[230px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption font-semibold uppercase tracking-[0.16em] text-on-dark-accent">Care path</span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-bright text-ink">
              <ArrowRight size={14} strokeWidth={2.5} />
            </span>
          </div>
          <p className="mt-3 font-display text-[1.3rem] font-semibold leading-tight">One team for every handoff.</p>
          <div className="mt-4 flex items-center gap-2 text-caption text-on-dark-muted">
            <span className="h-2 w-2 rounded-full bg-cta" aria-hidden="true" />
            <span>10 steps. Nothing to chase alone.</span>
          </div>
        </div>
      </div>
      <div className="services-hero-chip services-hero-chip-one rounded-full bg-surface-raised px-4 py-2.5 text-caption font-semibold text-ink shadow-pill">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-bright" aria-hidden="true" />
        Clinic + insurance
      </div>
      <div className="services-hero-chip services-hero-chip-two rounded-full bg-surface-raised px-4 py-2.5 text-caption font-semibold text-ink shadow-pill">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
        Straight to your door
      </div>
    </div>
  );
}

function PhaseTrack({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  return (
    <div className="relative">
      <div className="services-phase-line" aria-hidden="true">
        <span className="services-phase-bead" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PHASES.map((phase, index) => {
          const selected = active === index;
          return (
            <button
              key={phase.label}
              type="button"
              onClick={() => onSelect(index)}
              aria-pressed={selected}
              className={`services-phase-card relative min-h-[132px] rounded-card border p-5 text-left transition-all duration-(--duration-base) ease-(--ease-out-quart) ${
                selected
                  ? "border-brand bg-surface-raised shadow-raised"
                  : "border-line-brand bg-canvas/70 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-raised"
              }`}
            >
              <span className={`flex items-center justify-between text-caption font-bold uppercase tracking-[0.16em] ${selected ? "text-brand" : "text-grey-faint"}`}>
                <span>{phase.range}</span>
                <ChevronRight size={15} aria-hidden="true" />
              </span>
              <span className="mt-3 block font-display text-[1.1rem] font-semibold leading-tight text-ink">{phase.label}</span>
              <span className="mt-1.5 block text-small leading-snug text-grey-muted">{phase.copy}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepList({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  return (
    <ol className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-5">
      {STEPS.map((step, index) => {
        const selected = active === index;
        const Icon = step.icon;
        return (
          <li key={step.label}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={selected ? "step" : undefined}
              className={`group flex min-h-[62px] w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-all duration-(--duration-base) ease-(--ease-out-quart) ${
                selected
                  ? "border-brand bg-brand-soft shadow-soft"
                  : "border-line bg-surface-raised hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft"
              }`}
            >
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${selected ? "bg-brand text-on-dark" : "bg-grey-light text-brand"}`}>
                <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={`block text-[0.68rem] font-bold uppercase tracking-[0.13em] ${selected ? "text-brand" : "text-grey-faint"}`}>{String(index + 1).padStart(2, "0")}</span>
                <span className={`mt-0.5 block truncate text-small font-semibold ${selected ? "text-ink" : "text-grey-dark"}`}>{step.label}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StageVisual({ stepIndex }: { stepIndex: number }) {
  const step = STEPS[stepIndex];
  const Icon = step.icon;
  return (
    <div className="services-stage-scene relative min-h-[340px] overflow-hidden rounded-sheet bg-brand-tint p-5 sm:min-h-[400px] md:p-8">
      <div className="services-stage-photo absolute inset-0" aria-hidden="true">
        <img src="/services/services-spotlight.png" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="services-stage-overlay absolute inset-0" aria-hidden="true" />
      <div className="services-stage-ring services-stage-ring-one absolute rounded-full border border-on-dark/30" aria-hidden="true" />
      <div className="services-stage-ring services-stage-ring-two absolute rounded-full border border-brand-bright/55" aria-hidden="true" />
      <div className="services-stage-kit absolute left-1/2 top-1/2 w-[72%] max-w-[285px] -translate-x-1/2 -translate-y-1/2">
        <div className="services-stage-kit-inner rounded-sheet border border-on-dark/40 bg-ink/85 p-5 text-on-dark shadow-overlay backdrop-blur-md sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-bright text-ink">
              <Icon size={22} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <span className="text-caption font-semibold uppercase tracking-[0.16em] text-on-dark-accent">Step {String(stepIndex + 1).padStart(2, "0")}</span>
          </div>
          <p className="mt-6 font-display text-[1.5rem] font-semibold leading-tight">{step.label}</p>
          <div className="mt-5 h-px bg-on-dark/20" />
          <div className="mt-4 flex items-center justify-between gap-3 text-caption text-on-dark-muted">
            <span>Medville handoff</span>
            <span className="flex items-center gap-1.5 text-on-dark-brand"><Check size={14} strokeWidth={2.4} /> In progress</span>
          </div>
        </div>
      </div>
      <div className="services-stage-chip absolute bottom-5 left-5 rounded-full bg-surface-raised px-3.5 py-2 text-caption font-semibold text-ink shadow-pill sm:bottom-7 sm:left-7">
        Your part: a quick answer
      </div>
    </div>
  );
}

function JourneyBoard() {
  const reduced = prefersReducedMotion();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [inView, setInView] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || reduced || !inView) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % STEPS.length), 4200);
    return () => window.clearInterval(timer);
  }, [playing, reduced, inView]);

  const activePhase = STEPS[active].phase;
  const step = STEPS[active];

  const selectStep = (index: number) => {
    setActive(index);
    if (!reduced) setPlaying(false);
  };

  return (
    <div ref={boardRef} className="rounded-sheet border border-line-brand bg-surface-raised p-4 shadow-overlay sm:p-6 md:p-8">
      <div className="grid items-center gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-12">
        <div key={`visual-${active}`} className="services-stage-swap order-2 lg:order-1">
          <StageVisual stepIndex={active} />
        </div>
        <div className="order-1 lg:order-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="m-0 text-caption font-bold uppercase tracking-[0.18em] text-brand">Step {String(active + 1).padStart(2, "0")} of 10</p>
              <p className="mt-2 text-small font-semibold text-grey-muted">{PHASES[activePhase].label}</p>
            </div>
            {!reduced && (
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "Pause the journey" : "Play the journey"}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-soft px-4 text-caption font-semibold text-brand transition-colors duration-(--duration-base) hover:bg-brand-mint"
              >
                {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                {playing ? "Pause" : "Play"}
              </button>
            )}
          </div>
          <div key={`copy-${active}`} className="services-stage-swap mt-7">
            <h3 className="m-0 max-w-[12ch] font-display text-h2 font-bold leading-[1.06] text-ink">{step.label}</h3>
            <p className="mt-4 max-w-[34ch] text-body-lg leading-relaxed text-grey-dark">{step.caption}</p>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => selectStep((active + STEPS.length - 1) % STEPS.length)}
              aria-label="Previous step"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors duration-(--duration-base) hover:border-brand hover:text-brand"
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => selectStep((active + 1) % STEPS.length)}
              aria-label="Next step"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand text-on-dark transition-colors duration-(--duration-base) hover:bg-brand-hover"
            >
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <span className="ml-1 text-caption text-grey-muted">Select a step to see the handoff.</span>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-line-brand pt-7 md:mt-10 md:pt-8">
        <StepList active={active} onSelect={selectStep} />
      </div>
    </div>
  );
}

export default function Services() {
  usePageMeta(
    "Our Services | Medville Diabetes",
    "See the ten steps Medville handles from your first conversation to ongoing CGM supplies.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const journeyRef = useRef<HTMLDivElement | null>(null);
  const [activePhase, setActivePhase] = useState(0);

  const goToJourney = () => {
    journeyRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <div ref={revealRef}>
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.18} blur={46} size={480} duration="15s" className="-left-[180px] -top-[160px]" />
        <Blob tone="cyan" strength={0.16} blur={48} size={520} duration="18s" reverse className="-bottom-[220px] -right-[180px]" />
        <Grain opacity={0.045} />
        <Container wide className="relative grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:py-24">
          <div className="relative z-10">
            <div className="rise-in inline-flex items-center gap-2 rounded-full border border-brand/25 bg-canvas/75 px-4 py-1.5 text-caption font-semibold uppercase tracking-[0.1em] text-brand">
              <span className="h-2 w-2 rounded-full bg-cta" aria-hidden="true" />
              The Medville process
            </div>
            <h1 className="rise-in mt-5 max-w-[14ch] font-display text-display font-bold leading-[1.03] text-ink" style={{ "--rise-delay": "90ms" } as React.CSSProperties}>
              From first conversation to <span className="text-teal">ongoing supplies.</span>
            </h1>
            <p className="rise-in mt-5 max-w-[41ch] text-body-lg leading-relaxed text-grey-dark" style={{ "--rise-delay": "160ms" } as React.CSSProperties}>
              We handle the steps between your doctor, your insurance, and your door.
            </p>
            <div className="rise-in mt-8 flex flex-wrap items-center gap-3.5" style={{ "--rise-delay": "240ms" } as React.CSSProperties}>
              <Button to="/qualify" variant="cta" className="min-h-[52px] px-8">
                Check if you Qualify
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </Button>
              <Button variant="ghost" className="min-h-[52px]" onClick={goToJourney}>
                See the 10 steps
              </Button>
            </div>
            <div className="rise-in mt-5 flex flex-wrap gap-x-5 gap-y-2 text-caption font-medium text-grey-muted" style={{ "--rise-delay": "320ms" } as React.CSSProperties}>
              <span className="inline-flex items-center gap-2"><Check size={14} className="text-brand" strokeWidth={2.5} aria-hidden="true" /> No cost to check</span>
              <span className="inline-flex items-center gap-2"><Check size={14} className="text-brand" strokeWidth={2.5} aria-hidden="true" /> One team throughout</span>
            </div>
          </div>
          <div className="rise-in relative z-10" style={{ "--rise-delay": "180ms" } as React.CSSProperties}>
            <HeroDepthVisual />
          </div>
        </Container>
      </section>

      <section ref={journeyRef} className="scroll-mt-24 bg-grey-light py-16 md:py-24">
        <Container wide>
          <div data-reveal={0} className="mx-auto max-w-[700px] text-center">
            <Eyebrow>One clear path</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">See the whole process in seconds.</h2>
            <p className="mx-auto mt-3 max-w-[44ch] text-body leading-relaxed text-grey-dark">Four simple phases. Ten steps. We carry the handoffs.</p>
          </div>
          <div data-reveal={100} className="mt-10">
            <PhaseTrack active={activePhase} onSelect={(index) => { setActivePhase(index); goToJourney(); }} />
          </div>
          <div data-reveal={180} className="mt-8 rounded-card border border-line-brand bg-surface-raised px-5 py-4 shadow-soft md:flex md:items-center md:justify-between md:gap-6 md:px-7">
            <div>
              <p className="m-0 font-display text-[1.1rem] font-semibold text-ink">{PHASES[activePhase].title}</p>
              <p className="mt-1 text-small text-grey-muted">{PHASES[activePhase].copy}</p>
            </div>
            <span className="mt-3 inline-flex items-center gap-2 text-caption font-semibold text-brand md:mt-0"><span className="h-2 w-2 rounded-full bg-brand-bright" aria-hidden="true" /> Medville manages this phase</span>
          </div>
        </Container>
      </section>

      <section className="bg-wash relative overflow-hidden py-16 md:py-24">
        <Blob tone="cyan" strength={0.13} blur={40} size={420} duration="17s" className="-right-[180px] top-[8%]" />
        <Container wide className="relative">
          <div data-reveal={0} className="mx-auto max-w-[700px] text-center">
            <Eyebrow>Watch the handoff</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">You do not have to chase every step.</h2>
            <p className="mx-auto mt-3 max-w-[42ch] text-body leading-relaxed text-grey-dark">Tap a step. We will show you what Medville handles next.</p>
          </div>
          <div data-reveal={120} className="mt-10">
            <JourneyBoard />
          </div>
        </Container>
      </section>

      <section className="bg-why-band relative overflow-hidden py-16 md:py-24">
        <Container>
          <div data-reveal={0} className="mx-auto max-w-[600px] text-center">
            <Eyebrow>What that means for you</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">You focus on your diabetes. We handle the process.</h2>
          </div>
          <div className="mt-11 grid gap-4 md:grid-cols-3">
            {[
              { icon: Stethoscope, title: "Clinic contact", copy: "We confirm care and request the records needed." },
              { icon: ShieldCheck, title: "Insurance work", copy: "We check coverage and handle authorization." },
              { icon: Headphones, title: "Ongoing support", copy: "We answer questions and keep supplies moving." },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title} data-reveal={index * 100} className="rounded-card border border-line-brand bg-surface-raised p-6 shadow-soft md:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon size={20} strokeWidth={2.1} aria-hidden="true" /></span>
                  <h3 className="mt-5 font-display text-[1.08rem] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-small leading-relaxed text-grey-dark">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-cta-band relative overflow-hidden py-16 md:py-24">
        <Grain opacity={0.07} />
        <Container className="relative text-center">
          <h2 data-reveal={0} className="mx-auto max-w-[18ch] font-display text-h2 font-bold text-on-dark">Ready for step one?</h2>
          <p data-reveal={80} className="mx-auto mt-3 max-w-[38ch] text-body-lg leading-relaxed text-on-dark-muted">It starts with a short conversation.</p>
          <div data-reveal={160} className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Button to="/qualify" variant="on-band" className="min-h-[52px] px-8">
              Check if you Qualify
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Button>
            <Button to="/contact" variant="ghost-dark" className="min-h-[52px]">Contact Us</Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
