import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  PRODUCT_STATUS_LABEL,
  products as builtInProducts,
  type Product,
  type ProductStatus,
} from "../../data/products";
import {
  hideProduct,
  isImageAddress,
  loadProducts,
  saveProduct,
  toSlug,
  UPLOAD_HELP,
  uploadImage,
  uploadProblem,
} from "../data";
import { Badge, Banner, Card, Drawer, Empty, Field, PageHeader, Spinner, useToast } from "../ui";

/*
  Products.

  The catalog has two sources. Fourteen products are compiled into the site so
  it works with an empty database, and anything the client saves is stored in
  Firestore. This screen merges them by slug and always writes the whole
  merged record back, so once a built-in product has been edited it stops
  depending on the build entirely.

  Removing a built-in product writes a tombstone rather than deleting a
  document, because there is no document to delete for a product that only
  exists in the code.
*/

const STATUSES: ProductStatus[] = ["available", "coming-soon", "sold"];
const STATUS_TONE: Record<ProductStatus, "ok" | "warn" | "danger"> = {
  available: "ok",
  "coming-soon": "warn",
  sold: "danger",
};

const BLANK: Product = {
  slug: "",
  name: "",
  brand: "FreeStyle Libre",
  line: "cgm",
  category: "System",
  shortDescription: "",
  description: [],
  keyFacts: [],
  imageFront: "",
  imageBack: "",
  status: "available",
};

