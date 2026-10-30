/*
  Client for the protected administration APIs.

  Everything that touches Protected Health Information goes through here, and
  the shape of these calls is deliberate:

  - Always POST. A lead identifier must never appear in a URL, because URLs
    reach browser history, proxy logs and referrer headers. Section 3.4(e).
  - Always a valid token in the Authorization header. Firebase refreshes an
    expired token before it is used.
  - Protected responses never enter the browser HTTP cache. A small in-memory
    cache only deduplicates recent reads while this dashboard tab is open. It
    is cleared on sign-out, token changes and every mutation.
  - Errors surface as plain sentences. The server never sends detail back and
    this never invents any.
*/

const CONTENT_ENDPOINT = (import.meta.env.VITE_ADMIN_API as string | undefined)
  || "https://us-central1-medville-diabetes.cloudfunctions.net/adminApi";
/* The API address is public configuration, not a credential. Authentication
   and role checks still happen for every request inside the Lambda function.
   Keeping the deployed address as a fallback prevents a local hosting build
   from silently shipping an unconnected dashboard. */
const LEAD_ENDPOINT = (import.meta.env.VITE_AWS_ADMIN_API as string | undefined)
  || "https://v7etel6u7f.execute-api.us-east-1.amazonaws.com/admin";

const AWS_ACTIONS = new Set([
  "leads.list",
  "leads.assign",
  "leads.dial",
  "leads.history",
  "leads.team",
  "alerts.list",
  "alerts.set",
  "leads.get",
  "leads.update",
  "leads.delete",
  "leads.restore",
  "leads.status.import",
  "leads.stats",
  "leads.notify",
  "leads.confirmation.retry",
  "leads.export",
  "audit.list",
  "influencers.counts",
]);

const endpointFor = (action: string) => AWS_ACTIONS.has(action)
  ? LEAD_ENDPOINT
  : CONTENT_ENDPOINT;

export function isAdminApiConfigured() {
  return Boolean(LEAD_ENDPOINT);
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  injectsInsulinDaily: string;
  productInterest: string;
  productName: string;
  referralCode: string;
  source: string;
  message: string;
  notificationStatus: string;
  customerConfirmationStatus: string;
  status: LeadStatus;
  note: string;
  /* The uid of the salesperson working this lead, or empty. */
  assignedTo: string;
  /* One of STAGE_REASONS for the current stage, or empty. */
  statusReason: string;
  /* ISO time of a scheduled callback, or empty. */
  callbackAt: string;
  lastDialAt: string | null;
  dialCount: number;
  /* True for the sales roles: phone and email arrive empty and the number is
     released one call at a time through dialLead. */
  contactHidden: boolean;
  createdAt: string | null;
  deletedAt: string | null;
  purgeAt: number | null;
}

export type LeadStatus =
  | "new" | "no-answer" | "voicemail" | "callback" | "needs-verification" | "waiting-documents"
  | "intake-completed" | "qualified" | "not-qualified" | "not-interested" | "wrong-number"
  | "do-not-contact" | "closed" | "contacted";

/* The stages offered when changing one. "contacted" is the stage older records
   may still hold: it keeps its label but is no longer offered. The server
   holds the same list. */
export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "no-answer",
  "voicemail",
  "callback",
  "needs-verification",
  "waiting-documents",
  "intake-completed",
  "qualified",
  "not-qualified",
  "not-interested",
  "wrong-number",
  "do-not-contact",
  "closed",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  "no-answer": "No answer",
  voicemail: "Left voicemail",
  callback: "Callback scheduled",
  "needs-verification": "Needs verification",
  "waiting-documents": "Waiting on documents",
  "intake-completed": "Intake completed",
  qualified: "Qualified",
  "not-qualified": "Not qualified",
  "not-interested": "Not interested",
  "wrong-number": "Wrong number",
  "do-not-contact": "Do not contact",
  closed: "Closed, order placed",
  contacted: "Contacted (earlier stage)",
};

/* Stages that need one fixed reason. Never free text, so a stage cannot carry
   patient detail. Kept in step with stageReasons in aws/src/admin.cjs. */
