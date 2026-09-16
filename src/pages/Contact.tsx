import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, LockKeyhole, MessageSquareText, PhoneCall, ShieldAlert } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { PHONE_DISPLAY, PHONE_TEL } from "../data/company";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming",
];

const schema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(80),
  email: z.string().trim().email("Please enter a valid email address.").max(160),
  phone: z.string().trim().min(7, "Please enter your phone number.").max(25)
    .regex(/^[0-9+()\-.\s]+$/, "Please enter a valid phone number."),
  city: z.string().trim().min(1, "Please enter your city.").max(80),
  state: z.string().min(1, "Please select your state."),
  message: z.string().trim().min(10, "Please tell us how we can help.").max(1200, "Please keep your message under 1,200 characters."),
  privacyAccepted: z.boolean().refine((accepted) => accepted, {
    message: "Please confirm that your message does not include medical or health information.",
  }),
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;
type Status = "idle" | "submitting" | "success" | "error";

export default function Contact() {
  usePageMeta(metaFor("/contact"));
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const submissionId = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { privacyAccepted: false },
  });

  const endpoint = (import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined)
    || "https://us-central1-medville-diabetes.cloudfunctions.net/contactEnquiry";

  useEffect(() => {
    if (status === "success") successHeading.current?.focus();
  }, [status]);

  const onSubmit = async (values: FormValues) => {
    if (!endpoint || sending.current) return;
    sending.current = true;
    setStatus("submitting");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ ...values, submissionId: submissionId.current }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const receipt = await response.json();
      if (receipt?.ok !== true) throw new Error("Missing receipt");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      sending.current = false;
    }
  };

  if (status === "success") {
    return <section className="bg-wash relative overflow-hidden">
      <Grain opacity={0.05} />
      <Container className="relative max-w-2xl py-20 text-center md:py-28">
        <CheckCircle2 size={52} className="mx-auto text-brand-bright" aria-hidden="true" />
        <h1 ref={successHeading} tabIndex={-1} className="mt-5 font-display text-h1 font-bold text-on-dark">Your message was sent</h1>
        <p className="mx-auto mt-4 max-w-[58ch] text-body-lg leading-relaxed text-on-dark-brand">Our team will review your general question and contact you using the details you provided.</p>
        <Button to="/" variant="ghost-dark" className="mt-8">Return home</Button>
      </Container>
    </section>;
  }

  return <>
    <main aria-hidden={noticeOpen || undefined} className="bg-wash relative overflow-hidden">
      <Blob tone="brand" strength={0.28} blur={42} size={420} duration="20s" className="-left-[130px] -top-[120px]" />
      <Grain opacity={0.06} />
      <Container wide className="relative grid gap-10 py-12 md:py-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
        <div>
          <Eyebrow onDark>Contact our team</Eyebrow>
          <h1 className="mt-3 max-w-[15ch] font-display text-h1 font-bold text-on-dark">How can we help?</h1>
          <p className="mt-4 max-w-[54ch] text-body leading-relaxed text-on-dark-brand">Send a general question about our products, services, or next steps. Please do not send medical records or personal health information.</p>

          <div className="mt-8 rounded-[20px] border border-on-dark-accent/25 bg-navy-raised/70 p-6">
            <div className="flex items-start gap-3"><ShieldAlert size={21} className="mt-0.5 flex-none text-brand-bright" aria-hidden="true" /><div><h2 className="font-display text-body font-semibold text-on-dark">Keep your message general</h2><p className="mt-2 text-small leading-relaxed text-on-dark-brand">Do not include diagnoses, medications, glucose readings, insurance or Medicare numbers, Social Security numbers, medical documents, or images.</p></div></div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-[20px] border border-on-dark-accent/25 bg-navy-raised/70 p-6">
            <PhoneCall size={20} className="mt-0.5 flex-none text-brand-bright" aria-hidden="true" />
            <div><p className="text-small leading-relaxed text-on-dark-brand">Prefer to speak with someone?</p><a href={PHONE_TEL} className="mt-1 inline-block font-display text-body font-semibold text-on-dark underline underline-offset-4">Call {PHONE_DISPLAY}</a></div>
          </div>
        </div>

        <div className="rounded-[26px] bg-surface-raised p-6 shadow-overlay sm:p-9">
          <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Contact form" aria-busy={status === "submitting"} className="space-y-5">
            <div><h2 className="font-display text-h3 font-bold text-ink">Send a general question</h2><p className="mt-1 text-small text-grey-dark">All fields are required.</p></div>
            <fieldset disabled={noticeOpen || status === "submitting"} className="min-w-0 space-y-5 disabled:opacity-65">
              <legend className="sr-only">Your contact information and question</legend>
              <div hidden aria-hidden="true"><label>Leave this blank<input {...register("website")} tabIndex={-1} autoComplete="off" /></label></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First Name" error={errors.firstName?.message}><input {...register("firstName")} required autoComplete="given-name" className={inputClass(!!errors.firstName)} /></Field>
                <Field label="Last Name" error={errors.lastName?.message}><input {...register("lastName")} required autoComplete="family-name" className={inputClass(!!errors.lastName)} /></Field>
              </div>
              <Field label="Email Address" error={errors.email?.message}><input {...register("email")} required type="email" autoComplete="email" inputMode="email" className={inputClass(!!errors.email)} /></Field>
              <Field label="Phone Number" error={errors.phone?.message}><input {...register("phone")} required type="tel" autoComplete="tel" inputMode="tel" className={inputClass(!!errors.phone)} /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City" error={errors.city?.message}><input {...register("city")} required autoComplete="address-level2" className={inputClass(!!errors.city)} /></Field>
                <Field label="State" error={errors.state?.message}><select {...register("state")} required autoComplete="address-level1" defaultValue="" className={inputClass(!!errors.state)}><option value="" disabled>Select your state</option>{US_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></Field>
              </div>
              <Field label="How can we help you?" error={errors.message?.message} help="Use this box only for general questions. Do not include medical or health information."><textarea {...register("message")} required rows={6} maxLength={1200} className={`${inputClass(!!errors.message)} resize-y`} /></Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-md bg-grey-light p-4 text-caption leading-relaxed text-grey-muted">
                <input type="checkbox" required {...register("privacyAccepted")} aria-invalid={!!errors.privacyAccepted} aria-describedby={errors.privacyAccepted ? "contact-privacy-error" : undefined} className="mt-0.5 h-5 w-5 flex-none accent-ink" />
                <span>I confirm that this message contains only a general question and does not include medical records, health information, insurance identifiers, or other sensitive personal information.</span>
              </label>
              {errors.privacyAccepted && <p id="contact-privacy-error" className="flex items-center gap-1 text-caption font-medium text-danger"><AlertCircle size={13} aria-hidden="true" /> {errors.privacyAccepted.message}</p>}

              {status === "error" && <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4"><AlertCircle size={18} className="mt-0.5 flex-none text-danger" aria-hidden="true" /><p className="m-0 text-small text-ink">Your message could not be sent. Please try again or call our team.</p></div>}

              <Button type="submit" variant="cta" disabled={status === "submitting"} className="w-full">{status === "submitting" ? "Sending your message" : "Send message"}</Button>
              <p className="text-center text-caption leading-relaxed text-grey-muted">We handle your contact details according to our <Link to="/privacy-policy" className="font-semibold text-brand underline underline-offset-2">Privacy Policy</Link>.</p>
            </fieldset>
          </form>
        </div>
      </Container>
    </main>
    {noticeOpen && <PrivacyNotice onContinue={() => setNoticeOpen(false)} />}
  </>;
}

function PrivacyNotice({ onContinue }: { onContinue: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buttonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/75 p-4 backdrop-blur-sm" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="privacy-notice-title" aria-describedby="privacy-notice-body" className="w-full max-w-[560px] rounded-[24px] bg-surface-raised p-6 shadow-sheet sm:p-9">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand"><LockKeyhole size={23} aria-hidden="true" /></span>
      <p className="mt-5 text-caption font-semibold uppercase tracking-[0.16em] text-brand">Before you continue</p>
      <h2 id="privacy-notice-title" className="mt-2 font-display text-h2 font-bold text-ink">Please do not send health information</h2>
      <div id="privacy-notice-body" className="mt-4 space-y-3 text-body leading-relaxed text-grey-dark"><p>Use this form only for general questions about Medville Diabetes products, services, or next steps.</p><p>Do not include medical records, diagnoses, medications, glucose readings, insurance or Medicare numbers, Social Security numbers, medical documents, or images.</p></div>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button ref={buttonRef} type="button" onClick={onContinue} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-brand-bright px-7 py-3 font-display text-small font-semibold text-ink shadow-cta transition-colors hover:bg-ink hover:text-on-dark"><MessageSquareText size={17} aria-hidden="true" /> Continue to form</button>
        <a href={PHONE_TEL} className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-ink/25 px-6 py-3 font-display text-small font-semibold text-ink hover:bg-grey-light">Call instead</a>
      </div>
    </section>
  </div>;
}

function Field({ label, error, help, children }: { label: string; error?: string; help?: string; children: React.ReactNode }) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <label className="block" htmlFor={id}>
    <span className="mb-1.5 block text-small font-semibold text-ink">{label}</span>
    {isValidElement(children) ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, "aria-invalid": Boolean(error), "aria-describedby": describedBy }) : children}
    {help && <span id={`${id}-help`} className="mt-1.5 block text-caption leading-relaxed text-grey-muted">{help}</span>}
    {error && <span id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-caption font-medium text-danger"><AlertCircle size={13} aria-hidden="true" /> {error}</span>}
  </label>;
}

function inputClass(hasError: boolean) {
  return `w-full min-h-[46px] rounded-md border-[1.5px] bg-surface-raised px-4 py-2.5 text-body text-ink placeholder:text-grey-muted transition-colors duration-(--duration-micro) focus:border-brand focus:outline-none ${hasError ? "border-danger" : "border-line-input"}`;
}
