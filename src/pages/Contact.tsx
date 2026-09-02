import { ArrowRight, Phone, Mail, Clock, MapPin } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useReveal } from "../lib/useReveal";
import {
  ADDRESS_LINE_1,
  ADDRESS_LINE_2,
  EMAIL,
  EMAIL_HREF,
  HOURS_LONG,
  PHONE_DISPLAY,
  PHONE_TEL,
} from "../data/company";

/*
  Deliberate decision: no free-text contact form on this page.
  A general message box invites visitors to type medical details, which would
  put unplanned health information into the contact pipeline. Phone and email
  keep that channel controlled. See CLAUDE.md before changing this.

  Layout: the heading sits on the navy hero and the four detail cards hang
  over its lower edge onto the light canvas, so the cards read as the
  thing the page is for. The eligibility panel below them is the one navy
  block on the light ground.

  Motion: the four detail cards arrive from alternating sides, and the
  eligibility panel resolves out of a blur behind them.
*/
export default function Contact() {
  usePageMeta(metaFor("/contact"));
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.28} blur={42} size={420} duration="20s" className="-left-[130px] -top-[120px]" />
        <Grain opacity={0.06} />
        <Container className="relative max-w-3xl pb-24 pt-14 md:pb-28 md:pt-20">
          <p className="rise-in m-0">
            <Eyebrow onDark>Contact us</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 font-display text-h1 font-bold text-on-dark"
            style={{ "--rise-delay": "150ms" } as React.CSSProperties}
          >
            Need Help? Start Here.
          </h1>
          <p
            className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-on-dark-brand"
            style={{ "--rise-delay": "320ms" } as React.CSSProperties}
          >
            Have a question about a product, your eligibility submission, supplies, or
            next steps? Reach out to the Medville Diabetes team and we will help point
            you in the right direction.
          </p>
        </Container>
      </section>

      {/* relative, so the cards paint over the hero they hang from */}
      <section className="relative pb-16 md:pb-24">
        <Container className="max-w-3xl">
          <div className="-mt-14 grid gap-4 sm:grid-cols-2 md:-mt-16">
            <ContactCard delay={0} motion="reveal-left" icon={<Phone size={19} />} label="Phone">
              <a href={PHONE_TEL} className="inline-block py-1 font-semibold text-ink transition-colors hover:text-brand">
                {PHONE_DISPLAY}
              </a>
            </ContactCard>
            <ContactCard delay={170} motion="reveal-right" icon={<Mail size={19} />} label="Email">
              <a
                href={EMAIL_HREF}
                className="inline-block py-1 font-semibold text-ink transition-colors hover:text-brand"
              >
                {EMAIL}
              </a>
            </ContactCard>
            <ContactCard delay={340} motion="reveal-left" icon={<Clock size={19} />} label="Business Hours">
              <p className="m-0 font-semibold text-ink">Monday to Friday 8AM to 5PM</p>
              <p className="m-0 text-small text-grey-dark">{HOURS_LONG}</p>
            </ContactCard>
            <ContactCard delay={510} motion="reveal-right" icon={<MapPin size={19} />} label="Address">
              <p className="m-0 font-semibold text-ink">{ADDRESS_LINE_1}</p>
              <p className="m-0 text-small text-grey-dark">{ADDRESS_LINE_2}</p>
            </ContactCard>
          </div>

          {/* navy eligibility panel */}
          <div
            data-reveal={0}
            className="bg-cta-band reveal-blur reveal-glacial relative mt-10 overflow-hidden rounded-[24px] p-7 sm:p-9"
          >
            <Grain opacity={0.07} />
            <div className="relative">
              <h2 className="m-0 max-w-[30ch] font-display text-h3 font-bold text-on-dark">
                Wondering whether your insurance may help cover a CGM?
              </h2>
              <p className="mt-3 max-w-[58ch] text-small leading-relaxed text-on-dark-brand">
                You do not have to figure it out on your own. Start with our short
                eligibility check.
              </p>
              <Button to="/qualify" variant="on-band" className="mt-5">
                Check My Eligibility
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

function ContactCard({ icon, label, delay, motion, children }: {
  icon: React.ReactNode;
  label: string;
  delay: number;
  motion: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-reveal={delay}
      className={`${motion} reveal-slow flex items-start gap-4 rounded-lg bg-surface-raised p-6 shadow-overlay transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover`}
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-ink text-brand-bright">
        {icon}
      </span>
      <div>
        <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">
          {label}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
