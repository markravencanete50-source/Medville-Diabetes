import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Image as ImageIcon,
  Pencil,
  Plus,
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
  BLOCK_COLORS,
  BLOCK_LABEL,
  IMAGE_RATIOS,
  emptyBlock,
  postHasContent,
  readingMinutes,
  type BlockColor,
  type PostBlock,
} from "../../data/blog";
import {
  FONTS,
  FONT_CATEGORY_LABEL,
  ensureFontLoaded,
  fontFamily,
  type FontCategory,
} from "../../data/fonts";
import PostBody from "../../components/PostBody";
import { Badge, Banner, Card, Drawer, Empty, Field, PageHeader, Spinner, useToast } from "../ui";

/*
  The blog editor.

  A post is a list of blocks rather than one box of text, which is what makes
  a picture, a highlight and a heading each editable on their own terms. The
  client asked for something closer to a design tool; this is a block editor
  in the shape of Notion or WordPress rather than a free canvas. Colour and
  type are the author's to choose: the brand swatches are one tap away, the
  colour wheel beside them opens the whole spectrum, and the font list in
  data/fonts.ts runs from the site's own faces to fifty more. What comes back
  from the database is still checked before it is rendered, in data/blog.ts.

  Preview is not a second renderer. It mounts the same PostBody component the
  public article uses, so what is approved here is what a reader receives.
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
                    <td>
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
                    <td>
                      <Badge tone={post.published ? "ok" : "quiet"}>
                        {post.published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td>{post.publishedAt || "—"}</td>
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

  return (
    <Drawer
      open
      wide
      title={isNew ? "New article" : "Edit article"}
      onClose={onClose}
    >
      <div
        className="mb-5 flex flex-wrap items-center gap-2.5 rounded-lg p-3"
        style={{ background: "var(--a-bg)" }}
      >
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
      </div>

      <div className="mb-5 flex gap-1.5 rounded-full p-1" style={{ background: "var(--a-bg)" }}>
        {(["edit", "preview"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold"
            style={
              mode === value
                ? { background: "var(--a-surface)", color: "var(--a-text)", boxShadow: "var(--a-shadow)" }
                : { color: "var(--a-text-faint)" }
            }
          >
            {value === "edit" ? <Pencil size={15} /> : <Eye size={15} />}
            {value === "edit" ? "Write" : "Preview"}
          </button>
        ))}
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

          <HeaderImage draft={draft} set={set} />

          <div>
            <p className="admin-label">Article</p>
            <div className="mt-2 flex flex-col gap-3">
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

/* ---- preview: the real component, on the real background ---- */

function Preview({ draft }: { draft: PostRecord }) {
  return (
    <div className="rounded-lg p-6" style={{ background: "#ffffff" }}>
      <h1 className="m-0 font-display text-h2 font-bold leading-tight text-ink">
        {draft.title || "Untitled article"}
      </h1>
      {draft.excerpt && (
        <p className="mt-3 text-body leading-relaxed text-grey-muted">{draft.excerpt}</p>
      )}
      {draft.image && (
        <img
          src={draft.image}
          alt={draft.imageAlt}
          className="mt-5 aspect-[16/9] w-full rounded-lg object-cover"
        />
      )}
      <div className="mt-7">
        <PostBody blocks={draft.body} />
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
    <Field label="Header picture" help="Shown at the top of the article and on every card.">
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

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--a-bg)" }}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--a-text-faint)" }}
        >
          {BLOCK_LABEL[block.type]}
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
            <ColorPicker value={block.color} onPick={(color) => patch({ color } as Partial<PostBlock>)} />
            <FontPicker
              value={block.font}
              fallback="body"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
            <Choice
              label="Align"
              options={[
                { id: "left", label: "Left" },
                { id: "center", label: "Centre" },
              ]}
              value={block.align ?? "left"}
              onPick={(align) => patch({ align } as Partial<PostBlock>)}
            />
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
              value={String(block.level)}
              onPick={(level) => patch({ level: level === "3" ? 3 : 2 } as Partial<PostBlock>)}
            />
            <ColorPicker value={block.color} onPick={(color) => patch({ color } as Partial<PostBlock>)} />
            <FontPicker
              value={block.font}
              fallback="display"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
            <Choice
              label="Align"
              options={[
                { id: "left", label: "Left" },
                { id: "center", label: "Centre" },
              ]}
              value={block.align ?? "left"}
              onPick={(align) => patch({ align } as Partial<PostBlock>)}
            />
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
            <ColorPicker value={block.color} onPick={(color) => patch({ color } as Partial<PostBlock>)} />
            <FontPicker
              value={block.font}
              fallback="body"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
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
            <ColorPicker value={block.color} onPick={(color) => patch({ color } as Partial<PostBlock>)} />
            <FontPicker
              value={block.font}
              fallback="display"
              onPick={(font) => patch({ font } as Partial<PostBlock>)}
            />
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
                { id: "accent", label: "Cyan" },
                { id: "warn", label: "Orange" },
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

      <AddBlockRow compact onAdd={onAddAfter} />
    </div>
  );
}

