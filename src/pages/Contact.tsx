import { Phone, Mail, Clock, MapPin } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { usePageMeta } from "../lib/usePageMeta";

/*
  Deliberate decision: no free-text contact form on this page.
  A general message box invites visitors to type medical details, which would
  put unplanned health information into the contact pipeline. Phone and email
  keep that channel controlled. See CLAUDE.md before changing this.
*/
export default function Contact() {
  usePageMeta(
    "Contact | Medville Diabetes",
    "Contact Medville Diabetes by phone or email. Monday to Friday, 8:30 AM to 5:00 PM Eastern Time."
  );
  return (
    <section className="py-14 md:py-20">
      <Container className="max-w-3xl">
        <p className="text-caption font-semibold uppercase tracking-[0.22em] text-accent-deep">Contact</p>
        <h1 className="mt-3 font-display text-h1 font-bold text-ink">Talk to a real person.</h1>
        <p className="mt-4 max-w-[58ch] text-body-lg leading-relaxed text-ink-muted">
          Call or email us with any question about our products, your order, or
          how to qualify. We answer in plain language.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <ContactCard icon={<Phone size={19} />} label="Phone">
            <a href="tel:8770000000" className="font-semibold text-ink hover:text-accent-deep">877-000-0000</a>
          </ContactCard>
          <ContactCard icon={<Mail size={19} />} label="Email">
            <a href="mailto:info@medvillediabetes.com" className="font-semibold text-ink hover:text-accent-deep">
              info@medvillediabetes.com
            </a>
          </ContactCard>
          <ContactCard icon={<Clock size={19} />} label="Hours">
            <p className="font-semibold text-ink">Monday to Friday</p>
            <p className="text-small text-ink-muted">8:30 AM to 5:00 PM Eastern Time</p>
          </ContactCard>
          <ContactCard icon={<MapPin size={19} />} label="Address">
            <p className="font-semibold text-ink">[Street address to be provided]</p>
          </ContactCard>
        </div>

        <div className="mt-10 rounded-lg border border-line bg-surface p-6">
          <p className="text-small leading-relaxed text-ink-muted">
            Looking for a monitor? The fastest way to start is our short
            qualification form. It takes less than one minute.
          </p>
          <Button to="/qualify" variant="cta" className="mt-4">Check if you Qualify</Button>
        </div>
      </Container>
    </section>
  );
}

function ContactCard({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-line bg-surface-raised p-5 shadow-raised">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        {icon}
      </span>
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-subtle">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
