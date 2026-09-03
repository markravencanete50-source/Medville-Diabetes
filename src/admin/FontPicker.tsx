import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  FONTS,
  FONT_CATEGORY_LABEL,
  ensureFontLoaded,
  ensureFontPreview,
  fontById,
  fontFamily,
  type FontCategory,
} from "../data/fonts";
import { Popover } from "./Popover";

/*
  A font picker: a search box, a row of category chips, and a list in which
  every family is shown in its own face.

  Showing 180 faces at once would mean 180 stylesheets, so a row fetches a
  preview of its family only when it scrolls into view, and that preview
  holds just the letters of the family's own name. The full family is fetched
  by ensureFontLoaded when a face is chosen, the same as before.

  Choosing the block's default face stores nothing, so an untouched block
  stays untouched and follows the site if its faces ever change.
*/

const CATEGORIES = Object.keys(FONT_CATEGORY_LABEL) as FontCategory[];

export function FontPicker({
  label = "Font",
  value,
  fallback,
  onPick,
}: {
  label?: string;
  value: string | undefined;
  /* The face a block uses when none is chosen: the body face for text, the
     display face for a heading or a quote. */
  fallback: "body" | "display";
  onPick: (id: string | undefined) => void;
}) {
  const current = value ?? fallback;
  const face = fontById(current);
  const anchor = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [active, setActive] = useState(0);
  const labelId = useId();
  const listId = useId();
  const optionPrefix = useId();

  useEffect(() => {
    ensureFontLoaded(current);
  }, [current]);

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return FONTS.filter(
      (font) =>
        (category === "all" || font.category === category) &&
        (!term || font.label.toLowerCase().includes(term)),
    );
  }, [query, category]);

  useEffect(() => {
    setActive(0);
  }, [query, category]);

  /* Previews are fetched as rows come into view, and a row is watched only
     until its preview has been asked for. */
  useEffect(() => {
    const root = scroller.current;
    if (!open || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          ensureFontPreview((entry.target as HTMLElement).dataset.font);
          observer.unobserve(entry.target);
        }
      },
      { root, rootMargin: "160px 0px" },
    );
    root.querySelectorAll<HTMLElement>("[data-font]").forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [open, list]);

  /* On a desktop the search box takes focus at once. On a phone it does not,
     because the keyboard would cover half the sheet before the person has
     seen the list. */
  useEffect(() => {
    if (open && window.innerWidth >= 640) search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scroller.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (id: string | undefined) => {
    onPick(id === fallback ? undefined : id);
    setOpen(false);
    anchor.current?.focus();
  };

  const onKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(list.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const font = list[active];
      if (font) pick(font.id);
    }
  };

  const fallbackFace = fontById(fallback);

  return (
    <div className="admin-popover-anchor">
      <p className="admin-label" id={labelId}>
        {label}
      </p>
      <button
        ref={anchor}
        type="button"
        className="admin-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((state) => !state)}
      >
        <span className="text-[16px]" style={{ fontFamily: fontFamily(current, fallback) }}>
          {face?.label ?? current}
        </span>
        <small
          className="text-[11px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "var(--a-text-faint)" }}
        >
          {face ? FONT_CATEGORY_LABEL[face.category] : ""}
        </small>
        <ChevronDown size={15} aria-hidden="true" style={{ color: "var(--a-text-faint)" }} />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} label="Font picker">
        <div className="relative mb-2">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--a-text-faint)" }}
          />
          <input
            ref={search}
            className="admin-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search fonts"
            aria-label="Search fonts"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={list[active] ? `${optionPrefix}-${list[active].id}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKey}
          />
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            className="admin-chip"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {CATEGORIES.map((entry) => (
            <button
              key={entry}
              type="button"
              className="admin-chip"
              aria-pressed={category === entry}
              onClick={() => setCategory(entry)}
            >
              {FONT_CATEGORY_LABEL[entry]}
            </button>
          ))}
        </div>

        <ul ref={scroller} id={listId} role="listbox" aria-labelledby={labelId} className="admin-font-list">
          {value !== undefined && !query && category === "all" && (
            <li role="option" aria-selected={false} className="admin-font-row" onClick={() => pick(undefined)}>
              <b style={{ fontFamily: fontFamily(fallback, fallback) }}>
                Use the default ({fallbackFace?.label ?? fallback})
              </b>
            </li>
          )}
          {list.length === 0 && (
            <li className="admin-help px-2 py-4 text-center" aria-live="polite">
              No font matches that.
            </li>
          )}
          {list.map((font, index) => (
            <li
              key={font.id}
              id={`${optionPrefix}-${font.id}`}
              role="option"
              aria-selected={font.id === current}
              data-font={font.id}
              data-index={index}
              data-active={index === active}
              className="admin-font-row"
              onMouseMove={() => setActive(index)}
              onClick={() => pick(font.id)}
            >
              <span className="min-w-0">
                <b className="block truncate" style={{ fontFamily: font.family }}>
                  {font.label}
                </b>
                <small>{FONT_CATEGORY_LABEL[font.category]}</small>
              </span>
              {font.id === current && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
