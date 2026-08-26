import { Link } from "react-router-dom";

type Variant = "cta" | "primary" | "ghost" | "ghost-dark";

const styles: Record<Variant, string> = {
  cta: "bg-cta text-ink hover:bg-cta-hover shadow-raised",
  primary: "bg-ink text-on-dark hover:bg-navy-raised shadow-raised",
  ghost: "border border-line-strong text-ink hover:border-ink hover:bg-surface",
  "ghost-dark": "border border-on-dark-muted/50 text-on-dark hover:border-on-dark hover:bg-navy-raised",
};

export default function Button({
  to,
  href,
  variant = "primary",
  children,
  className = "",
  type,
  disabled,
}: {
  to?: string;
  href?: string;
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  type?: "submit" | "button";
  disabled?: boolean;
}) {
  const base = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 font-display text-small font-semibold transition-colors duration-(--duration-micro) disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`;
  if (to) return <Link to={to} className={base}>{children}</Link>;
  if (href) return <a href={href} className={base}>{children}</a>;
  return <button type={type ?? "button"} disabled={disabled} className={base}>{children}</button>;
}
