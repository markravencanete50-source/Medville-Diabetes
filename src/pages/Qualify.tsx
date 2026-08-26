import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Headset,
  LockKeyhole,
  Truck,
} from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { usePageMeta } from "../lib/usePageMeta";

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
  email: z.string().trim().email("Please enter a valid email address.").max(160),
  phone: z.string().trim().min(7, "Please enter a valid phone number.").max(25)
    .regex(/^[0-9+()\-.\s]+$/, "Please use numbers only."),
  city: z.string().trim().min(1, "Please enter your city.").max(80),
  state: z.string().min(1, "Please select your state."),
  injectsInsulinDaily: z.enum(["yes", "no"], { message: "Please select an answer." }),
});

type FormValues = z.infer<typeof schema>;

type Status = "idle" | "submitting" | "success" | "error";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Answer the form",
    body: "Your contact details and one question about your insulin use.",
  },
  {
    icon: Headset,
    title: "We review it",
    body: "Real people check your answers and contact you, usually within one business day.",
  },
  {
    icon: Truck,
    title: "Delivered to you",
    body: "If you qualify, your monitor and supplies arrive at your door.",
  },
];

export default function Qualify() {
  usePageMeta(
    "Check if you Qualify | Medville Diabetes",
    "Answer a few short questions to check whether you qualify for a continuous glucose monitor. It takes less than one minute.",
  );
  const [status, setStatus] = useState<Status>("idle");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const insulinAnswer = watch("injectsInsulinDaily");
  const endpoint = import.meta.env.VITE_QUALIFY_ENDPOINT as string | undefined;

  const onSubmit = async (values: FormValues) => {
    setStatus("submitting");
    try {
      if (!endpoint) {
        /* Prototype mode: no endpoint configured, nothing is sent anywhere. */
        await new Promise((r) => setTimeout(r, 700));
        setStatus("success");
        return;
      }
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
          <CheckCircle2 size={52} className="mx-auto text-success" aria-hidden="true" />
          <h1 className="mt-5 font-display text-h1 font-bold text-ink">Thank you.</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-body-lg leading-relaxed text-grey-dark">
            We received your information. A member of our team will review it and
            contact you with the next steps, usually within one business day.
          </p>
          {!endpoint && (
            <p className="mx-auto mt-6 max-w-[52ch] rounded-md bg-surface-raised p-4 text-caption text-grey-muted">
              Preview note: this website is running in prototype mode. Submissions
              are not yet connected to a server, and nothing you typed was sent or
              saved.
            </p>
          )}
          <Button to="/products" variant="ghost" className="mt-8">Browse our products</Button>
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-wash relative overflow-hidden">
      <Blob tone="green" strength={0.18} blur={40} size={420} className="-left-[120px] -top-[120px]" />
      <Grain opacity={0.05} />
      <Container wide className="relative grid gap-10 py-12 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        {/* left: what happens */}
        <div>
          <Eyebrow>One short form</Eyebrow>
          <h1 className="mt-3 font-display text-h1 font-bold text-ink">Check if you Qualify</h1>
          <p className="mt-4 max-w-[52ch] text-body leading-relaxed text-grey-dark">
            Answer the questions below. It takes less than one minute, and there is
            no cost to check. Our team will review your answers and contact you with
            the next steps.
          </p>

          <ul className="mt-8 flex list-none flex-col gap-5 p-0">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-green-soft text-green">
                  <step.icon size={20} strokeWidth={2} />
                </span>
                <div>
                  <p className="m-0 text-caption font-bold tracking-[0.14em] text-green-bright">
                    STEP {index + 1}
                  </p>
                  <h2 className="m-0 mt-0.5 font-display text-body font-semibold text-ink">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-small leading-relaxed text-grey-dark">{step.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-start gap-3 rounded-lg border border-green-mint bg-green-tint p-5">
            <LockKeyhole size={16} className="mt-0.5 flex-none text-green" aria-hidden="true" />
            <p className="m-0 text-caption leading-relaxed text-grey-dark">
              Your information is sent over an encrypted connection and stored in a
              secure database. It is used only to review whether you qualify and to
              contact you about it.
            </p>
          </div>
        </div>

        {/* right: the form card */}
        <div className="rounded-[26px] bg-surface-raised p-6 shadow-overlay sm:p-9">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" error={errors.firstName?.message}>
                <input {...register("firstName")} autoComplete="given-name" className={inputClass(!!errors.firstName)} />
              </Field>
              <Field label="Last name" error={errors.lastName?.message}>
                <input {...register("lastName")} autoComplete="family-name" className={inputClass(!!errors.lastName)} />
              </Field>
            </div>
            <Field label="Email" error={errors.email?.message}>
              <input {...register("email")} type="email" autoComplete="email" inputMode="email" className={inputClass(!!errors.email)} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
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
                          ? "border-green bg-green-soft text-green"
                          : "border-line-input bg-surface-raised text-grey-dark hover:border-green"
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
                  Something went wrong and your form was not sent. Please try again.
                  If the problem continues, call us at 877-000-0000.
                </p>
              </div>
            )}

            <Button type="submit" variant="green" disabled={status === "submitting"} className="w-full">
              {status === "submitting" ? "Sending your answers…" : "Submit"}
            </Button>

            {/*
              LEGAL PLACEHOLDER: visible on purpose so it cannot be forgotten.
              Replace with consent language written for Medville by its legal or
              compliance reviewer. Do not copy consent text from any other website.
            */}
            <p className="rounded-md bg-grey-light p-4 text-caption leading-relaxed text-grey-muted">
              [Consent language will appear here. It must be provided by
              Medville&rsquo;s legal or compliance reviewer before launch.]
            </p>
          </form>
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
  return `w-full min-h-[46px] rounded-md border-[1.5px] bg-surface-raised px-4 py-2.5 text-body text-ink placeholder:text-grey-muted transition-colors duration-(--duration-micro) focus:border-green focus:outline-none ${
    hasError ? "border-danger" : "border-line-input"
  }`;
}
