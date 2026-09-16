import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createContactHandler, validateContactSubmission } from "../functions/contact.js";

const origin = "https://www.medvillediabetes.com";
const sample = () => ({
  firstName: "Taylor",
  lastName: "Morgan",
  email: "taylor@example.com",
  phone: "661-555-0100",
  city: "Valencia",
  state: "California",
  message: "I have a general question about your delivery process.",
  privacyAccepted: true,
  submissionId: randomUUID(),
  website: "",
});

function harness({ enabled = true, save, notify } = {}) {
  const saved = new Map();
  let notifications = 0;
  const handler = createContactHandler({
    enabled,
    origins: [origin],
    save: save ?? (async (data) => { saved.set(data.submissionId, data); return {}; }),
    notify: notify ?? (async () => { notifications += 1; }),
  });
  return {
    saved,
    notifications: () => notifications,
    call: async (body = sample(), requestOrigin = origin) => {
      const req = {
        method: "POST", body, ip: "203.0.113.8",
        get: (name) => ({ Origin: requestOrigin, "Content-Type": "application/json" })[name] ?? "",
      };
      const res = { headers: {}, set(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; } };
      await handler(req, res);
      return res;
    },
  };
}

test("contact form accepts the required general enquiry fields", async () => {
  const h = harness();
  const response = await h.call();
  assert.equal(response.code, 200);
  assert.equal(response.body.ok, true);
  assert.equal(h.saved.size, 1);
  assert.equal(h.notifications(), 1);
});

test("contact form requires the no-health-information confirmation", () => {
  assert.equal(validateContactSubmission({ ...sample(), privacyAccepted: false }), null);
  assert.equal(validateContactSubmission({ ...sample(), privacyAccepted: true }).privacyAccepted, true);
});

test("contact form rejects missing, malformed and forged fields", () => {
  for (const patch of [
    { firstName: "" }, { email: "not-an-email" }, { phone: "123" },
    { state: "Unknown" }, { message: "Short" }, { website: "bot" },
  ]) assert.equal(validateContactSubmission({ ...sample(), ...patch }), null);
  const clean = validateContactSubmission({ ...sample(), role: "owner", status: "closed" });
  assert.equal(clean.role, undefined);
  assert.equal(clean.status, undefined);
});

test("contact form refuses foreign origins and a closed service", async () => {
  assert.equal((await harness().call(sample(), "https://evil.invalid")).code, 403);
  assert.equal((await harness({ enabled: false }).call()).code, 503);
});

test("contact rate limits do not save or notify", async () => {
  const h = harness({ save: async () => ({ limited: true }) });
  const response = await h.call();
  assert.equal(response.code, 429);
  assert.equal(h.notifications(), 0);
});

test("contact notification failure does not hide a successful save", async () => {
  const h = harness({ notify: async () => { throw new Error("synthetic failure"); } });
  assert.equal((await h.call()).code, 200);
  assert.equal(h.saved.size, 1);
});
