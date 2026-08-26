import { Link } from "react-router-dom";

/*
  Button variants.

  `cta` is brand orange and belongs to the qualify call to action only, which
  is the rule the client's palette carries. Its text is navy rather than
  white: white on orange is 2.07:1, navy is 7.36:1. `on-band` is the same
  action sitting inside a dark navy band.

  `primary` is the navy pill for any other confirming action, and `soft` the
  quiet cyan chip.
*/
type Variant = "cta" | "primary" | "ghost" | "ghost-dark" | "on-band" | "soft";

const styles: Record<Variant, string> = {
  cta: "bg-cta text-ink shadow-cta hover:bg-cta-hover hover:-translate-y-0.5",
  primary: "bg-ink text-on-dark shadow-raised hover:bg-navy-raised",
  ghost:
    "border-[1.5px] border-ink/20 bg-canvas/60 text-ink hover:border-brand hover:bg-canvas hover:text-brand",
  "ghost-dark":
    "border border-on-dark-muted/50 text-on-dark hover:border-on-dark hover:bg-navy-raised",
  "on-band":
    "bg-cta text-ink shadow-[0_4px_14px_rgb(0_20_12/0.34)] hover:-translate-y-0.5 hover:bg-cta-hover",
  soft: "bg-brand-soft text-brand hover:bg-brand-mint",
};

export default function Button({
  to,
  href,
  variant = "cta",
  children,
  className = "",
  type,
  disabled,
  onClick,
}: {
  to?: string;
  href?: string;
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-full px-7 py-3 font-display text-small font-semibold transition-all duration-(--duration-base) ease-(--ease-out-quart) disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 " +
    `${styles[variant]} ${className}`;

  if (to) return <Link to={to} className={base}>{children}</Link>;
  if (href) return <a href={href} className={base}>{children}</a>;
  return (
    <button type={type ?? "button"} disabled={disabled} onClick={onClick} className={base}>
      {children}
    </button>
  );
}