export const STAGE_REASONS: Partial<Record<LeadStatus, { value: string; label: string }[]>> = {
  "needs-verification": [
    { value: "insurance", label: "Insurance" },
    { value: "prescription", label: "Doctor or prescription" },
    { value: "contact-details", label: "Contact details" },
    { value: "other", label: "Something else" },
  ],
  "waiting-documents": [
    { value: "prescription", label: "Prescription" },
    { value: "insurance-card", label: "Insurance card" },
    { value: "photo-id", label: "Photo ID" },
    { value: "other", label: "Something else" },
  ],
  "not-qualified": [
    { value: "insurance", label: "Insurance does not cover it" },
    { value: "criteria", label: "Does not meet the medical criteria" },
    { value: "area", label: "Outside our service area" },
    { value: "other", label: "Something else" },
  ],
};

export function stageReasonLabel(status: LeadStatus, reason: string) {
  return STAGE_REASONS[status]?.find((item) => item.value === reason)?.label ?? "";
}

/* How the work queue groups stages. */
export type StageGroup = "new" | "callback" | "working" | "done";
export function stageGroup(status: LeadStatus): StageGroup {
  if (status === "new") return "new";
  if (status === "callback") return "callback";
  if (["intake-completed", "qualified", "not-qualified", "not-interested", "wrong-number", "do-not-contact", "closed"].includes(status)) return "done";
  return "working";
}

export interface LeadStats {
  total: number;
  insulinYes: number;
  byStatus: Record<string, number>;
  byState: Record<string, number>;
  byProduct: Record<string, number>;
  byDay: Record<string, number>;
}

export interface AuditEntry {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  leadId: string;
  count: number | null;
  at: string | null;
}

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: string;
  features: string[];
  disabled: boolean;
  lastSignIn: string | null;
}

export interface SalesMember {
  uid: string;
  email: string;
  name: string;
  role: "sales" | "manager";
  disabled: boolean;
  lastSignIn: string | null;
}

export interface SalesPersonFigures {
  assigned: number;
  open: number;
  new: number;
  callbacksDue: number;
  calledToday: number;
  calls: number;
  qualified: number;
  notQualified: number;
  closed: number;
  oldestNewAt: string | null;
  lastDialAt: string | null;
}

export interface SalesTeamSummary {
  people: Record<string, SalesPersonFigures>;
  unassigned: { open: number; new: number; oldestNewAt: string | null };
  total: number;
}

/* One entry in a lead's history. Fixed facts only: never a note's text. */
export interface LeadHistoryEntry {
  at: string;
  action: "stage" | "note" | "assign" | "call" | "delete" | "restore";
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  status: string;
  statusReason: string;
  callbackAt: string;
  assignee: string;
  source: string;
}

/* The most enquiries one assignment or status import may touch. Each needs
   its own history entry, and a database transaction holds 100 writes. Kept
   in step with BATCH_LIMIT in aws/src/admin.cjs. */
export const BATCH_LIMIT = 45;

export interface StaffAlert {
  uid: string;
  enabled: boolean;
  lastStatus: string;
  lastSentAt: string | null;
}

export interface Influencer {
  slug: string;
  name: string;
  handle: string;
  platform: string;
  active: boolean;
  deleted?: boolean;
  clicks: number;
  leads: number;
  createdAt: string | null;
}

export interface LeadPatch {
  status?: LeadStatus;
  statusReason?: string;
  callbackAt?: string;
  note?: string;
}

export class AdminApiError extends Error {}

type GetToken = () => Promise<string | null>;

const READ_TTL_MS: Record<string, number> = {
  "leads.stats": 30_000,
  "influencers.list": 30_000,
  "influencers.counts": 30_000,
};

const CACHE_INVALIDATING_ACTIONS = new Set([
  "leads.update",
  "leads.delete",
  "leads.restore",
  "leads.status.import",
  "leads.notify",
  "leads.confirmation.retry",
  "leads.assign",
  "alerts.set",
  "influencers.create",
  "influencers.setActive",
  "influencers.setDeleted",
  "admins.setRole",
  "admins.delete",
  "admins.invite",
]);

interface ReadCacheEntry {
  expiresAt: number;
  request: Promise<unknown>;
}

const readCache = new Map<string, ReadCacheEntry>();

export function clearAdminApiCache() {
  readCache.clear();
}

function readCacheKey(action: string, payload: Record<string, unknown>) {
  return `${action}:${JSON.stringify(payload)}`;
}

