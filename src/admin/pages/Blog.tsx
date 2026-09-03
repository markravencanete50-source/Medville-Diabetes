import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Image as ImageIcon,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deletePost,
  isImageAddress,
  loadPosts,
  postSlugExists,
  savePost,
  toSlug,
  uploadImage,
  uploadProblem,
  type PostRecord,
} from "../data";
import {
  ANIMATIONS,
  ANIMATION_DELAY_MAX,
  ANIMATION_DELAY_STEP,
  ANIMATION_GROUPS,
  ANIMATION_PACES,
  BLOCK_COLORS,
  BLOCK_LABEL,
  DEFAULT_TEMPLATE,
  IMAGE_RATIOS,
  POST_TEMPLATES,
  animationById,
  emptyBlock,
  postHasContent,
  readingMinutes,
  type AnimationEffect,
  type BlockAnimation,
  type BlockColor,
  type PostBlock,
  type PostTemplate,
} from "../../data/blog";
import PostBody from "../../components/PostBody";
import ArticleHeader, { BODY_COLUMN } from "../../components/ArticleHeader";
import { useReveal } from "../../lib/useReveal";
import { Badge, Banner, Card, Drawer, Empty, Field, PageHeader, Spinner, useToast } from "../ui";
import { ColorPicker } from "../ColorPicker";
import { FontPicker } from "../FontPicker";

/*
  The blog editor.

  A post is a list of blocks rather than one box of text, which is what makes
  a picture, a highlight and a heading each editable on their own terms. The
  client asked for something closer to a design tool; this is a block editor
  in the shape of Notion or WordPress rather than a free canvas. Colour and
  type are the author's to choose: the picker opens the whole spectrum with
  the brand swatches one tap away, and the font list in data/fonts.ts runs
  from the site's own faces to one hundred and seventy more. Since
  2026-09-03 an article also has a layout, chosen from five, and any block
  can arrive with one of the site's own animations, alone or from a preset
  applied to every block at once. What comes back from the database is still
  checked before it is rendered, in data/blog.ts.

  Preview is not a second renderer. It mounts the same ArticleHeader and
  PostBody components the public article uses, so what is approved here is
  what a reader receives, layout and motion included.
*/

const BLOCK_TYPES: PostBlock["type"][] = [
  "paragraph",
  "heading",
  "list",
  "quote",
  "image",
  "callout",
  "divider",
];

const BLOCK_PRESETS = BLOCK_COLORS.map((colour) => ({
  id: colour.id,
  label: colour.label,
  hex: colour.hex,
}));

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function blankPost(): PostRecord {
  return {
    slug: "",
    title: "",
    excerpt: "",
    body: [emptyBlock("paragraph")],
    image: "",
    imageAlt: "",
    author: "",
    publishedAt: todayISO(),
    published: false,
    template: DEFAULT_TEMPLATE,
  };
}

