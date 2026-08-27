import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import {
  adminApi,
  AdminApiError,
  leadName,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  type Lead,
  type LeadStatus,
} from "../api";
import { useAdminAuth } from "../auth";
import {
  Badge,
  Banner,
  Card,
  Drawer,
  Empty,
  Field,
  PageHeader,
  Spinner,
  formatDateTime,
  useToast,
} from "../ui";
import { products as builtInProducts } from "../../data/products";

/*
  The enquiry list.

  This is the one screen in the dashboard that shows Protected Health
  Information, and it is built with that in mind:

  - Every fetch is recorded in the access log by the function that serves it.
  - A person's record opens in a panel, never at its own address, so no
    patient is ever identified by a URL that could be copied or logged.
  - Searching and filtering happen in the browser on records already fetched,
    so a search term never travels anywhere.
  - The export is generated locally and never leaves the machine except by the
    client's own choice.
*/

const PRODUCT_NAME = new Map(builtInProducts.map((product) => [product.slug, product.name]));

const STATUS_TONE: Record<LeadStatus, "new" | "ok" | "warn" | "danger" | "quiet"> = {
  new: "new",
  contacted: "warn",
  qualified: "ok",
  "not-qualified": "danger",
  closed: "quiet",
};

export default function Leads() {
  const { getToken } = useAdminAuth();
  const toast = useToast();

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await adminApi.listLeads(getToken);
      setLeads(result.leads);
    } catch (problem) {
      setLeads([]);
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (leads ?? []).filter((lead) => {
      if (filter !== "all" && lead.status !== filter) return false;
      if (!term) return true;
      return (
        leadName(lead).toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.phone.toLowerCase().includes(term) ||
        lead.city.toLowerCase().includes(term) ||
        lead.state.toLowerCase().includes(term)
      );
    });
  }, [leads, filter, search]);

  const update = async (lead: Lead, patch: { status?: LeadStatus; note?: string }) => {
    setSaving(true);
    try {
      await adminApi.updateLead(getToken, lead.id, patch);
      setLeads((current) =>
        (current ?? []).map((item) => (item.id === lead.id ? { ...item, ...patch } : item)),
      );
      setOpenLead((current) => (current && current.id === lead.id ? { ...current, ...patch } : current));
      toast("Enquiry updated.");
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That did not work.", "danger");
    } finally {
      setSaving(false);
    }
  };

  /*
    The export is deliberately a manual action with a warning attached. A
    spreadsheet of patient details on a laptop is outside every safeguard the
    hosting provides, so the client should have to mean it.
  */
  const exportCsv = () => {
    const rows = [
      ["Received", "First name", "Last name", "Email", "Phone", "City", "State", "Insulin daily", "Product", "Stage", "Note"],
      ...visible.map((lead) => [
        lead.createdAt ?? "",
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.city,
        lead.state,
        lead.injectsInsulinDaily,
        PRODUCT_NAME.get(lead.productInterest) ?? lead.productInterest,
        LEAD_STATUS_LABEL[lead.status] ?? lead.status,
        lead.note,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `medville-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Downloaded. This file holds patient details; store it securely.");
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        lede="Everyone who has completed the qualification form, and where each one stands."
        actions={
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            onClick={exportCsv}
            disabled={!visible.length}
          >
            <Download size={16} /> Export
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[190px] flex-1">
            <Field label="Search" htmlFor="lead-search">
              <div className="relative">
                <Search
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--a-text-faint)" }}
                />
                <input
                  id="lead-search"
                  className="admin-input"
                  style={{ paddingLeft: 32 }}
                  placeholder="Name, email, phone or city"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
          </div>
          <div className="w-[190px]">
            <Field label="Stage" htmlFor="lead-filter">
              <select
                id="lead-filter"
                className="admin-select"
                value={filter}
                onChange={(event) => setFilter(event.target.value as LeadStatus | "all")}
              >
                <option value="all">All stages</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>

      <Card pad={false}>
        {leads === null ? (
          <Spinner label="Loading enquiries" />
        ) : !visible.length ? (
          <Empty>
            {leads.length ? "No enquiries match that search." : "No enquiries have arrived yet."}
          </Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Received</th>
                  <th scope="col">Location</th>
                  <th scope="col">Product</th>
                  <th scope="col">Stage</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2"
                        style={{ color: "var(--a-brand-text)" }}
                        onClick={() => setOpenLead(lead)}
                      >
                        {leadName(lead)}
                      </button>
                    </td>
                    <td style={{ color: "var(--a-text-muted)" }}>{formatDateTime(lead.createdAt)}</td>
                    <td style={{ color: "var(--a-text-muted)" }}>
                      {[lead.city, lead.state].filter(Boolean).join(", ") || "Not given"}
                    </td>
                    <td style={{ color: "var(--a-text-muted)" }}>
                      {PRODUCT_NAME.get(lead.productInterest) ?? lead.productInterest ?? "Not stated"}
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[lead.status] ?? "quiet"}>
                        {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer
        open={Boolean(openLead)}
        onClose={() => setOpenLead(null)}
        title={openLead ? leadName(openLead) : "Enquiry"}
      >
        {openLead && (
          <div className="flex flex-col gap-4">
            <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2.5 text-[14px]">
              <Detail label="Received">{formatDateTime(openLead.createdAt)}</Detail>
              <Detail label="Email">
                <a href={`mailto:${openLead.email}`} style={{ color: "var(--a-brand-text)" }}>
                  {openLead.email}
                </a>
              </Detail>
              <Detail label="Phone">
                <a href={`tel:${openLead.phone.replace(/[^0-9+]/g, "")}`} style={{ color: "var(--a-brand-text)" }}>
                  {openLead.phone}
                </a>
              </Detail>
              <Detail label="Location">
                {[openLead.city, openLead.state].filter(Boolean).join(", ") || "Not given"}
              </Detail>
              <Detail label="Insulin daily">
                {openLead.injectsInsulinDaily === "yes" ? "Yes" : "No"}
              </Detail>
              <Detail label="Product">
                {PRODUCT_NAME.get(openLead.productInterest) ?? openLead.productInterest ?? "Not stated"}
              </Detail>
            </dl>

            <Field label="Stage" htmlFor="lead-status">
              <select
                id="lead-status"
                className="admin-select"
                value={openLead.status}
                disabled={saving}
                onChange={(event) => void update(openLead, { status: event.target.value as LeadStatus })}
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </Field>

            <NoteEditor lead={openLead} saving={saving} onSave={(note) => void update(openLead, { note })} />

            <p className="admin-help">
              Opening and changing this record is recorded in the access log with your
              name and the time.
            </p>
          </div>
        )}
      </Drawer>
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: "var(--a-text-faint)" }}>{label}</dt>
      <dd className="m-0 font-medium">{children}</dd>
    </>
  );
}

function NoteEditor({
  lead,
  saving,
  onSave,
}: {
  lead: Lead;
  saving: boolean;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState(lead.note);
  useEffect(() => setNote(lead.note), [lead.id, lead.note]);

  return (
    <Field
      label="Internal note"
      htmlFor="lead-note"
      help="Seen only by administrators. Keep it factual."
    >
      <textarea
        id="lead-note"
        className="admin-textarea"
        value={note}
        maxLength={2000}
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        type="button"
        className="admin-btn admin-btn-quiet mt-2"
        disabled={saving || note === lead.note}
        onClick={() => onSave(note)}
      >
        Save note
      </button>
    </Field>
  );
}
