import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Factory,
  Headset,
  Lock,
  type LucideIcon,
  Package,
  PhoneCall,
  Quote,
  Smartphone,
  Users,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import GlucoseWave from "../components/GlucoseWave";
import ProductCard from "../components/ProductCard";
import QuickView from "../components/QuickView";
import Faq from "../components/Faq";
import { FALLBACK_FAQS, type FaqItem } from "../data/faqs";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import HeroViewer from "../components/HeroViewer";
import { useFaqs, usePosts, useProduct, useProducts, useTestimonials } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useParallax, useReveal } from "../lib/useReveal";
import { useCountUp } from "../lib/useCountUp";
import { formatPostDate, readingMinutes } from "../data/blog";

/*
  Home page.

  Every section, and all of its wording, follows the client's website copy
  document of 2026-08-28. Two things on this page come from live data rather
  than from the list below:

  - The testimonials band renders only when the client has published a
    verified testimonial from the dashboard. The copy document marks the three
    quotes as placeholders to be replaced later, and a placeholder quote on a
    healthcare website would read as a real customer, so the section stays out
    of the page until a real one exists.
  - The FAQ list prefers the questions saved in the dashboard and falls back to
    the four in the copy document.

  Motion: no two sections arrive the same way. The hero assembles line by
  line, the numbers drop in, the step cards tilt up off the page, the products
  scale in, the monitoring benefits come in from the left while the photograph
  slides up through its frame, the call to action resolves out of a blur, the blog cards swing open,
  and the questions barely move at all. Photographs drift against the scroll
  through useParallax.
*/


const NUMBERS: { key: "years" | "products" | "makers" | "providers"; icon: LucideIcon; label: string }[] = [
  { key: "years", icon: Building2, label: "Years of medical supply experience" },
  { key: "products", icon: Package, label: "Products across the Medville network" },
  { key: "makers", icon: Factory, label: "Manufacturers represented" },
  { key: "providers", icon: Users, label: "Care providers supported nationwide" },
];

const STEPS = [
  {
    icon: ClipboardList,
    tone: "brand" as const,
    title: "Tell Us About Yourself",
    body: "Complete our short eligibility form with your basic information so we can get started.",
    image: "/home/step-1-short-form.webp",
    width: 900,
    height: 762,
    alt: "A person completes a short eligibility form on a smartphone at home.",
  },
  {
    icon: Headset,
    tone: "cyan" as const,
    title: "We Review Your Potential Eligibility",
    body: "Our team reviews the information you provide and checks available coverage information to help determine your potential eligibility.",
    image: "/home/step-2-review.webp",
    width: 900,
    height: 720,
    alt: "A Medville Diabetes team member reviews information at a computer.",
  },
  {
    icon: PhoneCall,
    tone: "brand" as const,
    title: "We Walk You Through What Comes Next",
    body: "We will contact you to explain what we found, answer your questions, and help you understand the next steps.",
    image: "/home/step-3-delivery.webp",
    width: 900,
    height: 720,
    alt: "A customer speaks with a Medville Diabetes representative by phone at home.",
  },
];

const WHY = [
  {
    icon: BarChart3,
    tone: "brand" as const,
    title: "See More Than a Single Reading",
    body: "A CGM provides glucose information throughout the day, giving you a broader view of how your glucose is changing over time.",
  },
  {
    icon: Smartphone,
    tone: "cyan" as const,
    title: "Check With Less Disruption",
    body: "Compatible CGM systems can provide glucose information on a smartphone, receiver, or connected device, helping reduce the need to stop what you are doing for every check.",
  },
  {
    icon: Users,
    tone: "brand" as const,
    title: "Understand Your Trends",
    body: "Seeing glucose patterns over time can give you and your healthcare provider more context around how food, activity, medication, sleep, and other factors relate to your glucose.",
  },
];

const CAPTIONS = [
  { icon: Bell, text: "Glucose information throughout your day." },
  { icon: BarChart3, text: "Trends you can see over time." },
  { icon: Smartphone, text: "Technology designed to fit into real life." },
];


