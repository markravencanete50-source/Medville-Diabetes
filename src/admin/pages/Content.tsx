import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ExternalLink, Image, LayoutPanelTop, MousePointerClick, Type } from "lucide-react";
import {
  elementIsVisible,
  elementVisibilityKey,
  PAGE_VISIBILITY_KEY,
  PAGES,
  fieldPath,
  pageIsVisible,
  sectionIsVisible,
  sectionVisibilityKey,
  type PageId,
  type PageValues,
} from "../../content/schema";
import {
  isImageAddress,
  loadPage,
  savePage,
  UPLOAD_HELP,
  uploadImage,
  uploadProblem,
} from "../data";
import { Banner, Card, Field, PageHeader, Spinner, useToast } from "../ui";
import { PREVIEW_READY, PREVIEW_UPDATE, PREVIEW_SELECT } from "../../lib/editorPreview";
import { pageValidationError } from "../../content/validation";

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

const pageRepository = { loadPage, savePage };

export default function Content({ repository = pageRepository }: { repository?: typeof pageRepository } = {}) {
  const toast = useToast();
  const [pageId, setPageId] = useState<PageId>("home");
  const [values, setValues] = useState<PageValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<PageValues>({});
  const [section, setSection] = useState("hero");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const frame = useRef<HTMLIFrameElement>(null);
  const loadVersion = useRef(0);
  const editVersion = loadVersion.current;
  const canvas = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const dirty = values !== null && JSON.stringify(values) !== JSON.stringify(saved);

  const page = PAGES.find((entry) => entry.id === pageId)!;

  useEffect(() => {
    const version = ++loadVersion.current;
    setValues(null);
    setError("");
    void repository.loadPage(pageId).then((next) => {
      if (version !== loadVersion.current) return;
      setValues(next);
      setSaved(next);
    }).catch(() => {
      if (version === loadVersion.current) setError("The saved content could not be loaded. Reload this page to try again. Saving is disabled to protect existing content.");
    });
    return () => { loadVersion.current++; };
  }, [pageId, repository]);

  const sendPreview = () => {
    if (values) frame.current?.contentWindow?.postMessage({ type: PREVIEW_UPDATE, pageId, values }, window.location.origin);
  };
  useEffect(() => {
    sendPreview();
    const ready = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === PREVIEW_READY) sendPreview();
      if (event.data?.type === PREVIEW_SELECT && event.data.pageId === pageId && typeof event.data.key === "string") {
        const block = page.blocks.find((entry) => entry.fields.some((field) => fieldPath(entry.id, field.key) === event.data.key));
        if (!block) return;
        setSection(block.id);
        setMobileView("edit");
        requestAnimationFrame(() => document.getElementById(`content-${pageId}-${event.data.key}`)?.focus({ preventScroll: false }));
      }
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [pageId, values]);

  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(entry.contentRect.width));
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [values === null]);

  useEffect(() => {
    const beforeLeave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeLeave);
    return () => window.removeEventListener("beforeunload", beforeLeave);
  }, [dirty]);

  const changePage = (id: PageId) => {
    if (id === pageId || busy) return;
    if (dirty && !window.confirm("Discard unsaved changes to this page?")) return;
    setValues(null);
    setPageId(id);
    setSection(PAGES.find((entry) => entry.id === id)!.blocks.find((block) => block.id !== "meta")!.id);
  };

  const save = async () => {
    if (!values) return;
    const problem = pageValidationError(pageId, values);
    if (problem) { toast(problem, "danger"); return; }
    setBusy(true);
    try {
      await repository.savePage(pageId, values);
      setSaved(values);
      toast("Saved. Visitors will see the changes when they open or refresh the page.");
    } catch {
      toast("That could not be saved.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const set = (key: string, value: string) => {
    if (editVersion !== loadVersion.current) return;
    setValues((current) => current === null ? null : ({ ...current, [key]: value }));
  };
  const previewWidth = device === "phone" ? 390 : 1280;
  const previewScale = canvasWidth ? Math.min(1, canvasWidth / previewWidth) : 1;

  return (
    <>
      <PageHeader
        title="Edit pages"
        lede="Edit each section and see your changes in the website preview before saving."
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
              disabled={busy || !values || !dirty}
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
            className={`admin-btn admin-btn-sm ${entry.id === pageId ? "admin-btn-primary" : "admin-btn-quiet"}`}
            aria-pressed={entry.id === pageId}
            disabled={busy}
            onClick={() => changePage(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="page-editor-view-switch mb-4 flex gap-2" aria-label="Editor view">
        <button type="button" className={`admin-btn ${mobileView === "edit" ? "admin-btn-primary" : "admin-btn-quiet"}`} aria-pressed={mobileView === "edit"} onClick={() => setMobileView("edit")}>Edit content</button>
        <button type="button" className={`admin-btn ${mobileView === "preview" ? "admin-btn-primary" : "admin-btn-quiet"}`} aria-pressed={mobileView === "preview"} onClick={() => setMobileView("preview")}>Website preview</button>
      </div>

      {values === null ? (
        <Card>
          {!error && <Spinner label="Loading content" />}
        </Card>
      ) : (
        <div className={`page-editor-layout page-editor-show-${mobileView}`}>
        <div className="page-editor-controls flex min-w-0 flex-col gap-4">
          <Card>
            <VisibilityControl
              label={`${page.label} page`}
              help="Hidden pages are removed from the website navigation and cannot be opened by visitors."
              visible={pageIsVisible(values)}
              onChange={(visible) => set(PAGE_VISIBILITY_KEY, visible ? "" : "hidden")}
            />
          </Card>
          <Field label="Choose a section" htmlFor="page-editor-section">
            <select id="page-editor-section" className="admin-select" value={section} onChange={(event) => setSection(event.target.value)}>
              {page.blocks.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}
            </select>
          </Field>
          {pageId === "blog" && <Card><p className="admin-help">Edit article titles, cover pictures, and article sections in the Blog editor.</p><a href="#blog" className="admin-btn admin-btn-quiet" onClick={(event) => { if (dirty && !window.confirm("Discard unsaved page changes and open the Blog editor?")) event.preventDefault(); }}>Edit articles</a></Card>}
          {(pageId === "home" || pageId === "products" || pageId === "qualify") && <p className="admin-help">Product names and photographs are shared across the website. Edit them in Products. Reviews and questions have their own editors.</p>}
          <fieldset disabled={busy} className="min-w-0">
          {page.blocks.filter((block) => block.id === section).map((block) => (
            <Card key={block.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="admin-help m-0 uppercase tracking-[0.12em]">Section</p>
                  <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
                    {block.label}
                  </h2>
                </div>
                {block.hideable !== false && (
                  <VisibilityControl
                    compact
                    label={block.label}
                    visible={sectionIsVisible(values, block.id)}
                    onChange={(visible) => set(sectionVisibilityKey(block.id), visible ? "" : "hidden")}
                  />
                )}
              </div>
              {block.elements && block.elements.length > 0 && (
                <div className="mb-5 rounded-lg border border-[var(--a-line)] bg-[var(--a-surface-2)] p-3.5">
                  <div className="mb-2.5">
                    <p className="admin-label m-0">Elements in this section</p>
                    <p className="admin-help m-0">Hide one item without removing the rest of the section.</p>
                  </div>
                  <div className="grid gap-2">
                    {block.elements.map((element) => (
                      <ElementControl
                        key={element.id}
                        label={element.label}
                        kind={element.kind}
                        help={element.help}
                        visible={elementIsVisible(values, block.id, element.id)}
                        onChange={(visible) => set(
                          elementVisibilityKey(block.id, element.id),
                          visible ? "" : "hidden",
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
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
                          value={values[key] ?? field.fallback}
                          onChange={(event) => set(key, event.target.value)}
                        />
                      ) : (
                        <input
                          id={id}
                          className="admin-input"
                          maxLength={field.max}
                          placeholder={field.fallback}
                          value={values[key] ?? field.fallback}
                          onChange={(event) => set(key, event.target.value)}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            </Card>
          ))}
          </fieldset>
          <div className="flex items-center justify-between gap-3">
            <span className="admin-help" role="status">{dirty ? "Unsaved changes" : "All changes saved"}</span>
            <button className="admin-btn admin-btn-quiet" type="button" disabled={!dirty || busy} onClick={() => setValues(saved)}>Discard changes</button>
          </div>
        </div>
        <section className="page-editor-preview" aria-label="Website preview">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div><h2 className="admin-label">Website preview</h2><p className="admin-help">Click text or a picture to edit it. Forms do not send.</p></div>
            <div className="flex gap-2">
              <button type="button" className={`admin-btn admin-btn-sm ${device === "desktop" ? "admin-btn-primary" : "admin-btn-quiet"}`} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button>
              <button type="button" className={`admin-btn admin-btn-sm ${device === "phone" ? "admin-btn-primary" : "admin-btn-quiet"}`} aria-pressed={device === "phone"} onClick={() => setDevice("phone")}>Phone</button>
            </div>
          </div>
          <div ref={canvas} className="page-editor-preview-canvas">
            <div style={{ width: previewWidth * previewScale, height: "72vh", minHeight: 480 }}>
              <iframe key={pageId} ref={frame} src={`${page.path}?editorPreview=1`} title={`${page.label} website preview`} className="page-editor-frame" style={{ width: previewWidth, height: `calc(max(72vh, 480px) / ${previewScale})`, transform: `scale(${previewScale})`, transformOrigin: "top left" }} onLoad={sendPreview} />
            </div>
          </div>
        </section>
        </div>
      )}
    </>
  );
}

const ELEMENT_ICONS = {
  copy: Type,
  picture: Image,
  action: MousePointerClick,
  content: LayoutPanelTop,
};

function ElementControl({
  label,
  kind,
  help,
  visible,
  onChange,
}: {
  label: string;
  kind: keyof typeof ELEMENT_ICONS;
  help?: string;
  visible: boolean;
  onChange: (visible: boolean) => void;
}) {
  const Icon = ELEMENT_ICONS[kind];
  return (
    <div className="flex min-h-[58px] items-center gap-3 rounded-md border border-[var(--a-line)] bg-[var(--a-surface)] px-3 py-2.5">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-[var(--a-brand-soft)] text-[var(--a-brand)]">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-semibold leading-snug">{label}</p>
        {help && <p className="admin-help m-0">{help}</p>}
      </div>
      <button
        type="button"
        className={`admin-btn admin-btn-sm flex-none ${visible ? "admin-btn-quiet" : "admin-btn-primary"}`}
        aria-pressed={visible}
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        onClick={() => onChange(!visible)}
      >
        {visible ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
        {visible ? "Visible" : "Hidden"}
      </button>
    </div>
  );
}

function VisibilityControl({
  label,
  help,
  visible,
  compact = false,
  onChange,
}: {
  label: string;
  help?: string;
  visible: boolean;
  compact?: boolean;
  onChange: (visible: boolean) => void;
}) {
  const Icon = visible ? Eye : EyeOff;
  return (
    <div className={compact ? "" : "flex flex-wrap items-center justify-between gap-3"}>
      {!compact && (
        <div>
          <p className="font-display text-[15px] font-semibold">{label}</p>
          {help && <p className="admin-help">{help}</p>}
        </div>
      )}
      <button
        type="button"
        className={`admin-btn admin-btn-sm ${visible ? "admin-btn-quiet" : "admin-btn-primary"}`}
        aria-pressed={visible}
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        onClick={() => onChange(!visible)}
      >
        <Icon size={15} aria-hidden="true" />
        {visible ? "Visible" : "Hidden"}
      </button>
    </div>
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
  /* A path starting with "/" is a picture shipped with the site, which is
     what every built-in page picture is. */
  const looksWrong =
    value.trim() !== "" && !value.startsWith("/") && !isImageAddress(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, "pages"));
      toast("Picture uploaded.");
    } catch (problem) {
      toast(uploadProblem(problem), "danger");
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
        {value && !looksWrong ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[12px]" style={{ color: "var(--a-text-faint)" }}>
            {busy ? "Uploading" : "No picture"}
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
      {/* The address is the route that works before Cloud Storage exists.
          Both controls write the same field, so switching Storage on changes
          nothing here. */}
      <input
        type="text"
        className="admin-input mt-2"
        value={value}
        disabled={busy}
        placeholder="Or paste a picture address: https://..."
        aria-label={`${label} web address`}
        onChange={(event) => onChange(event.target.value.trim())}
      />
      {looksWrong && (
        <p className="admin-help mt-1" style={{ color: "var(--a-warn)" }}>
          That does not look like a web address.
        </p>
      )}
      <p className="admin-help mt-1">{UPLOAD_HELP}</p>
      {!isDefault && (
        <button type="button" className="admin-help mt-1 underline" onClick={() => onChange("")}>
          Go back to the built-in picture
        </button>
      )}
    </Field>
  );
}
