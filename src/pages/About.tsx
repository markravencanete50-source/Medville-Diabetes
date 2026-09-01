import {
  ArrowRight,
  ClipboardCheck,
  Compass,
  Eye,
  HeartHandshake,
  MessagesSquare,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import GlucoseWave from "../components/GlucoseWave";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useParallax, useReveal } from "../lib/useReveal";

/*
  About Us.

  Wording follows the client's website copy document of 2026-08-28: the hero,
  the mission and vision pair, the Backed by Medville story, the three
  promises and the closing call to action.

  Motion: the hero assembles line by line, the promise strip drops in, the
  mission and vision panels swing open from their outer edges, the story
  paragraphs settle one after another, the promise cards scale up into place, and the closing band resolves out of a blur. Photographs drift
  against the scroll.
*/

const MISSION_VISION = [
  {
    icon: Compass,
    title: "Our Mission",
    body: "Our mission is to make getting diabetes supplies easier, more dependable, and less stressful. We combine access to trusted products with clear communication and responsive support, helping people navigate the supply process without adding more unnecessary work to diabetes management.",
    image: "/about/mission-bg.webp",
    alt: "A family looks over green hills, with diabetes supplies and a plant in front.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    body: "Our vision is a diabetes supply experience that fits more naturally into everyday life, where people spend less time chasing answers, worrying about supplies, or trying to figure out what comes next. We want dependable access and helpful support to feel like the standard, giving the people we serve more time and confidence to focus on everything beyond managing diabetes.",
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
  "Medville Diabetes is part of Medville Medical Supply Distribution, a national medical supply company supporting care providers throughout the United States.",
  "Across the broader Medville network, we provide access to more than 35,000 medical products from over 300 manufacturers and support more than 6,000 care providers nationwide.",
  "Medville Diabetes brings that supply experience into a more focused service created around the needs of people managing diabetes. Because getting a CGM or keeping up with diabetes supplies comes with its own questions, insurance requirements, prescriptions, refills, and ongoing needs.",
  "Our goal is simple: make that process easier to navigate. With dependable products, clearer communication, and people available to help when questions come up, we want getting your supplies to feel like one less thing you have to manage.",
];

const PROMISES = [
  {
    icon: PackageCheck,
    title: "Dependable Supplies",
    body: "Getting the supplies you rely on should not feel uncertain. We work to provide dependable access to diabetes products and help make ongoing supply needs easier to manage.",
    image: "/about/value-leading-brands.webp",
    alt: "A FreeStyle Libre box and a Dexcom box with their sensors in front.",
  },
  {
    icon: MessagesSquare,
    title: "Clear Communication",
    body: "You should not have to chase down answers. We keep you informed and help explain what comes next throughout the supply process.",
    image: "/about/value-plain-answers.webp",
    alt: "A clipboard with three completed checks, next to a speech bubble and a small plant.",
  },
  {
    icon: PhoneCall,
    title: "Support When You Need It",
    body: "Questions happen. Our team is here to help you navigate supply-related questions, potential eligibility, and next steps without adding more confusion.",
    image: "/about/value-privacy.webp",
    alt: "A shield with a lock in front of a database and a cloud.",
  },
];

export default function About() {
  usePageMeta(metaFor("/about"));
  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        {/* hero: copy on the left, photograph bleeding off the right */}
        <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.14} blur={44} size={420} duration="22s" className="-left-[160px] -top-[150px]" />
          <Grain opacity={0.05} />

          <div className="relative">
            {/* From lg up the photograph fills the right half to the viewport
                edge, with its left side faded into the wash. Below lg it runs
                in the normal flow underneath the copy instead. */}
            <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden lg:block">
              <img
                src="/about/about-hero.webp"
                alt=""
                width={1536}
                height={1024}
                data-parallax="0.35"
                className="mask-fade-left h-full w-full object-cover object-right"
              />
            </div>

            <Container wide className="relative">
              <div className="grid lg:grid-cols-2">
                <div className="py-14 md:py-20 lg:py-24 lg:pr-10">
                  <span className="rise-in inline-flex items-center gap-2.5 rounded-full bg-brand-soft px-5 py-2.5 text-body font-semibold text-brand">
                    <HeartHandshake size={20} strokeWidth={2} />
                    About Medville Diabetes
                  </span>
                  <h1
                    className="rise-in mt-6 max-w-[19ch] font-display text-h1 font-bold leading-[1.08] text-ink"
                    style={{ "--rise-delay": "150ms" } as React.CSSProperties}
                  >
                    Making Diabetes Supply One Less Thing to Manage
                  </h1>
                  <div
                    className="rise-in mt-7 flex items-center gap-2"
                    style={{ "--rise-delay": "280ms" } as React.CSSProperties}
                    aria-hidden="true"
                  >
                    <span className="h-px w-20 bg-line-strong" />
                  </div>
                  <p
                    className="rise-in mt-7 max-w-[48ch] text-body-lg leading-relaxed text-grey-dark"
                    style={{ "--rise-delay": "400ms" } as React.CSSProperties}
                  >
                    Living with diabetes comes with enough routines, decisions, and
                    responsibilities. Getting the supplies you rely on should not
                    make your day more complicated.
                  </p>
                  <p
                    className="rise-in mt-4 max-w-[48ch] text-body-lg leading-relaxed text-grey-dark"
                    style={{ "--rise-delay": "540ms" } as React.CSSProperties}
                  >
                    Medville Diabetes brings the medical supply experience of Medville
                    into a service focused specifically on diabetes, helping make
                    access to CGMs and other diabetes supplies simpler and easier to
                    navigate.
                  </p>
                </div>
                <div />
              </div>

              <img
                src="/about/about-hero.webp"
                alt="An adult goes about a normal day at home while wearing a continuous glucose monitor."
                width={1536}
                height={1024}
                className="rise-in mb-14 h-auto w-full rounded-lg shadow-soft lg:hidden"
                style={{ "--rise-delay": "660ms" } as React.CSSProperties}
              />
            </Container>
          </div>

          <Container wide className="relative">
            <ul className="m-0 grid list-none grid-cols-1 gap-y-6 border-t border-line-brand p-0 py-8 sm:grid-cols-2 lg:grid-cols-4">
              {HERO_PROMISES.map((promise, index) => (
                <li
                  key={promise.lines[1]}
                  data-reveal={index * 170}
                  className={`reveal-drop flex items-center gap-3.5 lg:px-6 ${
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
            <div data-reveal={0} className="max-w-[600px]">
              <Eyebrow>Why we are here</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                Built Around What Makes Diabetes Care Easier
              </h2>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {MISSION_VISION.map((item, index) => (
                <div
                  key={item.title}
                  data-reveal={180 + index * 210}
                  className={`${
                    index === 0 ? "reveal-swing-left" : "reveal-swing-right"
                  } reveal-glacial group relative overflow-hidden rounded-lg shadow-soft`}
                >
                  <img
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    width={1536}
                    height={1024}
                    data-parallax="0.35"
                    className="absolute inset-0 h-full w-full object-cover"
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
              <Eyebrow>Backed by Medville</Eyebrow>
              <h2 className="mt-3 max-w-[22ch] font-display text-h2 font-bold text-ink">
                Medical Supply Experience With a Focus on Diabetes
              </h2>
            </div>
            <div className="mt-8 grid gap-x-14 gap-y-5 lg:grid-cols-2">
              {STORY.map((paragraph, index) => (
                <p
                  key={index}
                  data-reveal={160 + index * 160}
                  className="reveal-settle reveal-slow m-0 max-w-[62ch] text-body leading-relaxed text-grey-dark"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <p
              data-reveal={300}
              className="reveal-blur reveal-glacial mt-10 rounded-lg border-l-4 border-brand bg-surface-raised px-8 py-6 font-display text-h3 font-semibold leading-snug text-brand shadow-soft"
            >
              Reliable supplies. Dedicated support. More time for life.
            </p>
          </Container>
        </section>

        {/* three promises */}
        <section className="bg-grey-light py-14 md:py-20">
          <Container>
            <div data-reveal={0} className="mb-10 max-w-[560px]">
              <Eyebrow>Three promises</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                What You Can Expect From Us
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {PROMISES.map((promise, index) => (
                <div
                  key={promise.title}
                  data-reveal={index * 200}
                  className="reveal-zoom reveal-glacial group flex flex-col rounded-lg bg-surface-raised p-8 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <promise.icon size={22} strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 font-display text-h3 font-bold text-ink">{promise.title}</h3>
                  <p className="mt-3 text-small leading-relaxed text-grey-dark">{promise.body}</p>
                  <div className="mt-6 overflow-hidden rounded-md bg-grey-light">
                    <img
                      src={promise.image}
                      alt={promise.alt}
                      loading="lazy"
                      width={900}
                      height={720}
                      data-parallax="0.45"
                      className="aspect-[5/4] w-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* closing call to action */}
        <section className="bg-cta-band relative overflow-hidden py-16">
          <Grain opacity={0.07} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-25">
            <GlucoseWave variant="onDark" className="h-full" />
          </div>
          <Container className="relative">
            <h2
              data-reveal={0}
              className="reveal-push reveal-glacial max-w-[26ch] font-display text-h2 font-bold text-on-dark"
            >
              Ready to Make Getting Your Supplies Easier?
            </h2>
            <p
              data-reveal={220}
              className="reveal-settle mt-3 max-w-[56ch] text-body leading-relaxed text-on-dark-brand"
            >
              Start by checking your potential CGM eligibility and let us help you
              understand what comes next.
            </p>
            <div data-reveal={420} className="reveal-drop">
              <Button to="/qualify" variant="on-band" className="mt-7">
                Check My Eligibility
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </Container>
        </section>
      </div>
    </div>
  );
}
