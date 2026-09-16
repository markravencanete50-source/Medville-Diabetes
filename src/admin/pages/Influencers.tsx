import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Copy, Link2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { adminApi, AdminApiError, type Influencer } from "../api";
import { useAdminAuth } from "../auth";
import { Badge, Banner, Card, Empty, Field, PageHeader, Spinner, useToast } from "../ui";

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "Meta Ads", "YouTube", "Other"];

function referralUrl(item: Influencer) {
  const url = new URL("/qualify", window.location.origin);
  url.searchParams.set("ref", item.slug);
  if (item.platform === "Meta Ads") {
    url.searchParams.set("utm_source", "meta");
    url.searchParams.set("utm_medium", "paid_social");
    url.searchParams.set("utm_campaign", item.slug);
  }
  return url.toString();
}

export default function Influencers() {
  const { getToken } = useAdminAuth();
  const toast = useToast();
  const [items, setItems] = useState<Influencer[] | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busySlug, setBusySlug] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setItems((await adminApi.listInfluencers(getToken)).influencers);
    } catch (problem) {
      setItems([]);
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => (items ?? []).reduce(
    (sum, item) => ({ clicks: sum.clicks + item.clicks, leads: sum.leads + item.leads }),
    { clicks: 0, leads: 0 },
  ), [items]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !handle.trim()) return toast("Enter a name and social handle.", "danger");
    setBusy(true);
    try {
      await adminApi.createInfluencer(getToken, { name: name.trim(), handle: handle.trim(), platform });
      setName(""); setHandle("");
      toast("Influencer link created.");
      await load();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That did not work.", "danger");
    } finally { setBusy(false); }
  };

  const setActive = async (item: Influencer) => {
    setBusySlug(item.slug);
    try {
      await adminApi.setInfluencerActive(getToken, item.slug, !item.active);
      setItems((current) => (current ?? []).map((value) => value.slug === item.slug
        ? { ...value, active: !item.active } : value));
      toast(item.active ? "Influencer link paused." : "Influencer link reactivated.");
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That did not work.", "danger");
    } finally { setBusySlug(""); }
  };

  const copy = async (item: Influencer) => {
    try {
      await navigator.clipboard.writeText(referralUrl(item));
      toast("Referral link copied.");
    } catch { toast("The link could not be copied. Select it from the table instead.", "danger"); }
  };

  const conversion = totals.clicks ? `${((totals.leads / totals.clicks) * 100).toFixed(1)}%` : "0%";

  return (
    <>
      <PageHeader
        title="Influencers"
        lede="Create partner and paid social links, then compare unique visits, enquiries, and conversion rate."
        actions={<button type="button" className="admin-btn admin-btn-quiet" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>}
      />

      {error && <div className="mb-4"><Banner tone="warn">{error}</Banner></div>}

      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Card><div className="admin-stat"><b>{items?.length ?? 0}</b><span>Partners</span></div></Card>
        <Card><div className="admin-stat"><b>{totals.clicks}</b><span>Unique visits</span></div></Card>
        <Card><div className="admin-stat"><b>{totals.leads}</b><span>Enquiries</span></div></Card>
        <Card><div className="admin-stat"><b>{conversion}</b><span>Conversion</span></div></Card>
      </div>

      <Card className="mb-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg" style={{ background: "var(--a-brand-soft)", color: "var(--a-brand-text)" }}><BarChart3 size={19} /></span>
            <div><p className="admin-label m-0">Meta Ads measurement</p><p className="admin-help mt-1 max-w-[720px]">Choose Meta Ads when you create a link. The URL includes a campaign name and Medville records unique visits, enquiries, and conversion rate without sending form answers or contact details to Meta.</p></div>
          </div>
          <Badge tone="warn">Pixel connection required</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg p-4" style={{ background: "var(--a-brand-soft)" }}><div className="flex items-center gap-2"><ShieldCheck size={16} style={{ color: "var(--a-brand-text)" }} /><p className="admin-label m-0">Available now</p></div><p className="admin-help mt-2">Campaign link, unique visits, enquiries, and on-site conversion rate.</p></div>
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--a-border)" }}><p className="admin-label m-0">Needs a Meta ad account connection</p><p className="admin-help mt-2">Impressions, spend, CTR, CPC, CPM, reach, and frequency. These figures come from the Meta Marketing API, not from the Pixel alone.</p></div>
        </div>
        <p className="admin-help mt-4">A browser Pixel is not active yet. This diabetes website must not send health information, form fields, or health-related page activity to Meta. Add the approved Pixel ID and ad account only after privacy and legal review.</p>
      </Card>

      <Card className="mb-4">
        <form onSubmit={create}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--a-brand-soft)", color: "var(--a-brand-text)" }}><Link2 size={18} /></span>
            <div><p className="admin-label m-0">Create a referral link</p><p className="admin-help m-0">The handle becomes a safe link code; no visitor details are placed in the URL.</p></div>
          </div>
          <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
            <Field label="Influencer name" htmlFor="influencer-name">
              <input id="influencer-name" className="admin-input" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="T1D Girlie" />
            </Field>
            <Field label="Social handle" htmlFor="influencer-handle" help="Letters, numbers, dots, hyphens and underscores only.">
              <input id="influencer-handle" className="admin-input" maxLength={50} value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@t1d1girlie" />
            </Field>
            <Field label="Platform" htmlFor="influencer-platform">
              <select id="influencer-platform" className="admin-select" value={platform} onChange={(event) => setPlatform(event.target.value)}>
                {PLATFORMS.map((value) => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <button type="submit" className="admin-btn admin-btn-primary w-full md:w-auto" disabled={busy}><Plus size={16} /> {busy ? "Creating" : "Create link"}</button>
          </div>
        </form>
      </Card>

      <Card pad={false}>
        {items === null ? <Spinner label="Loading influencers" /> : !items.length ? (
          <Empty>No influencer links yet. Create the first one above.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Influencer</th><th scope="col">Referral link</th><th scope="col">Visits</th><th scope="col">Enquiries</th><th scope="col">Conversion</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
              <tbody>{items.map((item) => {
                const rate = item.clicks ? `${((item.leads / item.clicks) * 100).toFixed(1)}%` : "0%";
                return <tr key={item.slug}>
                  <td data-label="Influencer"><span className="font-semibold">{item.name}</span><span className="block text-xs" style={{ color: "var(--a-text-faint)" }}>{item.platform} · {item.handle}</span></td>
                  <td data-label="Referral link"><input className="admin-input min-w-[260px]" readOnly value={referralUrl(item)} aria-label={`Referral link for ${item.name}`} /></td>
                  <td data-label="Visits">{item.clicks}</td><td data-label="Enquiries">{item.leads}</td><td data-label="Conversion">{rate}</td>
                  <td data-label="Status"><Badge tone={item.active ? "ok" : "quiet"}>{item.active ? "Active" : "Paused"}</Badge></td>
                  <td><button type="button" className="admin-btn admin-btn-quiet admin-btn-sm" onClick={() => void copy(item)}><Copy size={14} /> Copy</button><button type="button" className="admin-btn admin-btn-quiet admin-btn-sm ml-2" disabled={busySlug === item.slug} onClick={() => void setActive(item)}>{item.active ? "Pause" : "Reactivate"}</button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
