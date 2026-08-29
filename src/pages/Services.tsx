import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { prefersReducedMotion } from "../lib/useReveal";

/*
  Our Services: the customer journey told as one scroll.

  A visitor reads four stages in seconds, then finds all ten steps our team
  completes inside those stages. The care cycle above them is the same route
  drawn once, so the shape of the process is clear before any detail arrives.

  The three.js cycle is lazy-loaded: nobody downloads it until the section
  approaches.
*/
const CareCycle3D = lazy(() => import("../components/CareCycle3D"));

const IMAGES = {
  mark: "/services/journey/journey-mark.webp",
  hero: "/services/journey/journey-hero.webp",
  start: "/services/journey/journey-stage-01-start.webp",
  confirm: "/services/journey/journey-stage-02-confirm.webp",
  approve: "/services/journey/journey-stage-03-approve.webp",
  deliver: "/services/journey/journey-stage-04-deliver.webp",
};

const STAGES = [
  {
    id: "stage-01",
    number: "01",
    title: "Start your request.",
    copy: "Tell us what you need. A short conversation is enough to begin.",
    label: "Your first conversation",
    icon: PhoneCall,
    image: IMAGES.start,
    alt: "A woman at home begins a phone conversation about her CGM supplies.",
    steps: [
      {
        number: "01",
        title: "Intake and sales",
        team: "We introduce the CGM option and collect your contact, insurance, and diabetes information.",
      },
    ],
  },
  {
    id: "stage-02",
    number: "02",
    title: "Confirm care and coverage.",
    copy: "We coordinate with your clinic and review the requirements that apply to your request.",
    label: "Clinic and eligibility",
    icon: Stethoscope,
    image: IMAGES.confirm,
    alt: "A care coordinator gathers medical records for a CGM supply request.",
    steps: [
      {
        number: "02",
        title: "Doctor verification and initial contact",
        team: "We contact your clinic to confirm your diabetes care and the key office details.",
      },
      {
        number: "03",
        title: "Qualification",
        team: "We evaluate clinical and insurance information against the applicable CGM coverage requirements.",
      },
    ],
  },
  {
    id: "stage-03",
    number: "03",
    title: "Gather details and secure approval.",
    copy: "We collect the right records, check the paperwork, and work through insurance authorization.",
    label: "Records and authorization",
    icon: ShieldCheck,
    image: IMAGES.approve,
    alt: "A coordinator verifies insurance information for continuous glucose monitor coverage.",
    steps: [
      {
        number: "04",
        title: "Documentation retrieval",
        team: "We request the medical records, prescription, and supporting documents from your provider.",
      },
      {
        number: "05",
        title: "Documentation review and compliance",
        team: "We check documents for accuracy, completion, and payer requirements.",
      },
      {
        number: "06",
        title: "Insurance verification and authorization",
        team: "We verify coverage and obtain required authorization or follow-up information.",
      },
    ],
  },
  {
    id: "stage-04",
    number: "04",
    title: "Receive supplies and ongoing support.",
    copy: "We prepare your order, deliver your supplies, and stay available for the next shipment.",
    label: "Delivery and resupply",
    icon: PackageCheck,
    image: IMAGES.deliver,
    alt: "A CGM supply kit is carefully prepared in a white box.",
    steps: [
      {
        number: "07",
        title: "Order processing",
        team: "Once requirements are met, we process the order for the appropriate CGM and supplies.",
      },
      {
        number: "08",
        title: "Shipping and delivery",
        team: "We ship the CGM directly to your home.",
      },
      {
        number: "09",
        title: "Customer service and support",
        team: "We help with questions, concerns, and equipment or supply issues.",
      },
      {
        number: "10",
        title: "Reorder and resupply",
        team: "We maintain eligibility and documentation while supporting ongoing resupply shipments.",
      },
    ],
  },
] as const;

/* The static panel the page shows while the care cycle chunk downloads. */
function CycleFallback() {
  return (
    <section className="journey-cycle journey-cycle-loading" aria-label="Loading the care cycle">
      <Container wide className="journey-cycle-grid">
        <div className="journey-cycle-copy">
          <p className="journey-eyebrow">The process at a glance</p>
          <h2>
            One simple process. <em>Every step coordinated.</em>
          </h2>
          <p className="journey-cycle-lede">
            Get a clear view of the journey, from your initial call through insurance
            coordination and ongoing supply deliveries.
          </p>
        </div>
        <div className="journey-cycle-canvas">
          <span>Loading care cycle</span>
        </div>
      </Container>
    </section>
  );
}

