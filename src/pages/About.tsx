import { ArrowRight, Compass, Eye, MessageCircle, ShieldCheck, Star } from "lucide-react";
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
  },
  {
    icon: Eye,
    title: "Our Vision",
    body: "To create a better experience for people living with diabetes, where getting the right supplies and support feels simple, reliable, and stress-free. We want every person we serve to feel more confident in their care and have more time and freedom to focus on the life they want to live.",
  },
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
      {/* hero: product photograph on the left, copy on the right */}
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="green" strength={0.2} blur={40} size={440} className="-right-[120px] -top-[140px]" />
        <Grain opacity={0.05} />
        <Container wide className="relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="rise-in order-2 lg:order-1" style={{ "--rise-delay": "160ms" } as React.CSSProperties}>
            <img
              src="/about/about-hero.webp"
              alt="A phone shows a glucose reading of 6.2 next to a sensor and a monitor box."
              className="floaty w-full rounded-lg object-cover object-[78%_center] shadow-soft"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="rise-in m-0">
              <Eyebrow>About Us</Eyebrow>
            </p>
            <h1
              className="rise-in mt-3 max-w-[22ch] font-display text-h1 font-bold text-ink"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              Your best interest is our first concern.
            </h1>
            <p
              className="rise-in mt-5 max-w-[52ch] text-body-lg leading-relaxed text-grey-dark"
              style={{ "--rise-delay": "160ms" } as React.CSSProperties}
            >
              Medville Diabetes supplies continuous glucose monitors from the leading
              brands to people living with diabetes. We handle the paperwork, we
              deliver your supplies to your door, and we answer your questions with
              real people, in plain language.
            </p>
          </div>
        </Container>
      </section>

      {/* mission and vision over the landscape photograph */}
      <section className="relative overflow-hidden">
        <img
          src="/about/mission-bg.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden="true" className="bg-overlay-wash absolute inset-0" />
        <Container wide className="relative py-16 md:py-24">
          <div data-reveal={0} className="max-w-[560px]">
            <Eyebrow>What guides us</Eyebrow>
            <h2 className="mt-3 font-display text-h2 font-bold text-ink">
              Why we do this work
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {MISSION_VISION.map((item, index) => (
              <div
                key={item.title}
                data-reveal={140 + index * 140}
                className={`${index === 0 ? "reveal-left" : "reveal-right"} rounded-lg bg-surface-raised/95 p-8 shadow-overlay backdrop-blur-sm md:p-10`}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-green-soft text-green">
                  <item.icon size={22} strokeWidth={2} />
                </span>
                <h3 className="mt-5 font-display text-h3 font-bold text-ink">{item.title}</h3>
                <p className="mt-3 text-body leading-relaxed text-grey-dark">{item.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* the company story */}
      <section className="py-16 md:py-24">
        <Container wide className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div data-reveal={0} className="reveal-left lg:sticky lg:top-28">
            <img
              src="/about/about-family.webp"
              alt="A family stands together in a green landscape, with diabetes supplies in front of them."
              loading="lazy"
              className="w-full rounded-lg object-cover shadow-soft"
            />
            <p
              data-reveal={200}
              className="mt-6 rounded-lg border-l-4 border-green bg-green-tint px-6 py-5 font-display text-[1.15rem] font-semibold leading-snug text-green"
            >
              Reliable supplies. Dedicated support. More time for life.
            </p>
          </div>
          <div>
            <div data-reveal={80}>
              <Eyebrow>Who we are</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                About Medville Diabetes
              </h2>
            </div>
            {STORY.map((paragraph, index) => (
              <p
                key={index}
                data-reveal={160 + index * 110}
                className="mt-5 max-w-[62ch] text-body leading-relaxed text-grey-dark"
              >
                {paragraph}
              </p>
            ))}
          </div>
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
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-green-soft text-green">
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

      {/* dark green call to action band */}
      <section className="bg-green-band relative overflow-hidden py-16">
        <Grain opacity={0.07} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-25">
          <GlucoseWave variant="onDark" className="h-full" />
        </div>
        <Container className="relative">
          <h2 data-reveal={0} className="max-w-[24ch] font-display text-h2 font-bold text-on-dark">
            Ready to see your glucose clearly?
          </h2>
          <p data-reveal={80} className="mt-3 max-w-[52ch] text-body leading-relaxed text-on-dark-green">
            Check whether you qualify in under one minute. There is no cost to
            check, and our team will guide you through every step after that.
          </p>
          <div data-reveal={160}>
            <Button to="/qualify" variant="on-green" className="mt-7">
              Check if you Qualify
              <ArrowRight size={16} strokeWidth={2.2} />
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
