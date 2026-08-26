import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ClipboardList,
  CircleHelp,
  Headset,
  Lock,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import GlucoseWave from "../components/GlucoseWave";
import ProductCard from "../components/ProductCard";
import QuickView from "../components/QuickView";
import Faq, { type FaqItem } from "../components/Faq";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import HeroViewer from "../components/HeroViewer";
import { products, getProduct } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";
import { useCountUp } from "../lib/useCountUp";

const FAQS: FaqItem[] = [
  {
    question: "What is a continuous glucose monitor?",
    answer:
      "A continuous glucose monitor, often called a CGM, is a small sensor worn on your body. It measures your glucose around the clock and sends the readings to your phone or to a reader.",
  },
  {
    question: "Do I still need finger sticks?",
    answer:
      "Most of the systems we supply do not require routine finger sticks. Some situations, such as symptoms that do not match the reading, may still call for one. Your care team can advise you.",
  },
  {
    question: "How do I find out if I qualify?",
    answer:
      "Fill out our short form. It asks for your contact details and one question about your insulin use. Our team reviews your answers and contacts you with the next steps.",
  },
  {
    question: "Which brands do you supply?",
    answer:
      "We supply the leading continuous glucose monitoring brands, including the FreeStyle Libre family and the Dexcom family.",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    tone: "green" as const,
    title: "Answer a short form",
    body: "Tell us your contact details and one question about your insulin use. It takes less than one minute.",
  },
  {
    icon: Headset,
    tone: "cyan" as const,
    title: "Our team reviews it",
    body: "Real people review your answers, handle the paperwork, and contact you with the next steps, usually within one business day.",
  },
  {
    icon: Truck,
    tone: "green" as const,
    title: "Delivered to your door",
    body: "Your monitor and supplies arrive at your home. We stay available for questions in plain language.",
  },
];

const WHY = [
  {
    title: "See your level and where it is heading",
    body: "A continuous glucose monitor shows your current number and the direction it is moving, at any time of day or night.",
  },
  {
    title: "Spend more time in your target range",
    body: "Watching your trends helps you keep your glucose inside your target range, which may help lower your A1C over time.",
  },
  {
    title: "Share your readings with people you trust",
    body: "You can share your data with family members, caregivers, and your care team, so the people around you can help.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "The form took me about a minute. A real person called me the next day and explained everything in plain words. My sensor arrived at my door that same week.",
    name: "Maria S.",
    place: "Texas",
  },
  {
    quote:
      "I stopped doing finger sticks every day. Now I look at my phone and I can see my number and where it is going. My daughter can see it too.",
    name: "Robert K.",
    place: "Florida",
  },
  {
    quote:
      "They handled the paperwork with my doctor. I did not have to chase anyone. When I had a question, I called and a person answered.",
    name: "Denise W.",
    place: "Ohio",
  },
];

const GUIDES = [
  {
    to: "/products",
    icon: CircleHelp,
    tint: "bg-[linear-gradient(120deg,#e6f3ec,#d2ead9)]",
    iconColour: "text-green",
    title: "What is a continuous glucose monitor?",
    body: "How a small sensor tracks your glucose around the clock, and what that means for your day.",
  },
  {
    to: "/products",
    icon: Route,
    tint: "bg-[linear-gradient(120deg,#e2f5fa,#d0edf5)]",
    iconColour: "text-accent-deep",
    title: "FreeStyle Libre or Dexcom: how to choose",
    body: "The two leading families compared in simple terms: wear time, alarms, and how readings reach your phone.",
  },
  {
    to: "/qualify",
    icon: ShieldCheck,
    tint: "bg-[linear-gradient(120deg,#e6f3ec,#e2f5fa)]",
    iconColour: "text-green",
    title: "Does my coverage include a CGM?",
    body: "What our team checks when they review your form, and what usually happens in the first phone call.",
  },
];

