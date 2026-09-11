import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createAttributionHandler, validReferralCode } from "../functions/attribution.js";
import { slugFromHandle, validateInfluencerInput } from "../functions/admin/influencers.js";

const origin = "https://www.medvillediabetes.com";
const response = () => ({ code: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } });

async function call({ body = { referralCode: "t1d1girlie", visitId: randomUUID() }, requestOrigin = origin, method = "POST", enabled = true, track = async () => ({ tracked: true }), rawBody } = {}) {
  const res = response();
  const headers = { Origin: requestOrigin, "Content-Type": "application/json" };
  await createAttributionHandler({ enabled, origins: [origin], track })({ method, body, rawBody, ip: "192.0.2.1", get: (key) => headers[key] }, res);
  return res;
}

test("records a validated anonymous referral visit without caching", async () => {
  let received;
  const result = await call({ track: async (data) => { received = data; return { tracked: true }; } });
  assert.equal(result.code, 200); assert.deepEqual(result.body, { ok: true, tracked: true });
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.equal(received.referralCode, "t1d1girlie");
});
test("rejects foreign origins, malformed codes, bad visit ids and oversized bodies", async () => {
  assert.equal((await call({ requestOrigin: "https://evil.invalid" })).code, 403);
  assert.equal((await call({ body: { referralCode: "../owner", visitId: randomUUID() } })).code, 400);
  assert.equal((await call({ body: { referralCode: "t1d1girlie", visitId: "not-a-uuid" } })).code, 400);
  assert.equal((await call({ rawBody: Buffer.alloc(1025) })).code, 413);
});
test("a closed tracking gate and storage errors never claim a click", async () => {
  assert.equal((await call({ enabled: false })).code, 503);
  const failed = await call({ track: async () => { throw new Error("private"); } });
  assert.equal(failed.code, 503); assert.equal(JSON.stringify(failed.body).includes("private"), false);
});
test("influencer input creates stable, URL-safe slugs", () => {
  assert.equal(slugFromHandle("@T1D1.Girlie"), "t1d1-girlie");
  assert.deepEqual(validateInfluencerInput({ name: "T1D Girlie", handle: "@t1d1girlie", platform: "Instagram" }), {
    name: "T1D Girlie", handle: "@t1d1girlie", platform: "Instagram", slug: "t1d1girlie",
  });
  assert.equal(validateInfluencerInput({ name: "Test", handle: "../../owner", platform: "Instagram" }), null);
  assert.equal(validReferralCode("t1d1girlie"), true);
});