export default function Blog() {
  const toast = useToast();
  const [posts, setPosts] = useState<PostRecord[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PostRecord | null>(null);
  /* True for a post that has never been saved, so the address may still be
     changed. Once saved, the slug is fixed: links would break otherwise. */
  const [isNew, setIsNew] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPosts(await loadPosts());
    } catch {
      setPosts([]);
      setError(
        "The articles could not be loaded. Check that Firestore is enabled and that you have a content role.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (post: PostRecord) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await deletePost(post.slug);
      toast("Article deleted.");
      void refresh();
    } catch {
      toast("The article could not be deleted.", "danger");
    }
  };

  return (
    <>
      <PageHeader
        title="Blog"
        lede="Write and publish articles. A draft is only visible here; publishing puts it on the website within about a minute."
        actions={
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setEditing(blankPost());
              setIsNew(true);
            }}
          >
            <Plus size={16} /> New article
          </button>
        }
      />

      {error && <Banner tone="warn">{error}</Banner>}

      <Card>
        {posts === null ? (
          <Spinner label="Loading articles" />
        ) : posts.length === 0 ? (
          <Empty>No articles yet. Select New article to write the first one.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Article</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.slug}>
                    <td data-label="Article">
                      <div className="flex items-center gap-3">
                        {post.image && (
                          <img
                            src={post.image}
                            alt=""
                            className="h-10 w-14 flex-none rounded object-cover"
                            style={{ background: "var(--a-bg)" }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="m-0 truncate font-semibold">{post.title || "Untitled"}</p>
                          <p className="m-0 text-[12px]" style={{ color: "var(--a-text-faint)" }}>
                            /blog/{post.slug} · {readingMinutes(post.body)} min read
                          </p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Status">
                      <Badge tone={post.published ? "ok" : "quiet"}>
                        {post.published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td data-label="Date">{post.publishedAt || "Not published"}</td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          className="admin-btn admin-btn-quiet"
                          aria-label={`Edit ${post.title}`}
                          onClick={() => {
                            setEditing(post);
                            setIsNew(false);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          aria-label={`Delete ${post.title}`}
                          onClick={() => void remove(post)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <PostEditor
          post={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}

/* ---- motion presets ----

   A preset writes an animation onto every block and is then forgotten. The
   blocks are the only record, so the article page never has to know a preset
   existed, and any block can be changed on its own afterwards. */

type PresetId = "none" | "calm" | "lively" | "editorial";

const PRESETS: { id: PresetId; label: string; description: string }[] = [
  { id: "none", label: "None", description: "Every block is simply there, with no motion." },
  { id: "calm", label: "Calm", description: "Each block settles gently into place, one after another." },
  { id: "lively", label: "Lively", description: "Blocks arrive from alternate sides with a short stagger between them." },
  { id: "editorial", label: "Editorial", description: "Text fades in, pictures slide up inside their frames, and dividers widen." },
];

function withPreset(blocks: PostBlock[], preset: PresetId): PostBlock[] {
  return blocks.map((block, index) => {
    const next = { ...block };
    delete next.animation;
    switch (preset) {
      case "calm":
        next.animation =
          index % 2 === 0 ? { effect: "settle", pace: "slow" } : { effect: "fade", pace: "slow" };
        break;
      case "lively": {
        const effects: AnimationEffect[] = ["left", "right", "zoom"];
        const step = index % 3;
        next.animation = step ? { effect: effects[step], delay: step * 80 } : { effect: effects[0] };
        break;
      }
      case "editorial":
        next.animation =
          block.type === "image"
            ? { effect: "curtain", pace: "slow" }
            : block.type === "heading"
              ? { effect: "settle" }
              : block.type === "divider"
                ? { effect: "expand" }
                : { effect: "fade" };
        break;
      default:
        break;
    }
    return next;
  });
}

/* ---- the editor ---- */

function PostEditor({
  post,
  isNew,
  onClose,
  onSaved,
}: {
  post: PostRecord;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<PostRecord>(post);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [preset, setPreset] = useState<PresetId>("calm");
  const presetId = useId();

  const set = <K extends keyof PostRecord>(key: K, value: PostRecord[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /* The address follows the title until somebody edits it by hand, which is
     the behaviour every editor has and nobody has to be told about. */
  const onTitle = (value: string) => {
    setDraft((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : toSlug(value),
    }));
  };

  const setBlock = (id: string, next: PostBlock) =>
    set("body", draft.body.map((block) => (block.id === id ? next : block)));

  const addBlock = (type: PostBlock["type"], afterId?: string) => {
    const block = emptyBlock(type);
    if (!afterId) return set("body", [...draft.body, block]);
    const at = draft.body.findIndex((b) => b.id === afterId);
    const next = [...draft.body];
    next.splice(at + 1, 0, block);
    set("body", next);
  };

  const moveBlock = (id: string, by: -1 | 1) => {
    const at = draft.body.findIndex((b) => b.id === id);
    const to = at + by;
    if (at < 0 || to < 0 || to >= draft.body.length) return;
    const next = [...draft.body];
    [next[at], next[to]] = [next[to], next[at]];
    set("body", next);
  };

  const removeBlock = (id: string) =>
    set("body", draft.body.filter((block) => block.id !== id));

  const save = async (publish?: boolean) => {
    const record: PostRecord = { ...draft, published: publish ?? draft.published };

    if (!record.title.trim()) return toast("Please give the article a title.", "danger");
    if (!record.slug.trim()) return toast("Please give the article an address.", "danger");
    if (record.published && !postHasContent(record.body))
      return toast("Please write something before publishing.", "danger");

    setSaving(true);
    try {
      if (isNew && (await postSlugExists(record.slug))) {
        setSaving(false);
        return toast("An article already uses that address. Please choose another.", "danger");
      }
      await savePost(record);
      toast(record.published ? "Article published." : "Draft saved.");
      onSaved();
    } catch {
      toast("The article could not be saved.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const minutes = useMemo(() => readingMinutes(draft.body), [draft.body]);

  const footer = (
    <>
      <button
        type="button"
        className="admin-btn admin-btn-primary"
        disabled={saving}
        onClick={() => void save(true)}
      >
        {draft.published ? "Save and keep published" : "Publish"}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-quiet"
        disabled={saving}
        onClick={() => void save(false)}
      >
        {draft.published ? "Unpublish and save draft" : "Save draft"}
      </button>
      <span className="ml-auto text-[13px]" style={{ color: "var(--a-text-faint)" }}>
        {minutes} min read
      </span>
    </>
  );

  return (
    <Drawer
      open
      wide
      title={isNew ? "New article" : "Edit article"}
      onClose={onClose}
      footer={footer}
    >
      <div className="admin-drawer-sticky">
        <div className="admin-segment" role="group" aria-label="Write or preview">
          {(["edit", "preview"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
            >
              {value === "edit" ? <Pencil size={15} /> : <Eye size={15} />}
              {value === "edit" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {mode === "preview" ? (
        <Preview draft={draft} />
      ) : (
        <div className="flex flex-col gap-5">
          <Field label="Title">
            <input
              className="admin-input"
              value={draft.title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="What Is a CGM and How Does It Work?"
            />
          </Field>

          <Field
            label="Address"
            help={
              isNew
                ? "This becomes the web address of the article."
                : "Fixed once an article has been saved, so existing links keep working."
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ color: "var(--a-text-faint)" }}>
                /blog/
              </span>
              <input
                className="admin-input"
                value={draft.slug}
                disabled={!isNew}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", toSlug(e.target.value));
                }}
              />
            </div>
          </Field>

          <Field label="Summary" help="One or two sentences. Shown on the cards and in search results.">
            <textarea
              className="admin-textarea"
              rows={3}
              value={draft.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author">
              <input
                className="admin-input"
                value={draft.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Medville Diabetes"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="admin-input"
                value={draft.publishedAt}
                onChange={(e) => set("publishedAt", e.target.value)}
              />
            </Field>
          </div>

          <TemplateChooser value={draft.template} onPick={(template) => set("template", template)} />

          <HeaderImage draft={draft} set={set} />

          <div>
            <p className="admin-label">Article</p>

            <div
              className="mb-3 flex flex-wrap items-end gap-2.5 rounded-lg p-3"
              style={{ background: "var(--a-bg)" }}
            >
              <div className="min-w-[180px] flex-1">
                <label className="admin-label" htmlFor={presetId}>
                  Motion preset
                </label>
                <select
                  id={presetId}
                  className="admin-select"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as PresetId)}
                >
                  {PRESETS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-quiet"
                onClick={() => set("body", withPreset(draft.body, preset))}
              >
                <Sparkles size={15} /> Apply to every block
              </button>
              <p className="admin-help m-0 w-full">
                {PRESETS.find((entry) => entry.id === preset)?.description} Each block can still be
                changed on its own below.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {draft.body.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  count={draft.body.length}
                  onChange={(next) => setBlock(block.id, next)}
                  onMove={(by) => moveBlock(block.id, by)}
                  onRemove={() => removeBlock(block.id)}
                  onAddAfter={(type) => addBlock(type, block.id)}
                />
              ))}
            </div>
            <AddBlockRow onAdd={(type) => addBlock(type)} />
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ---- preview: the real components, on the real background ---- */

function Preview({ draft }: { draft: PostRecord }) {
  /* Remounting the frame runs every arrival again, so an author can watch
     the motion as many times as they like. */
  const [replay, setReplay] = useState(0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="admin-help m-0">
          The article as a reader will see it, on the website's own colours.
        </p>
        <button
          type="button"
          className="admin-btn admin-btn-quiet admin-btn-sm"
          onClick={() => setReplay((n) => n + 1)}
        >
          <RotateCcw size={14} /> Replay animations
        </button>
      </div>
      <PreviewFrame key={replay} draft={draft} />
    </div>
  );
}

function PreviewFrame({ draft }: { draft: PostRecord }) {
  const revealRef = useReveal<HTMLDivElement>();
  return (
    <div
      ref={revealRef}
      className="overflow-hidden rounded-lg"
      style={{ background: "var(--color-canvas)", border: "1px solid var(--a-line)" }}
    >
      <ArticleHeader
        title={draft.title || "Untitled article"}
        excerpt={draft.excerpt}
        author={draft.author}
        publishedAt={draft.publishedAt}
        minutes={readingMinutes(draft.body)}
        image={draft.image}
        imageAlt={draft.imageAlt}
        template={draft.template}
        backLink={false}
        parallax={false}
      />
      <div className={`mx-auto px-5 py-8 sm:px-8 ${BODY_COLUMN[draft.template]}`}>
        <PostBody blocks={draft.body} />
      </div>
    </div>
  );
}

/* ---- layout ---- */

function Wire({ template }: { template: PostTemplate }) {
  switch (template) {
    case "magazine":
      return (
        <span className="admin-wire">
          <i className="w-pic" style={{ height: 30, boxShadow: "inset 0 -9px 0 var(--a-nav-bg)" }} />
          <i className="w-text" style={{ height: 4, width: "82%" }} />
          <i className="w-text" style={{ height: 4, width: "70%" }} />
        </span>
      );
    case "minimal":
      return (
        <span className="admin-wire">
          <i className="w-text" style={{ height: 9, width: "58%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "76%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "66%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "72%", justifySelf: "center" }} />
        </span>
      );
    case "feature":
      return (
        <span className="admin-wire">
          <i className="w-hero" style={{ height: 11 }} />
          <i className="w-pic" style={{ height: 15, width: "96%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "86%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "80%", justifySelf: "center" }} />
        </span>
      );
    case "split":
      return (
        <span className="admin-wire" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <span className="grid gap-[3px]">
            <i className="w-hero" style={{ height: 8 }} />
            <i className="w-text" style={{ height: 4, width: "90%" }} />
            <i className="w-text" style={{ height: 4, width: "70%" }} />
          </span>
          <i className="w-pic" style={{ height: 34 }} />
        </span>
      );
    default:
      return (
        <span className="admin-wire">
          <i className="w-hero" style={{ height: 16 }} />
          <i className="w-pic" style={{ height: 12, width: "74%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "68%", justifySelf: "center" }} />
          <i className="w-text" style={{ height: 4, width: "60%", justifySelf: "center" }} />
        </span>
      );
  }
}

function TemplateChooser({
  value,
  onPick,
}: {
  value: PostTemplate;
  onPick: (template: PostTemplate) => void;
}) {
  const labelId = useId();
  return (
    <div>
      <p className="admin-label" id={labelId}>
        Layout
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        {POST_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={value === template.id}
            className="admin-tab-card"
            onClick={() => onPick(template.id)}
          >
            <Wire template={template.id} />
            <b>{template.label}</b>
            <small>{template.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- header image ---- */

function HeaderImage({
  draft,
  set,
}: {
  draft: PostRecord;
  set: <K extends keyof PostRecord>(key: K, value: PostRecord[K]) => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      set("image", await uploadImage(file, "blog"));
      toast("Picture uploaded.");
    } catch (problem) {
      toast(uploadProblem(problem), "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field
      label="Header picture"
      help={
        draft.template === "minimal"
          ? "The Minimal layout shows no picture on the article itself. It is still used on the cards and in link previews."
          : "Shown at the top of the article and on every card."
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        {draft.image ? (
          <img
            src={draft.image}
            alt=""
            className="h-20 w-32 rounded-md object-cover"
            style={{ background: "var(--a-bg)" }}
          />
        ) : (
          <div
            className="flex h-20 w-32 items-center justify-center rounded-md"
            style={{ background: "var(--a-bg)", color: "var(--a-text-faint)" }}
          >
            <ImageIcon size={22} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void choose(e.target.files?.[0])}
          />
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Upload size={15} /> {busy ? "Uploading" : draft.image ? "Replace" : "Upload"}
          </button>
          {draft.image && (
            <button type="button" className="admin-btn admin-btn-quiet" onClick={() => set("image", "")}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        className="admin-input mt-3"
        value={draft.image}
        onChange={(e) => set("image", e.target.value.trim())}
        placeholder="Or paste a picture address: https://..."
      />
      {draft.image && !isImageAddress(draft.image) && !draft.image.startsWith("/") && (
        <p className="admin-help" style={{ color: "var(--a-warn)" }}>
          That does not look like a web address.
        </p>
      )}
      <input
        className="admin-input mt-2"
        value={draft.imageAlt}
        onChange={(e) => set("imageAlt", e.target.value)}
        placeholder="Describe the picture for a screen reader"
      />
    </Field>
  );
}

/* ---- one block ---- */

function BlockEditor({
  block,
  index,
  count,
  onChange,
  onMove,
  onRemove,
  onAddAfter,
}: {
  block: PostBlock;
  index: number;
  count: number;
  onChange: (next: PostBlock) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onAddAfter: (type: PostBlock["type"]) => void;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const patch = (changes: Partial<PostBlock>) =>
    onChange({ ...block, ...changes } as PostBlock);

  /* An animation is set whole, or removed, so the stored object never
     carries an undefined member. */
  const setAnimation = (animation: BlockAnimation | undefined) => {
    const next = { ...block };
    if (animation) next.animation = animation;
    else delete next.animation;
    onChange(next);
  };

  const upload = async (file: File | undefined) => {
    if (!file || block.type !== "image") return;
    setBusy(true);
    try {
      patch({ url: await uploadImage(file, "blog") } as Partial<PostBlock>);
      toast("Picture uploaded.");
    } catch (problem) {
      toast(uploadProblem(problem), "danger");
    } finally {
      setBusy(false);
    }
  };

  const alignChoice = (align: "left" | "center" | undefined) => (
    <Choice
      label="Align"
      options={[
        { id: "left", label: "Left" },
        { id: "center", label: "Centre" },
      ]}
      value={align ?? "left"}
      onPick={(next) => patch({ align: next } as Partial<PostBlock>)}
    />
  );

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--a-bg)" }}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--a-text-faint)" }}
        >
          {BLOCK_LABEL[block.type]}
          {block.animation && (
            <span className="ml-2 normal-case tracking-normal" style={{ color: "var(--a-brand-text)" }}>
              {animationById(block.animation.effect)?.label}
            </span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            aria-label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={15} />
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            aria-label="Remove this block"
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {block.type === "paragraph" && (
        <>
          <textarea
            className="admin-textarea"
            rows={4}
            value={block.text}
            onChange={(e) => patch({ text: e.target.value } as Partial<PostBlock>)}
            placeholder="Write here. **bold**, *italic* and [link](https://example.com) all work."
          />
          <div className="mt-3 flex flex-wrap gap-4">
            <ColorPicker
              label="Colour"
              value={block.color}
              presets={BLOCK_PRESETS}
              allowClear
              onChange={(color) => patch({ color: color as BlockColor | undefined } as Partial<PostBlock>)}
            />
            <FontPicker
              value={block.font}
              fallback="body"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
            {alignChoice(block.align)}
          </div>
        </>
      )}

      {block.type === "heading" && (
        <>
          <input
            className="admin-input"
            value={block.text}
            onChange={(e) => patch({ text: e.target.value } as Partial<PostBlock>)}
            placeholder="Section heading"
          />
          <div className="mt-3 flex flex-wrap gap-4">
            <Choice
              label="Size"
              options={[
                { id: "2", label: "Large" },
                { id: "3", label: "Small" },
              ]}
              value={block.level === 3 ? "3" : "2"}
              onPick={(level) => patch({ level: level === "3" ? 3 : 2 } as Partial<PostBlock>)}
            />
            <ColorPicker
              label="Colour"
              value={block.color}
              presets={BLOCK_PRESETS}
              allowClear
              onChange={(color) => patch({ color: color as BlockColor | undefined } as Partial<PostBlock>)}
            />
            <FontPicker
              value={block.font}
              fallback="display"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
            {alignChoice(block.align)}
          </div>
        </>
      )}

      {block.type === "list" && (
        <>
          <Choice
            label="Style"
            options={[
              { id: "bullet", label: "Bullets" },
              { id: "number", label: "Numbers" },
            ]}
            value={block.style}
            onPick={(style) => patch({ style } as Partial<PostBlock>)}
          />
          <div className="mt-3 flex flex-col gap-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="admin-input"
                  value={item}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = e.target.value;
                    patch({ items } as Partial<PostBlock>);
                  }}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  aria-label="Remove this item"
                  onClick={() =>
                    patch({ items: block.items.filter((_, j) => j !== i) } as Partial<PostBlock>)
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-quiet mt-2"
            onClick={() => patch({ items: [...block.items, ""] } as Partial<PostBlock>)}
          >
            <Plus size={15} /> Add item
          </button>
          <div className="mt-3 flex flex-wrap gap-4">
            <ColorPicker
              label="Colour"
              value={block.color}
              presets={BLOCK_PRESETS}
              allowClear
              onChange={(color) => patch({ color: color as BlockColor | undefined } as Partial<PostBlock>)}
            />
            <FontPicker
              value={block.font}
              fallback="body"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
            {alignChoice(block.align)}
          </div>
        </>
      )}

      {block.type === "quote" && (
        <>
          <textarea
            className="admin-textarea"
            rows={3}
            value={block.text}
            onChange={(e) => patch({ text: e.target.value } as Partial<PostBlock>)}
            placeholder="The quotation"
          />
          <input
            className="admin-input mt-2"
            value={block.attribution ?? ""}
            onChange={(e) => patch({ attribution: e.target.value } as Partial<PostBlock>)}
            placeholder="Who said it (optional)"
          />
          <div className="mt-3 flex flex-wrap gap-4">
            <ColorPicker
              label="Colour"
              value={block.color}
              presets={BLOCK_PRESETS}
              allowClear
              onChange={(color) => patch({ color: color as BlockColor | undefined } as Partial<PostBlock>)}
            />
            <FontPicker
              value={block.font}
              fallback="display"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
            {alignChoice(block.align)}
          </div>
        </>
      )}

      {block.type === "callout" && (
        <>
          <textarea
            className="admin-textarea"
            rows={3}
            value={block.text}
            onChange={(e) => patch({ text: e.target.value } as Partial<PostBlock>)}
            placeholder="Something worth pulling out of the flow"
          />
          <div className="mt-3">
            <Choice
              label="Tone"
              options={[
                { id: "brand", label: "Brand" },
                { id: "accent", label: "Deep cyan" },
                { id: "warn", label: "Bright cyan" },
              ]}
              value={block.tone}
              onPick={(tone) => patch({ tone } as Partial<PostBlock>)}
            />
          </div>
        </>
      )}

      {block.type === "image" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {block.url ? (
              <img
                src={block.url}
                alt=""
                className="h-20 w-32 rounded-md object-cover"
                style={{ background: "var(--a-surface)" }}
              />
            ) : (
              <div
                className="flex h-20 w-32 items-center justify-center rounded-md"
                style={{ background: "var(--a-surface)", color: "var(--a-text-faint)" }}
              >
                <ImageIcon size={22} />
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
            <button
              type="button"
              className="admin-btn admin-btn-quiet"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={15} /> {busy ? "Uploading" : block.url ? "Replace" : "Upload"}
            </button>
          </div>
          <input
            className="admin-input mt-3"
            value={block.url}
            onChange={(e) => patch({ url: e.target.value.trim() } as Partial<PostBlock>)}
            placeholder="Or paste a picture address: https://..."
          />
          <input
            className="admin-input mt-2"
            value={block.alt}
            onChange={(e) => patch({ alt: e.target.value } as Partial<PostBlock>)}
            placeholder="Describe the picture for a screen reader"
          />
          <input
            className="admin-input mt-2"
            value={block.caption ?? ""}
            onChange={(e) => patch({ caption: e.target.value } as Partial<PostBlock>)}
            placeholder="Caption (optional)"
          />
          <div className="mt-3 flex flex-wrap gap-4">
            <Choice
              label="Shape"
              options={IMAGE_RATIOS.map((r) => ({ id: r.id, label: r.label }))}
              value={block.ratio}
              onPick={(ratio) => patch({ ratio } as Partial<PostBlock>)}
            />
            <Choice
              label="Width"
              options={[
                { id: "inset", label: "In column" },
                { id: "full", label: "Full width" },
              ]}
              value={block.width}
              onPick={(width) => patch({ width } as Partial<PostBlock>)}
            />
          </div>
        </>
      )}

      {block.type === "divider" && (
        <p className="m-0 text-[13px]" style={{ color: "var(--a-text-faint)" }}>
          A horizontal rule between sections.
        </p>
      )}

      <AnimationPanel block={block} onChange={setAnimation} />

      <AddBlockRow compact onAdd={onAddAfter} />
    </div>
  );
}

/* ---- motion, one block at a time ---- */

function AnimationPanel({
  block,
  onChange,
}: {
  block: PostBlock;
  onChange: (animation: BlockAnimation | undefined) => void;
}) {
  const animation = block.animation;
  const selectId = useId();
  const delayId = useId();
  const [tryKey, setTryKey] = useState(0);
  const definition = animation ? animationById(animation.effect) : undefined;

  /* A change is rebuilt from scratch with only the parts that matter, so the
     normal pace and a zero delay are stored as nothing at all. */
  const update = (changes: Partial<BlockAnimation>) => {
    if (!animation) return;
    const next: BlockAnimation = { effect: changes.effect ?? animation.effect };
    const pace = "pace" in changes ? changes.pace : animation.pace;
    if (pace && pace !== "normal") next.pace = pace;
    const delay = "delay" in changes ? changes.delay : animation.delay;
    if (delay) next.delay = delay;
    onChange(next);
  };

  return (
    <div
      className="mt-4 rounded-lg p-3"
      style={{ border: "1px solid var(--a-line)", background: "var(--a-surface)" }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[170px] flex-1">
          <label className="admin-label" htmlFor={selectId}>
            Animation
          </label>
          <select
            id={selectId}
            className="admin-select"
            value={animation?.effect ?? ""}
            onChange={(e) => {
              const effect = e.target.value as AnimationEffect | "";
              if (!effect) onChange(undefined);
              else if (animation) update({ effect });
              else onChange({ effect });
            }}
          >
            <option value="">No animation</option>
            {ANIMATION_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {ANIMATIONS.filter((entry) => entry.group === group).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {animation && (
          <>
            <Choice
              label="Pace"
              options={ANIMATION_PACES.map((pace) => ({ id: pace.id, label: pace.label }))}
              value={animation.pace ?? "normal"}
              onPick={(pace) => update({ pace })}
            />
            <div>
              <label className="admin-label" htmlFor={delayId}>
                Delay: {animation.delay ?? 0} ms
              </label>
              <input
                id={delayId}
                type="range"
                className="block w-[170px]"
                min={0}
                max={ANIMATION_DELAY_MAX}
                step={ANIMATION_DELAY_STEP}
                value={animation.delay ?? 0}
                style={{ accentColor: "var(--a-brand)" }}
                onChange={(e) => update({ delay: Number(e.target.value) })}
              />
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-quiet admin-btn-sm"
              onClick={() => setTryKey((n) => n + 1)}
            >
              <Play size={14} /> Try it
            </button>
          </>
        )}
      </div>

      {definition && <p className="admin-help">{definition.description}</p>}
      {animation && tryKey > 0 && <TryIt key={tryKey} block={block} />}
    </div>
  );
}

/* One block on the website's own canvas, arriving the way it will on the
   page. A new key on every press plays it again. */
function TryIt({ block }: { block: PostBlock }) {
  const revealRef = useReveal<HTMLDivElement>();
  return (
    <div
      ref={revealRef}
      className="mt-3 overflow-hidden rounded-lg p-4"
      style={{ background: "var(--color-canvas)" }}
    >
      <PostBody blocks={[block]} />
    </div>
  );
}

/* ---- small controls ---- */

function Choice<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onPick: (id: T) => void;
}) {
  return (
    <div>
      <p className="admin-label">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="admin-chip"
            aria-pressed={value === option.id}
            onClick={() => onPick(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddBlockRow({
  onAdd,
  compact = false,
}: {
  onAdd: (type: PostBlock["type"]) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-3" : "mt-4"}`}>
      {!compact && (
        <span className="text-[13px]" style={{ color: "var(--a-text-faint)" }}>
          Add
        </span>
      )}
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`admin-btn admin-btn-quiet ${compact ? "admin-btn-sm" : ""}`}
          onClick={() => onAdd(type)}
        >
          <Plus size={compact ? 13 : 15} /> {BLOCK_LABEL[type]}
        </button>
      ))}
    </div>
  );
}
