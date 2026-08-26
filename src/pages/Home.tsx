import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Headset, LockKeyhole, ArrowRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import ProductViewer from "../components/ProductViewer";
import ProductCard from "../components/ProductCard";
import GlucoseWave from "../components/GlucoseWave";
import { products } from "../data/products";
import { usePageMeta } from "../lib/usePageMeta";

export default function Home() {
  usePageMeta(
    "Medville Diabetes | Continuous Glucose Monitors",
    "Medville Diabetes supplies continuous glucose monitors from FreeStyle Libre and Dexcom. Check if you qualify for a CGM in under one minute."
  );
  const featured = products.filter((p) => p.featured);

  return (
    <>
      {/* ─── Hero: copy left, interactive product right ─── */}
      <section className="relative overflow-hidden">
        <GlucoseWave subtle className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-70" />
        <Container wide className="relative grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-20 lg:py-24">
          <div>
            <p className="rise-in text-caption font-semibold uppercase tracking-[0.22em] text-accent-deep" style={{ "--rise-delay": "0ms" } as React.CSSProperties}>
              Continuous Glucose Monitors
            </p>
            <h1 className="rise-in mt-4 max-w-[16ch] font-display text-display font-bold leading-[1.04] text-ink" style={{ "--rise-delay": "80ms" } as React.CSSProperties}>
              Know your glucose number, every minute of the day.
            </h1>
            <p className="rise-in mt-5 max-w-[52ch] text-body-lg leading-relaxed text-ink-muted" style={{ "--rise-delay": "160ms" } as React.CSSProperties}>
              Medville Diabetes supplies continuous glucose monitors from the
              leading brands, FreeStyle Libre and Dexcom. A small sensor tracks
              your glucose 24 hours a day, without routine finger sticks.
            </p>
            <div className="rise-in mt-8 flex flex-wrap items-center gap-3" style={{ "--rise-delay": "240ms" } as React.CSSProperties}>
              <Button to="/qualify" variant="cta">Check if you Qualify</Button>
              <Button to="/products" variant="ghost">
                Browse our products <ArrowRight size={16} />
              </Button>
            </div>
            <p className="rise-in mt-4 text-caption text-ink-subtle" style={{ "--rise-delay": "300ms" } as React.CSSProperties}>
              It takes less than one minute. There is no cost to check.
            </p>
          </div>

          <div className="rise-in" style={{ "--rise-delay": "200ms" } as React.CSSProperties}>
            <ProductViewer
              front="/products/libre-front.svg"
              back="/products/libre-back.svg"
              alt="A continuous glucose monitoring sensor"
            />
          </div>
        </Container>
      </section>

      {/* ─── Trust strip: dense band after the airy hero ─── */}
      <section className="border-y border-line bg-surface">
        <Container wide className="grid grid-cols-2 gap-x-6 gap-y-5 py-6 lg:grid-cols-4">
          <TrustItem icon={<ShieldCheck size={19} />} text="The leading CGM brands" />
          <TrustItem icon={<Truck size={19} />} text="Delivered to your door" />
          <TrustItem icon={<Headset size={19} />} text="Support from real people" />
          <TrustItem icon={<LockKeyhole size={19} />} text="Your information stays private" />
        </Container>
      </section>

      {/* ─── Featured products ─── */}
      <section className="py-16 md:py-20">
        <Container wide>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-h2 font-bold text-ink">Our most popular monitors</h2>
              <p className="mt-2 max-w-[52ch] text-body text-ink-muted">
                Every device below tracks your glucose day and night. Open a
                product to rotate it, zoom in, and read the details.
              </p>
            </div>
            <Link to="/products" className="inline-flex items-center gap-1.5 text-small font-semibold text-accent-deep hover:text-ink">
              View all products <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </Container>
      </section>

      {/* ─── Why CGM band with the wave motif ─── */}
      <section className="border-t border-line bg-surface py-16 md:py-20">
        <Container>
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <h2 className="font-display text-h2 font-bold text-ink">
                Why people choose continuous monitoring
              </h2>
              <ul className="mt-6 space-y-5">
                <WhyItem
                  title="See your level and where it is heading"
                  body="A continuous glucose monitor shows your current number and the direction it is moving, at any time of day or night."
                />
                <WhyItem
                  title="Spend more time in your target range"
                  body="Watching your trends helps you keep your glucose inside your target range, which may help lower your A1C over time."
                />
                <WhyItem
                  title="Share your readings with people you trust"
                  body="You can share your data with family members, caregivers, and your care team, so the people around you can help."
                />
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-surface-raised p-6 shadow-raised">
              <div className="flex items-center justify-between">
                <p className="text-caption font-semibold uppercase tracking-[0.18em] text-accent-deep">Your glucose, all day</p>
                <p className="text-caption text-ink-subtle">Target range shown in blue</p>
              </div>
              <GlucoseWave className="mt-4 h-44" />
              <div className="mt-4 flex items-center justify-between text-caption text-ink-subtle">
                <span>Morning</span><span>Midday</span><span>Evening</span><span>Night</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── Qualify band ─── */}
      <section className="bg-ink py-16 text-on-dark md:py-20">
        <Container className="grid items-center gap-8 md:grid-cols-[1.2fr_auto]">
          <div>
            <h2 className="font-display text-h2 font-bold">Check if you qualify for a CGM.</h2>
            <p className="mt-3 max-w-[56ch] text-body leading-relaxed text-on-dark-muted">
              Answer a few short questions and our team will review your
              information. It takes less than one minute, and there is no cost
              to check.
            </p>
          </div>
          <Button to="/qualify" variant="cta" className="justify-self-start md:justify-self-end">
            Check if you Qualify
          </Button>
        </Container>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 md:py-20">
        <Container>
          <h2 className="font-display text-h2 font-bold text-ink">Common questions</h2>
          <div className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
            <Faq q="What is a continuous glucose monitor?">
              A continuous glucose monitor, often called a CGM, is a small
              sensor worn on your body. It measures your glucose around the
              clock and sends the readings to your phone or to a reader.
            </Faq>
            <Faq q="Do I still need finger sticks?">
              Most of the systems we supply do not require routine finger
              sticks. Some situations, such as symptoms that do not match the
              reading, may still call for one. Your care team can advise you.
            </Faq>
            <Faq q="How do I find out if I qualify?">
              Fill out our short form. It asks for your contact details and one
              question about your insulin use. Our team reviews your answers
              and contacts you with the next steps.
            </Faq>
            <Faq q="Which brands do you supply?">
              We supply the leading continuous glucose monitoring brands,
              including the FreeStyle Libre family and the Dexcom family.
            </Faq>
          </div>
        </Container>
      </section>
    </>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        {icon}
      </span>
      <p className="text-small font-medium text-ink">{text}</p>
    </div>
  );
}

function WhyItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-accent" aria-hidden="true" />
      <div>
        <h3 className="font-display text-body font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-small leading-relaxed text-ink-muted">{body}</p>
      </div>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-5">
      <h3 className="font-display text-body font-semibold text-ink">{q}</h3>
      <p className="mt-2 text-small leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
