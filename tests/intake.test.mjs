import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIntakeHandler, validateSubmission } from "../functions/intake.js";
import { notificationMessage, sendNotification } from "../functions/notification.js";

const origin = "https://www.medvillediabetes.com";
const sample = () => ({ firstName: "Test", lastName: "Example", email: "test@example.invalid", phone: "2025550147", city: "Example City", state: "California", injectsInsulinDaily: "no", productInterest: "dexcom-g7", submissionId: randomUUID() });
const response = () => ({ code: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } });
function harness(options = {}) {
  const saved = new Map();
  let messages = 0;
  const handler = createIntakeHandler({ enabled: true, origins: [origin], resolveProduct: async (slug) => slug === "dexcom-g7" ? { name: "Dexcom G7" } : null,
    save: async (data) => { const duplicate = saved.has(data.submissionId); if (!duplicate) saved.set(data.submissionId, data); return { duplicate }; },
    notify: async () => { messages++; }, ...options });
  const call = async (body = sample(), overrides = {}) => {
    const res = response();
    const headers = { Origin: origin, "Content-Type": "application/json", ...overrides.headers };
    await handler({ method: "POST", body, ip: "192.0.2.1", ...overrides, get: (key) => headers[key] }, res);
    return res;
  };
  return { call, saved, messages: () => messages };
}

test("saves selected product, returns an explicit receipt and forbids caching", async () => {
  const h = harness();
  const result = await h.call();
  assert.equal(result.code, 200); assert.deepEqual(result.body, { ok: true });
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.equal([...h.saved.values()][0].productName, "Dexcom G7");
});
test("closed launch gate never saves or sends", async () => {
  const h = harness({ enabled: false });
  assert.equal((await h.call()).code, 503); assert.equal(h.saved.size, 0); assert.equal(h.messages(), 0);
});
test("rejects foreign origins, wrong methods and wrong content types", async () => {
  const h = harness();
  assert.equal((await h.call(sample(), { headers: { Origin: "https://www.medvillediabetes.com.evil.invalid" } })).code, 403);
  assert.equal((await h.call(sample(), { method: "GET" })).code, 405);
  assert.equal((await h.call(sample(), { headers: { "Content-Type": "text/plain" } })).code, 415);
  assert.equal(h.saved.size, 0);
});
test("allows preflight without writing", async () => {
  const h = harness(); assert.equal((await h.call({}, { method: "OPTIONS" })).code, 204); assert.equal(h.saved.size, 0);
});
test("rejects invalid and malicious form values without echoing them", async () => {
  for (const patch of [{ phone: "-------" }, { state: "Not a state" }, { email: "not-an-email" }, { firstName: "\nprivate" }, { productInterest: "../../secrets" }, { injectsInsulinDaily: "maybe" }, { website: "spam" }, { submissionId: "../record" }]) {
    const h = harness(); const result = await h.call({ ...sample(), ...patch });
    assert.equal(result.code, 400); assert.equal(h.saved.size, 0);
    assert.equal(JSON.stringify(result.body).includes("test@example.invalid"), false);
  }
});
test("rejects oversized requests before database access", async () => {
  const h = harness(); assert.equal((await h.call(sample(), { rawBody: Buffer.alloc(9000) })).code, 413); assert.equal(h.saved.size, 0);
});
test("unknown products are rejected by server catalog", async () => {
  const h = harness(); assert.equal((await h.call({ ...sample(), productInterest: "unknown" })).code, 400); assert.equal(h.saved.size, 0);
});
test("rate limit produces a retry response and no notification", async () => {
  const h = harness({ save: async () => ({ limited: true }) }); assert.equal((await h.call()).code, 429); assert.equal(h.messages(), 0);
});
test("retries use the same record ID", async () => {
  const h = harness(); const data = sample(); await h.call(data); await h.call(data); assert.equal(h.saved.size, 1);
});
test("mail failure never changes a successful save into a failure", async () => {
  const h = harness({ notify: async () => { throw new Error("test failure"); } }); assert.equal((await h.call()).code, 200); assert.equal(h.saved.size, 1);
});
test("storage failure never reports success", async () => {
  const h = harness({ save: async () => { throw new Error("secret detail"); } }); const res = await h.call(); assert.equal(res.code, 503); assert.equal(JSON.stringify(res.body).includes("secret detail"), false);
});
test("notification includes selected product and protected dashboard, no patient fields", async () => {
  const data = sample(); const message = notificationMessage("Dexcom G7");
  assert.match(message.text, /Product selected: Dexcom G7/); assert.match(message.text, /\/admin#leads/);
  for (const key of ["firstName", "lastName", "email", "phone", "city"]) assert.equal(message.text.includes(data[key]), false);
  assert.equal(Object.keys(message).length, 2);
});
test("notification delivery uses server-only sender, fixed recipient and idempotency", async () => {
  const oldKey = process.env.RESEND_API_KEY; const oldFrom = process.env.NOTIFICATION_FROM;
  process.env.RESEND_API_KEY = "synthetic-test-key"; process.env.NOTIFICATION_FROM = "test@example.invalid";
  try {
    await sendNotification({ productName: "Dexcom G7", id: "test-uuid" }, async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.deepEqual(JSON.parse(options.body).to, ["info@medvillediabetes.com"]);
      assert.equal(options.headers["Idempotency-Key"], "eligibility-test-uuid");
      return { ok: true };
    });
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.NOTIFICATION_FROM; else process.env.NOTIFICATION_FROM = oldFrom;
  }
});
test("only explicitly allowed fields survive validation", () => {
  const data = validateSubmission({ ...sample(), role: "owner", status: "qualified", productName: "forged" });
  assert.equal(data.role, undefined); assert.equal(data.status, undefined); assert.equal(data.productName, undefined);
});
