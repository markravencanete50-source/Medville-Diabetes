import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdminHandler } from "../functions/admin/handler.js";
import { normalizeRole, roleChangeError } from "../functions/admin/roles.js";
import { passwordEmailMessage, sendAdminPasswordEmail } from "../functions/admin/password-email.js";
const origin = "https://www.medvillediabetes.com";
async function request({ role = "owner", body = { action: "leads.get" }, failAudit = false, failRun = false, requestOrigin = origin, method = "POST" } = {}) {
  let reads = 0; let audits = 0;
  const handler = createAdminHandler({
    origins: [origin], authenticate: async () => role ? { uid: "test", role } : null,
    audit: async () => { audits++; if (failAudit) throw new Error("private exception"); },
    routes: { "leads.get": { roles: ["owner", "marketing", "sales"], run: async () => { if (failRun) throw new Error("private exception"); reads++; return { ok: true }; } } },
  });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(b) { this.body = b; }, send(b) { this.body = b; } };
  await handler({ method, body, get: (k) => ({ Origin: requestOrigin, "Content-Type": "application/json" })[k] }, res);
  return { ...res, reads, audits };
}
async function requestForRoles(role, roles) {
  const handler = createAdminHandler({
    origins: [origin],
    authenticate: async () => ({ uid: "test", role }),
    audit: async () => undefined,
    routes: { test: { roles, run: async () => ({ ok: true }) } },
  });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(b) { this.body = b; }, send(b) { this.body = b; } };
  await handler({ method: "POST", body: { action: "test" }, get: (k) => ({ Origin: origin, "Content-Type": "application/json" })[k] }, res);
  return res.code;
}
test("unauthenticated callers cannot read records", async () => { const r = await request({ role: null }); assert.equal(r.code, 401); assert.equal(r.reads, 0); });
test("unknown roles cannot read records and denial is audited", async () => { const r = await request({ role: "unknown" }); assert.equal(r.code, 403); assert.equal(r.audits, 1); assert.equal(r.reads, 0); });
test("owner, marketing and sales can use enquiry routes", async () => { for (const role of ["owner", "marketing", "sales"]) { const r = await request({ role }); assert.equal(r.code, 200); assert.equal(r.reads, 1); assert.equal(r.headers["Cache-Control"], "no-store"); } });
test("marketing can manage staff but cannot read the owner-only access log", async () => {
  assert.equal(await requestForRoles("marketing", ["owner", "marketing"]), 200);
  assert.equal(await requestForRoles("marketing", ["owner"]), 403);
  assert.equal(await requestForRoles("sales", ["owner", "marketing"]), 403);
});
test("inherited object properties cannot become actions", async () => { for (const action of ["constructor", "__proto__", "toString"]) { const r = await request({ body: { action } }); assert.equal(r.code, 400); assert.equal(r.reads, 0); } });
test("malformed payloads cannot reach routes", async () => { for (const body of [null, [], "text", 42, { action: {} }]) assert.equal((await request({ body })).code, 400); });
test("audit failure remains generic and cannot expose a record", async () => { const r = await request({ role: "unknown", failAudit: true }); assert.equal(r.code, 500); assert.equal(r.reads, 0); assert.equal(JSON.stringify(r.body).includes("private"), false); });
test("route failure remains generic", async () => { const r = await request({ failRun: true }); assert.equal(r.code, 500); assert.equal(JSON.stringify(r.body).includes("private"), false); });
test("foreign origins and GET requests are refused", async () => { assert.equal((await request({ requestOrigin: "https://evil.invalid" })).code, 403); assert.equal((await request({ method: "GET" })).code, 405); });
test("legacy role names map to the replacement roles", () => { assert.equal(normalizeRole("editor"), "marketing"); assert.equal(normalizeRole("agent"), "sales"); });
test("marketing cannot grant, remove or alter Owner access", () => {
  assert.match(roleChangeError({ actorRole: "marketing", nextRole: "owner" }), /Owner/);
  assert.match(roleChangeError({ actorRole: "marketing", targetRole: "owner", nextRole: "sales" }), /Owner/);
  assert.equal(roleChangeError({ actorRole: "marketing", targetRole: "sales", nextRole: "marketing" }), "");
});
test("administrators cannot change their own access", () => {
  assert.match(roleChangeError({ actorRole: "marketing", targetRole: "marketing", nextRole: "sales", isSelf: true }), /own access/);
  assert.equal(roleChangeError({ actorRole: "owner", targetRole: "owner", nextRole: "owner", isSelf: true }), "");
});

test("password email uses clear Medville copy and a secure action link", () => {
  const actionLink = "https://example.invalid/reset?mode=resetPassword&oobCode=safe-code";
  const message = passwordEmailMessage({ actionLink, purpose: "reset" });
  assert.match(message.subject, /Reset your Medville Diabetes dashboard password/);
  assert.match(message.html, /MEDVILLE DIABETES/);
  assert.match(message.html, /Reset password/);
  assert.match(message.html, /28863 Industry Dr/);
  assert.match(message.html, /oobCode=safe-code/);
  assert.doesNotMatch(`${message.subject}${message.text}${message.html}`, /[\u2014*]/);
});

test("password email is sent from the configured Medville address", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.NOTIFICATION_FROM;
  process.env.RESEND_API_KEY = "synthetic-test-key";
  process.env.NOTIFICATION_FROM = "info@medvillediabetes.com";
  try {
    let request;
    await sendAdminPasswordEmail({
      email: "person@example.com",
      uid: "admin-1",
      actionLink: "https://example.invalid/reset?oobCode=one-time-code",
      purpose: "invite",
    }, async (url, options) => {
      request = { url, options };
      return { ok: true };
    });
    const body = JSON.parse(request.options.body);
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(body.from, "Medville Diabetes <info@medvillediabetes.com>");
    assert.deepEqual(body.to, ["person@example.com"]);
    assert.match(body.subject, /Set up your Medville Diabetes dashboard password/);
    assert.match(request.options.headers["Idempotency-Key"], /^admin-password-admin-1-/);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.NOTIFICATION_FROM;
    else process.env.NOTIFICATION_FROM = previousFrom;
  }
});
