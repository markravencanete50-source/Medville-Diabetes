// Injectable HTTP boundary, tested without sending or storing real patient data.
const STATES = new Set("Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming".split("|"));
const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max && !/[\u0000-\u001f\u007f]/.test(v);
export function validateSubmission(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return null;
  if (!text(b.firstName, 80) || !text(b.lastName, 80) || !text(b.city, 80)
    || !text(b.email, 160) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())
    || !text(b.phone, 25) || !/^[0-9+() .-]+$/.test(b.phone) || b.phone.replace(/\D/g, "").length < 7
    || !STATES.has(b.state) || !["yes", "no"].includes(b.injectsInsulinDaily)
    || typeof b.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.submissionId)
    || (b.productInterest !== undefined && (typeof b.productInterest !== "string" || !/^[a-z0-9-]{0,60}$/.test(b.productInterest)))
    || (b.website !== undefined && b.website !== "")) return null;
  return {
    firstName: b.firstName.trim(), lastName: b.lastName.trim(), email: b.email.trim().toLowerCase(),
    phone: b.phone.trim(), city: b.city.trim(), state: b.state,
    injectsInsulinDaily: b.injectsInsulinDaily, productInterest: b.productInterest || "", submissionId: b.submissionId,
  };
}

export function createIntakeHandler({ enabled, origins, resolveProduct, save, notify }) {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Vary", "Origin");
    const origin = req.get("Origin") || "";
    if (!origins.includes(origin)) return res.status(403).json({ error: "Request not allowed." });
    res.set("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "3600");
      return res.status(204).send("");
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    if (!enabled) return res.status(503).json({ error: "Online submissions are not open yet." });
    if (!(req.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return res.status(415).json({ error: "JSON required." });
    if (Number(req.get("Content-Length")) > 8192 || (req.rawBody?.length || 0) > 8192) return res.status(413).json({ error: "Request too large." });
    const data = validateSubmission(req.body);
    if (!data) return res.status(400).json({ error: "Please check the form fields." });
    try {
      const product = await resolveProduct(data.productInterest);
      if (!product) return res.status(400).json({ error: "Please choose an available product." });
      const result = await save({ ...data, productName: product.name }, req.ip || "unknown");
      if (result.limited) {
        res.set("Retry-After", "3600");
        return res.status(429).json({ error: "Please try again later or call our team." });
      }
      try { await notify(data.submissionId); } catch { /* recover from the dashboard */ }
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(503).json({ error: "The submission could not be saved. Please try again." });
    }
  };
}
