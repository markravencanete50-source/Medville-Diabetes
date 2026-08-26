import { ArrowRight, Phone, Mail, Clock, MapPin } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { useReveal } from "../lib/useReveal";

/*
  Deliberate decision: no free-text contact form on this page.
  A general message box invites visitors to type medical details, which would
  put unplanned health information into the contact pipeline. Phone and email
  keep that channel controlled. See CLAUDE.md before changing this.
*/
export default function Contact() {
  usePageMeta(
    "Contact | Medville Diabetes",
    "Contact Medville Diabetes by phone or email. Monday to Friday, 8:30 AM to 5:00 PM Eastern Time.",
  );
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="bg-wash relative overflow-hidden">
      <Blob tone="brand" strength={0.16} blur={42} size={420} className="-left-[130px] -top-[120px]" />
      <Grain opacity={0.05} />
      <section className="relative py-14 md:py-20">
        <Container className="max-w-3xl">
          <p className="rise-in m-0">
            <Eyebrow>Contact</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 font-display text-h1 font-bold text-ink"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            Talk to a real person.
          </h1>
          <p
            className="rise-in mt-4 max-w-[58ch] text-body-lg leading-relaxed text-grey-dark"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            Call or email us with any question about our products, your order, or
            how to qualify. We answer in plain language.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <ContactCard delay={0} icon={<Phone size={19} />} label="Phone">
              <a href="tel:+18885642595" className="font-semibold text-ink transition-colors hover:text-brand">
                888-564-2595
              </a>
            </ContactCard>
            <ContactCard delay={100} icon={<Mail size={19} />} label="Email">
              <a
                href="mailto:info@medvillediabetes.com"
                className="font-semibold text-ink transition-colors hover:text-brand"
              >
                info@medvillediabetes.com
              </a>
            </ContactCard>
            <ContactCard delay={200} icon={<Clock size={19} />} label="Hours">
              <p className="m-0 font-semibold text-ink">Monday to Friday</p>
              <p className="m-0 text-small text-grey-dark">8:30 AM to 5:00 PM Eastern Time</p>
            </ContactCard>
            <ContactCard delay={300} icon={<MapPin size={19} />} label="Address">
              <p className="m-0 font-semibold text-ink">[Street address to be provided]</p>
            </ContactCard>
          </div>

          {/* dark brand qualify panel */}
          <div data-reveal={0} className="bg-cta-band relative mt-10 overflow-hidden rounded-[24px] p-7 sm:p-9">
            <Grain opacity={0.07} />
            <div className="relative">
              <p className="m-0 max-w-[54ch] text-small leading-relaxed text-on-dark-brand">
                Looking for a monitor? The fastest way to start is our short
                qualification form. It takes less than one minute.
              </p>
              <Button to="/qualify" variant="on-band" className="mt-5">
                Check if you Qualify
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

function ContactCard({ icon, label, delay, children }: {
  icon: React.ReactNode; label: string; delay: number; children: React.ReactNode;
}) {
  return (
    <div
      data-reveal={delay}
      className="flex items-start gap-4 rounded-lg bg-surface-raised p-6 shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-brand-soft text-brand">
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
