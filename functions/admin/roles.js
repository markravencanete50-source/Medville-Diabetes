export const ADMIN_ROLES = ["owner", "marketing", "sales"];

export function normalizeRole(role) {
  if (role === "owner") return "owner";
  if (role === "marketing" || role === "editor") return "marketing";
  if (role === "sales" || role === "agent") return "sales";
  return null;
}

/* Marketing may manage day-to-day staff accounts, but it cannot use that
   ability to grant itself Owner access or to remove an existing Owner. */
export function roleChangeError({ actorRole, targetRole = null, nextRole, isSelf = false }) {
  if (!ADMIN_ROLES.includes(nextRole) && nextRole !== "none") return "That role is not allowed.";
  if (isSelf && nextRole !== actorRole) return "You cannot change your own access.";
  if (actorRole === "marketing" && (targetRole === "owner" || nextRole === "owner")) {
    return "Only an Owner can change Owner access.";
  }
  return "";
}
