import Container from "../components/Container";
import Button from "../components/Button";
import GlucoseWave from "../components/GlucoseWave";
import { usePageMeta } from "../lib/usePageMeta";

export default function About() {
  usePageMeta(
    "About Us | Medville Diabetes",
    "Medville Diabetes supplies continuous glucose monitors and support to people living with diabetes."
  );
  return (
    <>
      <section className="border-b border-line bg-surface py-14 md:py-18">
        <Container>
          <p className="text-caption font-semibold uppercase tracking-[0.22em] text-accent-deep">About Us</p>
          <h1 className="mt-3 max-w-[22ch] font-display text-h1 font-bold text-ink">
            Your best interest is our first concern.
          </h1>
          <p className="mt-5 max-w-[62ch] text-body-lg leading-relaxed text-ink-muted">
            Medville Diabetes supplies continuous glucose monitors from the
            leading brands to people living with diabetes. We handle the
            paperwork, we deliver your supplies to your door, and we answer
            your questions with real people, in plain language.
          </p>
        </Container>
      </section>

      <section className="py-14 md:py-18">
        <Container>
          <div className="grid gap-8 md:grid-cols-3">
            <ValueCard
              title="Plain answers"
              body="Diabetes care comes with enough complexity. We explain your options in clear, simple language, and we tell you exactly what to expect."
            />
            <ValueCard
              title="The leading brands"
              body="We supply the continuous glucose monitoring systems people ask for by name, including the FreeStyle Libre family and the Dexcom family."
            />
            <ValueCard
              title="Privacy by design"
              body="Your information travels over an encrypted connection and is stored in a secure database. We use it only to serve you."
            />
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-ink py-16 text-on-dark">
        <GlucoseWave subtle className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-40" />
        <Container className="relative">
          <h2 className="max-w-[24ch] font-display text-h2 font-bold">
            Ready to see your glucose clearly?
          </h2>
          <p className="mt-3 max-w-[52ch] text-body text-on-dark-muted">
            Check whether you qualify in under one minute. There is no cost to
            check, and our team will guide you through every step after that.
          </p>
          <Button to="/qualify" variant="cta" className="mt-7">Check if you Qualify</Button>
        </Container>
      </section>
    </>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised p-7 shadow-raised">
      <h2 className="font-display text-h3 font-bold text-ink">{title}</h2>
      <p className="mt-3 text-small leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
