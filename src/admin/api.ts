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
  "leads.get",
  "leads.update",
  "leads.delete",
  "leads.restore",
  "leads.status.import",
  "leads.stats",
  "leads.notify",
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
  createdAt: string | null;
  deletedAt: string | null;
  purgeAt: number | null;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "not-qualified" | "closed";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "not-qualified",
  "closed",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  "not-qualified": "Not qualified",
  closed: "Closed",
};

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
  role: string;
  features: string[];
  disabled: boolean;
  lastSignIn: string | null;
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
  } = {}) => call<{ leads: Lead[]; nextCursor: string | null }>(getToken, "leads.list", options),

  retryNotification: (getToken: GetToken, id: string) => call<{
    ok: true;
    notificationStatus: string;
    customerConfirmationStatus: string;
  }>(getToken, "leads.notify", { id }),
  auditExport: (getToken: GetToken, ids: string[]) => call<{ ok: true }>(getToken, "leads.export", { ids }),

  getLead: (getToken: GetToken, id: string) => call<{ lead: Lead }>(getToken, "leads.get", { id }),

  updateLead: (getToken: GetToken, id: string, patch: { status?: LeadStatus; note?: string }) =>
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
  inviteAdmin: (getToken: GetToken, email: string, role: string, features?: string[]) =>
    call<{ ok: true; uid: string; created: boolean; emailSent: boolean }>(getToken, "admins.invite", {
      email,
      role,
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
