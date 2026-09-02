import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { loadTheme, saveTheme, THEME_DEFAULTS, type ThemeRecord } from "../data";
import { Banner, Card, Field, PageHeader, Spinner, useToast } from "../ui";

/*
  Colours.

  The client can change four brand colours, and every change is checked for
  readability before it can be saved. Buttons are not among them: every
  button is the highlight colour or the text colour, so they follow those
  two and cannot be set apart from them. This is the guarded approach on purpose:
  a free colour picker on a medical supply site produces grey text on a pale
  background within a week, and the people reading this site are checking
  glucose information.

  The checks are the WCAG contrast ratios for the job each colour actually
  does, computed here rather than judged by eye. A failing combination cannot
  be saved; it is shown with the ratio it reached and the one it needed.
*/

interface TokenDef {
  key: keyof ThemeRecord;
  label: string;
  help: string;
  /*
    What the colour must be readable against, and how strictly.

    Blocking checks are the ones where text sits on the colour or is made
    of it. Failing one makes the site unreadable, so it stops the save.
    Advisory checks cover decoration, where a low ratio is a caution and
    not a fault. The brand cyan reaches only 2.3 to 1 on white and is the
    palette the site already ships: blocking it would greet the client
    with an error they never caused, on a value that is correct for the
    glucose wave and the underlines it actually paints.
  */
  check: {
    against: keyof ThemeRecord | "#ffffff";
    ratio: number;
    reason: string;
    blocking: boolean;
  };
}

const TOKENS: TokenDef[] = [
  {
    key: "brand",
    label: "Brand colour",
    help: "Links, headings and small controls.",
    check: {
      against: "#ffffff",
      ratio: 4.5,
      reason: "It is used for text, so it needs 4.5 to 1 against white.",
      blocking: true,
    },
  },
  {
    key: "brandBright",
    label: "Highlight colour",
    help: "The main buttons, marks, underlines and the glucose wave. Button text on it is always the text colour.",
    check: {
      against: "#ffffff",
      ratio: 3,
      reason:
        "Below 3 to 1 this is fine behind decoration, but do not use it for text or for an icon that has to be understood.",
      blocking: false,
    },
  },
  {
    key: "ink",
    label: "Text colour",
    help: "Body text and headings across the site.",
    check: {
      against: "#ffffff",
      ratio: 7,
      reason: "Body text needs 7 to 1 against white to stay comfortable to read.",
      blocking: true,
    },
  },
  {
    key: "surface",
    label: "Section background",
    help: "The tinted bands behind alternating sections.",
    check: {
      against: "ink",
      ratio: 7,
      reason: "Text sits on it, so it needs 7 to 1 against the text colour.",
      blocking: true,
    },
  },
];

/* ---- contrast, computed ---- */

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export default function Appearance() {
  const toast = useToast();
  const [theme, setTheme] = useState<ThemeRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const saved = await loadTheme();
      setTheme({ ...THEME_DEFAULTS, ...saved });
    } catch {
      setTheme({ ...THEME_DEFAULTS });
      setError("The saved colours could not be loaded. Check that Firestore is enabled.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const results = useMemo(() => {
    if (!theme) return [];
    return TOKENS.map((token) => {
      const value = theme[token.key];
      const against = token.check.against === "#ffffff" ? "#ffffff" : theme[token.check.against];
      const valid = HEX.test(value) && HEX.test(against);
      const ratio = valid ? contrast(value, against) : 0;
      return { token, value, ratio, passes: valid && ratio >= token.check.ratio, valid };
    });
  }, [theme]);

  const blocked = results.some((result) => !result.passes && result.token.check.blocking);
  const advisories = results.filter(
    (result) => !result.passes && !result.token.check.blocking,
  );

  const save = async () => {
    if (!theme || blocked) return;
    setBusy(true);
    try {
      await saveTheme(theme);
      toast("Colours saved. The website updates within a minute.");
    } catch {
      toast("Those colours could not be saved.", "danger");
    } finally {
      setBusy(false);
    }
  };

  if (!theme) {
    return (
      <>
        <PageHeader title="Colours" />
        <Card>
          <Spinner label="Loading colours" />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Colours"
        lede="Adjust the brand colours. Each one is checked for readability, and a combination that would be hard to read cannot be saved."
        actions={
          <>
            <button
              type="button"
              className="admin-btn admin-btn-quiet"
              onClick={() => setTheme({ ...THEME_DEFAULTS })}
            >
              <RotateCcw size={15} /> Reset
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void save()}
              disabled={busy || blocked}
            >
              {busy ? "Saving" : "Save colours"}
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      {blocked && (
        <div className="mb-4">
          <Banner tone="danger">
            One or more colours would be hard to read. Adjust the ones marked in red
            below before saving.
          </Banner>
        </div>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {results.map(({ token, value, ratio, passes, valid }) => (
          <Card key={token.key}>
            <Field label={token.label} help={token.help} htmlFor={`theme-${token.key}`}>
              <div className="flex items-center gap-2.5">
                <input
                  id={`theme-${token.key}`}
                  type="color"
                  value={HEX.test(value) ? value : "#000000"}
                  className="h-10 w-12 flex-none cursor-pointer rounded border-0 bg-transparent p-0"
                  onChange={(event) =>
                    setTheme((current) => ({ ...current!, [token.key]: event.target.value }))
                  }
                />
                <input
                  className="admin-input"
                  value={value}
                  spellCheck={false}
                  onChange={(event) =>
                    setTheme((current) => ({ ...current!, [token.key]: event.target.value }))
                  }
                />
              </div>
            </Field>

            <p
              className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-snug"
              style={{
                color: passes
                  ? "var(--a-ok)"
                  : token.check.blocking
                    ? "var(--a-danger)"
                    : "var(--a-warn)",
              }}
            >
              {passes ? (
                <Check size={14} className="mt-0.5 flex-none" />
              ) : (
                <X size={14} className="mt-0.5 flex-none" />
              )}
              <span>
                {!valid
                  ? "That is not a six figure colour code, for example #0a6d8a."
                  : passes
                    ? `Readable. ${ratio.toFixed(1)} to 1.`
                    : `Too low at ${ratio.toFixed(1)} to 1. ${token.check.reason}`}
              </span>
            </p>
          </Card>
        ))}
      </div>

      {advisories.length > 0 && !blocked && (
        <div className="mt-4">
          <Banner tone="warn">
            These colours can be saved, but keep them off text and off any icon that
            has to be understood: {advisories.map((entry) => entry.token.label.toLowerCase()).join(", ")}.
          </Banner>
        </div>
      )}

      <Card className="mt-4">
        <h2 className="mb-3 font-display text-[15px] font-semibold tracking-[-0.01em]">Preview</h2>
        <div
          className="rounded p-5"
          style={{ background: theme.surface, border: "1px solid var(--a-line)" }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: theme.brand }}
          >
            Continuous glucose monitors
          </p>
          <p
            className="mt-2 font-display text-[26px] font-bold leading-tight"
            style={{ color: theme.ink }}
          >
            Know your glucose, <span style={{ color: theme.brand }}>every minute</span> of the day.
          </p>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: theme.ink, opacity: 0.85 }}>
            A small sensor tracks your glucose 24 hours a day, without routine finger sticks.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex min-h-[42px] items-center rounded-full px-6 font-display text-[14px] font-semibold"
              style={{ background: theme.brandBright, color: theme.ink }}
            >
              Check My Eligibility
            </span>
            <span className="h-1.5 w-24 rounded-full" style={{ background: theme.brandBright }} />
          </div>
        </div>
      </Card>
    </>
  );
}
