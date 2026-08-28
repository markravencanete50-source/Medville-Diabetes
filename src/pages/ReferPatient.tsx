import {
  ArrowRight,
  Download,
  FileText,
  Mail,
  PhoneCall,
  PlayCircle,
  Send,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { useParallax, useReveal } from "../lib/useReveal";
import {
  EMAIL,
  EMAIL_HREF,
  PHONE_DISPLAY,
  PHONE_TEL,
  REFERRAL_PACKET_URL,
  REFERRAL_VIDEO_URL,
} from "../data/company";

/*
  Refer a Patient, for healthcare providers.

  Structure and wording follow section 13 of the client's website copy
  document of 2026-08-28.

  Two things on this page wait on the client. The referral packet PDF and the
  explainer video do not exist yet, so both are read from constants in
  data/company.ts. Until the packet is supplied the download buttons ask
  providers to request it by email, which is a working route rather than a
  link to a file that is not there; until the video is supplied its frame
  shows a placeholder panel. Setting either constant switches the page over
  with no other change.

  Motion: the hero assembles line by line, the three steps tilt up in
  sequence, the video frame unwipes from the left, the download panel pushes
  forward off the page, and the support band resolves out of a blur.
*/

const STEPS = [
  {
    icon: Download,
    title: "Download",
    body: "Download the referral form and requirements in one file.",
  },
  {
    icon: Send,
    title: "Complete & Send",
    body: "Complete the form and submit it with the requested documentation using the secure referral method provided.",
  },
  {
    icon: Stethoscope,
    title: "We Take It From Here",
    body: "Our team reviews the referral, contacts the patient, and follows up with your office if anything else is needed.",
  },
];

const PACKET_READY = REFERRAL_PACKET_URL !== "";
const PACKET_LABEL = PACKET_READY
  ? "Download Referral Form & Requirements"
  : "Request Referral Form & Requirements";
const PACKET_HREF = PACKET_READY
  ? REFERRAL_PACKET_URL
  : `${EMAIL_HREF}?subject=Referral%20form%20and%20requirements%20request`;

export default function ReferPatient() {
  usePageMeta(
    "Refer a Patient | Medville Diabetes",
    "Refer patients to Medville Diabetes for CGMs and diabetes supplies. Download the referral form and requirements and send your referral through our secure process.",
  );

  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        {/* HERO */}
        <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.2} blur={44} size={480} duration="20s" className="-left-[140px] -top-[160px]" />
          <Blob tone="cyan" strength={0.14} blur={46} size={460} duration="26s" reverse className="-bottom-[190px] -right-[120px]" />
          <Grain opacity={0.05} />
          <Container wide className="relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="rise-in m-0">
                <Eyebrow>For healthcare providers</Eyebrow>
              </p>
              <h1
                className="rise-in mt-3 max-w-[20ch] font-display text-h1 font-bold leading-[1.08] text-ink"
                style={{ "--rise-delay": "150ms" } as React.CSSProperties}
              >
                A Simpler Way to Refer Patients for Diabetes Supplies
              </h1>
              <p
                className="rise-in mt-5 max-w-[54ch] text-body-lg leading-relaxed text-grey-dark"
                style={{ "--rise-delay": "320ms" } as React.CSSProperties}
              >
                Send your patient to Medville Diabetes and we will help guide them
                through the supply process, from potential eligibility to next steps.
              </p>
              <div
                className="rise-in mt-8 flex flex-wrap items-center gap-3.5"
                style={{ "--rise-delay": "480ms" } as React.CSSProperties}
              >
                <Button href={PACKET_HREF} variant="cta" className="min-h-[50px] px-7">
                  {PACKET_LABEL}
                  <Download size={16} strokeWidth={2.2} />
                </Button>
                <Button to="/contact" variant="ghost" className="min-h-[50px]">
                  Contact Our Team
                </Button>
              </div>
              <p
                className="rise-in mt-4.5 flex items-start gap-2 text-caption text-grey-muted"
                style={{ "--rise-delay": "640ms" } as React.CSSProperties}
              >
                <Sparkles size={14} strokeWidth={2.2} className="mt-0.5 flex-none text-brand-bright" />
                Simple referral process. Clear follow-up. Support for your patient
                along the way.
              </p>
            </div>

            <div
              className="rise-in overflow-hidden rounded-[26px] shadow-soft"
              style={{ "--rise-delay": "380ms", "--rise-duration": "1400ms" } as React.CSSProperties}
            >
              {/*
                Placeholder photograph until the client supplies a provider
                image. The brief asks for a healthcare provider speaking with an
                adult patient during a routine visit.
              */}
              <img
                src="/services/journey/journey-stage-02-confirm.webp"
                alt="A care coordinator reviews a patient's records during a routine appointment."
                data-parallax="0.5"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </Container>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-grey-light py-16 md:py-24">
          <Container wide>
            <div data-reveal={0} className="max-w-[600px]">
              <Eyebrow>How referrals work</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                Refer in Three Simple Steps
              </h2>
            </div>
            <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  data-reveal={index * 200}
                  className="reveal-tilt reveal-slow flex flex-col rounded-lg bg-surface-raised p-8 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <step.icon size={22} strokeWidth={2} />
                  </span>
                  <p className="mt-5 text-caption font-bold tracking-[0.14em] text-brand-bright">
                    STEP {index + 1}
                  </p>
                  <h3 className="mt-1.5 font-display text-[1.15rem] font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-grey-dark">{step.body}</p>
                </div>
              ))}
            </div>
            <div data-reveal={640} className="reveal-drop mt-10">
              <Button href={PACKET_HREF} variant="cta" className="min-h-[50px] px-7">
                {PACKET_LABEL}
                <Download size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </Container>
        </section>

        {/* VIDEO EXPLANATION */}
        <section className="py-16 md:py-24">
          <Container className="max-w-[900px]">
            <div data-reveal={0} className="text-center">
              <Eyebrow>See how it works</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                Referral Process in Under a Minute
              </h2>
              <p className="mx-auto mt-3 max-w-[58ch] text-body leading-relaxed text-grey-dark">
                A quick walkthrough of how to refer a patient to Medville Diabetes and
                what happens after you submit the referral.
              </p>
            </div>

            <div className="mt-9 overflow-hidden rounded-[24px] bg-grey-light shadow-soft">
              <div data-reveal={200} className="reveal-wipe-left reveal-glacial">
              {REFERRAL_VIDEO_URL ? (
                <iframe
                  src={REFERRAL_VIDEO_URL}
                  title="How to refer a patient to Medville Diabetes"
                  allowFullScreen
                  className="aspect-video w-full border-0"
                />
              ) : (
                <div className="tint-product flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <PlayCircle size={46} strokeWidth={1.6} className="text-brand" aria-hidden="true" />
                  <p className="m-0 font-display text-body font-semibold text-ink">
                    The referral walkthrough video is on its way.
                  </p>
                  <p className="m-0 max-w-[46ch] text-small leading-relaxed text-grey-muted">
                    In the meantime, the three steps above cover the whole process, and
                    our team is available by phone or email.
                  </p>
                </div>
              )}
              </div>
            </div>
          </Container>
        </section>

        {/* DOWNLOAD CALL TO ACTION */}
        <section className="bg-why-band py-16 md:py-24">
          <Container wide>
            <div
              data-reveal={0}
              className="reveal-push reveal-glacial grid gap-9 rounded-[26px] bg-surface-raised p-8 shadow-soft md:p-12 lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div>
                <Eyebrow>Ready to refer?</Eyebrow>
                <h2 className="mt-3 font-display text-h2 font-bold text-ink">
                  Everything You Need in One Download
                </h2>
                <p className="mt-3 max-w-[52ch] text-body leading-relaxed text-grey-dark">
                  Get the Medville Diabetes referral form and requirements together in
                  one packet.
                </p>
                <Button href={PACKET_HREF} variant="cta" className="mt-7 min-h-[50px] px-7">
                  {PACKET_LABEL}
                  <Download size={16} strokeWidth={2.2} />
                </Button>
                <p className="mt-3.5 flex items-center gap-2 text-caption text-grey-muted">
                  <FileText size={14} strokeWidth={2} />
                  PDF • Printable • For healthcare provider use
                </p>
              </div>

              <div className="flex flex-col gap-5 rounded-lg bg-brand-tint p-7">
                <div>
                  <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">
                    Send completed referrals to
                  </p>
                  <a
                    href={EMAIL_HREF}
                    className="mt-1.5 inline-flex items-center gap-2 font-display text-body font-semibold text-brand"
                  >
                    <Mail size={17} strokeWidth={2} />
                    {EMAIL}
                  </a>
                </div>
                <div className="border-t border-brand-mint pt-5">
                  <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">
                    Questions?
                  </p>
                  <a
                    href={PHONE_TEL}
                    className="mt-1.5 inline-flex items-center gap-2 font-display text-body font-semibold text-brand"
                  >
                    <PhoneCall size={17} strokeWidth={2} />
                    Call {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* PROVIDER SUPPORT */}
        <section className="bg-cta-band relative overflow-hidden py-16">
          <Grain opacity={0.07} />
          <Container className="relative">
            <h2
              data-reveal={0}
              className="reveal-blur reveal-glacial m-0 max-w-[24ch] font-display text-h2 font-bold text-on-dark"
            >
              Need Help With a Referral?
            </h2>
            <p
              data-reveal={240}
              className="reveal-settle mt-3.5 max-w-[58ch] text-body leading-relaxed text-on-dark-brand"
            >
              Have a question before sending your referral or need help with an
              existing patient request? Our team is here to help.
            </p>
            <div data-reveal={440} className="reveal-drop">
              <Button to="/contact" variant="on-band" className="mt-7">
                Contact Our Team
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </Container>
        </section>
      </div>
    </div>
  );
}
