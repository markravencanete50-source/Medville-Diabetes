/*
  Medville Diabetes administrator API.

  Deploy as a Cloud Run function (2nd generation) in the client's dedicated
  Google Cloud project, after the Google Cloud BAA has been accepted on that
  project's billing account. See ADMIN-SETUP.md for the deploy command.

  Why this function exists at all
  ------------------------------
  Section 3.4(c) of the agreement requires an audit log recording who accessed
  or modified PHI and when. Firestore security rules can decide whether a read
  is allowed, but they cannot record that it happened. So the browser is given
  no access to the leads collection at any level, and every read and every
  change passes through here, where the caller is identified from their
  Identity Platform token and an auditLog entry is written before the data is
  returned.

  PHI rules enforced here
  -----------------------
  - No request body and no lead field is ever written to a log line.
  - Every response carries Cache-Control: no-store.
  - Lead identifiers never travel in a query string. All reads are POSTs.
  - Errors are generic and never echo submitted values back.
  - The audit entry records the actor, the action and the record touched, but
    never the PHI values themselves.

  Roles, taken from the Identity Platform custom claim:
    owner: every feature, including the access log and Owner management
    marketing: every feature except the access log; cannot grant or change Owner access
    sales: products and enquiries only
*/

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { sendNotification } from "./notification.js";
import { sendAdminPasswordEmail } from "./password-email.js";
import { createAdminHandler } from "./handler.js";
import { ADMIN_ROLES, normalizeFeatures, normalizeRole, roleChangeError } from "./roles.js";
import { validateInfluencerInput } from "./influencers.js";
import { imageUploadSignature } from "./images.js";

initializeApp({ credential: applicationDefault() });

const db = new Firestore();
const auth = getAuth();
const resendApiKey = defineSecret("RESEND_API_KEY");
const cloudinarySecret = defineSecret("CLOUDINARY_API_SECRET");
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://www.medvillediabetes.com").replace(/\/$/, "");

/*
  Allowed origins.

  ALLOWED_ORIGIN takes one origin or several separated by commas, so the
  Firebase address and the custom domain can both work without redeploying
  when DNS moves:

    ALLOWED_ORIGIN=https://medville-diabetes.web.app,https://www.medvillediabetes.com

  Access-Control-Allow-Origin may only ever name a single origin, so the
  request's own Origin is echoed back when it is on the list, and the header
  is omitted entirely when it is not, which is what makes the browser refuse.
  Vary: Origin is set either way so a shared cache cannot serve one site's
  response to another.

  Matching is exact. A prefix match would let evil-medvillediabetes.com
  through, and a suffix match would let medvillediabetes.com.evil.com through.
*/
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "https://www.medvillediabetes.com,https://medvillediabetes.com,https://medville-diabetes.web.app")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);


/* Sessions are short by design. Section 3.4(b) requires automatic session
   timeouts rather than shared credentials that stay signed in. The dashboard
   signs out on idle; this is the server side of the same rule, so a stolen
   token cannot be replayed for long. */
const MAX_TOKEN_AGE_SECONDS = 60 * 60;

const LEAD_STATUSES = new Set(["new", "contacted", "qualified", "not-qualified", "closed"]);

async function authenticate(req) {
  const header = req.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = await auth.verifyIdToken(header.slice(7), true);
    const issuedSecondsAgo = Math.floor(Date.now() / 1000) - decoded.auth_time;
    if (!Number.isFinite(issuedSecondsAgo) || issuedSecondsAgo < -60 || issuedSecondsAgo > MAX_TOKEN_AGE_SECONDS) return null;
    const role = normalizeRole(decoded.role);
    if (!role) return null;
    return {
      uid: decoded.uid,
      email: decoded.email || "",
      role,
      features: normalizeFeatures(decoded.features, role),
    };
  } catch {
    /* Never log the token or the reason. */
    return null;
  }
}

