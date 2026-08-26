import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, AlertCircle, LockKeyhole } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
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

export default function Qualify() {
  usePageMeta(
    "Check if you Qualify | Medville Diabetes",
    "Answer a few short questions to check whether you qualify for a continuous glucose monitor. It takes less than one minute."
  );
  const [status, setStatus] = useState<Status>("idle");
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

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
      <section className="py-20 md:py-28">
        <Container className="max-w-2xl text-center">
          <CheckCircle2 size={52} className="mx-auto text-success" aria-hidden="true" />
          <h1 className="mt-5 font-display text-h1 font-bold text-ink">Thank you.</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-body-lg leading-relaxed text-ink-muted">
            We received your information. A member of our team will review it
            and contact you with the next steps, usually within one business day.
          </p>
          {!endpoint && (
            <p className="mx-auto mt-6 max-w-[52ch] rounded-md bg-surface p-4 text-caption text-ink-subtle">
              Preview note: this website is running in prototype mode.
              Submissions are not yet connected to a server, and nothing you
              typed was sent or saved.
            </p>
          )}
          <Button to="/products" variant="ghost" className="mt-8">Browse our products</Button>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <Container className="max-w-2xl">
        <p className="text-caption font-semibold uppercase tracking-[0.22em] text-accent-deep">One short form</p>
        <h1 className="mt-3 font-display text-h1 font-bold text-ink">Check if you Qualify</h1>
        <p className="mt-4 text-body leading-relaxed text-ink-muted">
          Answer the questions below. It takes less than one minute, and there
          is no cost to check. Our team will review your answers and contact
          you with the next steps.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-9 space-y-5">
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
          <Field label="Do you inject insulin daily?" error={errors.injectsInsulinDaily?.message}>
            <select {...register("injectsInsulinDaily")} defaultValue="" className={inputClass(!!errors.injectsInsulinDaily)}>
              <option value="" disabled>Select an answer</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>

          {status === "error" && (
            <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
              <AlertCircle size={18} className="mt-0.5 flex-none text-danger" aria-hidden="true" />
              <p className="text-small text-ink">
                Something went wrong and your form was not sent. Please try
                again. If the problem continues, call us at 877-000-0000.
              </p>
            </div>
          )}

          <Button type="submit" variant="cta" disabled={status === "submitting"} className="w-full sm:w-auto">
            {status === "submitting" ? "Sending your answers…" : "Submit"}
          </Button>

          <div className="flex items-start gap-2.5 border-t border-line pt-5">
            <LockKeyhole size={15} className="mt-0.5 flex-none text-ink-subtle" aria-hidden="true" />
            <p className="text-caption leading-relaxed text-ink-subtle">
              Your information is sent over an encrypted connection and stored
              in a secure database. It is used only to review whether you
              qualify and to contact you about it.
            </p>
          </div>

          {/*
            LEGAL PLACEHOLDER: visible on purpose so it cannot be forgotten.
            Replace with consent language written for Medville by its legal or
            compliance reviewer. Do not copy consent text from any other website.
          */}
          <p className="rounded-md bg-surface p-4 text-caption leading-relaxed text-ink-subtle">
            [Consent language will appear here. It must be provided by
            Medville&rsquo;s legal or compliance reviewer before launch.]
          </p>
        </form>
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
  return `w-full min-h-11 rounded-md border bg-surface-raised px-4 py-2.5 text-body text-ink placeholder:text-ink-subtle transition-colors duration-(--duration-micro) focus:border-accent-deep focus:outline-none ${
    hasError ? "border-danger" : "border-line-strong"
  }`;
}