export default function Home() {
  usePageMeta(metaFor("/"));

  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();
  const { ref: statsRef, values: stats } = useCountUp({
    years: 15,
    products: 35000,
    makers: 300,
    providers: 6000,
  });
  const [quickView, setQuickView] = useState<string | null>(null);

  const products = useProducts();
  const hero = useProduct("freestyle-libre-3");
  const featured = products.filter((p) => p.featured);

  const liveFaqs = useFaqs();
  const faqs: FaqItem[] = liveFaqs.length
    ? liveFaqs.map((item) => ({ question: item.question, answer: item.answer }))
    : FALLBACK_FAQS;

  /* Only verified, published testimonials reach the page. See the note above. */
  const testimonials = useTestimonials();

  /* The three newest published articles. The band is left out entirely when
     there are none: invented cards that look like articles but lead nowhere
     are worse than no section at all. */
  const posts = usePosts().slice(0, 3);

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        {/* HERO */}
        <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.22} blur={40} size={460} duration="18s" className="-left-[120px] -top-[140px]" />
          <Blob tone="cyan" strength={0.18} blur={46} size={520} duration="24s" reverse className="-bottom-[160px] -right-[100px]" />
          <Grain opacity={0.05} />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-[150px] opacity-55">
            <GlucoseWave variant="hero" className="h-full" />
          </div>

          <Container wide className="relative grid items-center gap-10 py-14 md:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="rise-in m-0 inline-flex items-center rounded-full border border-brand/25 bg-canvas/70 px-4 py-1.5 text-caption font-semibold uppercase tracking-[0.08em] text-brand">
                Diabetes Supplies Made Simpler
              </p>
              <h1
                className="rise-in mt-5 max-w-[15ch] font-display text-display font-bold leading-[1.05] text-ink"
                style={{ "--rise-delay": "140ms" } as React.CSSProperties}
              >
                Manage Less. <span className="text-teal">Live More.</span>
              </h1>
              <p
                className="rise-in mt-5 max-w-[52ch] text-body-lg leading-relaxed text-grey-dark"
                style={{ "--rise-delay": "300ms" } as React.CSSProperties}
              >
                Getting the diabetes supplies you rely on should not add more to your
                day. Medville Diabetes helps make access to CGMs and diabetes supplies
                simpler, with dependable support along the way.
              </p>
              <div
                className="rise-in mt-8 flex flex-wrap items-center gap-3.5"
                style={{ "--rise-delay": "460ms" } as React.CSSProperties}
              >
                <Button to="/qualify" variant="cta" className="min-h-[50px] px-8">
                  Check My Eligibility
                  <ArrowRight size={16} strokeWidth={2.2} />
                </Button>
                <Button to="/products" variant="ghost" className="min-h-[50px]">
                  Explore Products
                </Button>
              </div>
              <p
                className="rise-in mt-4.5 text-caption text-grey-muted"
                style={{ "--rise-delay": "620ms" } as React.CSSProperties}
              >
                Quick to get started. No obligation. Coverage and eligibility vary by plan.
              </p>
            </div>

            {hero && (
              <div
                className="rise-in relative"
                style={{ "--rise-delay": "380ms", "--rise-duration": "1400ms" } as React.CSSProperties}
              >
                <HeroViewer product={hero} />
              </div>
            )}
          </Container>
        </section>

        {/* NUMBERS BAND */}
        <section
          ref={statsRef as React.RefObject<HTMLElement>}
          className="bg-dark-band relative overflow-hidden"
        >
          <Grain opacity={0.06} />
          <Container
            wide
            className="relative grid gap-8 py-12 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]"
          >
            {NUMBERS.map((entry, index) => (
              <div
                key={entry.key}
                data-reveal={index * 170}
                className="reveal-drop text-center"
              >
                <entry.icon
                  size={22}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="mx-auto mb-3 text-on-dark-accent"
                />
                <p className="m-0 font-display text-[2.4rem] font-bold leading-none text-on-dark">
                  {stats[entry.key].toLocaleString("en-US")}
                  <span className="ml-0.5 text-[1.5rem] text-on-dark-accent">+</span>
                </p>
                <p className="mx-auto mt-2 max-w-[24ch] text-small font-medium text-on-dark-muted">
                  {entry.label}
                </p>
              </div>
            ))}
          </Container>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-grey-light py-16 md:py-24">
          <Container wide>
            <div data-reveal={0} className="max-w-[660px]">
              <Eyebrow>Getting started</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                A Simpler Way to Check Your CGM Options
              </h2>
              <p className="mt-3 text-body leading-relaxed text-grey-dark">
                Not sure what your insurance may cover or what comes next? Start with a
                few basic details and we will help you navigate the process.
              </p>
            </div>
            <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  data-reveal={index * 200}
                  className="reveal-tilt reveal-slow group flex flex-col rounded-lg bg-surface-raised p-8 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
                >
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-md ${
                      step.tone === "cyan" ? "bg-accent-soft text-accent-deep" : "bg-brand-soft text-brand"
                    }`}
                  >
                    <step.icon size={22} strokeWidth={2} />
                  </span>
                  <p className="mt-5 text-caption font-bold tracking-[0.14em] text-brand-bright">
                    STEP {index + 1}
                  </p>
                  <h3 className="mt-1.5 font-display text-[1.15rem] font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-grey-dark">{step.body}</p>
                  <div className="mt-6 overflow-hidden rounded-md bg-grey-light">
                    <img
                      src={step.image}
                      alt={step.alt}
                      loading="lazy"
                      /* The real size of the file. The frame below already
                         fixes the ratio, so this is for the browser rather
                         than for layout, but it costs nothing to be exact. */
                      width={step.width}
                      height={step.height}
                      data-parallax="0.5"
                      className="aspect-[5/4] w-full object-cover"
                    />
                  </div>
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
                <Eyebrow>Explore diabetes technology</Eyebrow>
                <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                  Find What Fits Your Routine
                </h2>
                <p className="mt-2.5 max-w-[58ch] text-body leading-relaxed text-grey-dark">
                  From continuous glucose monitors to insulin delivery technology,
                  explore trusted products designed to support diabetes management in
                  everyday life.
                </p>
              </div>
              <Link to="/products" className="group inline-flex items-center gap-1.5 py-1 text-small font-semibold text-brand">
                View All Products
                <ArrowRight size={15} strokeWidth={2.2} className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-9 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
              {featured.map((product, index) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  delay={index * 180}
                  motion="reveal-zoom reveal-slow"
                  onQuickView={setQuickView}
                />
              ))}
            </div>
          </Container>
        </section>

        {/* WHY CONTINUOUS MONITORING */}
        <section className="bg-why-band relative overflow-hidden py-16 md:py-24">
          <Blob tone="cyan" strength={0.14} blur={40} size={420} className="-right-[140px] -top-[120px]" />
          <Container className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div data-reveal={0}>
                <Eyebrow>Why CGM?</Eyebrow>
                <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                  More Insight. Less Interruption.
                </h2>
              </div>
              <ul className="mt-7 flex list-none flex-col gap-5.5 p-0">
                {WHY.map((item, index) => (
                  <li key={item.title} data-reveal={200 + index * 190} className="reveal-left flex gap-4">
                    <span
                      className={`flex h-11 w-11 flex-none items-center justify-center rounded-full shadow-[0_1px_3px_rgb(0_41_59/0.1)] ${
                        item.tone === "cyan"
                          ? "bg-accent-soft text-accent-deep"
                          : "bg-brand-soft text-brand"
                      }`}
                    >
                      <item.icon size={19} strokeWidth={2.1} />
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
            {/* The frame clips and the inner wrapper slides up through it.
                The photograph itself is left free for the parallax drift. */}
            <div
              data-reveal={160}
              className="reveal-curtain reveal-glacial rounded-[24px] shadow-soft"
            >
              <div>
                <img
                  src="/home/why-monitoring.webp"
                  alt="A woman wearing a sensor on her arm looks at her phone, which shows a glucose reading of 112 inside her target range."
                  loading="lazy"
                  width={1200}
                  height={936}
                  data-parallax="0.7"
                  className="h-auto w-full"
                />
              </div>
            </div>
          </Container>
          <Container className="relative">
            <div className="mt-12 grid gap-6 border-t border-line-brand pt-9 sm:grid-cols-3">
              {CAPTIONS.map((item, index) => (
                <div
                  key={item.text}
                  data-reveal={index * 180}
                  className="reveal-swift flex items-start gap-3.5"
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface-raised text-brand shadow-[0_1px_3px_rgb(0_41_59/0.1)]">
                    <item.icon size={18} strokeWidth={2.1} />
                  </span>
                  <p className="m-0 text-small leading-relaxed text-grey-dark">{item.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* TESTIMONIALS */}
        {testimonials.length > 0 && (
          <section className="py-16 md:py-24">
            <Container wide>
              <div data-reveal={0} className="mx-auto max-w-[640px] text-center">
                <Eyebrow>Real life experiences</Eyebrow>
                <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                  Do not take our word for it. Take theirs.
                </h2>
              </div>
              <div className="mt-10 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {testimonials.map((item, index) => (
                  <figure
                    key={item.id}
                    data-reveal={index * 180}
                    className="reveal-push m-0 flex flex-col gap-3.5 rounded-lg border border-line-brand bg-surface-raised p-7"
                  >
                    <Quote size={26} className="text-brand-mint" aria-hidden="true" />
                    <blockquote className="m-0 text-[0.95rem] leading-relaxed text-grey-dark">
                      {item.quote}
                    </blockquote>
                    <figcaption className="mt-auto text-small font-semibold text-ink">
                      {item.name}
                      {item.location && (
                        <span className="font-medium text-grey-muted"> — {item.location}</span>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p data-reveal={140} className="reveal-swift mx-auto mt-6 max-w-[70ch] text-center text-[0.78rem] leading-relaxed text-grey-faint">
                Individual experiences vary. Testimonials do not guarantee eligibility,
                insurance coverage, product availability, or results.
              </p>
            </Container>
          </section>
        )}

        {/* CALL TO ACTION BAND */}
        <section className="bg-cta-band relative overflow-hidden">
          <Grain opacity={0.07} />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-[120px] opacity-25">
            <GlucoseWave variant="onDark" animate={false} className="h-full" />
          </div>
          <Container className="relative grid items-center gap-8 py-14 md:py-[88px] lg:grid-cols-2">
            <div data-reveal={0} className="reveal-blur reveal-glacial">
              <h2 className="m-0 max-w-[24ch] font-display text-h2 font-bold text-on-dark">
                Wondering If Your Insurance May Help Cover a CGM?
              </h2>
              <p className="mt-3.5 max-w-[56ch] text-[1.02rem] leading-relaxed text-on-dark-brand">
                It only takes a few minutes to get started. Submit your information and
                our team can review your potential eligibility and help you understand
                what comes next.
              </p>
            </div>
            <div data-reveal={320} className="reveal-push flex flex-col gap-3 lg:justify-self-start">
              <Button to="/qualify" variant="on-band" className="min-h-[54px] px-9 text-body">
                Check My Eligibility
                <ArrowRight size={17} strokeWidth={2.2} />
              </Button>
              {/*
                Not a flex container. Text around an inline link would each
                become its own flex item, which breaks the sentence into
                columns instead of wrapping it.
              */}
              <p className="m-0 text-caption leading-relaxed text-on-dark-muted">
                <Lock
                  size={14}
                  strokeWidth={2}
                  className="mr-1.5 inline-block -translate-y-px align-middle"
                  aria-hidden="true"
                />
                Your information will be handled according to our{" "}
                <Link to="/privacy-policy" className="inline-block py-1 underline underline-offset-2 hover:text-on-dark">
                  Privacy Policy
                </Link>{" "}
                and applicable privacy requirements.
              </p>
            </div>
          </Container>
        </section>

        {/* BLOG */}
        {posts.length > 0 && (
          <section id="blog" className="bg-grey-light scroll-mt-24 py-16 md:py-24">
            <Container wide>
              <div data-reveal={0} className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-[620px]">
                  <Eyebrow>Learn</Eyebrow>
                  <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                    Simple Answers for Everyday Diabetes Questions
                  </h2>
                </div>
                <Link to="/blog" className="group inline-flex items-center gap-1.5 text-small font-semibold text-brand">
                  Read our blog
                  <ArrowRight size={15} strokeWidth={2.2} className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="mt-9 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {posts.map((post, index) => (
                  <Link
                    key={post.slug}
                    to={`/blog/${post.slug}`}
                    data-reveal={index * 190}
                    className={`${
                      index === 0 ? "reveal-swing-left" : index === 2 ? "reveal-swing-right" : "reveal-zoom"
                    } reveal-slow group flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover`}
                  >
                    {post.image && (
                      <div className="aspect-[3/2] overflow-hidden bg-grey-light">
                        <img
                          src={post.image}
                          alt={post.imageAlt}
                          loading="lazy"
                          data-parallax="0.45"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                      <p className="m-0 text-caption font-semibold uppercase tracking-[0.12em] text-brand">
                        {formatPostDate(post.publishedAt)}
                        <span className="ml-3 normal-case tracking-normal text-grey-muted">
                          {readingMinutes(post.body)} min read
                        </span>
                      </p>
                      <h3 className="mt-2 font-display text-[1.05rem] font-semibold leading-snug text-ink">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 text-small leading-relaxed text-grey-dark">{post.excerpt}</p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-small font-semibold text-brand">
                        Read the article
                        <ArrowRight size={15} strokeWidth={2.2} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* FAQ */}
        <section id="faqs" className="scroll-mt-24 py-16 md:py-24">
          <Container className="max-w-[860px]">
            <div data-reveal={0} className="text-center">
              <Eyebrow>Common questions</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                Questions? Start Here.
              </h2>
            </div>
            <div
              data-reveal={140}
              aria-hidden="true"
              className="reveal-expand mx-auto mt-7 h-px w-40 bg-line-strong"
            />
            <div data-reveal={220} className="reveal-settle reveal-slow">
              <Faq items={faqs} />
            </div>
          </Container>
        </section>
      </div>

      <QuickView
        product={quickView ? products.find((p) => p.slug === quickView) ?? null : null}
        onClose={() => setQuickView(null)}
      />
    </div>
  );
}
