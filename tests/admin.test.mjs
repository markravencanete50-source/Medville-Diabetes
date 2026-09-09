import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdminHandler } from "../functions/admin/handler.js";
const origin = "https://www.medvillediabetes.com";
async function request({ role = "owner", body = { action: "leads.get" }, failAudit = false, failRun = false, requestOrigin = origin, method = "POST" } = {}) {
  let reads = 0; let audits = 0;
  const handler = createAdminHandler({
    origins: [origin], authenticate: async () => role ? { uid: "test", role } : null,
    audit: async () => { audits++; if (failAudit) throw new Error("private exception"); },
    routes: { "leads.get": { roles: ["owner", "agent"], run: async () => { if (failRun) throw new Error("private exception"); reads++; return { ok: true }; } } },
  });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(b) { this.body = b; }, send(b) { this.body = b; } };
  await handler({ method, body, get: (k) => ({ Origin: requestOrigin, "Content-Type": "application/json" })[k] }, res);
  return { ...res, reads, audits };
}
test("unauthenticated callers cannot read records", async () => { const r = await request({ role: null }); assert.equal(r.code, 401); assert.equal(r.reads, 0); });
test("editors cannot read records and denial is audited", async () => { const r = await request({ role: "editor" }); assert.equal(r.code, 403); assert.equal(r.audits, 1); assert.equal(r.reads, 0); });
test("owner and agent can use permitted routes", async () => { for (const role of ["owner", "agent"]) { const r = await request({ role }); assert.equal(r.code, 200); assert.equal(r.reads, 1); assert.equal(r.headers["Cache-Control"], "no-store"); } });
test("inherited object properties cannot become actions", async () => { for (const action of ["constructor", "__proto__", "toString"]) { const r = await request({ body: { action } }); assert.equal(r.code, 400); assert.equal(r.reads, 0); } });
test("malformed payloads cannot reach routes", async () => { for (const body of [null, [], "text", 42, { action: {} }]) assert.equal((await request({ body })).code, 400); });
test("audit failure remains generic and cannot expose a record", async () => { const r = await request({ role: "editor", failAudit: true }); assert.equal(r.code, 500); assert.equal(r.reads, 0); assert.equal(JSON.stringify(r.body).includes("private"), false); });
test("route failure remains generic", async () => { const r = await request({ failRun: true }); assert.equal(r.code, 500); assert.equal(JSON.stringify(r.body).includes("private"), false); });
test("foreign origins and GET requests are refused", async () => { assert.equal((await request({ requestOrigin: "https://evil.invalid" })).code, 403); assert.equal((await request({ method: "GET" })).code, 405); });
