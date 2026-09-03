import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronDown, Pipette } from "lucide-react";
import { HEX_COLOR } from "../data/blog";
import { Popover } from "./Popover";

/*
  A colour picker in the shape of a design tool's: a plane for saturation and
  brightness, a hue slider under it, the code in hex, RGB or HSL, the brand
  colours, any named swatches the caller offers, and the last few colours the
  person chose. Where the browser allows it there is also an eyedropper.

  Whatever route a colour takes through here, it leaves as a lowercase
  #rrggbb string. That is the one shape the blog decoder and the site colour
  reader accept, so nothing this control can produce is ever dropped on the
  way back in.

  The hue strip and the plane are the one place in the dashboard that shows
  every colour there is. They are the control itself, not the palette: the
  dashboard's own chrome stays inside the three brand colours.
*/

export interface ColorPreset {
  id: string;
  label: string;
  hex: string;
}

const BRAND: ColorPreset[] = [
  { id: "#00293b", label: "Navy", hex: "#00293b" },
  { id: "#18bada", label: "Cyan", hex: "#18bada" },
  { id: "#ff9e1b", label: "Orange", hex: "#ff9e1b" },
];

const RECENT_KEY = "medville:admin-recent-colours";
const RECENT_MAX = 12;

/* Where the plane starts when the block has no colour yet: the site's own
   link blue, so the first drag begins somewhere sensible. */
const START = "#0a6d8a";

