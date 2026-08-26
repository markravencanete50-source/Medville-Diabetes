/*
  The site's signature motif: a smooth glucose trend line over a shaded
  "in range" band. Derived from what the products actually do.
  Used as a section divider and as the hero underlay.
*/
export default function GlucoseWave({
  className = "",
  subtle = false,
}: {
  className?: string;
  subtle?: boolean;
}) {
  return (
    <div className={`${subtle ? "" : "relative"} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className="block h-full w-full">
        {/* the in-range band */}
        <rect x="0" y="70" width="1200" height="90" fill="var(--color-accent)" opacity={subtle ? 0.05 : 0.09} />
        <line x1="0" y1="70" x2="1200" y2="70" stroke="var(--color-accent)" strokeOpacity={subtle ? 0.18 : 0.3} strokeWidth="1.5" strokeDasharray="2 8" />
        <line x1="0" y1="160" x2="1200" y2="160" stroke="var(--color-accent)" strokeOpacity={subtle ? 0.18 : 0.3} strokeWidth="1.5" strokeDasharray="2 8" />
        {/* the glucose trend line */}
        <path
          d="M0,150 C90,140 140,92 230,96 C320,100 360,150 450,148 C540,146 590,84 680,86 C770,88 810,152 900,142 C970,134 1010,100 1080,104 C1120,106 1150,116 1180,114"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={subtle ? 2.5 : 3.5}
          strokeLinecap="round"
          opacity={subtle ? 0.5 : 1}
        />
      </svg>
      {!subtle && (
        <span
          className="wave-dot absolute h-2.5 w-2.5 rounded-full bg-accent"
          style={{ left: "calc(98.3% - 5px)", top: "calc(51.8% - 5px)" }}
        />
      )}
    </div>
  );
}
