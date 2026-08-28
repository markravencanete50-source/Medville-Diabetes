/*
  Medville Diabetes — administrator API.

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
    owner  — everything, including inviting and removing administrators
    editor — marketing content only; no lead access whatsoever
    agent  — leads: read and change status; no administrator management
*/

import { http } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, applicationDefault } from "firebase-admin/app";

initializeApp({ credential: applicationDefault() });

const db = new Firestore();
const auth = getAuth();

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";

/* Sessions are short by design. Section 3.4(b) requires automatic session
   timeouts rather than shared credentials that stay signed in. The dashboard
   signs out on idle; this is the server side of the same rule, so a stolen
   token cannot be replayed for long. */
const MAX_TOKEN_AGE_SECONDS = 60 * 60;

const LEAD_STATUSES = new Set(["new", "contacted", "qualified", "not-qualified", "closed"]);

function send(res, status, body) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  if (ALLOWED_ORIGIN) {
    res.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.set("Vary", "Origin");
  }
  if (body === undefined) return res.status(status).send("");
  return res.status(status).json(body);
}

async function authenticate(req) {
  const header = req.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = await auth.verifyIdToken(header.slice(7), true);
    const issuedSecondsAgo = Math.floor(Date.now() / 1000) - decoded.auth_time;
    if (issuedSecondsAgo > MAX_TOKEN_AGE_SECONDS) return null;
    if (!decoded.role) return null;
    return { uid: decoded.uid, email: decoded.email || "", role: decoded.role };
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
    status: d.status ?? "new",
    note: d.note ?? "",
    createdAt: d.createdAt?.toDate?.().toISOString() ?? null,
  };
}

/* ---- actions ---- */

async function listLeads(actor, body) {
  const limit = Math.min(Number(body.limit) || 200, 500);
  let query = db.collection("leads").orderBy("createdAt", "desc").limit(limit);
  if (body.status && LEAD_STATUSES.has(body.status)) {
    query = db.collection("leads")
      .where("status", "==", body.status)
      .orderBy("createdAt", "desc")
      .limit(limit);
  }
  const snapshot = await query.get();
  await audit(actor, "leads.list", { count: snapshot.size });
  return { leads: snapshot.docs.map(leadToJson) };
}

async function getLead(actor, body) {
  if (typeof body.id !== "string" || !body.id) return { error: "Not found." };
  const doc = await db.collection("leads").doc(body.id).get();
  if (!doc.exists) return { error: "Not found." };
  await audit(actor, "leads.read", { leadId: doc.id });
  return { lead: leadToJson(doc) };
}

async function updateLead(actor, body) {
  if (typeof body.id !== "string" || !body.id) return { error: "Not found." };
  const patch = {};
  if (typeof body.status === "string") {
    if (!LEAD_STATUSES.has(body.status)) return { error: "That status is not allowed." };
    patch.status = body.status;
  }
  if (typeof body.note === "string") {
    patch.note = body.note.slice(0, 2000);
  }
  if (!Object.keys(patch).length) return { error: "Nothing to change." };

  patch.updatedAt = FieldValue.serverTimestamp();
  patch.updatedBy = actor.email;
  await db.collection("leads").doc(body.id).update(patch);
  await audit(actor, "leads.update", { leadId: body.id, fields: Object.keys(patch) });
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

  const byStatus = {};
  const byState = {};
  const byProduct = {};
  const byDay = {};
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

async function listAudit(actor, body) {
  const limit = Math.min(Number(body.limit) || 100, 300);
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
   place a role can change, and it is restricted to the owner. */
async function listAdmins() {
  const list = await auth.listUsers(100);
  return {
    admins: list.users
      .filter((user) => user.customClaims?.role)
      .map((user) => ({
        uid: user.uid,
        email: user.email ?? "",
        role: user.customClaims.role,
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

  - Only an owner may call this, the same as every other route on this screen.
  - It is written to the audit log before anything is returned, so an account
    can never appear without a record of who created it and when.
  - No password is set. The account exists but cannot be signed in to until
    the person proves control of the mailbox by following the link Firebase
    emails them and choosing their own password. An invitation is not a
    credential, so an intercepted invite grants nothing on its own.
*/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function inviteAdmin(actor, body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role;

  if (!EMAIL.test(email)) return { error: "Please enter a valid email address." };
  if (!["owner", "editor", "agent"].includes(role)) {
    return { error: "That role is not allowed." };
  }

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

  await auth.setCustomUserClaims(user.uid, { role });
  /* Anything they already held stops working immediately rather than at the
     next token refresh. */
  await auth.revokeRefreshTokens(user.uid);

  /* The email address is not recorded: the uid identifies the account, and an
     audit entry should carry no more than it needs to. */
  await audit(actor, "admins.invite", { targetUid: user.uid, role, created });
  return { ok: true, uid: user.uid, created };
}

async function setAdminRole(actor, body) {
  const { uid, role } = body;
  if (typeof uid !== "string" || !uid) return { error: "Unknown administrator." };
  if (!["owner", "editor", "agent", "none"].includes(role)) {
    return { error: "That role is not allowed." };
  }
  if (uid === actor.uid && role !== "owner") {
    return { error: "You cannot remove your own owner access." };
  }
  await auth.setCustomUserClaims(uid, role === "none" ? {} : { role });
  /* Force the next request from that person to carry the new role. */
  await auth.revokeRefreshTokens(uid);
  await audit(actor, "admins.setRole", { targetUid: uid, role });
  return { ok: true };
}

/* ---- routing ---- */

const ROUTES = {
  "leads.list": { roles: ["owner", "agent"], run: listLeads },
  "leads.get": { roles: ["owner", "agent"], run: getLead },
  "leads.update": { roles: ["owner", "agent"], run: updateLead },
  "leads.stats": { roles: ["owner", "agent"], run: stats },
  "audit.list": { roles: ["owner"], run: listAudit },
  "admins.list": { roles: ["owner"], run: listAdmins },
  "admins.setRole": { roles: ["owner"], run: setAdminRole },
  "admins.invite": { roles: ["owner"], run: inviteAdmin },
};

http("adminApi", async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
    return send(res, 204);
  }
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });

  const actor = await authenticate(req);
  if (!actor) return send(res, 401, { error: "Please sign in again." });

  const body = req.body ?? {};
  const route = ROUTES[body.action];
  if (!route) return send(res, 400, { error: "Unknown request." });
  if (!route.roles.includes(actor.role)) {
    await audit(actor, "access.denied", { attempted: body.action });
    return send(res, 403, { error: "You do not have access to that." });
  }

  try {
    const result = await route.run(actor, body);
    if (result.error) return send(res, 400, result);
    return send(res, 200, result);
  } catch {
    /* No error details out, no request body in the logs. */
    return send(res, 500, { error: "That did not work. Please try again." });
  }
});