/* ---- the maths ---- */

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`;
}

interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255];
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const { h } = rgbToHsv(r, g, b);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255];
}

/* ---- recent colours, kept in this browser only ---- */

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((v): v is string => typeof v === "string" && HEX_COLOR.test(v)).slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(hex: string) {
  try {
    const next = [hex, ...readRecent().filter((v) => v !== hex)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private window */
  }
}

/* The browser's own eyedropper, where it exists. */
interface EyeDropperCtor {
  new (): { open(): Promise<{ sRGBHex: string }> };
}

type Mode = "hex" | "rgb" | "hsl";

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p
        className="m-0 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "var(--a-text-faint)" }}
      >
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Swatch({
  colour,
  pressed,
  onPick,
}: {
  colour: ColorPreset;
  pressed: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="admin-swatch"
      title={colour.label}
      aria-label={colour.label}
      aria-pressed={pressed}
      style={{ background: colour.hex }}
      onClick={onPick}
    />
  );
}

export function ColorPicker({
  label,
  id,
  value,
  presets = [],
  allowClear = false,
  onChange,
}: {
  /* A caption above the control. Leave it out when a Field already labels it. */
  label?: string;
  id?: string;
  /* A preset id, a #rrggbb code, or nothing for the default. */
  value: string | undefined;
  /* Named colours the caller wants offered, such as the blog's brand swatches. */
  presets?: ColorPreset[];
  /* Whether "use the default" is an option, which clears the value. */
  allowClear?: boolean;
  onChange: (next: string | undefined) => void;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("hex");
  const [recent, setRecent] = useState<string[]>([]);
  const labelId = useId();
  const valueId = useId();

  const preset = presets.find((p) => p.id === value);
  const hex = preset
    ? preset.hex.toLowerCase()
    : value && HEX_COLOR.test(value)
      ? value.toLowerCase()
      : undefined;

  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(...hexToRgb(hex ?? START)));

  /* Follow a change made from outside, but not one this picker just made:
     converting a grey or a black back to HSV loses its hue, and the slider
     would jump to red under the person's finger. */
  useEffect(() => {
    if (!hex) return;
    setHsv((current) =>
      rgbToHex(...hsvToRgb(current.h, current.s, current.v)) === hex ? current : rgbToHsv(...hexToRgb(hex)),
    );
  }, [hex]);

  const [hexText, setHexText] = useState(hex ?? "");
  useEffect(() => {
    setHexText(hex ?? "");
  }, [hex]);

  const openedWith = useRef<string | undefined>(undefined);

  const openPicker = () => {
    openedWith.current = hex;
    setRecent(readRecent());
    setOpen(true);
  };

  /* Closing records the colour among the recent ones, if it changed. */
  const close = useCallback(() => {
    setOpen(false);
    if (hex && hex !== openedWith.current) writeRecent(hex);
  }, [hex]);

  const commitHsv = (next: Hsv) => {
    setHsv(next);
    onChange(rgbToHex(...hsvToRgb(next.h, next.s, next.v)));
  };

  const commitHex = (next: string) => onChange(next.toLowerCase());

  const pickFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const s = clamp((event.clientX - rect.left) / rect.width);
    const v = 1 - clamp((event.clientY - rect.top) / rect.height);
    commitHsv({ h: hsv.h, s, v });
  };

  const onPlaneKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    let { s, v } = hsv;
    switch (event.key) {
      case "ArrowLeft":
        s -= step;
        break;
      case "ArrowRight":
        s += step;
        break;
      case "ArrowUp":
        v += step;
        break;
      case "ArrowDown":
        v -= step;
        break;
      default:
        return;
    }
    event.preventDefault();
    commitHsv({ h: hsv.h, s: clamp(s), v: clamp(v) });
  };

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v).map(Math.round) as [number, number, number];
  const hsl = rgbToHsl(...rgb);
  const shown = hex ?? rgbToHex(...rgb);
  const hueColor = `hsl(${Math.round(hsv.h)} 100% 50%)`;
  const canDrop = typeof window !== "undefined" && "EyeDropper" in window;

  const dropper = async () => {
    try {
      const Ctor = (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper;
      const result = await new Ctor().open();
      commitHex(result.sRGBHex);
    } catch {
      /* the person pressed Escape */
    }
  };

  const setRgbChannel = (index: 0 | 1 | 2, raw: string) => {
    const next: [number, number, number] = [...rgb];
    next[index] = clamp(Number(raw) || 0, 0, 255);
    commitHex(rgbToHex(...next));
  };

  const setHslChannel = (key: "h" | "s" | "l", raw: string) => {
    const n = Number(raw) || 0;
    const next = {
      h: key === "h" ? clamp(n, 0, 360) : hsl.h,
      s: key === "s" ? clamp(n, 0, 100) / 100 : hsl.s,
      l: key === "l" ? clamp(n, 0, 100) / 100 : hsl.l,
    };
    commitHex(rgbToHex(...hslToRgb(next.h, next.s, next.l)));
  };

  const numberField = (
    caption: string,
    fieldValue: number,
    max: number,
    onInput: (raw: string) => void,
  ) => (
    <label
      key={caption}
      className="text-[11px] font-semibold"
      style={{ color: "var(--a-text-faint)" }}
    >
      {caption}
      <input
        type="number"
        min={0}
        max={max}
        className="admin-mini-input mt-1"
        value={fieldValue}
        onChange={(event) => onInput(event.target.value)}
      />
    </label>
  );

  return (
    <div className="admin-popover-anchor">
      {label && (
        <p className="admin-label" id={labelId}>
          {label}
        </p>
      )}
      <button
        ref={anchor}
        type="button"
        id={id}
        className="admin-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
        onClick={() => (open ? close() : openPicker())}
      >
        <span
          className="admin-swatch"
          aria-hidden="true"
          style={hex ? { background: hex } : { background: "transparent", borderStyle: "dashed" }}
        />
        <span id={valueId}>{preset ? preset.label : (hex ?? "Default")}</span>
        <ChevronDown size={15} aria-hidden="true" style={{ color: "var(--a-text-faint)" }} />
      </button>

      <Popover open={open} onClose={close} anchor={anchor} label={`${label ?? "Colour"} picker`}>
        <div className="flex flex-col gap-3">
          <div
            className="admin-sv"
            role="slider"
            tabIndex={0}
            aria-label="Saturation and brightness"
            aria-valuenow={Math.round(hsv.v * 100)}
            aria-valuetext={`Saturation ${Math.round(hsv.s * 100)} percent, brightness ${Math.round(hsv.v * 100)} percent`}
            style={{ "--sv-hue": hueColor } as CSSProperties}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pickFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons & 1) pickFromPointer(event);
            }}
            onKeyDown={onPlaneKey}
          >
            <span
              className="admin-sv-thumb"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: shown }}
            />
          </div>

          <input
            type="range"
            className="admin-hue"
            min={0}
            max={360}
            step={1}
            value={Math.round(hsv.h)}
            aria-label="Hue"
            style={{ "--hue-thumb": hueColor } as CSSProperties}
            onChange={(event) => commitHsv({ ...hsv, h: Number(event.target.value) })}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="admin-picker-mode" role="group" aria-label="Colour code format">
              {(["hex", "rgb", "hsl"] as Mode[]).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            {canDrop && (
              <button
                type="button"
                className="admin-btn admin-btn-quiet admin-btn-sm"
                onClick={() => void dropper()}
              >
                <Pipette size={14} aria-hidden="true" /> Pick from screen
              </button>
            )}
          </div>

          {mode === "hex" && (
            <input
              className="admin-mini-input"
              value={hexText}
              spellCheck={false}
              aria-label="Colour code"
              placeholder="#0a6d8a"
              onChange={(event) => {
                const next = event.target.value.trim();
                setHexText(next);
                if (HEX_COLOR.test(next)) commitHex(next);
              }}
            />
          )}
          {mode === "rgb" && (
            <div className="grid grid-cols-3 gap-2">
              {numberField("R", rgb[0], 255, (raw) => setRgbChannel(0, raw))}
              {numberField("G", rgb[1], 255, (raw) => setRgbChannel(1, raw))}
              {numberField("B", rgb[2], 255, (raw) => setRgbChannel(2, raw))}
            </div>
          )}
          {mode === "hsl" && (
            <div className="grid grid-cols-3 gap-2">
              {numberField("H", Math.round(hsl.h), 360, (raw) => setHslChannel("h", raw))}
              {numberField("S", Math.round(hsl.s * 100), 100, (raw) => setHslChannel("s", raw))}
              {numberField("L", Math.round(hsl.l * 100), 100, (raw) => setHslChannel("l", raw))}
            </div>
          )}

          <Row title="Brand">
            {BRAND.map((colour) => (
              <Swatch
                key={colour.id}
                colour={colour}
                pressed={hex === colour.hex}
                onPick={() => commitHex(colour.hex)}
              />
            ))}
          </Row>

          {presets.length > 0 && (
            <Row title="Site colours">
              {presets.map((colour) => (
                <Swatch
                  key={colour.id}
                  colour={colour}
                  pressed={value === colour.id}
                  onPick={() => onChange(value === colour.id && allowClear ? undefined : colour.id)}
                />
              ))}
            </Row>
          )}

          {recent.length > 0 && (
            <Row title="Recent">
              {recent.map((code) => (
                <Swatch
                  key={code}
                  colour={{ id: code, label: code, hex: code }}
                  pressed={hex === code}
                  onPick={() => commitHex(code)}
                />
              ))}
            </Row>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {allowClear && value !== undefined ? (
              <button
                type="button"
                className="admin-btn admin-btn-quiet admin-btn-sm"
                onClick={() => onChange(undefined)}
              >
                Use the default
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={close}>
              Done
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
