import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Check, CheckCircle2, Mail, Send } from "lucide-react";
import Button from "./Button";
import { Field, inputClass } from "./FormField";
import { useProducts } from "../lib/useSiteData";
import { isEnquirable, PRODUCT_STATUS_LABEL, type Product } from "../data/products";
import { EMAIL, EMAIL_HREF, PHONE_DISPLAY, PHONE_TEL } from "../data/company";
import { prefersReducedMotion } from "../lib/useReveal";

/*
  The contact form.

  Read before changing this file. The message box is free text, and a visitor
  may type health details into it, so this form follows the same rules as the
  eligibility form on /qualify even though it never asks a medical question:

  1. Submissions POST as JSON to the covered Cloud Run endpoint only
     (VITE_CONTACT_ENDPOINT). Never a GET, never query-string data.
  2. Never write form values to console, localStorage, analytics, or logs.
  3. No analytics, pixels, chat widgets, or session recording may load on
     this page. Keep it dependency-clean.
  4. Error messages must never echo submitted values back.

  Products are chosen from picture tiles rather than typed, and travel as
  catalogue slugs. The dashboard turns each slug back into the product's name
  and photograph, which is how the sales team sees at a glance what a person
  is asking about.

  Two modes, decided by VITE_CONTACT_ENDPOINT:

  - Set: the form posts to the intake function and then shows a thank-you.
  - Unset: the form still renders, but the button reads "Send by Email" and
    submitting opens the visitor's own mail app with the message written out.
    Nothing is claimed to have been received, because nothing was sent by
    the site. There is deliberately no path to the thank-you screen without
    a server; see the note in Qualify.tsx for why.
*/

const MAX_PRODUCTS = 6;
const MAX_MESSAGE = 1500;

const schema = z
  .object({
    firstName: z.string().trim().min(1, "Please enter your first name.").max(80),
    lastName: z.string().trim().min(1, "Please enter your last name.").max(80),
    email: z.string().trim().email("Please enter your email address.").max(160),
    phone: z
      .string()
      .trim()
      .max(25)
      .refine((v) => v === "" || (v.length >= 7 && /^[0-9+()\-.\s]+$/.test(v)), {
        message: "Please enter your phone number, or leave it empty.",
      }),
    products: z.array(z.string().max(60)).max(MAX_PRODUCTS),
    message: z.string().max(MAX_MESSAGE, "Please keep your message under 1,500 characters."),
    /* Honeypot. Hidden from people, filled by scripts. */
    website: z.string().max(200).optional(),
  })
  .refine((v) => v.products.length > 0 || v.message.trim().length > 0, {
    message: "Please choose a product or write a message, so we know how to help.",
    path: ["message"],
  });

type FormValues = z.infer<typeof schema>;

type Status = "idle" | "submitting" | "success" | "mailed" | "error";

