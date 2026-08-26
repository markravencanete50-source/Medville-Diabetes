import {
  ArrowRight,
  ClipboardCheck,
  Compass,
  Eye,
  HeartHandshake,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import GlucoseWave from "../components/GlucoseWave";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

const MISSION_VISION = [
  {
    icon: Compass,
    title: "Our Mission",
    body: "To make diabetes management easier by giving people dependable access to the supplies they need and support they can count on. We help simplify the process, from understanding coverage to getting supplies on time, so managing diabetes takes up less of everyday life.",
    image: "/about/mission-bg.webp",
    alt: "A family looks over brand hills, with diabetes supplies and a plant in front.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    body: "To create a better experience for people living with diabetes, where getting the right supplies and support feels simple, reliable, and stress-free. We want every person we serve to feel more confident in their care and have more time and freedom to focus on the life they want to live.",
    image: "/about/vision-bg.webp",
    alt: "A man walks a park path toward his family, with diabetes supplies and a shield in front.",
  },
];

const HERO_PROMISES = [
  { icon: ClipboardCheck, lines: ["We handle", "the paperwork"] },
  { icon: Truck, lines: ["Delivered", "to your door"] },
  { icon: MessagesSquare, lines: ["Real people,", "real support"] },
  { icon: ShieldCheck, lines: ["Trusted brands.", "Reliable care."] },
];

const STORY = [
  "Medville Diabetes is part of Medville Medical Supply Distribution, a national supplier providing more than 35,000 medical products and care solutions to healthcare providers across the country. We created Medville Diabetes with a more focused purpose: to make getting diabetes supplies simpler and more convenient for the people who rely on them every day.",
  "Living with diabetes already comes with enough to manage. Finding the right supplies, understanding insurance coverage, keeping track of orders, and knowing who to call for help should not add to that burden.",
  "That is why Medville Diabetes provides a service built specifically around the needs of people living with diabetes. From CGM supplies and coverage support to ongoing assistance, our team is here to make the process easier, more reliable, and more personal.",
  "Backed by the experience and nationwide reach of Medville Medical Supply Distribution, we bring the resources of an established medical supplier with the focused support diabetes patients deserve.",
];

const VALUES = [
  {
    icon: MessageCircle,
    title: "Plain answers",
    body: "Diabetes care comes with enough complexity. We explain your options in clear, simple language, and we tell you exactly what to expect.",
    image: "/about/value-plain-answers.webp",
    alt: "A clipboard with three completed checks, next to a speech bubble and a small plant.",
  },
  {
    icon: Star,
    title: "The leading brands",
    body: "We supply the continuous glucose monitoring systems people ask for by name, including the FreeStyle Libre family and the Dexcom family.",
    image: "/about/value-leading-brands.webp",
    alt: "A FreeStyle Libre box and a Dexcom box with their sensors in front.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by design",
    body: "Your information travels over an encrypted connection and is stored in a secure database. We use it only to serve you.",
    image: "/about/value-privacy.webp",
    alt: "A shield with a lock in front of a database and a cloud.",
  },
];

export default function About() {
  usePageMeta(
    "About Us | Medville Diabetes",
    "Medville Diabetes supplies continuous glucose monitors and support to people living with diabetes.",
  );
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      {/* hero: copy on the left, product photograph bleeding off the right */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.14} blur={44} size={420} className="-left-[160px] -top-[150px]" />
        <Grain opacity={0.05} />

        <div className="relative">
          {/* From lg up the photograph fills the right half to the viewport
              edge, with its left side faded into the wash. Below lg it runs
              in the normal flow underneath the copy instead. */}
          <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[52%] lg:block">
            <img
              src="/about/about-hero.webp"
              alt=""
              className="mask-fade-left h-full w-full object-cover object-right"
            />
          </div>

          <Container wide className="relative">
            <div className="grid lg:grid-cols-2">
              <div className="py-14 md:py-20 lg:py-24 lg:pr-10">
                <span className="rise-in inline-flex items-center gap-2.5 rounded-full bg-brand-soft px-5 py-2.5 text-body font-semibold text-brand">
                  <HeartHandshake size={20} strokeWidth={2} />
                  About Us
                </span>
                <h1
                  className="rise-in mt-6 max-w-[19ch] font-display text-h1 font-bold leading-[1.08] text-ink"
                  style={{ "--rise-delay": "80ms" } as React.CSSProperties}
                >
                  Your best interest is our{" "}
                  <span className="text-brand">first concern.</span>
                </h1>
                <div
                  className="rise-in mt-7 flex items-center gap-2"
                  style={{ "--rise-delay": "140ms" } as React.CSSProperties}
                  aria-hidden="true"
                >
                  <span className="h-px w-20 bg-line-strong" />
                  <span className="h-[7px] w-[7px] rounded-full bg-brand-bright" />
                </div>
                <p
                  className="rise-in mt-7 max-w-[46ch] text-body-lg leading-relaxed text-grey-dark"
                  style={{ "--rise-delay": "200ms" } as React.CSSProperties}
                >
                  Medville Diabetes supplies continuous glucose monitors from the
                  leading brands to people living with diabetes.
                </p>
                <p
                  className="rise-in mt-4 max-w-[46ch] text-body-lg leading-relaxed text-grey-dark"
                  style={{ "--rise-delay": "260ms" } as React.CSSProperties}
                >
                  We handle the paperwork, we deliver your supplies to your door,
                  and we answer your questions with real people, in plain language.
                </p>
              </div>
              <div />
            </div>

            <img
              src="/about/about-hero.webp"
              alt="A phone shows a glucose reading of 6.2 next to a sensor and a monitor box."
              className="rise-in mb-14 w-full rounded-lg shadow-soft lg:hidden"
              style={{ "--rise-delay": "320ms" } as React.CSSProperties}
            />
          </Container>
        </div>

        <Container wide className="relative">
          <ul className="m-0 grid list-none grid-cols-1 gap-y-6 border-t border-line-brand p-0 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {HERO_PROMISES.map((promise, index) => (
              <li
                key={promise.lines[1]}
                data-reveal={index * 110}
                className={`flex items-center gap-3.5 lg:px-6 ${
                  index === 0 ? "lg:pl-0" : "lg:border-l lg:border-line-brand"
                }`}
              >
                <promise.icon size={30} strokeWidth={1.7} className="flex-none text-brand" />
                <p className="m-0 text-body leading-snug text-grey-dark">
                  {promise.lines[0]}
                  <br />
                  {promise.lines[1]}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* mission and vision, each over its own photograph */}
      <section className="py-16 md:py-24">
        <Container wide>
          <div data-reveal={0} className="max-w-[560px]">
            <Eyebrow>What guides us</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              Why we do this work
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {MISSION_VISION.map((item, index) => (
              <div
                key={item.title}
                data-reveal={140 + index * 140}
                className={`${index === 0 ? "reveal-left" : "reveal-right"} reveal-slow group relative overflow-hidden rounded-lg shadow-soft`}
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-(--ease-out-quart) group-hover:scale-[1.04]"
                />
                <div className="relative m-4 mt-52 rounded-md bg-surface-raised/95 p-7 backdrop-blur-sm md:m-6 md:mt-60 md:p-8">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <item.icon size={22} strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 font-display text-h3 font-bold text-ink">{item.title}</h3>
                  <p className="mt-3 text-body leading-relaxed text-grey-dark">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* the company story */}
      <section className="bg-why-band py-16 md:py-24">
        <Container>
          <div data-reveal={0}>
            <Eyebrow>Who we are</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              About Medville Diabetes
            </h2>
          </div>
          <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
            {STORY.map((paragraph, index) => (
              <p
                key={index}
                data-reveal={120 + index * 110}
                className="m-0 max-w-[62ch] text-body leading-relaxed text-grey-dark"
              >
                {paragraph}
              </p>
            ))}
          </div>
          <p
            data-reveal={200}
            className="reveal-zoom mt-10 rounded-lg border-l-4 border-brand bg-surface-raised px-8 py-6 font-display text-h3 font-semibold leading-snug text-brand shadow-soft"
          >
            Reliable supplies. Dedicated support. More time for life.
          </p>
        </Container>
      </section>

      {/* value cards */}
      <section className="bg-grey-light py-14 md:py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            {VALUES.map((value, index) => (
              <div
                key={value.title}
                data-reveal={index * 120}
                className="group flex flex-col rounded-lg bg-surface-raised p-8 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <value.icon size={22} strokeWidth={2} />
                </span>
                <h2 className="mt-5 font-display text-h3 font-bold text-ink">{value.title}</h2>
                <p className="mt-3 text-small leading-relaxed text-grey-dark">{value.body}</p>
                <div
                  data-reveal={index * 120 + 200}
                  className="reveal-zoom reveal-slow mt-6 overflow-hidden rounded-md bg-grey-light"
                >
                  <img
                    src={value.image}
                    alt={value.alt}
                    loading="lazy"
                    className="aspect-[5/4] w-full object-cover transition-transform duration-[900ms] ease-(--ease-out-quart) group-hover:scale-[1.045]"
                  />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* dark brand call to action band */}
      <section className="bg-cta-band relative overflow-hidden py-16">
        <Grain opacity={0.07} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-25">
          <GlucoseWave variant="onDark" className="h-full" />
        </div>
        <Container className="relative">
          <h2 data-reveal={0} className="max-w-[24ch] font-display text-h2 font-bold text-on-dark">
            Ready to see your glucose clearly?
          </h2>
          <p data-reveal={80} className="mt-3 max-w-[52ch] text-body leading-relaxed text-on-dark-brand">
            Check whether you qualify in under one minute. There is no cost to
            check, and our team will guide you through every step after that.
          </p>
          <div data-reveal={160}>
            <Button to="/qualify" variant="on-band" className="mt-7">
              Check if you Qualify
              <ArrowRight size={16} strokeWidth={2.2} />
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
