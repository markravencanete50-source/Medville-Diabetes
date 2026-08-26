import { ArrowRight, MessageCircle, ShieldCheck, Star } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import GlucoseWave from "../components/GlucoseWave";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

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
      {/* gradient hero with the banner photograph */}
      <section className="bg-wash relative overflow-hidden">
        <img
          src="/about/about-hero.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-[72%_center] md:block"
        />
        <div aria-hidden="true" className="bg-hero-fade absolute inset-0 hidden md:block" />
        <Blob tone="green" strength={0.2} blur={40} size={440} className="-left-[120px] -top-[140px]" />
        <Grain opacity={0.05} />
        <Container className="relative py-14 md:py-24">
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
            className="rise-in mt-5 max-w-[52ch] text-body-lg leading-relaxed text-grey-dark md:max-w-[46ch]"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            Medville Diabetes supplies continuous glucose monitors from the leading
            brands to people living with diabetes. We handle the paperwork, we
            deliver your supplies to your door, and we answer your questions with
            real people, in plain language.
          </p>
          <img
            src="/about/about-hero.webp"
            alt="A phone shows a glucose reading of 6.2 next to a sensor and a monitor box."
            loading="lazy"
            className="rise-in mt-8 w-full rounded-lg shadow-soft md:hidden"
            style={{ "--rise-delay": "240ms" } as React.CSSProperties}
          />
        </Container>
      </section>

      {/* value cards */}
      <section className="py-14 md:py-20">
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
