const REFERRAL_CODE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const VISIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validReferralCode(value) {
  return typeof value === "string" && REFERRAL_CODE.test(value);
}

export function validVisitId(value) {
  return typeof value === "string" && VISIT_ID.test(value);
}

/* Public, anonymous click boundary. The visit id is random and contains no
   identity, contact information, device fingerprint or health information. */
export function createAttributionHandler({ enabled, origins, track }) {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Vary", "Origin");
    const origin = (req.get("Origin") || "").replace(/\/$/, "");
    if (!origins.includes(origin)) return res.status(403).json({ error: "Request not allowed." });
    res.set("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "3600");
      return res.status(204).send("");
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    const available = typeof enabled === "function" ? enabled() : enabled;
    if (!available) return res.status(503).json({ error: "Referral tracking is not available." });
    if (!(req.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
      return res.status(415).json({ error: "JSON required." });
    }
    if (Number(req.get("Content-Length")) > 1024 || (req.rawBody?.length || 0) > 1024) {
      return res.status(413).json({ error: "Request too large." });
    }
    const referralCode = req.body?.referralCode;
    const visitId = req.body?.visitId;
    if (!validReferralCode(referralCode) || !validVisitId(visitId)) {
      return res.status(400).json({ error: "Invalid referral." });
    }
    try {
      const result = await track({ referralCode, visitId, ip: req.ip || "unknown" });
      return res.status(200).json({ ok: true, tracked: result.tracked === true });
    } catch {
      return res.status(503).json({ error: "Referral tracking is not available." });
    }
  };
}

/* Each opening of a referral link is a click; the first from a browser
   session is also a unique visit. Repeat openings from one session count up
   to MAX_HITS_PER_VISIT, and every hit shares the per-address hourly limit,
   so refreshing a page cannot inflate either figure. Links made before total
   clicks existed start from their unique visits, which every visit was at
   least one click of. Nothing about the visitor is stored. */
export const MAX_HITS_PER_VISIT = 20;
export const HITS_PER_ADDRESS_HOUR = 120;

export function createReferralTracker({ db, FieldValue, keys }) {
  return async ({ referralCode, visitId, ip }) => {
    const now = Date.now();
    const { visitKey, rateKey } = keys({ referralCode, visitId, ip, now });
    const influencer = db.collection("influencers").doc(referralCode);
    const visit = db.collection("attributionVisits").doc(visitKey);
    const rate = db.collection("attributionLimits").doc(rateKey);
    return db.runTransaction(async (tx) => {
      const [influencerSnapshot, visitSnapshot, rateSnapshot] = await Promise.all([
        tx.get(influencer), tx.get(visit), tx.get(rate),
      ]);
      const partner = influencerSnapshot.exists ? influencerSnapshot.data() : null;
      if (!partner || partner.active !== true) return { tracked: false };
      const count = rateSnapshot.data()?.count || 0;
      if (count >= HITS_PER_ADDRESS_HOUR) return { tracked: false };
      const hits = visitSnapshot.exists ? (Number(visitSnapshot.data()?.hits) || 1) : 0;
      if (hits >= MAX_HITS_PER_VISIT) return { tracked: false };
      const totalClicks = Number.isFinite(partner.totalClicks) ? partner.totalClicks
        : Number.isFinite(partner.clicks) ? partner.clicks : 0;
      tx.set(rate, { count: count + 1, expiresAt: new Date(now + 7200000) });
      if (visitSnapshot.exists) {
        tx.update(visit, { hits: hits + 1, lastAt: FieldValue.serverTimestamp() });
        tx.update(influencer, { totalClicks: totalClicks + 1, updatedAt: FieldValue.serverTimestamp() });
        return { tracked: true, unique: false };
      }
      tx.create(visit, {
        referralCode, hits: 1, createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000),
      });
      tx.update(influencer, {
        clicks: FieldValue.increment(1), totalClicks: totalClicks + 1, updatedAt: FieldValue.serverTimestamp(),
      });
      return { tracked: true, unique: true };
    });
  };
}
