/*
  The site's signature motif: a smooth glucose trend line over a shaded
  "in range" band. Derived from what the products actually do.

  In the redesign the range band is brand (the calm, in-range colour) while
  the trend line stays cyan, which is now reserved for data visuals. The line
  draws itself in on first paint via the .wave-draw utility.

  Variants:
    chart   the framed card on the "why continuous monitoring" section
    hero    a wide, faint underlay at the bottom of a gradient hero
    onDark  the pale line used inside the dark brand call to action bands
*/

const TREND =
  "M0,150 C90,140 140,92 230,96 C320,100 360,150 450,148 C540,146 590,84 680,86 C770,88 810,152 900,142 C970,134 1010,100 1080,104 C1120,106 1150,116 1180,114";

export default function GlucoseWave({
  className = "",
  variant = "chart",
  animate = true,
  drawDelay = "0s",
}: {
  className?: string;
  variant?: "chart" | "hero" | "onDark";
  animate?: boolean;
  drawDelay?: string;
}) {
  const isChart = variant === "chart";
  const onDark = variant === "onDark";

  return (
    <div className={`${isChart ? "relative" : ""} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className="block h-full w-full">
        {!onDark && (
          <>
            <rect
              x="0"
              y="70"
              width="1200"
              height="90"
              rx={isChart ? 8 : 0}
              fill="var(--color-brand-bright)"
              opacity={isChart ? 0.12 : 0.06}
            />
            {isChart && (
              <>
                <line
                  x1="0" y1="70" x2="1200" y2="70"
                  stroke="var(--color-brand-bright)" strokeOpacity="0.4"
                  strokeWidth="1.5" strokeDasharray="2 8"
                />
                <line
                  x1="0" y1="160" x2="1200" y2="160"
                  stroke="var(--color-brand-bright)" strokeOpacity="0.4"
                  strokeWidth="1.5" strokeDasharray="2 8"
                />
              </>
            )}
          </>
        )}
        <path
          d={TREND}
          fill="none"
          stroke={onDark ? "var(--color-on-dark-accent)" : "var(--color-accent)"}
          strokeWidth={isChart ? 3.5 : 2.5}
          strokeLinecap="round"
          className={animate ? "wave-draw" : ""}
          style={
            animate
              ? ({
                  "--draw-duration": isChart ? "2.6s" : "3s",
                  "--draw-delay": drawDelay,
                } as React.CSSProperties)
              : undefined
          }
        />
      </svg>
      {isChart && (
        <span
          className="wave-dot absolute h-2.5 w-2.5 rounded-full bg-accent"
          style={{ left: "calc(98.3% - 5px)", top: "calc(51.8% - 5px)" }}
        />
      )}
    </div>
  );
}
