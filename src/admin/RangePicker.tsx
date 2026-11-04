import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "./Popover";

/*
  A calendar for choosing a run of days, for the Sales team charts.

  One button names the range. It opens a panel with ready-made ranges down
  one side and a month calendar beside them: press a first day, then a last
  day, and Apply. Days are California days, because that is where the
  business runs and where the server counts, so "Today" is the same day for
  everyone who opens the screen. Days after today cannot be chosen, and a
  range is held to the longest the server will count.
*/

export interface DayRange {
  from: string;
  to: string;
}

const PACIFIC = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const pacificToday = () => PACIFIC.format(new Date());

/* Days are plain "YYYY-MM-DD" strings. Noon UTC keeps the arithmetic clear
   of any daylight-saving edge. */
export function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;
}
const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
function addMonths(day: string, n: number) {
  const [y, m] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  return date.toISOString().slice(0, 10);
}
const lastOfMonth = (day: string) => addDays(addMonths(monthStart(day), 1), -1);

export function prettyDay(day: string, withYear = false) {
  const date = new Date(`${day}T12:00:00Z`);
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function rangeText(range: DayRange) {
  if (range.from === range.to) return prettyDay(range.from, true);
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${prettyDay(range.from, !sameYear)} to ${prettyDay(range.to, true)}`;
}

interface Preset {
  label: string;
  range: (today: string) => DayRange;
}

export const PRESETS: Preset[] = [
  { label: "Today", range: (t) => ({ from: t, to: t }) },
  { label: "Yesterday", range: (t) => ({ from: addDays(t, -1), to: addDays(t, -1) }) },
  { label: "Last 7 days", range: (t) => ({ from: addDays(t, -6), to: t }) },
  { label: "Last 30 days", range: (t) => ({ from: addDays(t, -29), to: t }) },
  { label: "This month", range: (t) => ({ from: monthStart(t), to: t }) },
  {
    label: "Last month",
    range: (t) => {
      const start = addMonths(monthStart(t), -1);
      return { from: start, to: lastOfMonth(start) };
    },
  },
  { label: "Last 90 days", range: (t) => ({ from: addDays(t, -89), to: t }) },
];

export function presetName(range: DayRange) {
  const today = pacificToday();
  return PRESETS.find((preset) => {
    const r = preset.range(today);
    return r.from === range.from && r.to === range.to;
  })?.label;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function RangePicker({
  value,
  onChange,
  maxDays = 92,
}: {
  value: DayRange;
  onChange: (range: DayRange) => void;
  maxDays?: number;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthStart(value.to));
  const [start, setStart] = useState<string | null>(null);
  const [draft, setDraft] = useState<DayRange>(value);
  const [hover, setHover] = useState<string | null>(null);
  const today = pacificToday();

  const openPanel = () => {
    setDraft(value);
    setStart(null);
    setMonth(monthStart(value.to));
    setOpen(true);
  };
  const close = () => setOpen(false);
  const apply = (range: DayRange) => {
    onChange(range);
    setOpen(false);
  };

  /* While the first day is chosen and the second is not, the range follows
     the pointer so the reader sees what they are about to pick. */
  const shown: DayRange = start
    ? hover
      ? hover < start ? { from: hover, to: start } : { from: start, to: hover }
      : { from: start, to: start }
    : draft;

  const cells = useMemo(() => {
    const first = new Date(`${month}T12:00:00Z`).getUTCDay();
    const last = lastOfMonth(month);
    const list: (string | null)[] = Array.from({ length: first }, () => null);
    for (let d = month; d <= last; d = addDays(d, 1)) list.push(d);
    while (list.length % 7) list.push(null);
    return list;
  }, [month]);

  const tooFar = (day: string) => Boolean(start && Math.abs(daysBetween(start, day)) > maxDays);
  const pick = (day: string) => {
    if (!start) {
      setStart(day);
      setDraft({ from: day, to: day });
      return;
    }
    const range = day < start ? { from: day, to: start } : { from: start, to: day };
    setStart(null);
    setDraft(range);
  };

  const label = presetName(value);
  const monthTitle = new Date(`${month}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", month: "long", year: "numeric" });

  return (
    <div className="admin-popover-anchor">
      <button
        ref={anchor}
        type="button"
        className="admin-range-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span className="min-w-0 text-left">
          <span className="admin-range-trigger-label">{label ?? "Custom range"}</span>
          <span className="admin-range-trigger-days">{rangeText(value)}</span>
        </span>
      </button>

      <Popover open={open} onClose={close} anchor={anchor} label="Choose the days to show" className="admin-popover-range">
        <div className="admin-range-panel">
          <ul className="admin-range-presets" aria-label="Ready-made ranges">
            {PRESETS.map((preset) => {
              const r = preset.range(today);
              const active = r.from === shown.from && r.to === shown.to;
              return (
                <li key={preset.label}>
                  <button type="button" aria-pressed={active} onClick={() => apply(r)}>
                    {preset.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="admin-range-calendar">
            <div className="admin-range-month">
              <button type="button" className="admin-range-nav" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <p aria-live="polite">{monthTitle}</p>
              <button
                type="button"
                className="admin-range-nav"
                aria-label="Next month"
                disabled={addMonths(month, 1) > today}
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-range-grid" role="grid" aria-label={monthTitle} onPointerLeave={() => setHover(null)}>
              {WEEKDAYS.map((day) => (
                <span key={day} className="admin-range-weekday" aria-hidden="true">{day}</span>
              ))}
              {cells.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                const disabled = day > today || tooFar(day);
                const inside = day >= shown.from && day <= shown.to;
                const edge = day === shown.from || day === shown.to;
                return (
                  <button
                    key={day}
                    type="button"
                    className="admin-range-day"
                    data-inside={inside || undefined}
                    data-edge={edge || undefined}
                    data-today={day === today || undefined}
                    disabled={disabled}
                    aria-pressed={edge}
                    aria-label={new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    onPointerEnter={() => setHover(day)}
                    onFocus={() => setHover(day)}
                    onClick={() => pick(day)}
                  >
                    {Number(day.slice(8))}
                  </button>
                );
              })}
            </div>

            <p className="admin-help mt-2" aria-live="polite">
              {start ? "Now choose the last day." : `${rangeText(draft)}, ${daysBetween(draft.from, draft.to)} ${daysBetween(draft.from, draft.to) === 1 ? "day" : "days"}. California time.`}
            </p>

            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="admin-btn admin-btn-quiet admin-btn-sm" onClick={close}>Cancel</button>
              <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={Boolean(start)} onClick={() => apply(draft)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </Popover>
    </div>
  );
}
