import { editableItems } from "../content/editableItems";
import { usePageText } from "../lib/useSiteData";
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
import { metaFor } from "../data/pageMeta";
import { useParallax, useReveal } from "../lib/useReveal";
import { useElementVisible, useSectionVisible } from "../lib/useSiteData";
import { useCompanyDetails } from "../lib/useCompanyDetails";

/*
  Refer a Patient, for healthcare providers.

  Structure and wording follow section 13 of the client's website copy
  document of 2026-08-28.

  Two things on this page wait on the client. The referral packet PDF and the
  explainer video do not exist yet, so both are read from constants in
  data/company.ts. The download buttons say "Download" whatever the state,
  on the client's instruction of 2026-09-02; until the packet is supplied
  they open an email asking for it, which is a working route rather than a
  link to a file that is not there. Until the video is supplied its frame
  shows a placeholder panel. Setting either constant switches the page over
  with no other change.

  Motion: the hero assembles line by line, the three steps tilt up in
  sequence, the video frame draws in from the left, the download panel pushes
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

export default function ReferPatient() {
  const { EMAIL, EMAIL_HREF, PHONE_DISPLAY, PHONE_TEL } = useCompanyDetails();
  const { text } = usePageText("refer");
  const PACKET_LABEL = text("download.buttonLabel");
  const PACKET_HREF = text("download.packetUrl") || `${EMAIL_HREF}?subject=Referral%20form%20and%20requirements%20request`;
  const videoUrl = text("video.embedUrl");
  usePageMeta(metaFor("/refer-a-patient"));

  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();
  const showHero = useSectionVisible("refer", "hero");
  const showSteps = useSectionVisible("refer", "steps");
  const showVideo = useSectionVisible("refer", "video");
  const showDownload = useSectionVisible("refer", "download");
  const showSupport = useSectionVisible("refer", "support");
  const heroCopy = useElementVisible("refer", "hero", "copy");
  const heroButtons = useElementVisible("refer", "hero", "buttons");
  const heroNote = useElementVisible("refer", "hero", "note");
  const heroPicture = useElementVisible("refer", "hero", "picture");
  const stepsHeading = useElementVisible("refer", "steps", "heading");
  const stepCards = useElementVisible("refer", "steps", "cards");
  const stepsButton = useElementVisible("refer", "steps", "button");
  const videoCopy = useElementVisible("refer", "video", "copy");
  const videoPlayer = useElementVisible("refer", "video", "player");
  const downloadCopy = useElementVisible("refer", "download", "copy");
  const downloadButton = useElementVisible("refer", "download", "button");
  const downloadContact = useElementVisible("refer", "download", "contact");
  const supportCopy = useElementVisible("refer", "support", "copy");
  const supportButton = useElementVisible("refer", "support", "button");

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        {/* HERO */}
        {showHero && <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.2} blur={44} size={480} duration="20s" className="-left-[140px] -top-[160px]" />
          <Blob tone="cyan" strength={0.14} blur={46} size={460} duration="26s" reverse className="-bottom-[190px] -right-[120px]" />
          <Grain opacity={0.05} />
          <Container wide className="relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2 lg:gap-14">
            <div>
              {heroCopy && <>
              <p className="rise-in m-0">
                <Eyebrow onDark>{text("hero.for-healthcare-providers")}</Eyebrow>
              </p>
              <h1
                className="rise-in mt-3 max-w-[20ch] font-display text-h1 font-bold leading-[1.08] text-on-dark"
                style={{ "--rise-delay": "150ms" } as React.CSSProperties}
              >{text("hero.a-simpler-way-to-refer-patients-for-diabetes-supplies")}</h1>
              <p
                className="rise-in mt-5 max-w-[54ch] text-body-lg leading-relaxed text-on-dark-brand"
                style={{ "--rise-delay": "320ms" } as React.CSSProperties}
              >{text("hero.send-your-patient-to-medville-diabetes-and-we-will-help-guide-the")}</p>
              </>}
              {heroButtons && (
              <div
                className="rise-in mt-8 flex flex-wrap items-center gap-3.5"
                style={{ "--rise-delay": "480ms" } as React.CSSProperties}
              >
                <Button href={PACKET_HREF} variant="cta" className="min-h-[50px] px-7">
                  {PACKET_LABEL}
                  <Download size={16} strokeWidth={2.2} />
                </Button>
                <Button to="/contact" variant="ghost-dark" className="min-h-[50px]">{text("hero.contact-our-team")}</Button>
              </div>
              )}
              {heroNote && (
              <p
                className="rise-in mt-4.5 flex items-start gap-2 text-caption text-on-dark-muted"
                style={{ "--rise-delay": "640ms" } as React.CSSProperties}
              >
                <Sparkles size={14} strokeWidth={2.2} className="mt-0.5 flex-none text-brand-bright" />{text("hero.simple-referral-process-clear-follow-up-support-for-your-patient")}</p>
              )}
            </div>

            {heroPicture && (
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
                src={text("hero.section-photograph")}
                alt={text("hero.photograph-description")}
                width={1100}
                height={825}
                data-parallax="0.5"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            )}
          </Container>
        </section>}

        {/* HOW IT WORKS */}
        {showSteps && <section className="bg-grey-light py-16 md:py-24">
          <Container wide>
            {stepsHeading && (
            <div data-reveal={0} className="max-w-[600px]">
              <Eyebrow>{text("steps.how-referrals-work")}</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">{text("steps.refer-in-three-simple-steps")}</h2>
            </div>
            )}
            {stepCards && (
            <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {editableItems(STEPS, text, "steps.cards").map((step, index) => (
                <div
                  key={step.title}
                  data-reveal={index * 200}
                  className="reveal-tilt reveal-slow flex flex-col rounded-lg bg-surface-raised p-8 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <step.icon size={22} strokeWidth={2} />
                  </span>
                  <p className="mt-5 text-caption font-bold tracking-[0.14em] text-brand-bright">{text("steps.step")} {index + 1}
                  </p>
                  <h3 className="mt-1.5 font-display text-[1.15rem] font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-grey-dark">{step.body}</p>
                </div>
              ))}
            </div>
            )}
            {stepsButton && (
            <div data-reveal={640} className="reveal-drop mt-10">
              <Button href={PACKET_HREF} variant="cta" className="min-h-[50px] px-7">
                {PACKET_LABEL}
                <Download size={16} strokeWidth={2.2} />
              </Button>
            </div>
            )}
          </Container>
        </section>}

        {/* VIDEO EXPLANATION */}
        {showVideo && <section className="py-16 md:py-24">
          <Container className="max-w-[900px]">
            {videoCopy && (
            <div data-reveal={0} className="text-center">
              <Eyebrow>{text("video.see-how-it-works")}</Eyebrow>
              <h2 className="mt-3 font-display text-h2 font-bold text-ink">{text("video.referral-process-in-under-a-minute")}</h2>
              <p className="mx-auto mt-3 max-w-[58ch] text-body leading-relaxed text-grey-dark">{text("video.a-quick-walkthrough-of-how-to-refer-a-patient-to-medville-diabete")}</p>
            </div>
            )}

            {videoPlayer && (
            <div
              data-reveal={200}
              className="reveal-curtain-left reveal-glacial mt-9 rounded-[24px] bg-grey-light shadow-soft"
            >
              <div>
              {videoUrl ? (
                <iframe
                  src={videoUrl}
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="no-referrer"
                  title="How to refer a patient to Medville Diabetes"
                  allowFullScreen
                  className="aspect-video w-full border-0"
                />
              ) : (
                <div className="tint-product flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <PlayCircle size={46} strokeWidth={1.6} className="text-brand" aria-hidden="true" />
                  <p className="m-0 font-display text-body font-semibold text-ink">{text("video.the-referral-walkthrough-video-is-on-its-way")}</p>
                  <p className="m-0 max-w-[46ch] text-small leading-relaxed text-grey-muted">{text("video.in-the-meantime-the-three-steps-above-cover-the-whole-process-and")}</p>
                </div>
              )}
              </div>
            </div>
            )}
          </Container>
        </section>}

        {/* DOWNLOAD CALL TO ACTION */}
        {showDownload && <section className="bg-why-band py-16 md:py-24">
          <Container wide>
            <div
              data-reveal={0}
              className="reveal-push reveal-glacial grid gap-9 rounded-[26px] bg-surface-raised p-6 shadow-soft sm:p-8 md:p-12 lg:grid-cols-[1.1fr_0.9fr]"
            >
              {/* min-w-0 on both columns: a grid track defaults to the width
                  of its widest child, and the email address below is one long
                  unbreakable word. */}
              <div className="min-w-0">
                {downloadCopy && <>
                <Eyebrow>{text("download.ready-to-refer")}</Eyebrow>
                <h2 className="mt-3 font-display text-h2 font-bold text-ink">{text("download.everything-you-need-in-one-download")}</h2>
                <p className="mt-3 max-w-[52ch] text-body leading-relaxed text-grey-dark">{text("download.get-the-medville-diabetes-referral-form-and-requirements-together")}</p>
                </>}
                {downloadButton && <>
                <Button href={PACKET_HREF} variant="cta" className="mt-7 min-h-[50px] px-7">
                  {PACKET_LABEL}
                  <Download size={16} strokeWidth={2.2} />
                </Button>
                <p className="mt-3.5 flex items-center gap-2 text-caption text-grey-muted">
                  <FileText size={14} strokeWidth={2} />{text("download.pdf-printable-for-healthcare-provider-use")}</p>
                </>}
              </div>

              {downloadContact && (
              <div className="flex min-w-0 flex-col gap-5 rounded-lg bg-brand-tint p-6 sm:p-7">
                <div>
                  <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">{text("download.send-completed-referrals-to")}</p>
                  <a
                    href={EMAIL_HREF}
                    className="mt-1.5 flex items-start gap-2 font-display text-body font-semibold text-brand"
                  >
                    <Mail size={17} strokeWidth={2} className="mt-1 flex-none" />
                    <span className="break-all">{EMAIL}</span>
                  </a>
                </div>
                <div className="border-t border-brand-mint pt-5">
                  <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">{text("download.questions")}</p>
                  <a
                    href={PHONE_TEL}
                    className="mt-1.5 flex items-center gap-2 font-display text-body font-semibold text-brand"
                  >
                    <PhoneCall size={17} strokeWidth={2} className="flex-none" />{text("download.call")} {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              )}
            </div>
          </Container>
        </section>}

        {/* PROVIDER SUPPORT */}
        {showSupport && <section className="bg-cta-band relative overflow-hidden py-16">
          <Grain opacity={0.07} />
          <Container className="relative">
            {supportCopy && <>
            <h2
              data-reveal={0}
              className="reveal-blur reveal-glacial m-0 max-w-[24ch] font-display text-h2 font-bold text-on-dark"
            >{text("support.need-help-with-a-referral")}</h2>
            <p
              data-reveal={240}
              className="reveal-settle mt-3.5 max-w-[58ch] text-body leading-relaxed text-on-dark-brand"
            >{text("support.have-a-question-before-sending-your-referral-or-need-help-with-an")}</p>
            </>}
            {supportButton && (
            <div data-reveal={440} className="reveal-drop">
              <Button to="/contact" variant="on-band" className="mt-7">{text("support.contact-our-team")}<ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
            )}
          </Container>
        </section>}
      </div>
    </div>
  );
}