export default function Services() {
  usePageMeta(metaFor("/services"));

  const [revealed, setRevealed] = useState<Set<number>>(() => new Set<number>());
  const [motion, setMotion] = useState(false);
  const stages = useRef<(HTMLElement | null)[]>([]);

  /*
    Motion is opt-in. The hero entrance and the staged reveals only get their
    hidden starting state once this class lands, so a visitor who prefers
    reduced motion, or one whose script never runs, reads the page in full.

    This runs before the browser paints, so the hero is never shown in full
    and then snapped back to the start of its own animation.
  */
  useLayoutEffect(() => {
    if (!prefersReducedMotion()) setMotion(true);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        setRevealed((previous) => {
          const next = new Set(previous);
          visible.forEach((entry) => next.add(Number(entry.target.getAttribute("data-stage"))));
          return next.size === previous.size ? previous : next;
        });
      },
      /*
        The low threshold is the safety net. Thresholds are a share of the
        panel, not of the screen, and a tall stage on a short window can
        never reach a high one, which would leave that stage hidden.
      */
      { threshold: [0.05, 0.2, 0.45], rootMargin: "-14% 0px -24% 0px" },
    );
    stages.current.forEach((stage) => stage && observer.observe(stage));
    return () => observer.disconnect();
  }, []);

  const goToStage = (index: number) => {
    stages.current[index]?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className={`journey ${motion ? "journey-motion" : ""}`}>
      <section className="journey-hero bg-wash">
        <Blob tone="brand" strength={0.16} blur={48} size={500} className="-left-[205px] -top-[210px]" />
        <Blob tone="brand" strength={0.11} blur={48} size={520} className="-bottom-[250px] -right-[220px]" />
        <Grain />
        <Container wide className="journey-hero-grid">
          <div className="journey-hero-copy">
            <p className="journey-eyebrow">How the process works</p>
            <h1>
              From your first call to <em>every supply delivery.</em>
            </h1>
            <p className="journey-hero-lede">
              Medville handles the coordination with your doctor and insurance
              provider, making the process simple from start to finish.
            </p>
            <div className="journey-hero-actions">
              <Button variant="ghost" onClick={() => goToStage(0)}>
                See the journey
                <ArrowDown size={16} strokeWidth={2.2} />
              </Button>
            </div>
            <p className="journey-hero-note">Ten steps, made clear in four stages.</p>
          </div>

          <div className="journey-hero-photo">
            <img
              src={IMAGES.hero}
              alt="A woman at home checks her phone while wearing a continuous glucose monitor."
              width={1600}
              height={900}
            />
            <div className="journey-hero-card">
              <span>One coordinated team</span>
              <strong>We make the next step easier to see.</strong>
              <p>
                <Check size={14} strokeWidth={2.5} /> From call to resupply
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Suspense fallback={<CycleFallback />}>
        <CareCycle3D />
      </Suspense>

      <section className="journey-stages" aria-label="The four stages of the Medville care process">
        <Container wide>
          <div className="journey-stages-intro">
            <p className="journey-eyebrow">The detailed process</p>
            <h2>
              Four clear stages. <em>Every step, clearly explained.</em>
            </h2>
            <p className="journey-stages-lede">
              Each stage outlines the work our team completes to keep your CGM
              supplies moving forward.
            </p>
          </div>
        </Container>

        <div className="journey-sequence">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <article
                id={stage.id}
                key={stage.number}
                data-stage={index}
                ref={(node) => {
                  stages.current[index] = node;
                }}
                className={`journey-stage ${revealed.has(index) ? "is-revealed" : ""}`}
              >
                <Container wide className="journey-stage-grid">
                  <figure className="journey-stage-visual">
                    <div className="journey-stage-mask" aria-hidden="true" />
                    <img
                      src={stage.image}
                      alt={stage.alt}
                      loading="lazy"
                      decoding="async"
                      width={1100}
                      height={825}
                    />
                    <figcaption>
                      <span>Stage {stage.number}</span>
                      <strong>{stage.label}</strong>
                    </figcaption>
                  </figure>

                  <div className="journey-stage-copy">
                    <p className="journey-stage-kicker">
                      <span>
                        <Icon size={17} strokeWidth={2.1} />
                      </span>
                      Stage {stage.number} · {stage.label}
                    </p>
                    <h2>{stage.title}</h2>
                    <p className="journey-stage-summary">{stage.copy}</p>
                    <div className="journey-step-list">
                      <strong>Detailed steps in this stage</strong>
                      {stage.steps.map((step) => (
                        <div className="journey-step" key={step.number}>
                          <span>{step.number}</span>
                          <div>
                            <b>{step.title}</b>
                            <p>{step.team}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Container>
              </article>
            );
          })}
        </div>
      </section>

      <section className="journey-closing bg-why-band">
        <Grain />
        <Container className="journey-closing-content">
          <img src={IMAGES.mark} alt="" loading="lazy" className="journey-closing-mark" width={58} height={58} />
          <p className="journey-eyebrow">The full care path</p>
          <h2>
            We handle the process. <em>You focus on your health.</em>
          </h2>
          <p className="journey-closing-lede">
            Medville stays with your order from the first conversation through
            recurring deliveries.
          </p>
          <Button to="/qualify" variant="cta" className="min-h-[52px] px-8">
            Check My Eligibility
            <ArrowRight size={16} strokeWidth={2.2} />
          </Button>
        </Container>
      </section>
    </div>
  );
}
