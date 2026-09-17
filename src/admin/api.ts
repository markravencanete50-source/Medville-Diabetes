/*
  Client for the adminApi Cloud Run function.

  Everything that touches Protected Health Information goes through here, and
  the shape of these calls is deliberate:

  - Always POST. A lead identifier must never appear in a URL, because URLs
    reach browser history, proxy logs and referrer headers. Section 3.4(e).
  - Always a fresh token in the Authorization header, so a revoked
    administrator loses access on their next request rather than at some later
    refresh.
  - Never cached. The function sets no-store; this side asks for the same.
  - Errors surface as plain sentences. The server never sends detail back and
    this never invents any.
*/

const ENDPOINT = (import.meta.env.VITE_ADMIN_API as string | undefined)
  || "https://us-central1-medville-diabetes.cloudfunctions.net/adminApi";

export function isAdminApiConfigured() {
  return Boolean(ENDPOINT);
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
  status: LeadStatus;
  note: string;
  createdAt: string | null;
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

async function call<T>(getToken: GetToken, action: string, payload: Record<string, unknown> = {}) {
  if (!ENDPOINT) {
    throw new AdminApiError(
      "The lead service is not connected yet. See ADMIN-SETUP.md for the deploy step.",
    );
  }
  const token = await getToken();
  if (!token) throw new AdminApiError("Please sign in again.");

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
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
  listLeads: (getToken: GetToken, status?: LeadStatus, cursor?: string) =>
    call<{ leads: Lead[]; nextCursor: string | null }>(getToken, "leads.list", { ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) }),

  retryNotification: (getToken: GetToken, id: string) => call<{ ok: true }>(getToken, "leads.notify", { id }),
  auditExport: (getToken: GetToken, ids: string[]) => call<{ ok: true }>(getToken, "leads.export", { ids }),

  getLead: (getToken: GetToken, id: string) => call<{ lead: Lead }>(getToken, "leads.get", { id }),

  updateLead: (getToken: GetToken, id: string, patch: { status?: LeadStatus; note?: string }) =>
    call<{ ok: true }>(getToken, "leads.update", { id, ...patch }),

  stats: (getToken: GetToken) => call<LeadStats>(getToken, "leads.stats"),

  listInfluencers: (getToken: GetToken) =>
    call<{ influencers: Influencer[] }>(getToken, "influencers.list"),

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
