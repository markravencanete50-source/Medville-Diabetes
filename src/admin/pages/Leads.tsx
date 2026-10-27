import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Phone, RefreshCw, Search, Trash2, Upload, UserCheck } from "lucide-react";
import {
  adminApi,
  AdminApiError,
  isAdminApiConfigured,
  leadName,
  memberName,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  type Lead,
  type LeadStatus,
  type SalesMember,
} from "../api";
import { canOpen, isSalesRole, useAdminAuth } from "../auth";
import {
  Badge,
  Banner,
  Card,
  ConfirmDialog,
  Drawer,
  Empty,
  Field,
  PageHeader,
  Spinner,
  formatDateTime,
  useToast,
} from "../ui";
import { products as builtInProducts } from "../../data/products";
import DateRangeFilter, { type DateRange } from "../DateRangeFilter";
import { parseStatusImport, StatusCsvError } from "../statusCsv";

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

  The two sales roles see a narrower screen. Phone numbers and email addresses
  arrive from the server already removed, so they are not in the page at all.
  Call asks the server for one number, which writes the request to the access
  log, and hands it straight to the computer's dialler without drawing it.
  A salesperson receives only the leads assigned to them; the sales manager
  sees every lead and assigns them. Neither is offered export, delete or the
  status import, and the server refuses those for both.
*/

const HIDDEN_PHONE = "(***) ***-****";

const PRODUCT_NAME = new Map(builtInProducts.map((product) => [product.slug, product.name]));

const STATUS_TONE: Record<LeadStatus, "new" | "ok" | "warn" | "danger" | "quiet"> = {
  new: "new",
  contacted: "warn",
  qualified: "ok",
  "not-qualified": "danger",
  closed: "quiet",
};