export default function ContactForm() {
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined;
  const [status, setStatus] = useState<Status>("idle");
  const products = useProducts();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { products: [], message: "", phone: "" },
  });

  const chosen = watch("products");
  const messageText = watch("message") ?? "";

  /*
    The thank-you is much shorter than the form it replaces, so without this
    the page would shrink under the visitor and leave them looking at the
    footer, unsure whether anything happened.
  */
  const doneRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (status === "success") {
      doneRef.current?.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  }, [status]);

  /*
    The product a visitor was reading when they pressed "Contact Our Team".
    It arrives in router state, never in the address, so the URL stays free
    of anything about the visitor. Only a slug that exists is accepted.
  */
  const arrivedFrom = (location.state as { product?: string } | null)?.product ?? "";
  useEffect(() => {
    if (arrivedFrom && products.some((product) => product.slug === arrivedFrom)) {
      setValue("products", [arrivedFrom]);
    }
  }, [arrivedFrom, products, setValue]);

  const toggle = (slug: string) => {
    const next = chosen.includes(slug)
      ? chosen.filter((item) => item !== slug)
      : chosen.length < MAX_PRODUCTS
        ? [...chosen, slug]
        : chosen;
    setValue("products", next, { shouldValidate: Boolean(errors.message) });
  };

  const chosenProducts = useMemo(
    () => chosen.map((slug) => products.find((product) => product.slug === slug)).filter(Boolean) as Product[],
    [chosen, products],
  );

  const onSubmit = async (values: FormValues) => {
    if (!endpoint) {
      /*
        No server to send to, so the visitor's own mail app carries the
        message. The site itself stores nothing and claims nothing.
      */
      const names = chosenProducts.map((product) => product.name).join(", ");
      const lines = [
        `Name: ${values.firstName} ${values.lastName}`,
        `Email: ${values.email}`,
        values.phone ? `Phone: ${values.phone}` : "",
        names ? `Products of interest: ${names}` : "",
        "",
        values.message,
      ].filter((line, index, all) => line !== "" || index === all.length - 2);
      const subject = encodeURIComponent("Website enquiry");
      const body = encodeURIComponent(lines.join("\n"));
      window.location.href = `${EMAIL_HREF}?subject=${subject}&body=${body}`;
      setStatus("mailed");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          products: values.products,
          message: values.message,
          website: values.website ?? "",
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div ref={doneRef} className="flex h-full flex-col justify-center py-4 text-center" role="status">
        <CheckCircle2
          size={52}
          className="rise-in mx-auto text-brand"
          aria-hidden="true"
        />
        <h2
          className="rise-in mt-5 font-display text-h3 font-bold text-ink"
          style={{ "--rise-delay": "120ms" } as React.CSSProperties}
        >
          Thank You. Your Message Has Been Sent.
        </h2>
        <p
          className="rise-in mx-auto mt-3 max-w-[46ch] text-body leading-relaxed text-grey-dark"
          style={{ "--rise-delay": "240ms" } as React.CSSProperties}
        >
          Our team will read your message and reply by email or phone during
          business hours.
        </p>
        {chosenProducts.length > 0 && (
          <div
            className="rise-in mt-7"
            style={{ "--rise-delay": "360ms" } as React.CSSProperties}
          >
            <p className="m-0 text-caption font-semibold uppercase tracking-[0.14em] text-grey-muted">
              You asked about
            </p>
            <ul className="mt-3 flex list-none flex-wrap justify-center gap-3 p-0">
              {chosenProducts.map((product) => (
                <li
                  key={product.slug}
                  className="flex items-center gap-2.5 rounded-full border border-line-brand bg-brand-tint py-1.5 pl-1.5 pr-4"
                >
                  <img
                    src={product.imageFront}
                    alt=""
                    width={36}
                    height={36}
                    loading="lazy"
                    className="h-9 w-9 rounded-full bg-surface-raised object-contain"
                  />
                  <span className="text-caption font-semibold text-ink">{product.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div
          className="rise-in mt-8"
          style={{ "--rise-delay": "480ms" } as React.CSSProperties}
        >
          <Button to="/products" variant="ghost">
            Explore Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First Name" error={errors.firstName?.message}>
          <input
            {...register("firstName")}
            autoComplete="given-name"
            className={inputClass(!!errors.firstName)}
          />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <input
            {...register("lastName")}
            autoComplete="family-name"
            className={inputClass(!!errors.lastName)}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email Address" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            className={inputClass(!!errors.email)}
          />
        </Field>
        <Field label="Phone Number" hint="(optional)" error={errors.phone?.message}>
          <input
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass(!!errors.phone)}
          />
        </Field>
      </div>

      {/*
        A fieldset rather than a label, on purpose. A label that wraps a
        group of buttons hands a click on its text to the first button.
      */}
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 block w-full text-small font-semibold text-ink">
          Which products are you interested in?
          <span className="ml-1.5 font-normal text-grey-muted">(choose up to {MAX_PRODUCTS})</span>
        </legend>
        <input type="hidden" {...register("products")} />
        <ProductPicker products={products} chosen={chosen} onToggle={toggle} />
        {chosenProducts.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-grey-muted">
            <span>
              Asking about:{" "}
              <span className="font-semibold text-ink">
                {chosenProducts.map((product) => product.name).join(", ")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setValue("products", [])}
              className="min-h-[32px] rounded-full px-2 font-semibold text-brand underline underline-offset-2"
            >
              Clear
            </button>
          </p>
        )}
      </fieldset>

      <Field label="Your Message" error={errors.message?.message}>
        <textarea
          {...register("message")}
          rows={5}
          maxLength={MAX_MESSAGE}
          placeholder="Tell us how we can help. Please do not include medical record numbers or insurance identifiers."
          className={`${inputClass(!!errors.message)} min-h-[140px] resize-y`}
        />
        <span className="mt-1 block text-right text-caption text-grey-faint">
          {messageText.length} / {MAX_MESSAGE}
        </span>
      </Field>

      {/* Honeypot: off screen, out of the tab order, ignored by screen readers. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input {...register("website")} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status === "error" && (
        <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
          <AlertCircle size={18} className="mt-0.5 flex-none text-danger" aria-hidden="true" />
          <p className="m-0 text-small text-ink">
            Something went wrong while sending your message. Please try again, or
            call us at{" "}
            <a href={PHONE_TEL} className="font-semibold underline underline-offset-2">
              {PHONE_DISPLAY}
            </a>
            .
          </p>
        </div>
      )}

      {status === "mailed" && (
        <div role="status" className="flex items-start gap-3 rounded-md border border-line-brand bg-brand-tint p-4">
          <Mail size={18} className="mt-0.5 flex-none text-brand" aria-hidden="true" />
          <p className="m-0 text-small text-ink">
            Your email app should now be open with your message ready to send. If it
            did not open, email us at{" "}
            <a href={EMAIL_HREF} className="font-semibold underline underline-offset-2">
              {EMAIL}
            </a>{" "}
            or call{" "}
            <a href={PHONE_TEL} className="font-semibold underline underline-offset-2">
              {PHONE_DISPLAY}
            </a>
            .
          </p>
        </div>
      )}

      <Button type="submit" variant="cta" disabled={status === "submitting"} className="w-full">
        {status === "submitting" ? (
          "Sending your message…"
        ) : endpoint ? (
          <>
            <Send size={16} strokeWidth={2.2} aria-hidden="true" />
            Send Message
          </>
        ) : (
          <>
            <Mail size={16} strokeWidth={2.2} aria-hidden="true" />
            Send by Email
          </>
        )}
      </Button>

      <p className="rounded-md bg-grey-light p-4 text-caption leading-relaxed text-grey-muted">
        By sending this message you agree that Medville Diabetes may contact you by
        email or phone about your enquiry. Your information is handled according to
        our{" "}
        <Link to="/privacy-policy" className="font-semibold text-brand underline underline-offset-2">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to="/terms-of-service" className="font-semibold text-brand underline underline-offset-2">
          Terms of Service
        </Link>
        .
      </p>
    </form>
  );
}

/*
  Picture tiles, one per product. Each is a toggle button, so a visitor can
  ask about several at once. Selected follows the site's rule for pills that
  act as buttons: navy when selected, navy outline when not.

  The tiles arrive staggered from a small zoom. They sit inside the card,
  which has its own reveal; the nesting is fine because both write only to
  their own element.
*/
function ProductPicker({
  products,
  chosen,
  onToggle,
}: {
  products: Product[];
  chosen: string[];
  onToggle: (slug: string) => void;
}) {
  if (!products.length) return null;
  const full = chosen.length >= MAX_PRODUCTS;

  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3" role="group">
      {products.map((product, index) => {
        const selected = chosen.includes(product.slug);
        const disabled = !selected && full;
        return (
          <li key={product.slug} data-reveal={Math.min(index, 8) * 55} className="reveal-zoom reveal-swift">
            <button
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onToggle(product.slug)}
              className={`group relative flex h-full w-full flex-col overflow-hidden rounded-md border-[1.5px] text-left transition-all duration-(--duration-micro) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-ink shadow-raised"
                  : "border-line-input hover:border-ink"
              }`}
            >
              <span className="relative block aspect-[4/3] w-full bg-brand-tint">
                <img
                  src={product.imageFront}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-contain p-2 transition-transform duration-(--duration-base) ease-(--ease-out-quart) group-hover:scale-[1.04]"
                />
                <span
                  className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-all duration-(--duration-micro) ${
                    selected
                      ? "scale-100 border-ink bg-ink text-on-dark"
                      : "scale-90 border-line-strong bg-surface-raised text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                {!isEnquirable(product) && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-ink px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-on-dark">
                    {PRODUCT_STATUS_LABEL[product.status ?? "available"]}
                  </span>
                )}
              </span>
              <span
                className={`flex min-h-[44px] flex-1 flex-col justify-center px-3 py-2 transition-colors duration-(--duration-micro) ${
                  selected ? "bg-ink text-on-dark" : "bg-surface-raised text-ink"
                }`}
              >
                <span className="block text-caption font-semibold leading-snug">{product.name}</span>
                <span
                  className={`mt-0.5 block text-[0.7rem] uppercase tracking-[0.12em] ${
                    selected ? "text-on-dark-brand" : "text-grey-muted"
                  }`}
                >
                  {product.brand}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
