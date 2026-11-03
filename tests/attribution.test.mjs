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
  assert.equal(validateInfluencerInput({ name: "Meta campaign", handle: "fall-cgm", platform: "Meta Ads" }).platform, "Meta Ads");
  assert.equal(validReferralCode("t1d1girlie"), true);
});

/* A small stand-in for Firestore: documents in a map, a transaction that
   applies its writes only at the end, and FieldValue markers it understands. */
import { createReferralTracker, MAX_HITS_PER_VISIT, HITS_PER_ADDRESS_HOUR } from "../functions/attribution.js";
const marker = (kind, value) => ({ __marker: kind, value });
const FakeFieldValue = { increment: (n) => marker("increment", n), serverTimestamp: () => marker("now") };
function fakeDb(initial) {
  const docs = new Map(Object.entries(initial));
  const apply = (path, data, merge) => {
    const base = merge ? { ...(docs.get(path) || {}) } : {};
    for (const [k, v] of Object.entries(data)) base[k] = v?.__marker === "increment" ? (base[k] || 0) + v.value : v?.__marker === "now" ? "now" : v;
    docs.set(path, base);
  };
  const ref = (collection, id) => ({ path: `${collection}/${id}` });
  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(name, id) }),
    runTransaction: async (fn) => {
      const writes = [];
      const tx = {
        get: async (r) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
        set: (r, d) => writes.push(() => apply(r.path, d, false)),
        create: (r, d) => writes.push(() => apply(r.path, d, false)),
        update: (r, d) => writes.push(() => apply(r.path, d, true)),
      };
      const result = await fn(tx);
      writes.forEach((w) => w());
      return result;
    },
  };
}
const keys = ({ visitId, ip, now }) => ({ visitKey: `v-${visitId}`, rateKey: `r-${ip}-${Math.floor(now / 3600000)}` });

test("every opening counts as a click, and only the first from a session as a unique visit", async () => {
  const db = fakeDb({ "influencers/t1d1girlie": { active: true, clicks: 0, totalClicks: 0 } });
  const track = createReferralTracker({ db, FieldValue: FakeFieldValue, keys });
  const session = randomUUID();
  assert.deepEqual(await track({ referralCode: "t1d1girlie", visitId: session, ip: "192.0.2.1" }), { tracked: true, unique: true });
  assert.deepEqual(await track({ referralCode: "t1d1girlie", visitId: session, ip: "192.0.2.1" }), { tracked: true, unique: false });
  await track({ referralCode: "t1d1girlie", visitId: randomUUID(), ip: "192.0.2.2" });
  const partner = db.docs.get("influencers/t1d1girlie");
  assert.equal(partner.clicks, 2); assert.equal(partner.totalClicks, 3);
  assert.equal(db.docs.get(`attributionVisits/v-${session}`).hits, 2);
});
test("older links start their total from unique visits, and paused links count nothing", async () => {
  const db = fakeDb({ "influencers/old": { active: true, clicks: 9 }, "influencers/paused": { active: false, clicks: 4 } });
  const track = createReferralTracker({ db, FieldValue: FakeFieldValue, keys });
  await track({ referralCode: "old", visitId: randomUUID(), ip: "192.0.2.1" });
  assert.equal(db.docs.get("influencers/old").totalClicks, 10); assert.equal(db.docs.get("influencers/old").clicks, 10);
  assert.deepEqual(await track({ referralCode: "paused", visitId: randomUUID(), ip: "192.0.2.1" }), { tracked: false });
  assert.deepEqual(await track({ referralCode: "missing", visitId: randomUUID(), ip: "192.0.2.1" }), { tracked: false });
  assert.equal(db.docs.get("influencers/paused").totalClicks, undefined);
});
test("refreshing cannot inflate clicks past the per-session and per-address limits", async () => {
  const db = fakeDb({ "influencers/t1d1girlie": { active: true, clicks: 0, totalClicks: 0 } });
  const track = createReferralTracker({ db, FieldValue: FakeFieldValue, keys });
  const session = randomUUID();
  for (let i = 0; i < MAX_HITS_PER_VISIT + 5; i++) await track({ referralCode: "t1d1girlie", visitId: session, ip: "192.0.2.9" });
  assert.equal(db.docs.get("influencers/t1d1girlie").totalClicks, MAX_HITS_PER_VISIT);
  for (let i = 0; i < HITS_PER_ADDRESS_HOUR + 5; i++) await track({ referralCode: "t1d1girlie", visitId: randomUUID(), ip: "192.0.2.10" });
  assert.equal(db.docs.get("influencers/t1d1girlie").totalClicks, MAX_HITS_PER_VISIT + HITS_PER_ADDRESS_HOUR);
});