export default function Leads() {
  const { getToken, session } = useAdminAuth();
  const toast = useToast();
  const role = session!.role;
  const salesRole = isSalesRole(role);
  const ownLeadsOnly = role === "sales";
  const canAssign = canOpen(role, "salesTeam", session!.features);

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [deleteCandidates, setDeleteCandidates] = useState<Lead[]>([]);
  const [pendingImport, setPendingImport] = useState<{ id: string; status: LeadStatus }[] | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [opening, setOpening] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [members, setMembers] = useState<SalesMember[]>([]);
  const [dialingId, setDialingId] = useState("");
  const connected = isAdminApiConfigured();
  const memberByUid = useMemo(() => new Map(members.map((member) => [member.uid, member])), [members]);
  const assignable = useMemo(() => members.filter((member) => !member.disabled), [members]);

  useEffect(() => {
    if (!canAssign) return;
    let live = true;
    adminApi.salesTeam(getToken)
      .then((result) => live && setMembers(result.members))
      .catch(() => live && toast("The sales team could not be loaded. Assignment is unavailable for now.", "danger"));
    return () => { live = false; };
  }, [canAssign, getToken, toast]);

  const load = useCallback(async () => {
    setError("");
    /* Nowhere to ask. The layout banner already explains that, so asking and
       showing the refusal would only repeat it as an error. */
    if (!connected) {
      setLeads([]);
      return;
    }
    try {
      const result = await adminApi.listLeads(getToken, { ...range, ...(assignee ? { assignee } : {}) });
      setLeads(result.leads);
      setSelectedIds(new Set());
      setNextCursor(result.nextCursor);
    } catch (problem) {
      setLeads([]);
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken, connected, range, assignee]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await adminApi.listLeads(getToken, { ...range, ...(assignee ? { assignee } : {}), cursor: nextCursor });
      setLeads((current) => [...new Map([...(current ?? []), ...result.leads].map((lead) => [lead.id, lead])).values()]);
      setNextCursor(result.nextCursor);
    } catch { toast("The next page could not be loaded. Please try again.", "danger"); }
    finally { setLoadingMore(false); }
  };

  const open = async (id: string) => {
    setOpening(true);
    try { setOpenLead((await adminApi.getLead(getToken, id)).lead); }
    catch { toast("The enquiry could not be opened. Please try again.", "danger"); }
    finally { setOpening(false); }
  };

  /* The number goes from the response to the dialler and nowhere else: it is
     not stored in state, so it never renders. */
  const dial = async (lead: Lead) => {
    setDialingId(lead.id);
    try {
      const result = await adminApi.dialLead(getToken, lead.id);
      const link = document.createElement("a");
      link.href = `tel:${result.dial}`;
      link.click();
      const touched = { lastDialAt: new Date().toISOString(), dialCount: lead.dialCount + 1 };
      setLeads((current) => (current ?? []).map((item) => item.id === lead.id ? { ...item, ...touched } : item));
      setOpenLead((current) => current && current.id === lead.id ? { ...current, ...touched } : current);
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The call could not be started. Please try again.", "danger");
    } finally {
      setDialingId("");
    }
  };

  const assign = async (ids: string[], to: string) => {
    if (!ids.length) return;
    setSaving(true);
    try {
      for (let start = 0; start < ids.length; start += 50) {
        await adminApi.assignLeads(getToken, ids.slice(start, start + 50), to);
      }
      const moved = new Set(ids);
      setLeads((current) => (current ?? []).map((lead) => moved.has(lead.id) ? { ...lead, assignedTo: to } : lead));
      setOpenLead((current) => current && moved.has(current.id) ? { ...current, assignedTo: to } : current);
      setSelectedIds(new Set());
      toast(to
        ? `${ids.length} ${ids.length === 1 ? "enquiry" : "enquiries"} assigned to ${memberName(memberByUid.get(to))}.`
        : `${ids.length} ${ids.length === 1 ? "enquiry is" : "enquiries are"} now unassigned.`);
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The assignment did not save.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const retryNotification = async () => {
    if (!openLead) return;
    setSaving(true);
    try {
      const result = await adminApi.retryNotification(getToken, openLead.id);
      const updated = {
        ...openLead,
        notificationStatus: result.notificationStatus,
        customerConfirmationStatus: result.customerConfirmationStatus,
      };
      setOpenLead(updated);
      setLeads((current) => (current ?? []).map((lead) => lead.id === updated.id ? updated : lead));
      if (result.customerConfirmationStatus === "sent") toast("Customer confirmation sent.");
      else toast("The customer confirmation could not be sent. Please try again.", "danger");
    } catch { toast("The notification could not be sent. Contact the site administrator.", "danger"); }
    finally { setSaving(false); }
  };

  const deleteLeads = async () => {
    if (!deleteCandidates.length) return;
    setSaving(true);
    const moved: string[] = [];
    const failed: string[] = [];
    try {
      /* Keep a small request pool so every enquiry keeps its own AWS audit
         transaction without flooding the service on a large selection. */
      for (let start = 0; start < deleteCandidates.length; start += 4) {
        const batch = deleteCandidates.slice(start, start + 4);
        const results = await Promise.allSettled(batch.map((lead) => adminApi.deleteLead(getToken, lead.id)));
        results.forEach((result, index) => (result.status === "fulfilled" ? moved : failed).push(batch[index].id));
      }
      const removed = new Set(moved);
      setLeads((current) => (current ?? []).filter((lead) => !removed.has(lead.id)));
      setSelectedIds(new Set(failed));
      setOpenLead((current) => current && removed.has(current.id) ? null : current);
      setDeleteCandidates([]);
      if (failed.length) toast(`${moved.length} moved to the Recycle Bin; ${failed.length} could not be moved. Failed enquiries remain selected.`, "danger");
      else toast(`${moved.length} ${moved.length === 1 ? "enquiry" : "enquiries"} moved to the Recycle Bin for seven days.`);
    } finally {
      setSaving(false);
    }
  };

  const downloadStatusTemplate = () => {
    const rows = [["id", "status"], ...visible.map((lead) => [lead.id, lead.status])];
    const csv = rows.map((row) => row.join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `medville-enquiry-statuses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Status template downloaded. Only the status column should be changed.");
  };

  const readStatusImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 200_000) return toast("The status file is too large.", "danger");
    try {
      setPendingImport(parseStatusImport(await file.text(), leads ?? []));
    } catch (problem) {
      toast(problem instanceof StatusCsvError ? problem.message : "The status CSV could not be read.", "danger");
    }
  };

  const importStatuses = async () => {
    if (!pendingImport) return;
    setSaving(true);
    try {
      const result = await adminApi.importLeadStatuses(getToken, pendingImport);
      setPendingImport(null);
      toast(`${result.updated} enquiry ${result.updated === 1 ? "status" : "statuses"} updated.`);
      await load();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The status import could not be applied.", "danger");
    } finally { setSaving(false); }
  };

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
        lead.state.toLowerCase().includes(term) ||
        lead.referralCode.toLowerCase().includes(term)
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
  const exportCsv = async () => {
    setExporting(true);
    try { await adminApi.auditExport(getToken, visible.map((lead) => lead.id)); }
    catch {
      setExporting(false);
      setExportOpen(false);
      toast("The export could not be recorded. Please try again.", "danger");
      return;
    }
    const rows = [
      ["ID", "Received", "Source", "First name", "Last name", "Email", "Phone", "City", "State", "Insulin daily", "Product", "Influencer", "Question", "Stage", "Internal note"],
      ...visible.map((lead) => [
        lead.id,
        lead.createdAt ?? "",
        lead.source === "contact" ? "Contact form" : "Eligibility form",
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.city,
        lead.state,
        lead.injectsInsulinDaily,
        lead.productName || PRODUCT_NAME.get(lead.productInterest) || lead.productInterest || "Not sure yet",
        lead.referralCode,
        lead.message,
        LEAD_STATUS_LABEL[lead.status] ?? lead.status,
        lead.note,
      ]),
    ];
    /* A spreadsheet reads a cell that starts with =, +, - or @ as a formula,
       and a visitor could type one into a name box. Such a cell is prefixed
       with an apostrophe, which Excel and Sheets treat as "this is text". */
    const cell = (value: unknown) => {
      const text = String(value ?? "");
      const safe = /^[\s]*[=+\-@]|^[\t\r\n]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `medville-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    setExportOpen(false);
    toast("Downloaded. This file holds patient details; store it securely.");
  };

  return (
    <>
      <PageHeader
        title={ownLeadsOnly ? "My leads" : "Enquiries"}
        lede={ownLeadsOnly
          ? "The enquiries assigned to you. Press Call to dial. The phone number is never shown."
          : salesRole
            ? "Every enquiry and who is working it. Assign new enquiries to your team. Contact details stay hidden."
            : "Eligibility submissions and general contact questions, with their current status."}
        actions={
          <>
          <button type="button" className="admin-btn admin-btn-quiet" disabled={!connected} onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
          {!salesRole && <>
          <button
            type="button"
            className="admin-btn admin-btn-quiet"
            onClick={() => setExportOpen(true)}
            disabled={!visible.length || visible.length > 500}
          >
            <Download size={16} /> Export loaded enquiries
          </button>
          <button type="button" className="admin-btn admin-btn-quiet" disabled={!visible.length} onClick={downloadStatusTemplate}>
            <Download size={16} /> Status template
          </button>
          <label className="admin-btn admin-btn-quiet cursor-pointer">
            <Upload size={16} /> Import statuses
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { void readStatusImport(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          </>}
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <Card className="mb-4">
        <div className="mb-4"><DateRangeFilter value={range} onChange={setRange} /></div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-[220px]">
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
                  placeholder={salesRole ? "Name or city" : "Name, email, phone or city"}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
          </div>
          <div className="w-full sm:w-[190px]">
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
          {canAssign && (
            <div className="w-full sm:w-[220px]">
              <Field label="Assigned to" htmlFor="lead-assignee">
                <select
                  id="lead-assignee"
                  className="admin-select"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                >
                  <option value="">Everyone</option>
                  <option value="unassigned">Not assigned yet</option>
                  {members.map((member) => (
                    <option key={member.uid} value={member.uid}>{memberName(member)}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>
      </Card>

      <Card pad={false}>
        {leads === null ? (
          <Spinner label="Loading enquiries" />
        ) : !visible.length ? (
          <Empty>
            {!connected
              ? "Enquiries will appear here once the enquiry service is connected."
              : leads.length
                ? "No enquiries match that search."
                : "No enquiries have arrived yet."}
          </Empty>
        ) : (
          <div className="admin-table-wrap">
            {(!salesRole || canAssign) && <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--a-line)" }}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={visible.length > 0 && visible.every((lead) => selectedIds.has(lead.id))} onChange={(event) => setSelectedIds((current) => {
                  const next = new Set(current);
                  visible.forEach((lead) => event.target.checked ? next.add(lead.id) : next.delete(lead.id));
                  return next;
                })} /> Select all shown
              </label>
              {canAssign && (
                <span className="flex flex-wrap items-center gap-2">
                  <label htmlFor="bulk-assign" className="sr-only">Assign selected enquiries to</label>
                  <select id="bulk-assign" className="admin-select" style={{ width: "auto" }} value={assignTo} onChange={(event) => setAssignTo(event.target.value)}>
                    <option value="">Choose a salesperson</option>
                    {assignable.map((member) => (
                      <option key={member.uid} value={member.uid}>{memberName(member)}</option>
                    ))}
                  </select>
                  <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={!selectedIds.size || !assignTo || saving} onClick={() => void assign([...selectedIds], assignTo)}>
                    <UserCheck size={14} /> Assign {selectedIds.size}
                  </button>
                </span>
              )}
              {!salesRole && (
                <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" disabled={!selectedIds.size || saving} onClick={() => setDeleteCandidates((leads ?? []).filter((lead) => selectedIds.has(lead.id)))}>
                  <Trash2 size={14} /> Move {selectedIds.size} to Recycle Bin
                </button>
              )}
              <span className="admin-help">Selection applies to loaded enquiries only.</span>
            </div>}
            <table className="admin-table">
              <thead>
                <tr>
                  {(!salesRole || canAssign) && <th scope="col"><span className="sr-only">Select enquiry</span></th>}
                  <th scope="col">Name</th>
                  <th scope="col">Received</th>
                  <th scope="col">Location</th>
                  <th scope="col">Enquiry</th>
                  <th scope="col">Influencer</th>
                  {canAssign && <th scope="col">Assigned to</th>}
                  <th scope="col">Stage</th>
                  {salesRole && <th scope="col" className="relative"><span className="sr-only">Call</span></th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => (
                  <tr key={lead.id}>
                    {(!salesRole || canAssign) && <td data-label="Select"><input type="checkbox" aria-label={`Select ${leadName(lead)}`} checked={selectedIds.has(lead.id)} onChange={(event) => setSelectedIds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(lead.id); else next.delete(lead.id);
                      return next;
                    })} /></td>}
                    <td data-label="Name">
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2"
                        style={{ color: "var(--a-brand-text)" }}
                        disabled={opening}
                        onClick={() => void open(lead.id)}
                      >
                        {leadName(lead)}
                      </button>
                    </td>
                    <td data-label="Received" style={{ color: "var(--a-text-muted)" }}>
                      {formatDateTime(lead.createdAt)}
                    </td>
                    <td data-label="Location" style={{ color: "var(--a-text-muted)" }}>
                      {[lead.city, lead.state].filter(Boolean).join(", ") || "Not given"}
                    </td>
                    <td data-label="Enquiry" style={{ color: "var(--a-text-muted)" }}>
                      {lead.source === "contact" ? "General question" : lead.productName || PRODUCT_NAME.get(lead.productInterest) || lead.productInterest || "Not sure yet"}
                    </td>
                    <td data-label="Influencer" style={{ color: "var(--a-text-muted)" }}>
                      {lead.referralCode ? `@${lead.referralCode}` : "Direct"}
                    </td>
                    {canAssign && (
                      <td data-label="Assigned to" style={{ color: "var(--a-text-muted)" }}>
                        {lead.assignedTo ? memberName(memberByUid.get(lead.assignedTo)) : <Badge tone="warn">Not assigned</Badge>}
                      </td>
                    )}
                    <td data-label="Stage">
                      <Badge tone={STATUS_TONE[lead.status] ?? "quiet"}>
                        {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                      </Badge>
                    </td>
                    {salesRole && (
                      <td>
                        <CallButton lead={lead} busy={dialingId === lead.id} onCall={() => void dial(lead)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {nextCursor && <div className="mt-4 flex items-center gap-3"><button type="button" className="admin-btn admin-btn-quiet" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more enquiries"}</button><p className="admin-help">Search and export apply to loaded enquiries.</p></div>}
      {opening && <p role="status" className="admin-help">Opening enquiry…</p>}

      <Drawer
        open={Boolean(openLead)}
        onClose={() => setOpenLead(null)}
        title={openLead ? leadName(openLead) : "Enquiry"}
      >
        {openLead && (
          <div className="flex flex-col gap-4">
            <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2.5 text-[14px]">
              <Detail label="Received">{formatDateTime(openLead.createdAt)}</Detail>
              {openLead.contactHidden ? <>
                <Detail label="Phone">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span aria-label="Hidden">{HIDDEN_PHONE}</span>
                    <CallButton lead={openLead} busy={dialingId === openLead.id} onCall={() => void dial(openLead)} />
                  </span>
                </Detail>
                <Detail label="Email">Hidden</Detail>
              </> : <>
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
              </>}
              <Detail label="Calls">
                {openLead.dialCount
                  ? `${openLead.dialCount}, last on ${formatDateTime(openLead.lastDialAt)}`
                  : "Not called yet"}
              </Detail>
              <Detail label="Location">
                {[openLead.city, openLead.state].filter(Boolean).join(", ") || "Not given"}
              </Detail>
              {openLead.source === "contact" ? <Detail label="Enquiry type">General contact question</Detail> : <>
                <Detail label="Insulin daily">{openLead.injectsInsulinDaily === "yes" ? "Yes" : "No"}</Detail>
                <Detail label="Product">{openLead.productName || PRODUCT_NAME.get(openLead.productInterest) || openLead.productInterest || "Not sure yet"}</Detail>
                <Detail label="Influencer">{openLead.referralCode ? `@${openLead.referralCode}` : "Direct"}</Detail>
              </>}
              <Detail label="Company notification">Not configured. Review enquiries here.</Detail>
              <Detail label="Customer confirmation">{emailStatusLabel(openLead.customerConfirmationStatus)}</Detail>
            </dl>
            {openLead.source === "contact" && <div className="rounded-lg p-4" style={{ background: "var(--a-brand-soft)" }}><p className="admin-label">Question</p><p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">{openLead.message}</p></div>}
            {openLead.customerConfirmationStatus !== "sent" && <button type="button" className="admin-btn admin-btn-quiet" disabled={saving} onClick={() => void retryNotification()}>Retry customer confirmation</button>}

            {canAssign && (
              <Field label="Assigned to" htmlFor="lead-assign">
                <select
                  id="lead-assign"
                  className="admin-select"
                  value={openLead.assignedTo}
                  disabled={saving}
                  onChange={(event) => void assign([openLead.id], event.target.value)}
                >
                  <option value="">Not assigned</option>
                  {openLead.assignedTo && !memberByUid.has(openLead.assignedTo) && (
                    <option value={openLead.assignedTo}>Former team member</option>
                  )}
                  {members.map((member) => (
                    <option key={member.uid} value={member.uid} disabled={member.disabled}>{memberName(member)}</option>
                  ))}
                </select>
              </Field>
            )}

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

            {!salesRole && (
              <div className="border-t pt-4" style={{ borderColor: "var(--a-line)" }}>
                <button type="button" className="admin-btn admin-btn-danger w-full" disabled={saving} onClick={() => setDeleteCandidates([openLead])}>
                  <Trash2 size={16} aria-hidden="true" /> Move to Recycle Bin
                </button>
                <p className="admin-help">The enquiry can be restored for seven days. After that, AWS removes it automatically. The action remains recorded in the access log.</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={exportOpen}
        title="Download these enquiries?"
        body={<p>This file contains patient details. Continue only if you can store it securely and limit access to authorized staff.</p>}
        confirmLabel="Download enquiries"
        busyLabel="Preparing download"
        busy={exporting}
        onCancel={() => setExportOpen(false)}
        onConfirm={() => void exportCsv()}
      />
      <ConfirmDialog
        open={deleteCandidates.length > 0}
        title={deleteCandidates.length === 1 ? "Move this enquiry to the Recycle Bin?" : `Move ${deleteCandidates.length} enquiries to the Recycle Bin?`}
        body={<p>{deleteCandidates.length === 1 ? "It" : "They"} will disappear from active enquiries and can be restored for seven days. The access log will record who moved each enquiry and when.</p>}
        confirmLabel="Move to Recycle Bin"
        busyLabel="Moving enquiries"
        busy={saving}
        onCancel={() => setDeleteCandidates([])}
        onConfirm={() => void deleteLeads()}
      />
      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Apply imported status updates?"
        body={<p>This will update only the status of {pendingImport?.length ?? 0} enquiries. Names, contact details, form answers, and notes will not change.</p>}
        confirmLabel="Update statuses"
        busyLabel="Updating statuses"
        busy={saving}
        onCancel={() => setPendingImport(null)}
        onConfirm={() => void importStatuses()}
      />
    </>
  );
}

function CallButton({ lead, busy, onCall }: { lead: Lead; busy: boolean; onCall: () => void }) {
  return (
    <button
      type="button"
      className="admin-btn admin-btn-primary admin-btn-sm"
      disabled={busy}
      aria-label={`Call ${leadName(lead)}`}
      onClick={onCall}
    >
      <Phone size={14} aria-hidden="true" /> {busy ? "Starting call" : "Call"}
    </button>
  );
}

function emailStatusLabel(status: string) {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Delivery failed";
  return "Pending delivery";
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
