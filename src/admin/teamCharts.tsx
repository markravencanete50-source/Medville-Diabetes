import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { prettyDay } from "./RangePicker";

/*
  The Sales team charts: a business view of what the team did over the
  chosen days. Hand-drawn SVG and HTML, like charts.tsx, for the same reason.

  Two series at most per chart, in --a-series-1 (cyan) and --a-series-2
  (orange), a pair checked for colour blindness in both themes. Every chart
  with two series has a legend, and the number a reader points at is printed
  in words beneath the chart, so nothing depends on telling colours apart.
  Each chart sits in a ChartFrame, which also offers its numbers as a table.
*/

const AXIS = "var(--a-text-faint)";
const GRID = "var(--a-line)";
export const SERIES = ["var(--a-series-1)", "var(--a-series-2)"] as const;

export interface Series {
  key: string;
  label: string;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="admin-chart-legend" aria-label="Key">
      {series.map((item, index) => (
        <li key={item.key}>
          <span className="admin-chart-swatch" style={{ background: SERIES[index] }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* Draws at the card's real width, so axis text stays 11px on a phone instead
   of shrinking with a scaled drawing. */
function useWidth(fallback = 720) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const niceMax = (max: number) => (max <= 4 ? 4 : max <= 10 ? 10 : Math.ceil(max / 5) * 5);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ---- one headline figure, with the change from the period before ---- */

export function KpiTile({
  label,
  value,
  previous,
  hint,
  percent = false,
  periodDays,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  hint?: string;
  percent?: boolean;
  periodDays: number;
}) {
  const shown = value === null ? "No data" : percent ? `${value}%` : value.toLocaleString();
  let change = "";
  let Icon = ArrowRight;
  if (value !== null && previous !== undefined && previous !== null) {
    const before = `the ${plural(periodDays, "day", "days")} before`;
    if (percent) {
      const diff = value - previous;
      change = diff === 0 ? `Same as ${before}` : `${Math.abs(diff)} points ${diff > 0 ? "higher" : "lower"} than ${before}`;
      Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : ArrowRight;
    } else if (previous === 0) {
      change = value === 0 ? `None in ${before} either` : `None in ${before}`;
      Icon = value > 0 ? ArrowUpRight : ArrowRight;
    } else {
      const pct = Math.round(((value - previous) / previous) * 100);
      change = pct === 0 ? `Same as ${before}` : `${Math.abs(pct)}% ${pct > 0 ? "up" : "down"} on ${before}`;
      Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : ArrowRight;
    }
  }
  return (
    <div className="admin-card admin-card-pad">
      <div className="admin-stat">
        <span>{label}</span>
        <b>{shown}</b>
        {change && (
          <span className="admin-kpi-change">
            <Icon size={14} aria-hidden="true" /> {change}
          </span>
        )}
        {hint && <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{hint}</span>}
      </div>
    </div>
  );
}

/* ---- two counts per day, as lines ----
   One axis: both are counts of things done on a day. A crosshair reads the
   exact day. Markers appear only on short ranges. */

export function DailyLines({
  days,
  series,
}: {
  days: { day: string; values: number[] }[];
  series: Series[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [box, width] = useWidth();
  const height = width < 480 ? 180 : 220;
  const pad = { top: 14, right: 16, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const top = niceMax(Math.max(1, ...days.flatMap((d) => d.values)));
  const x = (i: number) => pad.left + (days.length <= 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;

  if (!days.length) return <div ref={box}><p className="py-12 text-center text-[14px]" style={{ color: AXIS }}>Nothing in these days.</p></div>;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * width;
    const i = days.length < 2 ? 0 : Math.round(((px - pad.left) / plotW) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  };
  const active = hover === null ? null : days[hover];

  return (
    <div ref={box}>
      <Legend series={series} />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto", touchAction: "pan-y" }}
        role="img"
        aria-label={series.map((s, si) => `${s.label}: ${days.reduce((sum, d) => sum + d.values[si], 0)} in total`).join(". ")}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
            <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={AXIS}>{tick}</text>
          </g>
        ))}
        {series.map((s, si) => (
          <path
            key={s.key}
            d={days.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.values[si])}`).join(" ")}
            fill="none"
            stroke={SERIES[si]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {days.length <= 14 && series.map((s, si) => days.map((d, i) => (
          <circle key={`${s.key}-${d.day}`} cx={x(i)} cy={y(d.values[si])} r="4" fill={SERIES[si]} stroke="var(--a-surface)" strokeWidth="2" />
        )))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke={AXIS} strokeWidth="1" strokeDasharray="3 3" />
            {series.map((s, si) => (
              <circle key={s.key} cx={x(hover)} cy={y(days[hover].values[si])} r="5.5" fill={SERIES[si]} stroke="var(--a-surface)" strokeWidth="2" />
            ))}
          </g>
        )}
        <text x={pad.left} y={height - 7} fontSize="11" fill={AXIS}>{prettyDay(days[0].day)}</text>
        {days.length > 1 && <text x={width - pad.right} y={height - 7} fontSize="11" fill={AXIS} textAnchor="end">{prettyDay(days[days.length - 1].day)}</text>}
      </svg>
      <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--a-text-muted)", minHeight: "1.2em" }} aria-live="polite">
        {active
          ? `${prettyDay(active.day, true)}: ${series.map((s, si) => `${s.label.toLowerCase()} ${active.values[si]}`).join(", ")}`
          : "Point at the chart to read a day."}
      </p>
    </div>
  );
}

/* ---- two outcomes per day, as stacked columns ----
   Each column is one day. The two parts are separated by a 2px gap, and the
   top part has its data end rounded. */

export function DailyColumns({
  days,
  series,
}: {
  days: { day: string; values: [number, number] }[];
  series: Series[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [box, width] = useWidth();
  const height = width < 480 ? 150 : 180;
  const pad = { top: 12, right: 16, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const top = niceMax(Math.max(1, ...days.map((d) => d.values[0] + d.values[1])));
  const slot = plotW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(28, slot - 2));
  const h = (v: number) => (v / top) * plotH;
  const active = hover === null ? null : days[hover];

  return (
    <div ref={box}>
      <Legend series={series} />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label={series.map((s, si) => `${s.label}: ${days.reduce((sum, d) => sum + d.values[si], 0)} in total`).join(". ")}
        onPointerLeave={() => setHover(null)}
      >
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH - h(tick)} y2={pad.top + plotH - h(tick)} stroke={GRID} strokeWidth="1" />
            <text x={pad.left - 8} y={pad.top + plotH - h(tick) + 4} textAnchor="end" fontSize="11" fill={AXIS}>{tick}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = pad.left + slot * i + (slot - barW) / 2;
          const base = pad.top + plotH;
          const lower = h(d.values[0]);
          const gap = d.values[0] && d.values[1] ? 2 : 0;
          const upper = Math.max(0, h(d.values[1]) - gap);
          const r = Math.min(4, barW / 2);
          return (
            <g key={d.day} onPointerEnter={() => setHover(i)}>
              {/* The hit area is the whole slot, taller and wider than the mark. */}
              <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill="transparent" />
              {d.values[0] > 0 && (
                <path d={roundedTop(cx, base - lower, barW, lower, d.values[1] ? 0 : r)} fill={SERIES[0]} opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
              {d.values[1] > 0 && (
                <path d={roundedTop(cx, base - lower - gap - upper, barW, upper, r)} fill={SERIES[1]} opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
            </g>
          );
        })}
        {days.length > 0 && <text x={pad.left} y={height - 7} fontSize="11" fill={AXIS}>{prettyDay(days[0].day)}</text>}
        {days.length > 1 && <text x={width - pad.right} y={height - 7} fontSize="11" fill={AXIS} textAnchor="end">{prettyDay(days[days.length - 1].day)}</text>}
      </svg>
      <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--a-text-muted)", minHeight: "1.2em" }} aria-live="polite">
        {active
          ? `${prettyDay(active.day, true)}: ${series.map((s, si) => `${s.label.toLowerCase()} ${active.values[si]}`).join(", ")}`
          : "Point at a day to read it."}
      </p>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/* ---- two counts per person, as paired horizontal bars ----
   Names read across, so the bars run across. Each person has a pair, 2px
   apart, with the value printed at the end of each bar. */

export function PersonBars({
  rows,
  series,
}: {
  rows: { label: string; values: [number, number] }[];
  series: Series[];
}) {
  const max = Math.max(1, ...rows.flatMap((row) => row.values));
  if (!rows.length) return <p className="py-10 text-center text-[14px]" style={{ color: AXIS }}>Nobody on the team yet.</p>;
  return (
    <div>
      <Legend series={series} />
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row) => (
          <li key={row.label}>
            <p className="m-0 mb-1 truncate text-[13.5px] font-medium">{row.label}</p>
            {row.values.map((value, si) => (
              <div key={series[si].key} className="admin-person-bar" title={`${row.label}, ${series[si].label.toLowerCase()}: ${value}`}>
                <span className="admin-person-bar-track">
                  <span style={{ width: `${value ? Math.max(2, (value / max) * 100) : 0}%`, background: SERIES[si] }} />
                </span>
                <span className="admin-person-bar-value">
                  <span className="sr-only">{series[si].label}: </span>{value}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- from enquiry to qualified ----
   One hue: the steps are one quantity narrowing. Each step says what share
   of the enquiries received reached it. */

export function Funnel({ steps }: { steps: { label: string; value: number; note?: string }[] }) {
  const first = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {steps.map((step, index) => {
        const share = Math.round((step.value / first) * 100);
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-medium">{step.label}</span>
              <span className="text-[13px] font-semibold tabular-nums">
                {step.value.toLocaleString()}
                {index > 0 && <span className="ml-1.5 font-medium" style={{ color: "var(--a-text-muted)" }}>{share}%</span>}
              </span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden" style={{ background: "var(--a-surface-2)", borderRadius: "0 4px 4px 0" }}>
              <div style={{ width: `${step.value ? Math.max(2, (step.value / first) * 100) : 0}%`, height: "100%", background: SERIES[0], borderRadius: "0 4px 4px 0" }} />
            </div>
            {step.note && <p className="admin-help m-0 mt-1">{step.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
