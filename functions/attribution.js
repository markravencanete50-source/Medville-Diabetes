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
