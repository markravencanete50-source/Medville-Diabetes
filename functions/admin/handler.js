// All routes go through this boundary, including malformed and denied requests.
export function createAdminHandler({ authenticate, audit, routes, origins }) {
  return async (req, res) => {
    res.set("Cache-Control", "no-store"); res.set("Pragma", "no-cache");
    res.set("X-Content-Type-Options", "nosniff"); res.set("Vary", "Origin");
    const send = (code, body) => body === undefined ? res.status(code).send("") : res.status(code).json(body);
    const origin = (req.get("Origin") || "").replace(/\/$/, "");
    if (origin && !origins.includes(origin)) return send(403, { error: "Request not allowed." });
    if (origin) res.set("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return send(204);
    }
    if (req.method !== "POST") return send(405, { error: "Method not allowed." });
    if (!(req.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return send(415, { error: "JSON required." });
    if (Number(req.get("Content-Length")) > 65536 || (req.rawBody?.length || 0) > 65536) return send(413, { error: "Request too large." });
    try {
      const actor = await authenticate(req);
      if (!actor) return send(401, { error: "Please sign in again." });
      const body = req.body ?? {};
      const route = typeof body.action === "string" && Object.hasOwn(routes, body.action) ? routes[body.action] : null;
      if (!route) return send(400, { error: "Unknown request." });
      if (!route.roles.includes(actor.role)) {
        await audit(actor, "access.denied", { attempted: body.action });
        return send(403, { error: "You do not have access to that." });
      }
      if (route.feature && actor.role !== "owner" && !actor.features.includes(route.feature)) {
        await audit(actor, "access.denied", { attempted: body.action, feature: route.feature });
        return send(403, { error: "You do not have access to that." });
      }
      const result = await route.run(actor, body);
      return send(result.error ? 400 : 200, result);
    } catch {
      return send(500, { error: "That did not work. Please try again." });
    }
  };
}
