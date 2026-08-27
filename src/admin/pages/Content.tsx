import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PAGES, type PageId, type PageValues, fieldPath } from "../../content/schema";
import { loadPage, savePage, uploadImage } from "../data";
import { Banner, Card, Field, PageHeader, Spinner, useToast } from "../ui";

/*
  Page text.

  The editor is generated from the content schema, so a field added there
  appears here without anyone touching this file, and the labels a client sees
  are the same ones the site reads.

  An empty box means "use the wording built into the site", which is why every
  field shows the built-in text as its placeholder. That keeps the difference
  between "not set" and "deliberately blank" honest, and means a client can
  always get back to the original by clearing a box.
*/

export default function Content() {
  const toast = useToast();
  const [pageId, setPageId] = useState<PageId>("home");
  const [values, setValues] = useState<PageValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const page = PAGES.find((entry) => entry.id === pageId)!;

  const refresh = useCallback(async (id: PageId) => {
    setValues(null);
    setError("");
    try {
      setValues(await loadPage(id));
    } catch {
      setValues({});
      setError("The saved text could not be loaded. Check that Firestore is enabled.");
    }
  }, []);

  useEffect(() => {
    void refresh(pageId);
  }, [pageId, refresh]);

  const save = async () => {
    if (!values) return;
    setBusy(true);
    try {
      await savePage(pageId, values);
      toast("Saved. The website updates within a minute.");
    } catch {
      toast("That could not be saved.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const set = (key: string, value: string) =>
    setValues((current) => ({ ...(current ?? {}), [key]: value }));

  return (
    <>
      <PageHeader
        title="Page text"
        lede="Change the words on any page. Leave a box empty to keep the wording the site was built with."
        actions={
          <>
            <a
              className="admin-btn admin-btn-quiet"
              href={page.path}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} /> View page
            </a>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void save()}
              disabled={busy || !values}
            >
              {busy ? "Saving" : "Save changes"}
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {PAGES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`admin-btn ${entry.id === pageId ? "admin-btn-primary" : "admin-btn-quiet"}`}
            style={{ minHeight: 34 }}
            onClick={() => setPageId(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {values === null ? (
        <Card>
          <Spinner label="Loading text" />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {page.blocks.map((block) => (
            <Card key={block.id}>
              <h2 className="mb-3 font-display text-[15px] font-semibold tracking-[-0.01em]">
                {block.label}
              </h2>
              <div className="flex flex-col gap-3.5">
                {block.fields.map((field) => {
                  const key = fieldPath(block.id, field.key);
                  const value = values[key] ?? "";
                  const id = `content-${pageId}-${key}`;

                  if (field.kind === "image") {
                    return (
                      <ImageField
                        key={key}
                        id={id}
                        label={field.label}
                        value={value || field.fallback}
                        isDefault={!value}
                        onChange={(next) => set(key, next)}
                      />
                    );
                  }

                  return (
                    <Field
                      key={key}
                      label={field.label}
                      htmlFor={id}
                      help={field.help ?? (value ? undefined : "Currently showing the built-in wording.")}
                    >
                      {field.kind === "longText" ? (
                        <textarea
                          id={id}
                          className="admin-textarea"
                          maxLength={field.max}
                          placeholder={field.fallback}
                          value={value}
                          onChange={(event) => set(key, event.target.value)}
                        />
                      ) : (
                        <input
                          id={id}
                          className="admin-input"
                          maxLength={field.max}
                          placeholder={field.fallback}
                          value={value}
                          onChange={(event) => set(key, event.target.value)}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ImageField({
  id,
  label,
  value,
  isDefault,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  isDefault: boolean;
  onChange: (next: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, "pages"));
      toast("Picture uploaded.");
    } catch (problem) {
      toast(problem instanceof Error ? problem.message : "The upload did not work.", "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field
      label={label}
      htmlFor={id}
      help={isDefault ? "Currently showing the built-in picture." : undefined}
    >
      <div
        className="mb-2 flex h-36 items-center justify-center overflow-hidden rounded"
        style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-line)" }}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[12px]" style={{ color: "var(--a-text-faint)" }}>
            No picture
          </span>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept="image/*"
        disabled={busy}
        className="admin-input"
        style={{ padding: 6 }}
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      {!isDefault && (
        <button type="button" className="admin-help mt-1 underline" onClick={() => onChange("")}>
          Go back to the built-in picture
        </button>
      )}
    </Field>
  );
}
