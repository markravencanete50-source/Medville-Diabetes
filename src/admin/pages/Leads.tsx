import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Phone, RefreshCw, Search, Trash2, Upload, UserCheck } from "lucide-react";
import {
  adminApi,
  AdminApiError,
  BATCH_LIMIT,
  isAdminApiConfigured,
  leadName,
  memberName,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  STAGE_REASONS,
  stageGroup,
  stageReasonLabel,
  type Lead,
  type LeadHistoryEntry,
  type LeadPatch,
  type LeadStatus,
  type SalesMember,
  type StageGroup,
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
  "no-answer": "warn",
  voicemail: "warn",
  callback: "new",
  "needs-verification": "warn",
  "waiting-documents": "warn",
  "intake-completed": "ok",
  qualified: "ok",
  "not-qualified": "danger",
  "not-interested": "quiet",
  "wrong-number": "danger",
  "do-not-contact": "danger",
  closed: "ok",
  contacted: "warn",
};

/* The work queue, in the order a salesperson should work it. */
const QUEUES: { id: StageGroup | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "callback", label: "Callbacks" },
  { id: "working", label: "In progress" },
  { id: "done", label: "Done" },
];

const isDue = (lead: Lead) => lead.status === "callback" && Boolean(lead.callbackAt) && Date.parse(lead.callbackAt) <= Date.now();

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
  const [queue, setQueue] = useState<StageGroup | "all">("all");
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
  /* Bumped after every change made from this screen, so an open history panel
     shows the entry just written. */
  const [historyVersion, setHistoryVersion] = useState(0);
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
  const dial = async (lead: Lead, copy = false) => {
    setDialingId(lead.id);
    try {
      const result = await adminApi.dialLead(getToken, lead.id, copy);
      if (copy) {
        /* Straight to the clipboard for pasting into Five9. Never shown. */
        const copied = await navigator.clipboard?.writeText(result.dial).then(() => true, () => false);
        if (copied) toast("Number copied. Paste it into Five9. It is not shown here.");
        else toast("Your browser blocked copying. Press Copy again.", "danger");
      } else {
        const link = document.createElement("a");
        link.href = `tel:${result.dial}`;
        link.click();
      }
      const touched = { lastDialAt: new Date().toISOString(), dialCount: lead.dialCount + 1, callPending: true };
      setHistoryVersion((value) => value + 1);
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
      for (let start = 0; start < ids.length; start += BATCH_LIMIT) {
        await adminApi.assignLeads(getToken, ids.slice(start, start + BATCH_LIMIT), to);
      }
      const moved = new Set(ids);
      setLeads((current) => (current ?? []).map((lead) => moved.has(lead.id) ? { ...lead, assignedTo: to } : lead));
      setOpenLead((current) => current && moved.has(current.id) ? { ...current, assignedTo: to } : current);
      setSelectedIds(new Set());
      setHistoryVersion((value) => value + 1);
      toast(to
        ? `${ids.length} ${ids.length === 1 ? "enquiry" : "enquiries"} assigned to ${memberName(memberByUid.get(to))}.`
        : `${ids.length} ${ids.length === 1 ? "enquiry is" : "enquiries are"} now unassigned.`);
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The assignment did not save.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const replaceLead = (updated: Lead) => {
    setOpenLead(updated);
    setLeads((current) => (current ?? []).map((lead) => lead.id === updated.id ? updated : lead));
  };

  const retryConfirmation = async () => {
    if (!openLead) return;
    setSaving(true);
    try {
      const result = await adminApi.retryConfirmation(getToken, openLead.id);
      replaceLead({ ...openLead, customerConfirmationStatus: result.customerConfirmationStatus });
      if (result.customerConfirmationStatus === "sent") toast("Customer confirmation sent.");
      else toast("The customer confirmation could not be sent. Please try again.", "danger");
    } catch { toast("The customer confirmation could not be sent. Contact the site administrator.", "danger"); }
    finally { setSaving(false); }
  };

  /* The company inbox notice says a lead exists. It never carries the answers. */
  const retryNotification = async () => {
    if (!openLead) return;
    setSaving(true);
    try {
      const result = await adminApi.retryNotification(getToken, openLead.id);
      replaceLead({ ...openLead, notificationStatus: result.notificationStatus });
      if (result.notificationStatus === "sent") toast("Company email sent.");
      else toast("The company email could not be sent. Please try again.", "danger");
    } catch { toast("The company email could not be sent. Contact the site administrator.", "danger"); }
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

  const searched = useMemo(() => {
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

  const queueCounts = useMemo(() => {
    const counts: Record<StageGroup | "all", number> = { all: searched.length, new: 0, callback: 0, working: 0, done: 0 };
    searched.forEach((lead) => { counts[stageGroup(lead.status)] += 1; });
    return counts;
  }, [searched]);
  const dueCount = useMemo(() => searched.filter(isDue).length, [searched]);

  /* New enquiries are worked oldest first and callbacks soonest first. Every
     other view keeps the newest first. */
  const visible = useMemo(() => {
    if (queue === "all") return searched;
    const rows = searched.filter((lead) => stageGroup(lead.status) === queue);
    if (queue === "new") return [...rows].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    if (queue === "callback") return [...rows].sort((a, b) => a.callbackAt.localeCompare(b.callbackAt));
    return rows;
  }, [searched, queue]);

  const update = async (lead: Lead, patch: LeadPatch) => {
    setSaving(true);
    try {
      await adminApi.updateLead(getToken, lead.id, patch);
      /* A stage change replaces the reason and the callback time with whatever
         the new stage carries, the same way the server does. */
      const applied: Partial<Lead> = patch.status
        ? { ...patch, statusReason: patch.statusReason ?? "", callbackAt: patch.status === "callback" ? patch.callbackAt ?? "" : "" }
        : { ...patch };
      /* Recording the stage after a call is what counts the call. */
      if (patch.status && lead.callPending) Object.assign(applied, { callPending: false, callsLogged: lead.callsLogged + 1 });
      setLeads((current) =>
        (current ?? []).map((item) => (item.id === lead.id ? { ...item, ...applied } : item)),
      );
      setOpenLead((current) => (current && current.id === lead.id ? { ...current, ...applied } : current));
      setHistoryVersion((value) => value + 1);
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

      {leads !== null && leads.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Work queue">
          {QUEUES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="admin-chip"
              aria-pressed={queue === item.id}
              onClick={() => setQueue(item.id)}
            >
              {item.label} ({queueCounts[item.id]})
              {item.id === "callback" && dueCount > 0 && <span className="ml-1.5"><Badge tone="warn">{dueCount} due now</Badge></span>}
            </button>
          ))}
        </div>
      )}

      <Card pad={false}>
        {leads === null ? (
          <Spinner label="Loading enquiries" />
        ) : !visible.length ? (
          <Empty>
            {!connected
              ? "Enquiries will appear here once the enquiry service is connected."
              : leads.length
                ? queue === "all" ? "No enquiries match that search." : "Nothing in this part of the queue."
                : ownLeadsOnly ? "No enquiries are assigned to you yet." : "No enquiries have arrived yet."}
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
                  {salesRole && <th scope="col" className="relative"><span className="sr-only">Call</span></th>}
                  <th scope="col">Received</th>
                  <th scope="col">Location</th>
                  <th scope="col">Enquiry</th>
                  <th scope="col">Influencer</th>
                  {canAssign && <th scope="col">Assigned to</th>}
                  <th scope="col">Stage</th>
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
                    {/* Beside the name so it never scrolls out of view. */}
                    {salesRole && (
                      <td>
                        <CallButton lead={lead} busy={dialingId === lead.id} onCall={() => void dial(lead)} onCopy={() => void dial(lead, true)} />
                      </td>
                    )}
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
                      <StageBadge lead={lead} />
                    </td>
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
                    <CallButton lead={openLead} busy={dialingId === openLead.id} onCall={() => void dial(openLead)} onCopy={() => void dial(openLead, true)} />
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
                  ? `${openLead.callsLogged} recorded, last dialled ${formatDateTime(openLead.lastDialAt)}`
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
              <Detail label="Company email">{companyEmailLabel(openLead.notificationStatus)}</Detail>
              <Detail label="Customer confirmation">{emailStatusLabel(openLead.customerConfirmationStatus)}</Detail>
            </dl>
            {openLead.source === "contact" && <div className="rounded-lg p-4" style={{ background: "var(--a-brand-soft)" }}><p className="admin-label">Question</p><p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">{openLead.message}</p></div>}
            {!salesRole && openLead.customerConfirmationStatus !== "sent" && <button type="button" className="admin-btn admin-btn-quiet" disabled={saving} onClick={() => void retryConfirmation()}>Retry customer confirmation</button>}
            {!salesRole && ["failed", "bounced", "rejected", "complained", "pending"].includes(openLead.notificationStatus) && <button type="button" className="admin-btn admin-btn-quiet" disabled={saving} onClick={() => void retryNotification()}>Resend company email</button>}

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

            {openLead.status === "do-not-contact" && role !== "owner" ? (
              <Banner tone="warn">
                This patient asked not to be contacted. Only an Owner can change this stage.
              </Banner>
            ) : (
              <>
                {openLead.callPending && (
                  <Banner tone="info">
                    You called this patient. Set the stage below to record how the call went. The call
                    counts in your figures once you save the stage.
                  </Banner>
                )}
                <StageEditor lead={openLead} saving={saving} onSave={(patch) => void update(openLead, patch)} />
              </>
            )}

            <NoteEditor lead={openLead} saving={saving} onSave={(note) => void update(openLead, { note })} />

            <p className="admin-help">
              Opening and changing this record is recorded in the access log with your
              name and the time.
            </p>

            <HistoryPanel
              key={openLead.id}
              lead={openLead}
              version={historyVersion}
              myUid={session!.user.uid}
              memberByUid={memberByUid}
            />

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

/* Call opens the computer's dialler. Copy puts the number on the clipboard
   for when Five9 does not open from a link. Either way the number is
   released by the server one at a time and never drawn on the screen. */
function CallButton({ lead, busy, onCall, onCopy }: { lead: Lead; busy: boolean; onCall: () => void; onCopy: () => void }) {
  if (lead.status === "do-not-contact") return <Badge tone="danger">Do not call</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className="admin-btn admin-btn-primary admin-btn-sm"
        disabled={busy}
        aria-label={`Call ${leadName(lead)}`}
        onClick={onCall}
      >
        <Phone size={14} aria-hidden="true" /> {busy ? "Working" : "Call"}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-quiet admin-btn-sm"
        disabled={busy}
        aria-label={`Copy the number for ${leadName(lead)} to paste into Five9`}
        title="Copy the number to paste into Five9"
        onClick={onCopy}
      >
        <Copy size={14} aria-hidden="true" /> Copy
      </button>
    </span>
  );
}

function StageBadge({ lead }: { lead: Lead }) {
  const reason = stageReasonLabel(lead.status, lead.statusReason);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Badge tone={STATUS_TONE[lead.status] ?? "quiet"}>{LEAD_STATUS_LABEL[lead.status] ?? lead.status}</Badge>
      {lead.status === "callback" && lead.callbackAt && (
        <span className="text-[12px]" style={{ color: isDue(lead) ? "var(--a-warn)" : "var(--a-text-muted)" }}>
          {isDue(lead) ? "Due now, " : ""}{formatDateTime(lead.callbackAt)}
        </span>
      )}
      {reason && <span className="text-[12px]" style={{ color: "var(--a-text-muted)" }}>{reason}</span>}
    </span>
  );
}

/* A datetime-local value for the browser's own time zone. */
function localInputValue(iso: string) {
  const date = iso ? new Date(iso) : (() => { const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(10, 0, 0, 0); return next; })();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/*
  Changing the stage. A stage that needs a reason or a callback time asks for
  it before it can be saved, so the queue never holds a callback without a
  time. Reasons are a fixed list, never typed, so a stage carries no patient
  detail.
*/
function StageEditor({ lead, saving, onSave }: { lead: Lead; saving: boolean; onSave: (patch: LeadPatch) => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [reason, setReason] = useState(lead.statusReason);
  const [when, setWhen] = useState(() => localInputValue(lead.callbackAt));
  useEffect(() => {
    setStatus(lead.status);
    setReason(lead.statusReason);
    setWhen(localInputValue(lead.callbackAt));
  }, [lead.id, lead.status, lead.statusReason, lead.callbackAt]);

  const reasons = STAGE_REASONS[status];
  const callbackTime = status === "callback" && when ? new Date(when) : null;
  const callbackValid = Boolean(callbackTime && !Number.isNaN(callbackTime.getTime()) && callbackTime.getTime() > Date.now() - 5 * 60000);
  const ready = (!reasons || reasons.some((item) => item.value === reason)) && (status !== "callback" || callbackValid);
  const unchanged = status === lead.status && reason === lead.statusReason
    && (status !== "callback" || (callbackTime?.toISOString() ?? "") === lead.callbackAt);
  const offered = LEAD_STATUSES.includes(lead.status) ? LEAD_STATUSES : [lead.status, ...LEAD_STATUSES];

  return (
    <div className="flex flex-col gap-3">
      <Field label="Stage" htmlFor="lead-status">
        <select
          id="lead-status"
          className="admin-select"
          value={status}
          disabled={saving}
          onChange={(event) => {
            const next = event.target.value as LeadStatus;
            setStatus(next);
            setReason(next === lead.status ? lead.statusReason : "");
          }}
        >
          {offered.map((item) => (
            <option key={item} value={item}>{LEAD_STATUS_LABEL[item]}</option>
          ))}
        </select>
      </Field>
      {reasons && (
        <Field label="Reason" htmlFor="lead-reason">
          <select id="lead-reason" className="admin-select" value={reason} disabled={saving} onChange={(event) => setReason(event.target.value)}>
            <option value="">Choose a reason</option>
            {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
      )}
      {status === "callback" && (
        <Field label="Call back on" htmlFor="lead-callback" help="Your own time zone. The salesperson gets an email when it is due.">
          <input id="lead-callback" type="datetime-local" className="admin-input" value={when} disabled={saving} onChange={(event) => setWhen(event.target.value)} />
        </Field>
      )}
      {status === "do-not-contact" && status !== lead.status && (
        <p className="admin-help">The Call button is removed for this patient. Only an Owner can change this stage afterwards.</p>
      )}
      <button
        type="button"
        className="admin-btn admin-btn-primary"
        disabled={saving || !ready || unchanged}
        onClick={() => onSave({
          status,
          ...(reasons ? { statusReason: reason } : {}),
          ...(status === "callback" && callbackTime ? { callbackAt: callbackTime.toISOString() } : {}),
        })}
      >
        Save stage
      </button>
    </div>
  );
}

const ROLE_NAME: Record<string, string> = {
  owner: "An Owner",
  marketing: "Marketing",
  manager: "The sales manager",
  sales: "A salesperson",
};

/* Who did it, as plainly as this viewer can be told: "You", a teammate's
   name where the team list is loaded, otherwise their sign-in address. */
function historyActor(entry: LeadHistoryEntry, myUid: string, members: Map<string, SalesMember>) {
  if (entry.actorRole === "system") return "Automatic assignment";
  if (entry.actorUid === myUid) return "You";
  const member = members.get(entry.actorUid);
  if (member) return memberName(member);
  return entry.actorEmail || ROLE_NAME[entry.actorRole] || "Someone";
}

function historyText(entry: LeadHistoryEntry, myUid: string, members: Map<string, SalesMember>) {
  if (entry.action === "stage") {
    const status = entry.status as LeadStatus;
    const label = LEAD_STATUS_LABEL[status] ?? entry.status;
    const reason = stageReasonLabel(status, entry.statusReason);
    const when = entry.callbackAt ? `, for ${formatDateTime(entry.callbackAt)}` : "";
    return `changed the stage to ${label}${reason ? `: ${reason}` : ""}${when}${entry.source === "import" ? ", by import" : ""}.`;
  }
  if (entry.action === "assign") {
    if (!entry.assignee) return "removed the assignment.";
    if (entry.source === "auto") {
      if (entry.assignee === myUid) return "gave it to you.";
      const member = members.get(entry.assignee);
      return `gave it to ${member ? memberName(member) : members.size ? "a former team member" : "a teammate"}.`;
    }
    if (entry.assignee === myUid) return "assigned it to you.";
    const member = members.get(entry.assignee);
    /* A salesperson has no team list, so a colleague is named generically. */
    return `assigned it to ${member ? memberName(member) : members.size ? "a former team member" : "a teammate"}.`;
  }
  if (entry.action === "call") return entry.source === "copy" ? "copied the number to call it." : "started a call.";
  if (entry.action === "note") return "updated the internal note.";
  if (entry.action === "delete") return "moved it to the Recycle Bin.";
  return "restored it from the Recycle Bin.";
}

/*
  The lead's history: every stage change, assignment, call and note edit, with
  who and when, newest first. It closes with the enquiry arriving, which comes
  from the lead itself. Entries hold fixed facts only, never a note's text.
*/
function HistoryPanel({
  lead,
  version,
  myUid,
  memberByUid,
}: {
  lead: Lead;
  version: number;
  myUid: string;
  memberByUid: Map<string, SalesMember>;
}) {
  const { getToken } = useAdminAuth();
  const [entries, setEntries] = useState<LeadHistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    adminApi.leadHistory(getToken, lead.id)
      .then((result) => live && setEntries(result.history))
      .catch(() => { if (live) { setEntries([]); setFailed(true); } });
    return () => { live = false; };
  }, [getToken, lead.id, version]);

  const arrival = lead.source === "contact"
    ? "The contact form question arrived."
    : lead.referralCode
      ? `The eligibility form arrived through @${lead.referralCode}.`
      : "The eligibility form arrived.";

  return (
    <section aria-labelledby="lead-history-title" className="border-t pt-4" style={{ borderColor: "var(--a-line)" }}>
      <h3 id="lead-history-title" className="admin-label">History</h3>
      {entries === null ? (
        <p className="admin-help" role="status">Loading the history.</p>
      ) : (
        <ol className="m-0 mt-2 flex list-none flex-col gap-3 p-0">
          {failed && <li className="admin-help">The history could not be loaded. Close and reopen the enquiry to try again.</li>}
          {entries.map((entry) => (
            <li key={`${entry.at}-${entry.action}-${entry.actorUid}`} className="text-[14px] leading-snug">
              <span className="font-semibold">{historyActor(entry, myUid, memberByUid)}</span>{" "}
              {historyText(entry, myUid, memberByUid)}
              <span className="block text-[12px]" style={{ color: "var(--a-text-muted)" }}>{formatDateTime(entry.at)}</span>
            </li>
          ))}
          <li className="text-[14px] leading-snug">
            {arrival}
            <span className="block text-[12px]" style={{ color: "var(--a-text-muted)" }}>{formatDateTime(lead.createdAt)}</span>
          </li>
        </ol>
      )}
    </section>
  );
}

/* Delivery of the company inbox notice, as SES reports it back. */
function companyEmailLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Waiting to send",
    sent: "Sent",
    delivered: "Delivered",
    delayed: "Delayed, still trying",
    bounced: "Bounced",
    rejected: "Rejected",
    complained: "Marked as spam",
    failed: "Delivery failed",
  };
  return labels[status] ?? "Not sent";
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