/*
  The audit entry. Written before the caller sees any PHI, so a read that
  fails to be recorded is a read that does not happen.

  It deliberately stores no lead values: who, what, which record, when.
*/
async function audit(actor, action, detail = {}) {
  await db.collection("auditLog").add({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    ...detail,
    at: FieldValue.serverTimestamp(),
  });
}

function leadToJson(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    injectsInsulinDaily: d.injectsInsulinDaily ?? "",
    productInterest: d.productInterest ?? "",
    productName: d.productName ?? "",
    referralCode: d.referralCode ?? "",
    source: d.source ?? "qualify",
    message: d.message ?? "",
    notificationStatus: d.notificationStatus ?? "not-configured",
    status: d.status ?? "new",
    note: d.note ?? "",
    createdAt: d.createdAt?.toDate?.().toISOString() ?? null,
  };
}

/* ---- actions ---- */

async function listLeads(actor, body) {
  const limit = Math.min(Math.max(Math.floor(Number(body.limit) || 50), 1), 200);
  let query = db.collection("leads").orderBy("createdAt", "desc").limit(limit);
  if (body.status && LEAD_STATUSES.has(body.status)) {
    query = db.collection("leads")
      .where("status", "==", body.status)
      .orderBy("createdAt", "desc")
      .limit(limit);
  }
  if (body.cursor) {
    if (!validId(body.cursor)) return { error: "Invalid page." };
    const cursor = await db.collection("leads").doc(body.cursor).get();
    if (!cursor.exists) return { error: "Please refresh the enquiry list." };
    query = query.startAfter(cursor);
  }
  const snapshot = await query.get();
  await audit(actor, "leads.list", { count: snapshot.size, leadIds: snapshot.docs.map((doc) => doc.id) });
  return { leads: snapshot.docs.map(leadToJson), nextCursor: snapshot.size === limit ? snapshot.docs.at(-1).id : null };
}

function validId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

async function getLead(actor, body) {
  if (!validId(body.id)) return { error: "Not found." };
  const doc = await db.collection("leads").doc(body.id).get();
  if (!doc.exists) return { error: "Not found." };
  await audit(actor, "leads.read", { leadId: doc.id });
  return { lead: leadToJson(doc) };
}