export default function Home() {
  usePageMeta(
    "Medville Diabetes | Continuous Glucose Monitors",
    "Medville Diabetes supplies continuous glucose monitors from FreeStyle Libre and Dexcom. Check if you qualify in less than one minute.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const { ref: statsRef, values: stats } = useCountUp({ a: 11, b: 2, c: 14, d: 1 });
  const [quickView, setQuickView] = useState<string | null>(null);

  const hero = getProduct("freestyle-libre-3");
  const featured = products.filter((p) => p.featured);

  return (
    <div ref={revealRef}>
      {/* HERO */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="green" strength={0.22} blur={40} size={460} duration="14s" className="-left-[120px] -top-[140px]" />
        <Blob tone="cyan" strength={0.18} blur={46} size={520} duration="18s" reverse className="-bottom-[160px] -right-[100px]" />
        <Grain opacity={0.05} />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-[150px] opacity-55">
          <GlucoseWave variant="hero" className="h-full" />
        </div>

        <Container wide className="relative grid items-center gap-10 py-14 md:py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="rise-in m-0 inline-flex items-center gap-2 rounded-full border border-green/25 bg-canvas/70 px-4 py-1.5 text-caption font-semibold uppercase tracking-[0.08em] text-green">
              <span className="h-[7px] w-[7px] rounded-full bg-green-bright" aria-hidden="true" />
              Continuous Glucose Monitors
            </p>
            <h1
              className="rise-in mt-5 max-w-[15ch] font-display text-display font-bold leading-[1.05] text-ink"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              Know your glucose, <span className="text-green">every minute</span> of the day.
            </h1>
            <p
              className="rise-in mt-5 max-w-[52ch] text-body-lg leading-relaxed text-grey-dark"
              style={{ "--rise-delay": "160ms" } as React.CSSProperties}
            >
              We supply continuous glucose monitors from the leading brands, FreeStyle
              Libre and Dexcom. A small sensor tracks your glucose 24 hours a day,
              without routine finger sticks.
            </p>
            <div
              className="rise-in mt-8 flex flex-wrap items-center gap-3.5"
              style={{ "--rise-delay": "240ms" } as React.CSSProperties}
            >
              <Button to="/qualify" variant="green" className="min-h-[50px] px-8">
                Check if you Qualify
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <Button to="/products" variant="ghost" className="min-h-[50px]">
                Browse our products
              </Button>
            </div>
            <p
              className="rise-in mt-4.5 flex items-center gap-2 text-caption text-grey-muted"
              style={{ "--rise-delay": "320ms" } as React.CSSProperties}
            >
              <Check size={14} strokeWidth={2.5} className="text-green-bright" />
              It takes less than one minute. There is no cost to check.
            </p>
          </div>

          {hero && (
            <div className="rise-in relative" style={{ "--rise-delay": "200ms" } as React.CSSProperties}>
              <HeroViewer product={hero} />
            </div>
          )}
        </Container>
      </section>

      {/* STATS BAND */}
      <section ref={statsRef as React.RefObject<HTMLElement>} className="bg-dark-band relative overflow-hidden">
        <Grain opacity={0.06} />
        <Container wide className="relative grid gap-8 py-11 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <Stat value={String(stats.a)} label="CGM products supplied" />
          <Stat value={String(stats.b)} label="Leading brands: Libre and Dexcom" />
          <Stat value={String(stats.c)} unit="days" label="Of wear from one sensor" />
          <Stat value={`< ${stats.d}`} unit="min" label="To check if you qualify" />
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-grey-light py-16 md:py-24">
        <Container wide>
          <div data-reveal={0} className="max-w-[640px]">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              Three simple steps to your monitor
            </h2>
            <p className="mt-3 text-body leading-relaxed text-grey-dark">
              We keep the process short and clear. You answer a few questions, and we
              take care of the rest.
            </p>
          </div>
          <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                data-reveal={index * 120}
                className="rounded-lg bg-surface-raised p-8 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-md ${
                    step.tone === "cyan" ? "bg-accent-soft text-accent-deep" : "bg-green-soft text-green"
                  }`}
                >
                  <step.icon size={22} strokeWidth={2} />
                </span>
                <p className="mt-5 text-caption font-bold tracking-[0.14em] text-green-bright">
                  STEP {index + 1}
                </p>
                <h3 className="mt-1.5 font-display text-[1.15rem] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-grey-dark">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="py-16 md:py-24">
        <Container wide>
          <div data-reveal={0} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Our Products</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                Our most popular monitors
              </h2>
              <p className="mt-2.5 max-w-[52ch] text-body leading-relaxed text-grey-dark">
                Real product photography, front and back. Hover a card to see the back
                of the device, or open a quick view.
              </p>
            </div>
            <Link to="/products" className="group inline-flex items-center gap-1.5 text-small font-semibold text-green">
              View all products
              <ArrowRight size={15} strokeWidth={2.2} className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="mt-9 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {featured.map((product, index) => (
              <ProductCard
                key={product.slug}
                product={product}
                delay={index * 120}
                onQuickView={setQuickView}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* WHY CGM */}
      <section className="bg-why-band relative overflow-hidden py-16 md:py-24">
        <Blob tone="cyan" strength={0.14} blur={40} size={420} className="-right-[140px] -top-[120px]" />
        <Container className="relative grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal={0}>
            <Eyebrow>Why continuous monitoring</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              See the whole picture, not one moment
            </h2>
            <ul className="mt-7 flex list-none flex-col gap-5.5 p-0">
              {WHY.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-surface-raised text-green shadow-[0_1px_3px_rgb(0_41_59/0.1)]">
                    <Check size={16} strokeWidth={2.4} />
                  </span>
                  <div>
                    <h3 className="m-0 font-display text-[1.02rem] font-semibold text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-grey-dark">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal={140} className="rounded-[24px] bg-surface-raised p-7 shadow-overlay">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-caption font-semibold uppercase tracking-[0.18em] text-green">
                Your glucose, all day
              </p>
              <p className="m-0 inline-flex items-center gap-1.5 text-caption text-grey-muted">
                <span className="h-2 w-3.5 rounded-[3px] bg-green-bright/25" aria-hidden="true" />
                Target range
              </p>
            </div>
            <GlucoseWave variant="chart" drawDelay="0.3s" className="mt-4.5 h-[190px]" />
            <div className="mt-4 flex items-center justify-between text-caption text-grey-muted">
              <span>Morning</span><span>Midday</span><span>Evening</span><span>Night</span>
            </div>
          </div>
        </Container>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 md:py-24">
        <Container wide>
          <div data-reveal={0} className="mx-auto max-w-[620px] text-center">
            <Eyebrow>What people say</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              Trusted by people living with diabetes
            </h2>
          </div>
          <div className="mt-10 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {TESTIMONIALS.map((t, index) => (
              <figure
                key={t.name}
                data-reveal={index * 120}
                className="m-0 flex flex-col gap-3.5 rounded-lg border border-line-green bg-surface-raised p-7"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-green-mint)" aria-hidden="true">
                  <path d="M11 7H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v3l4-4V9a2 2 0 0 0-2-2Z" />
                  <path d="M20 7h-5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v3l4-4V9a2 2 0 0 0-2-2Z" opacity="0.6" />
                </svg>
                <blockquote className="m-0 text-[0.95rem] leading-relaxed text-grey-dark">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-auto text-small font-semibold text-ink">
                  {t.name} <span className="font-medium text-grey-muted">— {t.place}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p data-reveal={0} className="mt-5 text-center text-[0.78rem] text-grey-faint">
            Representative experiences. Individual results and timelines vary.
          </p>
        </Container>
      </section>

      {/* QUALIFY BAND */}
      <section className="bg-green-band relative overflow-hidden">
        <Grain opacity={0.07} />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-[120px] opacity-25">
          <GlucoseWave variant="onDark" animate={false} className="h-full" />
        </div>
        <Container className="relative grid items-center gap-8 py-14 md:py-[88px] lg:grid-cols-2">
          <div data-reveal={0}>
            <h2 className="m-0 max-w-[22ch] font-display text-h2 font-bold text-on-dark">
              Check if you qualify for a CGM.
            </h2>
            <p className="mt-3.5 max-w-[56ch] text-[1.02rem] leading-relaxed text-on-dark-green">
              Answer a few short questions and our team will review your information.
              It takes less than one minute, and there is no cost to check.
            </p>
          </div>
          <div data-reveal={120} className="flex flex-col gap-3 lg:justify-self-start">
            <Button to="/qualify" variant="on-green" className="min-h-[54px] px-9 text-body">
              Check if you Qualify
              <ArrowRight size={17} strokeWidth={2.2} />
            </Button>
            <p className="m-0 flex items-center gap-2 text-caption text-on-dark-muted">
              <Lock size={14} strokeWidth={2} />
              Your information stays private and encrypted.
            </p>
          </div>
        </Container>
      </section>

      {/* RESOURCES */}
      <section className="bg-grey-light py-16 md:py-24">
        <Container wide>
          <div data-reveal={0}>
            <Eyebrow>Learn</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              Guides in plain English
            </h2>
          </div>
          <div className="mt-9 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {GUIDES.map((guide, index) => (
              <Link
                key={guide.title}
                to={guide.to}
                data-reveal={index * 120}
                className="flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-soft transition-transform duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1"
              >
                <div className={`flex h-[120px] items-center justify-center ${guide.tint}`}>
                  <guide.icon size={40} strokeWidth={1.6} className={guide.iconColour} />
                </div>
                <div className="px-6 pb-6 pt-5">
                  <h3 className="m-0 font-display text-[1.05rem] font-semibold text-ink">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-small leading-relaxed text-grey-dark">{guide.body}</p>
                  <span className="mt-3.5 inline-flex items-center gap-1.5 text-small font-semibold text-green">
                    Read the guide
                    <ArrowRight size={15} strokeWidth={2.2} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <Container className="max-w-[860px]">
          <div data-reveal={0} className="text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">Common questions</h2>
          </div>
          <div data-reveal={80}>
            <Faq items={FAQS} />
          </div>
        </Container>
      </section>

      <QuickView
        product={quickView ? getProduct(quickView) ?? null : null}
        onClose={() => setQuickView(null)}
      />
    </div>
  );
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="text-center">
      <p className="m-0 font-display text-[2.4rem] font-bold text-on-dark">
        {value}
        {unit && <span className="ml-1.5 text-[1.2rem] text-on-dark-accent">{unit}</span>}
      </p>
      <p className="mt-1 text-small font-medium text-on-dark-muted">{label}</p>
    </div>
  );
}
