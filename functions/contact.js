const STATES = new Set("Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming".split("|"));

const singleLine = (value, max) => typeof value === "string"
  && value.trim().length > 0
  && value.trim().length <= max
  && !/[\u0000-\u001f\u007f]/.test(value);

const messageText = (value) => typeof value === "string"
  && value.trim().length >= 10
  && value.trim().length <= 1200
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);

export function validateContactSubmission(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (!singleLine(body.firstName, 80) || !singleLine(body.lastName, 80)
    || !singleLine(body.city, 80) || !singleLine(body.email, 160)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    || !singleLine(body.phone, 25) || !/^[0-9+() .-]+$/.test(body.phone)
    || body.phone.replace(/\D/g, "").length < 7
    || !STATES.has(body.state) || !messageText(body.message)
    || body.privacyAccepted !== true
    || typeof body.submissionId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionId)
    || (body.website !== undefined && body.website !== "")) return null;
  return {
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    city: body.city.trim(),
    state: body.state,
    message: body.message.trim(),
    privacyAccepted: true,
    submissionId: body.submissionId,
  };
}

export function createContactHandler({ enabled, origins, save, notify }) {
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
    if (!available) return res.status(503).json({ error: "The contact form is not available yet." });
    if (!(req.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
      return res.status(415).json({ error: "JSON required." });
    }
    if (Number(req.get("Content-Length")) > 8192 || (req.rawBody?.length || 0) > 8192) {
      return res.status(413).json({ error: "Request too large." });
    }
    const data = validateContactSubmission(req.body);
    if (!data) return res.status(400).json({ error: "Please check the form fields." });
    try {
      const result = await save(data, req.ip || "unknown");
      if (result.limited) {
        res.set("Retry-After", "3600");
        return res.status(429).json({ error: "Please try again later or call our team." });
      }
      try { await notify(data.submissionId); } catch { /* retry from the dashboard */ }
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(503).json({ error: "The message could not be saved. Please try again." });
    }
  };
}
