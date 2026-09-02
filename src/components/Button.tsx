import { Link } from "react-router-dom";

/*
  Button variants.

  Every button is one of the two brand colours, cyan #18bada or navy
  #00293b, on the client's instruction of 2026-09-02, and hovering swaps a
  button to the other one. That is the whole system: a cyan button turns
  navy under the pointer, a navy button turns cyan, and an outline fills
  with the colour of its border. Nothing else is ever a button colour.

  Text on cyan is navy (6.4:1) and text on navy is white (14.6:1). White on
  cyan would be 2.3:1, so no variant ever pairs those two.

  `cta` is the qualify call to action and the one cyan fill on a light
  section. `on-band` is the same action inside a navy band, where the hover
  lightens instead of swapping, because navy on navy would vanish.
  `primary` is the navy fill for any other confirming action. `ghost` is
  the navy outline for the quieter choice beside a filled button, and
  `ghost-dark` its counterpart on a navy ground. `soft` is a small cyan-tint
  chip for a control that must not compete with a real button.
*/
type Variant = "cta" | "primary" | "ghost" | "ghost-dark" | "on-band" | "soft";

const styles: Record<Variant, string> = {
  cta: "bg-brand-bright text-ink shadow-cta hover:bg-ink hover:text-on-dark hover:-translate-y-0.5",
  primary: "bg-ink text-on-dark shadow-raised hover:bg-brand-bright hover:text-ink",
  ghost:
    "border-[1.5px] border-ink/30 text-ink hover:border-ink hover:bg-ink hover:text-on-dark",
  "ghost-dark":
    "border-[1.5px] border-on-dark/50 text-on-dark hover:border-brand-bright hover:bg-brand-bright hover:text-ink",
  "on-band":
    "bg-brand-bright text-ink shadow-[0_4px_14px_rgb(0_24_36/0.4)] hover:-translate-y-0.5 hover:bg-on-dark-accent",
  soft: "bg-brand-soft text-brand hover:bg-ink hover:text-on-dark",
};

export default function Button({
  to,
  state,
  href,
  variant = "cta",
  children,
  className = "",
  type,
  disabled,
  onClick,
}: {
  to?: string;
  /* Router state, used to carry a product slug to the qualify form without
     putting it in the URL. */
  state?: unknown;
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

  if (to) return <Link to={to} state={state} className={base}>{children}</Link>;
  if (href) return <a href={href} className={base}>{children}</a>;
  return (
    <button type={type ?? "button"} disabled={disabled} onClick={onClick} className={base}>
      {children}
    </button>
  );
}
