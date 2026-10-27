import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { adminApi, leadName, type Influencer, type Lead } from "../api";
import { canOpen, isSalesRole, useAdminAuth } from "../auth";
import { loadTrash, restoreTrash, type TrashKind, type TrashRecord } from "../data";
import { Banner, Card, Empty, PageHeader, Spinner, formatDateTime, useToast } from "../ui";

const KIND_LABEL: Record<TrashKind, string> = {
  products: "Product",
  faqs: "Question",
  testimonials: "Review",
  blog: "Article",
};

type BinEntry =
  | { key: string; kind: "leads"; label: string; deletedAt: string | null; item: Lead }
  | { key: string; kind: "influencers"; label: string; deletedAt: string | null; item: Influencer }
  | { key: string; kind: TrashKind; label: string; deletedAt: string | null; item: TrashRecord };

function retention(purgeAt: number | null) {
  if (!purgeAt) return "Seven days from deletion";
  const days = Math.max(0, Math.ceil((purgeAt * 1000 - Date.now()) / 86_400_000));
  return days ? `${days} ${days === 1 ? "day" : "days"} remaining` : "Pending automatic removal";
}

export default function RecycleBin() {
  const { session, getToken } = useAdminAuth();
  const toast = useToast();
  const [websiteItems, setWebsiteItems] = useState<TrashRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const role = session!.role;
  const features = session!.features;
  const kinds = (["products", "faqs", "testimonials", "blog"] as TrashKind[])
    .filter((kind) => canOpen(role, kind, features));
  const canSeeLeads = canOpen(role, "leads", features) && !isSalesRole(role);
  const canSeeInfluencers = canOpen(role, "influencers", features);

  const refresh = useCallback(async () => {
    setLoading(true);
    setWebsiteItems([]);
    setLeads([]);
    setInfluencers([]);
    setNextCursor(null);
    const tasks: Promise<void>[] = [];
    const failures: string[] = [];
    if (kinds.length) tasks.push(loadTrash(kinds).then(setWebsiteItems).catch(() => { failures.push("Website content could not be loaded."); }));
    if (canSeeLeads) tasks.push(adminApi.listLeads(getToken, { deleted: true }).then((result) => {
      setLeads(result.leads);
      setNextCursor(result.nextCursor);
    }).catch(() => { failures.push("Deleted enquiries could not be loaded."); }));
    if (canSeeInfluencers) tasks.push(adminApi.listInfluencers(getToken).then((result) => {
      setInfluencers(result.influencers.filter((item) => item.deleted));
    }).catch(() => { failures.push("Deleted influencer links could not be loaded."); }));
    await Promise.all(tasks);
    setErrors(failures);
    setLoading(false);
  // Available kinds and permissions are fixed for the current signed-in session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, role, features]);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await adminApi.listLeads(getToken, { deleted: true, cursor: nextCursor });
      setLeads((current) => [...new Map([...current, ...result.leads].map((lead) => [lead.id, lead])).values()]);
      setNextCursor(result.nextCursor);
    } catch {
      toast("More deleted enquiries could not be loaded.", "danger");
    } finally { setLoadingMore(false); }
  };

  const restore = async (entry: BinEntry) => {
    setBusyKey(entry.key);
    try {
      if (entry.kind === "leads") {
        await adminApi.restoreLead(getToken, entry.item.id);
        setLeads((current) => current.filter((item) => item.id !== entry.item.id));
      } else if (entry.kind === "influencers") {
        await adminApi.setInfluencerDeleted(getToken, entry.item.slug, false);
        setInfluencers((current) => current.filter((item) => item.slug !== entry.item.slug));
      } else {
        await restoreTrash(entry.item);
        setWebsiteItems((current) => current.filter((item) => item.id !== entry.item.id));
      }
      toast("Item restored.");
    } catch (problem) {
      toast(problem instanceof Error ? problem.message : "This item could not be restored.", "danger");
    } finally { setBusyKey(""); }
  };

  const entries: BinEntry[] = [
    ...leads.map((item): BinEntry => ({ key: `leads:${item.id}`, kind: "leads", label: leadName(item), deletedAt: item.deletedAt, item })),
    ...influencers.map((item): BinEntry => ({ key: `influencers:${item.slug}`, kind: "influencers", label: item.name || item.slug, deletedAt: null, item })),
    ...websiteItems.map((item): BinEntry => ({ key: item.id, kind: item.kind, label: item.label, deletedAt: item.deletedAt, item })),
  ].sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

  return <>
    <PageHeader title="Recycle Bin" lede="Restore deleted enquiries, links, and website content here. Enquiries are removed automatically after seven days. Deleted administrator logins cannot be restored." actions={
      <button type="button" className="admin-btn admin-btn-quiet" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
    } />
    {errors.map((error) => <div className="mb-3" key={error}><Banner tone="warn">{error}</Banner></div>)}
    <Card pad={false}>
      {loading ? <Spinner label="Loading Recycle Bin" /> : !entries.length ? <Empty>The Recycle Bin is empty.</Empty> :
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th scope="col">Type</th><th scope="col">Item</th><th scope="col">Deleted</th><th scope="col">Retention</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{entries.map((entry) => <tr key={entry.key}>
            <td data-label="Type">{entry.kind === "leads" ? "Enquiry" : entry.kind === "influencers" ? "Influencer link" : KIND_LABEL[entry.kind]}</td>
            <td data-label="Item" className="font-semibold">{entry.label}</td>
            <td data-label="Deleted">{formatDateTime(entry.deletedAt)}</td>
            <td data-label="Retention">{entry.kind === "leads" ? retention(entry.item.purgeAt) : "Until restored"}</td>
            <td data-label="Actions"><button type="button" className="admin-btn admin-btn-quiet admin-btn-sm" disabled={Boolean(busyKey)} onClick={() => void restore(entry)}><RotateCcw size={14} /> {busyKey === entry.key ? "Restoring" : "Restore"}</button></td>
          </tr>)}</tbody>
        </table></div>}
    </Card>
    {nextCursor && <button type="button" className="admin-btn admin-btn-quiet mt-4" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading" : "Load more deleted enquiries"}</button>}
  </>;
}