async function updateLead(actor, body) {
  if (!validId(body.id)) return { error: "Not found." };
  const patch = {};
  if (typeof body.status === "string") {
    if (!LEAD_STATUSES.has(body.status)) return { error: "That status is not allowed." };
    patch.status = body.status;
  }
  if (typeof body.note === "string") {
    if (body.note.length > 2000) return { error: "The note is too long." };
    patch.note = body.note;
  }
  if (!Object.keys(patch).length) return { error: "Nothing to change." };

  patch.updatedAt = FieldValue.serverTimestamp();
  patch.updatedBy = actor.email;
  const batch = db.batch();
  batch.update(db.collection("leads").doc(body.id), patch);
  batch.create(db.collection("auditLog").doc(), {
    actorUid: actor.uid, actorEmail: actor.email, actorRole: actor.role,
    action: "leads.update", leadId: body.id, fields: Object.keys(patch), at: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { ok: true };
}

/*
  Dashboard figures.

  Counts are computed here rather than in the browser so the raw records never
  have to leave the server just to be totalled, and so the audit entry can say
  plainly that a summary was viewed rather than a set of patients.
*/
async function stats(actor) {
  const snapshot = await db.collection("leads").select("status", "state", "createdAt", "productInterest", "injectsInsulinDaily").get();

  const byStatus = Object.create(null);
  const byState = Object.create(null);
  const byProduct = Object.create(null);
  const byDay = Object.create(null);
  let insulinYes = 0;

  snapshot.forEach((doc) => {
    const d = doc.data();
    const status = d.status ?? "new";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    if (d.state) byState[d.state] = (byState[d.state] ?? 0) + 1;
    if (d.productInterest) byProduct[d.productInterest] = (byProduct[d.productInterest] ?? 0) + 1;
    if (d.injectsInsulinDaily === "yes") insulinYes += 1;
    const created = d.createdAt?.toDate?.();
    if (created) {
      const day = created.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
  });

  await audit(actor, "leads.stats", { count: snapshot.size });

  return { total: snapshot.size, insulinYes, byStatus, byState, byProduct, byDay };
}

function influencerToJson(doc) {
  const d = doc.data();
  return {
    slug: doc.id,
    name: d.name ?? "",
    handle: d.handle ?? "",
    platform: d.platform ?? "Other",
    active: d.active === true,
    deleted: d.deleted === true,
    clicks: Number.isFinite(d.clicks) ? d.clicks : 0,
    leads: Number.isFinite(d.leads) ? d.leads : 0,
    createdAt: d.createdAt?.toDate?.().toISOString() ?? null,
  };
}

async function listInfluencers(actor) {
  const snapshot = await db.collection("influencers").orderBy("createdAt", "desc").limit(200).get();
  await audit(actor, "influencers.list", { count: snapshot.size });
  return { influencers: snapshot.docs.map(influencerToJson) };
}

async function createInfluencer(actor, body) {
  const input = validateInfluencerInput(body);
  if (!input) return { error: "Please check the influencer details." };
  const reference = db.collection("influencers").doc(input.slug);
  const result = await db.runTransaction(async (tx) => {
    if ((await tx.get(reference)).exists) return { error: "That influencer link already exists." };
    tx.create(reference, {
      ...input, active: true, clicks: 0, leads: 0,
      createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    return { ok: true };
  });
  if (result.error) return result;
  await audit(actor, "influencers.create", { influencerId: input.slug });
  return { ok: true, influencer: { ...input, active: true, clicks: 0, leads: 0, createdAt: null } };
}

async function setInfluencerActive(actor, body) {
  if (!validId(body.slug) || typeof body.active !== "boolean") {
    return { error: "Unknown influencer." };
  }
  const reference = db.collection("influencers").doc(body.slug);
  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(reference);
    if (!existing.exists || existing.data().deleted) return { error: "Unknown influencer." };
    tx.update(reference, {
      active: body.active, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    return { ok: true };
  });
  if (result.error) return result;
  await audit(actor, "influencers.setActive", { influencerId: body.slug, active: body.active });
  return { ok: true };
}

async function setInfluencerDeleted(actor, body) {
  if (!validId(body.slug) || typeof body.deleted !== "boolean") return { error: "Unknown influencer." };
  const reference = db.collection("influencers").doc(body.slug);
  if (!(await reference.get()).exists) return { error: "Unknown influencer." };
  await audit(actor, "influencers.delete.requested", { influencerId: body.slug, deleted: body.deleted });
  await reference.update({ deleted: body.deleted, active: false, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  return { ok: true };
}

async function listAudit(actor, body) {
  const limit = Math.min(Math.max(Math.floor(Number(body.limit) || 100), 1), 300);
  const snapshot = await db.collection("auditLog").orderBy("at", "desc").limit(limit).get();
  return {
    entries: snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        actorEmail: d.actorEmail ?? "",
        actorRole: d.actorRole ?? "",
        action: d.action ?? "",
        leadId: d.leadId ?? "",
        count: d.count ?? null,
        at: d.at?.toDate?.().toISOString() ?? null,
      };
    }),
  };
}

/* Administrator management. Roles are custom claims, so this is the only
   place a role can change. Only an Owner may invite, change, revoke, or remove
   an administrator account. */
async function listAdmins() {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return {
    admins: users
      .filter((user) => normalizeRole(user.customClaims?.role) || user.customClaims?.managedAdmin === true)
      .map((user) => ({
        uid: user.uid,
        email: user.email ?? "",
        role: normalizeRole(user.customClaims?.role) || "none",
        features: normalizeRole(user.customClaims?.role)
          ? normalizeFeatures(user.customClaims?.features, normalizeRole(user.customClaims.role))
          : [],
        disabled: user.disabled,
        lastSignIn: user.metadata.lastSignInTime ?? null,
      })),
  };
}

/*
  Inviting an administrator.

  Until now an account had to be created in the Google Cloud console and only
  its role was set here. That was a deliberate limit: creating a user is the
  one action that can mint access to patient records. The client asked for the
  invitation to happen in the dashboard, and it is safe to move it here
  because the three things that made the console safer are all still true.

  - Only an Owner may call this endpoint.
  - It is written to the audit log before anything is returned, so an account
    can never appear without a record of who created it and when.
   - No password is set. The account exists but cannot be signed in to until
     the person follows the one-time link and chooses a password. The link is
     treated as a credential and is sent only to the person's own mailbox.
*/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/*
  Shared mailboxes cannot hold an administrator account.

  Every audit entry records the account that acted. If a team signs in as one
  address, the trail says "sales@ opened this record" and can never say who,
  which makes it useless for the one purpose it exists to serve. Section
  3.4(b) of the agreement asks for individual logins, and HIPAA's Technical
  Safeguards require unique user identification (164.312(a)(2)(i)).

  This is a hard refusal rather than a warning, because the dashboard cannot
  tell later that a login was shared: by then there is only a name on a
  record. It is checked here rather than only in the browser, since the
  browser is not what decides.

  The list is the local parts a role address actually uses. A real person is
  not called "billing", so a false refusal is close to impossible; a shared
  address that slips through under some other name is still worth stopping
  at the point somebody notices.
*/
const SHARED_MAILBOXES = new Set([
  "accounts", "admin", "administrator", "billing", "contact", "enquiries",
  "hello", "help", "info", "inquiries", "mail", "marketing", "no-reply",
  "noreply", "office", "orders", "sales", "staff", "support", "team",
]);

function isSharedMailbox(email) {
  return SHARED_MAILBOXES.has(email.split("@")[0]);
}

const SHARED_MAILBOX_REFUSAL =
  "That is a shared mailbox. Every administrator needs their own address, " +
  "because the access log records who opened a patient record and a shared " +
  "login cannot answer that.";

async function inviteAdmin(actor, body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role;
  const features = actor.role === "owner"
    ? normalizeFeatures(body.features, role)
    : normalizeFeatures(undefined, role);

  if (!EMAIL.test(email)) return { error: "Please enter a valid email address." };
  if (isSharedMailbox(email)) return { error: SHARED_MAILBOX_REFUSAL };
  if (!ADMIN_ROLES.includes(role)) {
    return { error: "That role is not allowed." };
  }
  const initialRoleError = roleChangeError({ actorRole: actor.role, nextRole: role });
  if (initialRoleError) return { error: initialRoleError };

  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(email);
  } catch (problem) {
    if (problem?.code !== "auth/user-not-found") throw problem;
    /* No password. The invitation email is the only way in. */
    user = await auth.createUser({ email, emailVerified: false });
    created = true;
  }

  const currentRole = normalizeRole(user.customClaims?.role);
  const changeError = roleChangeError({
    actorRole: actor.role,
    targetRole: currentRole,
    nextRole: role,
    isSelf: user.uid === actor.uid,
  });
  if (changeError) return { error: changeError };
  await audit(actor, "admins.invite.requested", { targetUid: user.uid, role, features, created });
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role, features, managedAdmin: true });
  /* Anything they already held stops working immediately rather than at the
     next token refresh. */
  await auth.revokeRefreshTokens(user.uid);

  /* The email address is not recorded: the uid identifies the account, and an
     audit entry should carry no more than it needs to. */
  await audit(actor, "admins.invite", { targetUid: user.uid, role, created });
  let emailSent = true;
  try {
    const actionLink = await auth.generatePasswordResetLink(user.email, {
      url: `${PUBLIC_SITE_URL}/admin`,
      handleCodeInApp: false,
    });
    await sendAdminPasswordEmail({
      email: user.email,
      uid: user.uid,
      actionLink,
      purpose: "invite",
    });
    await audit(actor, "admins.passwordEmail.sent", { targetUid: user.uid, purpose: "invite" });
  } catch (problem) {
    emailSent = false;
    console.error("Admin invitation delivery failed", { code: /^[a-z0-9/-]{1,80}$/i.test(problem?.code || "") ? problem.code : "unknown" });
    await audit(actor, "admins.passwordEmail.failed", { targetUid: user.uid, purpose: "invite" });
  }
  return { ok: true, uid: user.uid, created, emailSent };
}

async function resendAdminPasswordEmail(actor, body) {
  if (typeof body.uid !== "string" || !body.uid) return { error: "Unknown administrator." };
  let user;
  try {
    user = await auth.getUser(body.uid);
  } catch {
    return { error: "Unknown administrator." };
  }
  if (!user.email || !normalizeRole(user.customClaims?.role)) {
    return { error: "Unknown administrator." };
  }
  await audit(actor, "admins.passwordEmail.requested", { targetUid: user.uid, purpose: "reset" });
  try {
    const actionLink = await auth.generatePasswordResetLink(user.email, {
      url: `${PUBLIC_SITE_URL}/admin`,
      handleCodeInApp: false,
    });
    await sendAdminPasswordEmail({
      email: user.email,
      uid: user.uid,
      actionLink,
      purpose: "reset",
    });
    await audit(actor, "admins.passwordEmail.sent", { targetUid: user.uid, purpose: "reset" });
    return { ok: true };
  } catch (problem) {
    await audit(actor, "admins.passwordEmail.failed", { targetUid: user.uid, purpose: "reset" });
    console.error("Admin password email delivery failed", { code: /^[a-z0-9/-]{1,80}$/i.test(problem?.code || "") ? problem.code : "unknown" });
    return { error: "The email could not be sent. Please try again." };
  }
}

async function setAdminRole(actor, body) {
  const { uid, role } = body;
  if (typeof uid !== "string" || !uid) return { error: "Unknown administrator." };
  const initialRoleError = roleChangeError({
    actorRole: actor.role,
    nextRole: role,
    isSelf: uid === actor.uid,
  });
  if (initialRoleError) return { error: initialRoleError };
  const targetUser = await auth.getUser(uid);
  const currentRole = normalizeRole(targetUser.customClaims?.role);
  const changeError = roleChangeError({
    actorRole: actor.role,
    targetRole: currentRole,
    nextRole: role,
    isSelf: uid === actor.uid,
  });
  if (changeError) return { error: changeError };
  /* An account created before this rule, or outside the dashboard, must not
     be granted a role now. Taking access away is always allowed: refusing
     that would strand exactly the account most worth closing. */
  if (role !== "none") {
    if (targetUser.email && isSharedMailbox(targetUser.email.toLowerCase())) {
      return { error: SHARED_MAILBOX_REFUSAL };
    }
  }
  const claims = { ...targetUser.customClaims };
  if (role === "none") {
    delete claims.role;
    delete claims.features;
    claims.managedAdmin = true;
  } else {
    claims.role = role;
    claims.managedAdmin = true;
    claims.features = actor.role === "owner"
      ? normalizeFeatures(body.features, role)
      : normalizeFeatures(undefined, role);
  }
  await audit(actor, "admins.setRole.requested", { targetUid: uid, role, features: claims.features || [] });
  await auth.setCustomUserClaims(uid, claims);
  /* Force the next request from that person to carry the new role. */
  await auth.revokeRefreshTokens(uid);
  await audit(actor, "admins.setRole", { targetUid: uid, role });
  return { ok: true };
}

async function deleteAdmin(actor, body) {
  const uid = typeof body.uid === "string" ? body.uid : "";
  if (!uid) return { error: "Unknown administrator." };
  if (uid === actor.uid) return { error: "You cannot remove your own account." };
  let target;
  try {
    target = await auth.getUser(uid);
  } catch {
    return { error: "Unknown administrator." };
  }
  const targetRole = normalizeRole(target.customClaims?.role);
  if (targetRole === "owner") {
    const page = await auth.listUsers(1000);
    const ownerCount = page.users.filter((user) => normalizeRole(user.customClaims?.role) === "owner").length;
    if (ownerCount <= 1) return { error: "The last Owner account cannot be removed." };
  }
  await audit(actor, "admins.delete.requested", { targetUid: uid, targetRole: targetRole || "none" });
  await auth.deleteUser(uid);
  await audit(actor, "admins.delete", { targetUid: uid, targetRole: targetRole || "none" });
  return { ok: true };
}

/* ---- routing ---- */

const ROUTES = {
  "images.signUpload": { roles: ADMIN_ROLES, run: async (actor, body) => {
    const result = imageUploadSignature(actor, body, {
      secret: cloudinarySecret.value(), apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
    if (!result.error) await audit(actor, "images.upload.requested", { folder: body.folder });
    return result;
  } },
  "leads.list": { roles: ADMIN_ROLES, feature: "leads", run: listLeads },
  "leads.get": { roles: ADMIN_ROLES, feature: "leads", run: getLead },
  "leads.update": { roles: ADMIN_ROLES, feature: "leads", run: updateLead },
  "leads.stats": { roles: ADMIN_ROLES, feature: "overview", run: stats },
  "influencers.list": { roles: ADMIN_ROLES, feature: "influencers", run: listInfluencers },
  "influencers.create": { roles: ADMIN_ROLES, feature: "influencers", run: createInfluencer },
  "influencers.setActive": { roles: ADMIN_ROLES, feature: "influencers", run: setInfluencerActive },
  "influencers.setDeleted": { roles: ADMIN_ROLES, feature: "influencers", run: setInfluencerDeleted },
  "audit.list": { roles: ["owner"], feature: "audit", run: listAudit },
  "admins.list": { roles: ["owner"], feature: "team", run: listAdmins },
  "admins.setRole": { roles: ["owner"], feature: "team", run: setAdminRole },
  "admins.delete": { roles: ["owner"], feature: "team", run: deleteAdmin },
  "admins.invite": { roles: ["owner"], feature: "team", run: inviteAdmin },
  "admins.sendPasswordEmail": { roles: ["owner"], feature: "team", run: resendAdminPasswordEmail },
  "leads.notify": { roles: ADMIN_ROLES, feature: "leads", run: async (actor, body) => {
    if (!validId(body.id)) return { error: "Not found." };
    const ref = db.collection("leads").doc(body.id);
    const lead = (await ref.get()).data();
    if (!lead) return { error: "Not found." };
    if (lead.notificationStatus === "sent") return { ok: true };
    await audit(actor, "leads.notify", { leadId: body.id });
    await sendNotification({ id: body.id, productName: lead.productName, kind: lead.source === "contact" ? "contact" : "eligibility" });
    await ref.update({ notificationStatus: "sent", notifiedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  } },
  "leads.export": { roles: ADMIN_ROLES, feature: "leads", run: async (actor, body) => {
    if (!Array.isArray(body.ids) || body.ids.length > 500 || !body.ids.every(validId)) return { error: "Invalid export." };
    await audit(actor, "leads.export", { count: body.ids.length, leadIds: body.ids });
    return { ok: true };
  } },
};

export const adminApi = onRequest({
  region: "us-central1", cors: false, maxInstances: 2,
  memory: "256MiB", timeoutSeconds: 30, secrets: [resendApiKey, cloudinarySecret],
}, createAdminHandler({ authenticate, audit, routes: ROUTES, origins: ALLOWED_ORIGINS }));
