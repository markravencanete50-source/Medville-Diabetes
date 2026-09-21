import { CalendarDays } from "lucide-react";
import { Field } from "./ui";

export interface DateRange {
  from: string;
  to: string;
}

export function recentRange(days: number): DateRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - Math.max(0, days - 1));
  return { from: localDay(from), to: localDay(to) };
}

export function rangeLabel(range: DateRange) {
  if (!range.from && !range.to) return "All time";
  if (range.from && range.to) return `${prettyDay(range.from)} to ${prettyDay(range.to)}`;
  return range.from ? `From ${prettyDay(range.from)}` : `Through ${prettyDay(range.to)}`;
}

export default function DateRangeFilter({
  value,
  onChange,
  allTime = true,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  allTime?: boolean;
}) {
  const applyPreset = (days: number) => onChange(recentRange(days));
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={17} aria-hidden="true" style={{ color: "var(--a-brand-text)" }} />
          <div>
            <p className="admin-label m-0">Calendar range</p>
            <p className="admin-help m-0">{rangeLabel(value)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Date range shortcuts">
          {[7, 30, 90].map((days) => (
            <button key={days} type="button" className="admin-btn admin-btn-quiet admin-btn-sm" onClick={() => applyPreset(days)}>
              {days} days
            </button>
          ))}
          {allTime && <button type="button" className="admin-btn admin-btn-quiet admin-btn-sm" onClick={() => onChange({ from: "", to: "" })}>All time</button>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From" htmlFor="date-range-from">
          <input id="date-range-from" className="admin-input" type="date" value={value.from} max={value.to || undefined} onChange={(event) => onChange({ ...value, from: event.target.value })} />
        </Field>
        <Field label="To" htmlFor="date-range-to">
          <input id="date-range-to" className="admin-input" type="date" value={value.to} min={value.from || undefined} onChange={(event) => onChange({ ...value, to: event.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function localDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prettyDay(day: string) {
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? day
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
