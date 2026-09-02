import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { isEnquirable } from "../data/products";
import { useProducts } from "../lib/useSiteData";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Headset,
  LockKeyhole,
  Mail,
  Phone,
  PhoneCall,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useReveal } from "../lib/useReveal";
import { EMAIL_HREF, HOURS_LONG, PHONE_DISPLAY, PHONE_TEL } from "../data/company";

/*
  PHI NOTICE: read before changing this file.
  The insulin answer combined with the contact fields is Protected Health
  Information. The rules for this page:
  1. Submissions POST as JSON to the covered Cloud Run endpoint only
     (VITE_QUALIFY_ENDPOINT). Never a GET, never query-string data.
  2. Never write form values to console, localStorage, analytics, or logs.
  3. No analytics, pixels, chat widgets, or session recording may load on
     this page. Keep it dependency-clean.
  4. Error messages must never echo submitted values back.
*/

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
  email: z.string().trim().email("Please enter your email address.").max(160),
  phone: z.string().trim().min(7, "Please enter your phone number.").max(25)
    .regex(/^[0-9+()\-.\s]+$/, "Please enter your phone number."),
  city: z.string().trim().min(1, "Please enter your city.").max(80),
  state: z.string().min(1, "Please select your state."),
  injectsInsulinDaily: z.enum(["yes", "no"], { message: "Please select an answer." }),
  /* Which product prompted the enquiry. Optional, and a slug rather than
     free text, so nothing unexpected reaches the record. */
  productInterest: z.string().max(60).optional(),
});

type FormValues = z.infer<typeof schema>;

type Status = "idle" | "submitting" | "success" | "error";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Submit Your Details",
    body: "Complete the short form below.",
  },
  {
    icon: Headset,
    title: "We Review",
    body: "We check your information and potential eligibility.",
  },
  {
    icon: PhoneCall,
    title: "We Contact You",
    body: "Our team reaches out to explain what comes next.",
  },
];

