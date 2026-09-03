import { ArrowRight, Phone, Mail, Clock, MapPin, MessageSquareText, Headset, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import Container from "../components/Container";
import Button from "../components/Button";
import ContactForm from "../components/ContactForm";
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
  Layout: the heading sits on the navy hero and the four detail cards hang
  over its lower edge onto the light canvas. Below them the contact form
  sits in a raised card beside a short explanation of what happens to a
  message, and the eligibility panel closes the page as the one navy block
  on the light ground.

  The form, added 2026-09-03 on the client's instruction, has a free-text
  message box. A visitor may type health details into it, so everything it
  collects travels the same PHI pathway as the eligibility form: a POST of
  JSON to a covered Cloud Run function, into the same `leads` collection,
  read only through the audited dashboard. ContactForm.tsx carries the rules.

  Motion: the four detail cards arrive from alternating sides, the form's
  explanation settles up, the form card tilts in, its product tiles zoom in
  one after another, and the eligibility panel resolves out of a blur.
*/

const NEXT_STEPS = [
  {
    icon: MessageSquareText,
    title: "Tell us what you need",
    body: "Pick the products you are interested in and write a short message.",
  },
  {
    icon: Headset,
    title: "We read every message",
    body: "A member of our team reviews it during business hours.",
  },
  {
    icon: Phone,
    title: "We get back to you",
    body: "We reply by email, or by phone if you give us a number.",
  },
];
export default function Contact() {
  usePageMeta(metaFor("/contact"));
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      <section className="bg-wash relative overflow-hidden">
        <Blob tone="brand" strength={0.28} blur={42} size={420} duration="20s" className="-left-[130px] -top-[120px]" />
        <Grain opacity={0.06} />
        <Container className="relative max-w-3xl pb-24 pt-14 md:pb-28 md:pt-20">
          {/* A div, because Eyebrow is itself a paragraph. */}
          <div className="rise-in">
            <Eyebrow onDark>Contact us</Eyebrow>
          </div>
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
          {/* minmax(0, 1fr): a grid track defaults to a minimum of its
              content's width, and the email address is one word that is
              wider than a 375px phone allows, which pushed the card two
              pixels past the edge and gave the page a sideways scroll. */}
          <div className="-mt-14 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 md:-mt-16">
            <ContactCard delay={0} motion="reveal-left" icon={<Phone size={19} />} label="Phone">
              <a href={PHONE_TEL} className="inline-block py-1 font-semibold text-ink transition-colors hover:text-brand">
                {PHONE_DISPLAY}
              </a>
            </ContactCard>
            <ContactCard delay={170} motion="reveal-right" icon={<Mail size={19} />} label="Email">
              <a
                href={EMAIL_HREF}
                className="inline-block py-1 text-small font-semibold text-ink transition-colors [overflow-wrap:anywhere] hover:text-brand sm:text-body"
              >
                {EMAIL}
              </a>
            </ContactCard>
            {/* One line, as the client's copy document gives it. The card
                used to print the hours twice, once without the time zone and
                once with it. */}
            <ContactCard delay={340} motion="reveal-left" icon={<Clock size={19} />} label="Business Hours">
              <p className="m-0 font-semibold text-ink">{HOURS_LONG}</p>
            </ContactCard>
            <ContactCard delay={510} motion="reveal-right" icon={<MapPin size={19} />} label="Address">
              <p className="m-0 font-semibold text-ink">{ADDRESS_LINE_1}</p>
              <p className="m-0 text-small text-grey-dark">{ADDRESS_LINE_2}</p>
            </ContactCard>
          </div>

        </Container>
      </section>

      {/* the message form beside what happens to a message */}
      <section className="relative overflow-hidden bg-surface pb-16 pt-14 md:pb-24 md:pt-20">
        <Blob tone="brand" strength={0.18} blur={48} size={380} duration="24s" className="-right-[120px] top-[40%]" />
        <Container wide className="relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <div data-reveal={0} className="reveal-settle">
              <Eyebrow>Send a message</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                Tell Us How We Can Help
              </h2>
              <p className="mt-4 max-w-[50ch] text-body leading-relaxed text-grey-dark">
                Ask about a product, your supplies, or what to do next. Choose the
                products you are interested in so our team knows exactly what you are
                asking about.
              </p>
            </div>

            <ul className="mt-8 flex list-none flex-col gap-5 p-0">
              {NEXT_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  data-reveal={180 + index * 170}
                  className="reveal-left flex gap-4"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-ink text-brand-bright">
                    <step.icon size={20} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="m-0 text-caption font-bold tracking-[0.14em] text-brand">
                      STEP {index + 1}
                    </p>
                    <h3 className="m-0 mt-0.5 font-display text-body font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-small leading-relaxed text-grey-dark">{step.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div
              data-reveal={720}
              className="reveal-blur mt-8 flex items-start gap-3 rounded-lg border border-line-brand bg-surface-raised/80 p-5"
            >
              <LockKeyhole size={16} className="mt-0.5 flex-none text-brand" aria-hidden="true" />
              <p className="m-0 text-caption leading-relaxed text-grey-dark">
                Your message goes only to the Medville Diabetes team. It is handled
                according to our{" "}
                <Link
                  to="/privacy-policy"
                  className="inline-block py-1 font-semibold text-ink underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                . Please do not include medical record numbers or insurance
                identifiers in a message.
              </p>
            </div>
          </div>

          <div
            data-reveal={120}
            className="reveal-tilt reveal-slow relative rounded-[26px] bg-surface-raised p-5 shadow-overlay sm:p-9"
          >
            <ContactForm />
          </div>
        </Container>
      </section>

      <section className="relative pb-16 pt-10 md:pb-24 md:pt-14">
        <Container className="max-w-3xl">
          {/* navy eligibility panel */}
          <div
            data-reveal={0}
            className="bg-cta-band reveal-blur reveal-glacial relative overflow-hidden rounded-[24px] p-7 sm:p-9"
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
      <div className="min-w-0">
        <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">
          {label}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