function pruneReadCache(now: number) {
  for (const [key, entry] of readCache) {
    if (entry.expiresAt <= now) readCache.delete(key);
  }
  while (readCache.size >= 40) {
    const oldest = readCache.keys().next().value as string | undefined;
    if (!oldest) break;
    readCache.delete(oldest);
  }
}

async function call<T>(getToken: GetToken, action: string, payload: Record<string, unknown> = {}) {
  const ttl = READ_TTL_MS[action] ?? 0;
  const now = Date.now();
  const key = ttl ? readCacheKey(action, payload) : "";
  if (ttl) {
    const cached = readCache.get(key);
    if (cached && cached.expiresAt > now) return cached.request as Promise<T>;
    pruneReadCache(now);
  }

  const request = callNetwork<T>(getToken, action, payload);
  if (ttl) {
    readCache.set(key, { expiresAt: now + ttl, request });
    request.catch(() => {
      if (readCache.get(key)?.request === request) readCache.delete(key);
    });
  } else if (CACHE_INVALIDATING_ACTIONS.has(action)) {
    request.then(clearAdminApiCache, () => undefined);
  }
  return request;
}

async function callNetwork<T>(getToken: GetToken, action: string, payload: Record<string, unknown>) {
  const endpoint = endpointFor(action);
  if (!endpoint) {
    throw new AdminApiError(
      "The lead service is not connected yet. See ADMIN-SETUP.md for the deploy step.",
    );
  }
  const token = await getToken();
  if (!token) throw new AdminApiError("Please sign in again.");

  let res: Response;
  try {
    res = await fetch(endpoint, {
      signal: AbortSignal.timeout(20000),
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new AdminApiError("The lead service could not be reached.");
  }

  if (res.status === 401) throw new AdminApiError("Your session has expired. Please sign in again.");
  if (res.status === 403) throw new AdminApiError("You do not have access to that.");
  if (!(res.headers.get("Content-Type") || "").includes("application/json")) {
    throw new AdminApiError("The enquiry service is not ready. Please contact the site administrator.");
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new AdminApiError("The enquiry service returned an incomplete response. Please try again.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdminApiError("The enquiry service returned an incomplete response.");

  if (!res.ok || typeof body.error === "string") {
    throw new AdminApiError(
      typeof body.error === "string" ? body.error : "That did not work. Please try again.",
    );
  }
  return body as T;
}

export const adminApi = {
  signImageUpload: (getToken: GetToken, folder: string) =>
    call<{ cloudName: string; apiKey: string; signature: string; params: Record<string, string> }>(getToken, "images.signUpload", { folder }),
  listLeads: (getToken: GetToken, options: {
    status?: LeadStatus;
    cursor?: string;
    from?: string;
    to?: string;
    deleted?: boolean;
    /* A salesperson's uid, or "unassigned". Ignored for a salesperson, who
       only ever receives their own leads. */
    assignee?: string;
  } = {}) => call<{ leads: Lead[]; nextCursor: string | null }>(getToken, "leads.list", options),

  /* Releases one phone number for one call. Each release is written to the
     access log and counted against an hourly limit. */
  dialLead: (getToken: GetToken, id: string) => call<{ dial: string }>(getToken, "leads.dial", { id }),

  /* Who did what to one enquiry, newest first. Reading it is recorded in the
     access log. */
  leadHistory: (getToken: GetToken, id: string) =>
    call<{ history: LeadHistoryEntry[] }>(getToken, "leads.history", { id }),

  assignLeads: (getToken: GetToken, ids: string[], assignee: string) =>
    call<{ ok: true; assigned: number }>(getToken, "leads.assign", { ids, assignee }),

  salesTeam: (getToken: GetToken) => call<{ members: SalesMember[] }>(getToken, "team.members"),

  salesTeamSummary: (getToken: GetToken) => call<SalesTeamSummary>(getToken, "leads.team"),

  /* Email alerts are counts only. The address is taken from the person's
     account on the server, never from here. */
  listAlerts: (getToken: GetToken) => call<{ alerts: StaffAlert[] }>(getToken, "alerts.list"),
  setAlerts: (getToken: GetToken, uid: string, enabled: boolean) =>
    call<{ ok: true }>(getToken, "alerts.set", { uid, enabled }),

  /* Resends the company inbox notice for one lead. The notice says a lead
     exists and never carries its answers. */
  retryNotification: (getToken: GetToken, id: string) => call<{
    ok: true;
    notificationStatus: string;
    customerConfirmationStatus: string;
  }>(getToken, "leads.notify", { id }),
  /* Resends the customer's receipt for their form. */
  retryConfirmation: (getToken: GetToken, id: string) => call<{
    ok: true;
    customerConfirmationStatus: string;
  }>(getToken, "leads.confirmation.retry", { id }),
  auditExport: (getToken: GetToken, ids: string[]) => call<{ ok: true }>(getToken, "leads.export", { ids }),

  getLead: (getToken: GetToken, id: string) => call<{ lead: Lead }>(getToken, "leads.get", { id }),

  updateLead: (getToken: GetToken, id: string, patch: LeadPatch) =>
    call<{ ok: true }>(getToken, "leads.update", { id, ...patch }),

  deleteLead: (getToken: GetToken, id: string) =>
    call<{ ok: true }>(getToken, "leads.delete", { id }),

  restoreLead: (getToken: GetToken, id: string) =>
    call<{ ok: true }>(getToken, "leads.restore", { id }),

  importLeadStatuses: (getToken: GetToken, items: { id: string; status: LeadStatus }[]) =>
    call<{ ok: true; updated: number }>(getToken, "leads.status.import", { items }),

  stats: (getToken: GetToken, range: { from?: string; to?: string } = {}) =>
    call<LeadStats>(getToken, "leads.stats", range),

  listInfluencers: async (getToken: GetToken) => {
    const [result, counts] = await Promise.all([
      call<{ influencers: Influencer[] }>(getToken, "influencers.list"),
      call<{ counts: Record<string, number> }>(getToken, "influencers.counts"),
    ]);
    return { influencers: result.influencers.map((item) => ({ ...item, leads: counts.counts[item.slug] || 0 })) };
  },

  createInfluencer: (getToken: GetToken, input: { name: string; handle: string; platform: string }) =>
    call<{ ok: true; influencer: Influencer }>(getToken, "influencers.create", input),

  setInfluencerActive: (getToken: GetToken, slug: string, active: boolean) =>
    call<{ ok: true }>(getToken, "influencers.setActive", { slug, active }),

  setInfluencerDeleted: (getToken: GetToken, slug: string, deleted: boolean) =>
    call<{ ok: true }>(getToken, "influencers.setDeleted", { slug, deleted }),

  listAudit: (getToken: GetToken) => call<{ entries: AuditEntry[] }>(getToken, "audit.list"),

  listAdmins: (getToken: GetToken) => call<{ admins: AdminUser[] }>(getToken, "admins.list"),

  setAdminRole: (getToken: GetToken, uid: string, role: string, features?: string[]) =>
    call<{ ok: true }>(getToken, "admins.setRole", { uid, role, ...(features ? { features } : {}) }),

  deleteAdmin: (getToken: GetToken, uid: string) =>
    call<{ ok: true }>(getToken, "admins.delete", { uid }),

  /* Creates the account if it does not exist and gives it a role. It does not
     set a password: the invitation email does that, so this returning
     successfully means the person can be emailed, not that they can sign in
     yet. */
  inviteAdmin: (getToken: GetToken, email: string, role: string, features?: string[], name = "") =>
    call<{ ok: true; uid: string; created: boolean; emailSent: boolean }>(getToken, "admins.invite", {
      email,
      role,
      ...(name ? { name } : {}),
      ...(features ? { features } : {}),
    }),

  sendPasswordEmail: (getToken: GetToken, uid: string) =>
    call<{ ok: true }>(getToken, "admins.sendPasswordEmail", { uid }),
};

/* Turns a lead into the one line a table row shows. Kept here so no component
   has to assemble a person's details ad hoc. */
export function leadName(lead: Lead) {
  return `${lead.firstName} ${lead.lastName}`.trim() || "Unnamed enquiry";
}

/* How a salesperson is named on screen: their name if the owner gave one,
   otherwise their email address. */
export function memberName(member: Pick<SalesMember, "name" | "email"> | undefined) {
  return member ? member.name || member.email || "Unnamed account" : "Former team member";
}