/* ---- small controls ---- */

/*
  Colour. The brand swatches come first; the disc after them is the browser's
  own colour picker, which opens a wheel or a spectrum depending on the
  device, and the box beside it takes a code typed or pasted in. Selecting
  the swatch already chosen clears the choice, so a block can go back to its
  default without a separate control.
*/
const HEX = /^#[0-9a-fA-F]{6}$/;

function ColorPicker({
  value,
  onPick,
}: {
  value: BlockColor | undefined;
  onPick: (color: BlockColor | undefined) => void;
}) {
  const custom = typeof value === "string" && value.startsWith("#");
  const [hex, setHex] = useState<string>(custom ? value : "#0a6d8a");
  useEffect(() => {
    if (custom) setHex(value);
  }, [custom, value]);
  const pickerId = useId();

  return (
    <div>
      <p className="admin-label">Colour</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {BLOCK_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={value === color.id}
            onClick={() => onPick(value === color.id ? undefined : color.id)}
            className="h-7 w-7 rounded-full"
            style={{
              background: color.token,
              outline: value === color.id ? "2px solid var(--a-accent)" : "none",
              outlineOffset: 2,
            }}
          />
        ))}
        <label
          htmlFor={pickerId}
          title="Any colour"
          className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full"
          style={{
            background: custom
              ? value
              : "conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #3b82f6, #a855f7, #f43f5e)",
            outline: custom ? "2px solid var(--a-accent)" : "none",
            outlineOffset: 2,
          }}
        >
          <input
            id={pickerId}
            type="color"
            aria-label="Choose any colour"
            value={HEX.test(hex) ? hex.toLowerCase() : "#000000"}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              setHex(e.target.value);
              onPick(e.target.value as BlockColor);
            }}
          />
        </label>
        <input
          className="admin-input"
          style={{ width: 96, minHeight: 30, padding: "2px 8px", fontSize: 12 }}
          value={hex}
          spellCheck={false}
          aria-label="Colour code"
          onChange={(e) => {
            const next = e.target.value.trim();
            setHex(next);
            if (HEX.test(next)) onPick(next.toLowerCase() as BlockColor);
          }}
        />
      </div>
    </div>
  );
}

/*
  Font. One list, grouped the way a person thinks about type, with each name
  shown in its own face where the browser allows it and a sample line beside
  the list that always is. The face is fetched as soon as it is chosen, so
  the sample and the preview show the real thing rather than a fallback.
*/
const FONT_GROUPS = (Object.keys(FONT_CATEGORY_LABEL) as FontCategory[]).map((category) => ({
  category,
  fonts: FONTS.filter((font) => font.category === category),
}));

function FontPicker({
  value,
  fallback,
  onPick,
}: {
  value: string | undefined;
  /* The face a block uses when none is chosen: the body face for text, the
     display face for a heading or a quote. Choosing it again stores nothing,
     so an untouched block stays untouched. */
  fallback: "body" | "display";
  onPick: (font: string | undefined) => void;
}) {
  const current = value ?? fallback;
  const selectId = useId();
  useEffect(() => {
    ensureFontLoaded(current);
  }, [current]);

  return (
    <div>
      <label className="admin-label" htmlFor={selectId}>
        Font
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        <select
          id={selectId}
          className="admin-select"
          style={{ minWidth: 190 }}
          value={current}
          onChange={(e) => onPick(e.target.value === fallback ? undefined : e.target.value)}
        >
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.category} label={FONT_CATEGORY_LABEL[group.category]}>
              {group.fonts.map((font) => (
                <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                  {font.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="text-[15px]"
          style={{ fontFamily: fontFamily(current, fallback), color: "var(--a-text-muted)" }}
        >
          The quick brown fox jumps over the lazy dog
        </span>
      </div>
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onPick: (id: never) => void;
}) {
  return (
    <div>
      <p className="admin-label">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onPick(option.id as never)}
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={
              value === option.id
                ? { background: "var(--a-accent)", color: "#fff" }
                : { background: "var(--a-surface)", color: "var(--a-text-faint)" }
            }
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
          className="admin-btn admin-btn-quiet"
          onClick={() => onAdd(type)}
          style={compact ? { padding: "4px 10px", fontSize: 12 } : undefined}
        >
          <Plus size={compact ? 13 : 15} /> {BLOCK_LABEL[type]}
        </button>
      ))}
    </div>
  );
}
