import { AlertCircle } from "lucide-react";

/*
  The one field wrapper and the one input style for every public form: the
  eligibility form on /qualify and the contact form on /contact. Both forms
  used to declare their own copies, and a change to the error colour rule
  (an icon and a sentence beside the field, always) would have had to land
  twice.
*/
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  /* A quieter second line under the label, for "optional" and the like. */
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-small font-semibold text-ink">
        {label}
        {hint && <span className="ml-1.5 font-normal text-grey-muted">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1 text-caption font-medium text-danger">
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </span>
      )}
    </label>
  );
}

export function inputClass(hasError: boolean) {
  return `w-full min-h-[46px] rounded-md border-[1.5px] bg-surface-raised px-4 py-2.5 text-body text-ink placeholder:text-grey-muted transition-colors duration-(--duration-micro) focus:border-brand focus:outline-none ${
    hasError ? "border-danger" : "border-line-input"
  }`;
}