export default function Products() {
  const toast = useToast();
  const [saved, setSaved] = useState<Record<string, Partial<Product>> | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setSaved(await loadProducts());
    } catch {
      setSaved({});
      setError("The product list could not be loaded. Check that Firestore is enabled.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const merged = useMemo(() => {
    const bySlug = new Map<string, Product>(builtInProducts.map((product) => [product.slug, product]));
    for (const [slug, patch] of Object.entries(saved ?? {})) {
      if ((patch as { deleted?: boolean }).deleted) {
        bySlug.delete(slug);
        continue;
      }
      const existing = bySlug.get(slug);
      bySlug.set(slug, { ...(existing ?? BLANK), ...patch, slug } as Product);
    }
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [saved]);

  const remove = async (product: Product) => {
    if (!window.confirm(`Remove ${product.name} from the website?`)) return;
    try {
      await hideProduct(product.slug);
      toast("Product removed from the website.");
      await refresh();
    } catch {
      toast("That product could not be removed.", "danger");
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        lede="Everything in the catalog. Mark a product as coming soon or sold out and visitors can no longer enquire about it."
        actions={
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => setEditing({ ...BLANK })}
          >
            <Plus size={16} /> Add product
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <Card pad={false}>
        {saved === null ? (
          <Spinner label="Loading products" />
        ) : !merged.length ? (
          <Empty>No products yet.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Brand</th>
                  <th scope="col">Availability</th>
                  <th scope="col">Price</th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {merged.map((product) => {
                  const status = product.status ?? "available";
                  return (
                    <tr key={product.slug}>
                      <td>
                        <div className="flex items-center gap-3">
                          {product.imageFront && (
                            <img
                              src={product.imageFront}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 flex-none rounded object-contain"
                              style={{ background: "var(--a-surface-2)" }}
                            />
                          )}
                          <button
                            type="button"
                            className="text-left font-semibold underline underline-offset-2"
                            style={{ color: "var(--a-brand-text)" }}
                            onClick={() => setEditing(product)}
                          >
                            {product.name}
                          </button>
                        </div>
                      </td>
                      <td style={{ color: "var(--a-text-muted)" }}>{product.brand}</td>
                      <td>
                        <Badge tone={STATUS_TONE[status]}>{PRODUCT_STATUS_LABEL[status]}</Badge>
                      </td>
                      <td style={{ color: "var(--a-text-muted)" }}>
                        {typeof product.price === "number" ? `$${product.price.toFixed(2)}` : "Not shown"}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          style={{ minHeight: 32, padding: "0 10px" }}
                          onClick={() => void remove(product)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.slug ? "Edit product" : "Add product"}
      >
        {editing && (
          <ProductForm
            product={editing}
            existingSlugs={merged.map((product) => product.slug)}
            onDone={async () => {
              setEditing(null);
              await refresh();
            }}
          />
        )}
      </Drawer>
    </>
  );
}

function ProductForm({
  product,
  existingSlugs,
  onDone,
}: {
  product: Product;
  existingSlugs: string[];
  onDone: () => Promise<void>;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Product>(product);
  /*
    Uploading and saving are two different waits and used to share one flag,
    so the submit button read "Saving" while a picture was still going up and
    nothing was being saved. They are separate now, and only the picture that
    is actually uploading is disabled.
  */
  const [uploading, setUploading] = useState<"imageFront" | "imageBack" | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !product.slug;

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const pickImage = async (side: "imageFront" | "imageBack", file: File | undefined) => {
    if (!file) return;
    setUploading(side);
    try {
      const url = await uploadImage(file, "products");
      set(side, url);
      toast("Picture uploaded.");
    } catch (problem) {
      toast(uploadProblem(problem), "danger");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const slug = draft.slug || toSlug(draft.name);
    if (!slug) return toast("Please give the product a name.", "danger");
    if (isNew && existingSlugs.includes(slug)) {
      return toast("A product with that name already exists.", "danger");
    }
    if (!draft.imageFront) return toast("Please add the front picture.", "danger");
    /* A picture given as an address is only useful if it is one. Catching it
       here keeps a broken image out of the catalog rather than out of view. */
    for (const [label, value] of [
      ["front", draft.imageFront],
      ["back", draft.imageBack],
    ] as const) {
      if (value && !value.startsWith("/") && !isImageAddress(value)) {
        return toast(`The ${label} picture address is not a web address.`, "danger");
      }
    }

    setSaving(true);
    try {
      await saveProduct(slug, { ...draft, slug });
      toast("Product saved.");
      await onDone();
    } catch {
      toast("That product could not be saved.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="p-name">
        <input
          id="p-name"
          className="admin-input"
          required
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand" htmlFor="p-brand">
          <input
            id="p-brand"
            className="admin-input"
            value={draft.brand}
            onChange={(event) => set("brand", event.target.value as Product["brand"])}
          />
        </Field>
        <Field label="Type" htmlFor="p-line">
          <select
            id="p-line"
            className="admin-select"
            value={draft.line}
            onChange={(event) => set("line", event.target.value as Product["line"])}
          >
            <option value="cgm">Continuous glucose monitor</option>
            <option value="insulin-pump">Insulin pump</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Availability" htmlFor="p-status">
          <select
            id="p-status"
            className="admin-select"
            value={draft.status ?? "available"}
            onChange={(event) => set("status", event.target.value as ProductStatus)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {PRODUCT_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price" htmlFor="p-price" help="Leave empty to show no price.">
          <input
            id="p-price"
            className="admin-input"
            type="number"
            min="0"
            step="0.01"
            value={draft.price ?? ""}
            onChange={(event) =>
              set("price", event.target.value === "" ? undefined : Number(event.target.value))
            }
          />
        </Field>
      </div>

      <Field label="Short description" htmlFor="p-short" help="One or two plain sentences.">
        <textarea
          id="p-short"
          className="admin-textarea"
          style={{ minHeight: 70 }}
          value={draft.shortDescription}
          onChange={(event) => set("shortDescription", event.target.value)}
        />
      </Field>

      <Field label="Full description" htmlFor="p-desc" help="One paragraph per line.">
        <textarea
          id="p-desc"
          className="admin-textarea"
          value={draft.description.join("\n")}
          onChange={(event) => set("description", event.target.value.split("\n").filter(Boolean))}
        />
      </Field>

      <Field label="Key facts" htmlFor="p-facts" help="One fact per line.">
        <textarea
          id="p-facts"
          className="admin-textarea"
          style={{ minHeight: 80 }}
          value={draft.keyFacts.join("\n")}
          onChange={(event) => set("keyFacts", event.target.value.split("\n").filter(Boolean))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <ImagePicker
          label="Front picture"
          value={draft.imageFront}
          busy={uploading === "imageFront"}
          onPick={(file) => void pickImage("imageFront", file)}
          onAddress={(value) => set("imageFront", value)}
          onClear={() => set("imageFront", "")}
        />
        <ImagePicker
          label="Back picture"
          value={draft.imageBack}
          busy={uploading === "imageBack"}
          onPick={(file) => void pickImage("imageBack", file)}
          onAddress={(value) => set("imageBack", value)}
          onClear={() => set("imageBack", "")}
        />
      </div>

      <p className="admin-help">{UPLOAD_HELP}</p>

      <button
        type="submit"
        className="admin-btn admin-btn-primary"
        disabled={saving || uploading !== null}
      >
        {saving ? "Saving" : uploading ? "Waiting for the picture" : "Save product"}
      </button>
    </form>
  );
}

/*
  A picture is either uploaded or given as a web address, and both write the
  same field, so nothing changes here when Cloud Storage is switched on. The
  address is the route that works on the free tier, and it was missing from
  this form entirely: the only control was a file input pointed at a bucket
  that does not exist yet, and the front picture is required to save, so no
  product could be added at all.
*/
function ImagePicker({
  label,
  value,
  busy,
  onPick,
  onAddress,
  onClear,
}: {
  label: string;
  value: string;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onAddress: (value: string) => void;
  onClear: () => void;
}) {
  /* A pasted address is shown as typed and only judged once there is
     something to judge, so the field does not turn red at the first
     character. A path starting with "/" is one of the pictures shipped with
     the site, which is how every built-in product refers to its own art. */
  const looksWrong =
    value.trim() !== "" && !value.startsWith("/") && !isImageAddress(value);

  return (
    <Field label={label} help="JPG, PNG or WebP, up to 5 MB.">
      <div
        className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded"
        style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-line)" }}
      >
        {value && !looksWrong ? (
          <img src={value} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[12px]" style={{ color: "var(--a-text-faint)" }}>
            {busy ? "Uploading" : "No picture"}
          </span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="admin-input"
        style={{ padding: 6 }}
        onChange={(event) => onPick(event.target.files?.[0])}
      />
      <input
        type="text"
        className="admin-input mt-2"
        value={value}
        disabled={busy}
        placeholder="Or paste a picture address: https://..."
        aria-label={`${label} web address`}
        onChange={(event) => onAddress(event.target.value.trim())}
      />
      {looksWrong && (
        <p className="admin-help mt-1" style={{ color: "var(--a-warn)" }}>
          That does not look like a web address.
        </p>
      )}
      {value && (
        <button type="button" className="admin-help mt-1 underline" onClick={onClear}>
          Remove this picture
        </button>
      )}
    </Field>
  );
}