export default function Qualify() {
  usePageMeta(metaFor("/qualify"));
  const [status, setStatus] = useState<Status>("idle");
  const revealRef = useReveal<HTMLElement>();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const location = useLocation();
  const insulinAnswer = watch("injectsInsulinDaily");

  /*
    The product a visitor was reading before they clicked through. It
    travels in router state rather than in the URL: a product slug is not
    Protected Health Information on its own, but this form is the PHI
    pathway, and Section 3.4(e) is easiest to honour by keeping the whole
    address free of anything about the visitor.
  */
  const arrivedFrom = (location.state as { product?: string } | null)?.product ?? "";
  const enquirable = useProducts().filter(isEnquirable);

  useEffect(() => {
    if (arrivedFrom) setValue("productInterest", arrivedFrom);
  }, [arrivedFrom, setValue]);

  const endpoint = import.meta.env.VITE_QUALIFY_ENDPOINT as string | undefined;

  const onSubmit = async (values: FormValues) => {
    /*
      There is deliberately no path to the success screen without a server.
      An earlier build simulated one when no endpoint was configured, which
      told a visitor "We Received Your Information" while nothing had been
      sent. On a public address that is a person with diabetes waiting for a
      call that is never coming. When there is no endpoint the form is not
      rendered at all; see the dormant panel below.
    */
    if (!endpoint) return;
    setStatus("submitting");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <section className="bg-wash relative overflow-hidden">
        <Grain opacity={0.05} />
        <Container className="relative max-w-2xl py-20 text-center md:py-28">
          <CheckCircle2 size={52} className="mx-auto text-brand-bright" aria-hidden="true" />
          <h1 className="mt-5 font-display text-h1 font-bold text-on-dark">
            Thank You. We Received Your Information.
          </h1>
          <p className="mx-auto mt-4 max-w-[60ch] text-body-lg leading-relaxed text-on-dark-brand">
            Our team will review the information you submitted and contact you to
            discuss your potential eligibility and available next steps. Submitting
            this form does not guarantee insurance coverage or qualification.
          </p>
          <Button to="/products" variant="ghost-dark" className="mt-8">Explore Products</Button>
        </Container>
      </section>
    );
  }

  return (
    <section ref={revealRef} className="bg-wash relative overflow-hidden">
      <Blob tone="brand" strength={0.28} blur={40} size={420} duration="20s" className="-left-[120px] -top-[120px]" />
      <Grain opacity={0.06} />
      <Container wide className="relative grid gap-10 py-12 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        {/* left: what happens, on the navy ground */}
        <div>
          <div data-reveal={0} className="reveal-settle">
          <Eyebrow onDark>Check your potential eligibility</Eyebrow>
          <h1 className="mt-3 font-display text-h1 font-bold text-on-dark">
            Does Your Insurance Help Cover a CGM?
          </h1>
          <p className="mt-4 max-w-[54ch] text-body leading-relaxed text-on-dark-brand">
            {endpoint
              ? "Not sure what your plan may cover? Complete the short form below and our team will review your information to help you understand your potential eligibility and next steps."
              : "Not sure what your plan may cover? Our team can review your information and help you understand your potential eligibility and next steps."}
          </p>
          </div>

          <ul className="mt-8 flex list-none flex-col gap-5 p-0">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                data-reveal={200 + index * 190}
                className="reveal-left flex gap-4"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-navy-raised text-brand-bright">
                  <step.icon size={20} strokeWidth={2} />
                </span>
                <div>
                  <p className="m-0 text-caption font-bold tracking-[0.14em] text-brand-bright">
                    STEP {index + 1}
                  </p>
                  <h2 className="m-0 mt-0.5 font-display text-body font-semibold text-on-dark">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-small leading-relaxed text-on-dark-brand">
                    {!endpoint && index === 0
                      ? "Call or email us with your basic information."
                      : step.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div
            data-reveal={780}
            className="reveal-blur mt-8 flex items-start gap-3 rounded-lg border border-on-dark-accent/30 bg-navy-raised/70 p-5"
          >
            <LockKeyhole size={16} className="mt-0.5 flex-none text-brand-bright" aria-hidden="true" />
            <p className="m-0 text-caption leading-relaxed text-on-dark-brand">
              Your privacy matters. Information submitted through this form will be
              handled according to our{" "}
              <Link
                to="/privacy-policy"
                className="inline-block py-1 font-semibold text-on-dark underline underline-offset-2"
              >
                Privacy Policy
              </Link>{" "}
              and applicable privacy requirements.
            </p>
          </div>
        </div>

        {/* right: the form card, or the dormant panel in its place */}
        <div
          data-reveal={140}
          className="reveal-right reveal-slow rounded-[26px] bg-surface-raised p-6 shadow-overlay sm:p-9"
        >
          {!endpoint ? (
            /*
              No intake endpoint, so there is nowhere for an answer to go. The
              form is not shown at all rather than shown and quietly discarded:
              collecting a person's insulin use and then dropping it is worse
              than not asking. The page keeps its heading, its three steps and
              its privacy notice, so it reads as a finished page that is not
              open yet, and it offers the two routes that do work.

              This whole branch disappears the moment VITE_QUALIFY_ENDPOINT is
              set at launch. Nothing here needs undoing.
            */
            <div className="flex h-full flex-col justify-center py-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-brand-bright">
                <Clock size={26} strokeWidth={2} aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-display text-h3 font-bold text-ink">
                Eligibility checks open soon
              </h2>
              <p className="mx-auto mt-3 max-w-[42ch] text-body leading-relaxed text-grey-dark">
                The online eligibility form is not accepting submissions yet. Our
                team can still answer your questions and start the process with you
                over the phone or by email.
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <Button href={PHONE_TEL} variant="cta" className="w-full">
                  <Phone size={16} strokeWidth={2.2} />
                  Call {PHONE_DISPLAY}
                </Button>
                <Button href={EMAIL_HREF} variant="ghost" className="w-full">
                  <Mail size={16} strokeWidth={2.2} />
                  Email our team
                </Button>
              </div>
              <p className="mt-6 text-caption leading-relaxed text-grey-muted">
                {HOURS_LONG}
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First Name" error={errors.firstName?.message}>
                <input {...register("firstName")} autoComplete="given-name" className={inputClass(!!errors.firstName)} />
              </Field>
              <Field label="Last Name" error={errors.lastName?.message}>
                <input {...register("lastName")} autoComplete="family-name" className={inputClass(!!errors.lastName)} />
              </Field>
            </div>
            <Field label="Email Address" error={errors.email?.message}>
              <input {...register("email")} type="email" autoComplete="email" inputMode="email" className={inputClass(!!errors.email)} />
            </Field>
            <Field label="Phone Number" error={errors.phone?.message}>
              <input {...register("phone")} type="tel" autoComplete="tel" inputMode="tel" className={inputClass(!!errors.phone)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" error={errors.city?.message}>
                <input {...register("city")} autoComplete="address-level2" className={inputClass(!!errors.city)} />
              </Field>
              <Field label="State" error={errors.state?.message}>
                <select {...register("state")} autoComplete="address-level1" defaultValue="" className={inputClass(!!errors.state)}>
                  <option value="" disabled>Select your state</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* insulin question as a Yes / No toggle pair */}
            <Field
              label="Which product are you interested in?"
              error={errors.productInterest?.message}
            >
              <select
                {...register("productInterest")}
                defaultValue={arrivedFrom}
                className={inputClass(!!errors.productInterest)}
              >
                <option value="">I am not sure yet</option>
                {enquirable.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Do you inject insulin daily?" error={errors.injectsInsulinDaily?.message}>
              <input type="hidden" {...register("injectsInsulinDaily")} />
              <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Do you inject insulin daily?">
                {(["yes", "no"] as const).map((value) => {
                  const selected = insulinAnswer === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setValue("injectsInsulinDaily", value, { shouldValidate: true })
                      }
                      className={`min-h-[46px] rounded-md border-[1.5px] font-display text-small font-semibold transition-all duration-(--duration-micro) ${
                        selected
                          ? "border-ink bg-ink text-on-dark"
                          : "border-line-input bg-surface-raised text-ink hover:border-ink"
                      }`}
                    >
                      {value === "yes" ? "Yes" : "No"}
                    </button>
                  );
                })}
              </div>
            </Field>

            {status === "error" && (
              <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
                <AlertCircle size={18} className="mt-0.5 flex-none text-danger" aria-hidden="true" />
                <p className="m-0 text-small text-ink">
                  Something went wrong while submitting your information. Please try
                  again or contact our team for assistance at {PHONE_DISPLAY}.
                </p>
              </div>
            )}

            <Button type="submit" variant="cta" disabled={status === "submitting"} className="w-full">
              {status === "submitting" ? "Sending your information…" : "Check My Eligibility"}
            </Button>

            {/*
              Consent language delivered by the client on 2026-08-26
              (Medville_Diabetes__Consent_Language.docx), reproduced verbatim.
              The policy references are linked to the site's legal pages.
              Changes to this text must come from the client's reviewer.
            */}
            <p className="rounded-md bg-grey-light p-4 text-caption leading-relaxed text-grey-muted">
              By pressing the submit button, I certify that I personally entered my
              own information, and I give express consent authorizing Medville
              Diabetes (MD), and its marketing partners to contact me at the email
              address and/or phone number provided (mobile phone as applicable)
              which may include direct calls, auto-dialed calls, text messages, and
              artificial or pre-recorded voice calls to discuss continuous glucose
              monitors and related healthcare products/services; regardless of my
              inclusion on any State or Federal Do Not Call list. I further certify
              that I am the customary user of the telephone number I have provided
              and am authorized to provide express consent to be contacted at this
              number. MD may, with your verbal consent, transfer your call to a
              third party for the purpose of offering other products and/or
              services. MD may be compensated for the call transfer. Consent is not
              a condition of purchase. By pressing the submit button you also
              consent to{" "}
              <Link to="/privacy-policy" className="font-semibold text-brand underline underline-offset-2">
                MD Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/terms-of-service" className="font-semibold text-brand underline underline-offset-2">
                MD Terms and Conditions
              </Link>
              .
            </p>
          </form>
          )}
        </div>
      </Container>
    </section>
  );
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-small font-semibold text-ink">{label}</span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1 text-caption font-medium text-danger">
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </span>
      )}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return `w-full min-h-[46px] rounded-md border-[1.5px] bg-surface-raised px-4 py-2.5 text-body text-ink placeholder:text-grey-muted transition-colors duration-(--duration-micro) focus:border-brand focus:outline-none ${
    hasError ? "border-danger" : "border-line-input"
  }`;
}
