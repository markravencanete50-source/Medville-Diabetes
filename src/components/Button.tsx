import { Link } from "react-router-dom";

/*
  Button variants.

  `green` is the primary call to action across the site after the 2026-08-26
  client decision. The brand orange token is retained in index.css but is no
  longer used on any call to action.

  `on-green` is the inverted pill used inside the dark green bands, where a
  white surface reads as the action and green would disappear.
*/
type Variant = "green" | "primary" | "ghost" | "ghost-dark" | "on-green" | "soft";

const styles: Record<Variant, string> = {
  green: "bg-green text-on-dark shadow-green hover:bg-green-hover hover:-translate-y-0.5",
  primary: "bg-ink text-on-dark shadow-raised hover:bg-navy-raised",
  ghost:
    "border-[1.5px] border-ink/20 bg-canvas/60 text-ink hover:border-green hover:bg-canvas hover:text-green",
  "ghost-dark":
    "border border-on-dark-muted/50 text-on-dark hover:border-on-dark hover:bg-navy-raised",
  "on-green":
    "bg-canvas text-green-deep shadow-[0_4px_14px_rgb(0_20_12/0.3)] hover:-translate-y-0.5 hover:bg-green-soft",
  soft: "bg-green-soft text-green hover:bg-green-mint",
};

export default function Button({
  to,
  href,
  variant = "green",
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
