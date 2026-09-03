import { useId, useMemo, useState } from "react";

/*
  Dashboard charts.

  Hand-drawn SVG and HTML rather than a charting library. The dashboard is a
  lazy chunk, but it is still the client's own site, and a chart library would
  add more weight than every chart here put together. These are also the only
  four shapes the dashboard needs.

  Colour comes from the dashboard palette in admin.css, which is derived from
  the three brand colours only. Every chart carries a single series, so there
  is no categorical palette and no legend: the labels carry identity and one
  hue carries magnitude. The mark is --a-chart, which is the cyan-into-navy
  blend the interface uses for links (6.2:1 on the light surface, 6.6:1 as
  raw cyan on the dark one), so a bar reads clearly in both themes. Should a
  second or third series ever be needed, --a-chart-2 (navy) and --a-chart-3
  (an orange shade that clears 3:1 as a mark) are already defined beside it.

  Every chart also offers its numbers as a table, so nothing here depends on
  seeing colour or shape.
*/

const AXIS = "var(--a-text-faint)";
const GRID = "var(--a-line)";
const MARK = "var(--a-chart)";

export function ChartFrame({
  title,
  note,
  children,
  table,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  table: { columns: [string, string]; rows: [string, string][] };
}) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
          {note && (
            <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--a-text-faint)" }}>
              {note}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-[12px] font-semibold underline underline-offset-2"
          style={{ color: "var(--a-text-muted)" }}
          aria-expanded={showTable}
          aria-controls={id}
          onClick={() => setShowTable((open) => !open)}
        >
          {showTable ? "Show chart" : "Show numbers"}
        </button>
      </figcaption>

      {showTable ? (
        <div id={id} className="admin-table-wrap">
          {/* Two narrow columns fit a phone as they are, so this table is
              exempt from the stacked layout. */}
          <table className="admin-table admin-table-keep">
            <thead>
              <tr>
                <th scope="col">{table.columns[0]}</th>
                <th scope="col">{table.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(([label, value]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

/* ---- hero numbers ----
   A single figure is not a chart. It is one large number and a label. */

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="admin-card admin-card-pad">
      <div className="admin-stat">
        <span>{label}</span>
        <b>{value}</b>
        {hint && (
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{hint}</span>
        )}
      </div>
    </div>
  );
}

/* ---- change over time ----
   A line over a soft fill, a 2px stroke, markers only where the reader is
   pointing, and a crosshair that reports the exact day. No number is printed
   on every point. */

export interface TrendPoint {
  day: string;
  count: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const width = 720;
  const height = 220;
  const pad = { top: 14, right: 14, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...points.map((p) => p.count));
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;

  const x = (index: number) =>
    pad.left + (points.length <= 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value: number) => pad.top + plotH - (value / niceMax) * plotH;

  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.count)}`).join(" ");
  const area = points.length
    ? `${line} L${x(points.length - 1)},${pad.top + plotH} L${x(0)},${pad.top + plotH} Z`
    : "";

  const ticks = [0, niceMax / 2, niceMax];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * width;
    if (points.length < 2) return setHover(points.length ? 0 : null);
    const ratio = (px - pad.left) / plotW;
    const index = Math.round(ratio * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  };

  if (!points.length) {
    return (
      <p className="py-12 text-center text-[14px]" style={{ color: "var(--a-text-faint)" }}>
        No enquiries yet.
      </p>
    );
  }

  const active = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto", touchAction: "pan-y" }}
        role="img"
        aria-label={`Enquiries per day. Highest day, ${max}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MARK} stopOpacity="0.22" />
            <stop offset="100%" stopColor={MARK} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={GRID}
              strokeWidth="1"
            />
            <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={AXIS}>
              {tick}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={MARK}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.length <= 14 &&
          points.map((point, index) => (
            <circle
              key={point.day}
              cx={x(index)}
              cy={y(point.count)}
              r="4"
              fill={MARK}
              stroke="var(--a-surface)"
              strokeWidth="2"
            />
          ))}

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke={MARK}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover)}
              cy={y(points[hover].count)}
              r="5.5"
              fill={MARK}
              stroke="var(--a-surface)"
              strokeWidth="2"
            />
          </g>
        )}

        <text x={pad.left} y={height - 7} fontSize="11" fill={AXIS}>
          {shortDay(points[0].day)}
        </text>
        {points.length > 1 && (
          <text x={width - pad.right} y={height - 7} fontSize="11" fill={AXIS} textAnchor="end">
            {shortDay(points[points.length - 1].day)}
          </text>
        )}
      </svg>

      <p
        className="mt-1 text-center text-[12.5px]"
        style={{ color: "var(--a-text-muted)", minHeight: "1.2em" }}
        aria-live="polite"
      >
        {active
          ? `${shortDay(active.day)}: ${active.count} ${active.count === 1 ? "enquiry" : "enquiries"}`
          : "Point at the chart to read a day."}
      </p>
    </div>
  );
}

function shortDay(day: string) {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ---- magnitude across named categories ----
   Horizontal bars, because the labels are words and words read better across
   than rotated. Each bar is square where it meets the baseline and rounded at
   the data end, with a 2px gap between neighbours. */

export interface BarItem {
  label: string;
  value: number;
}

export function BarList({ items, unit = "" }: { items: BarItem[]; unit?: string }) {
  const max = useMemo(() => Math.max(1, ...items.map((item) => item.value)), [items]);

  if (!items.length) {
    return (
      <p className="py-10 text-center text-[14px]" style={{ color: "var(--a-text-faint)" }}>
        Nothing to show yet.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {items.map((item) => (
        <li key={item.label} className="py-[3px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13.5px] font-medium">{item.label}</span>
            <span className="flex-none text-[13px] font-semibold tabular-nums">
              {item.value}
              {unit}
            </span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden"
            style={{ background: "var(--a-surface-2)", borderRadius: "0 4px 4px 0" }}
          >
            <div
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                height: "100%",
                background: MARK,
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Turns a count map into the ordered list a BarList wants, folding a long
   tail into one row rather than inventing more categories. */
export function toBarItems(
  counts: Record<string, number>,
  options: { limit?: number; label?: (key: string) => string } = {},
) {
  const { limit = 8, label = (key: string) => key } = options;
  const sorted = Object.entries(counts)
    .map(([key, value]) => ({ label: label(key), value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);
  return tail ? [...head, { label: "All others", value: tail }] : head;
}

/* Fills in the quiet days so a gap in enquiries reads as a dip rather than
   disappearing from the axis. */
export function toTrendPoints(byDay: Record<string, number>, days = 30): TrendPoint[] {
  const points: TrendPoint[] = [];
  const today = new Date();
  for (let back = days - 1; back >= 0; back -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - back);
    const key = date.toISOString().slice(0, 10);
    points.push({ day: key, count: byDay[key] ?? 0 });
  }
  return points;
}
