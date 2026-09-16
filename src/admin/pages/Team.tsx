import { useCallback, useEffect, useState } from "react";
import { Mail, Send, ShieldOff, Trash2 } from "lucide-react";
import { adminApi, AdminApiError, type AdminUser } from "../api";
import { ADMIN_FEATURES, ROLE_ACCESS, useAdminAuth, type AdminFeature, type AdminRole } from "../auth";
import { Badge, Banner, Card, Empty, Field, PageHeader, Spinner, formatDateTime, useToast } from "../ui";

/*
  Administrators.

  Section 3.4(b) of the agreement requires individual logins with role-based
  access rather than one shared account. This is the screen that keeps that
  true over time, and the roles it grants are the same ones the server checks.

  An owner or marketing administrator invites somebody by email. The function creates the account and
  gives it a role but sets no password, so the invitation is not a credential:
  the person can only get in by following the link emailed to them and
  choosing their own password. The one-time email link is a credential and is
  sent only to that person's individual mailbox.

  The server creates the Identity Platform password link, then sends a branded
  message from the verified Medville domain. The browser never receives the
  reset link or the mail service key.

  Changing a role revokes that person's current session, so a removal takes
  effect on their next request rather than whenever their token happens to
  expire.
*/

/*
  Kept in step with SHARED_MAILBOXES in functions/admin/index.js. The list is
  duplicated rather than shared because the function is deployed on its own and
  has no import path into this bundle; the server copy is the one that decides,
  and this one only saves a round trip.
*/
const SHARED_MAILBOXES = new Set([
  "accounts", "admin", "administrator", "billing", "contact", "enquiries",
  "hello", "help", "info", "inquiries", "mail", "marketing", "no-reply",
  "noreply", "office", "orders", "sales", "staff", "support", "team",
]);

function isSharedMailbox(email: string) {
  return SHARED_MAILBOXES.has(email.split("@")[0]);
}

const SHARED_MAILBOX_REFUSAL =
  "That is a shared mailbox. Every administrator needs their own address, because the access log records who opened a patient record and a shared login cannot answer that.";

const ROLE_NOTE: Record<string, string> = {
  owner: "Everything, including these settings and the access log.",
  marketing: "Everything except the access log. Cannot grant or change Owner access.",
  sales: "Products and enquiries only.",
  none: "Signed out of everything. The account stays but has no access.",
};

const FEATURE_LABEL: Record<AdminFeature, string> = {
  overview: "Overview",
  leads: "Enquiries",
  influencers: "Influencers",
  products: "Products",
  content: "Edit pages",
  blog: "Blog",
  appearance: "Colours",
  faqs: "Questions",
  testimonials: "Reviews",
  team: "Administrators",
  audit: "Access log",
};

function defaultFeatures(role: string): AdminFeature[] {
  return role === "owner"
    ? [...ADMIN_FEATURES]
    : role === "marketing" || role === "sales"
      ? [...ROLE_ACCESS[role as AdminRole]] as AdminFeature[]
      : [];
}

export default function Team() {
  const { getToken, session } = useAdminAuth();
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("marketing");
  const [inviteFeatures, setInviteFeatures] = useState<AdminFeature[]>(() => defaultFeatures("marketing"));
  const [inviting, setInviting] = useState(false);
  const isOwner = session?.role === "owner";

  /*
    Two steps, and the order matters. The account has to exist before Identity
    Platform will email it, so the function runs first and the email second.
    If the email fails, the account and its role are still correct and the
    owner can use Resend rather than starting again.
  */
  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return toast("Please enter an email address.", "danger");
    /* The server refuses this too, and the server is what decides. Saying so
       here means the owner finds out while they are still typing rather than
       after a round trip. */
    if (isSharedMailbox(email)) return toast(SHARED_MAILBOX_REFUSAL, "danger");

    setInviting(true);
    try {
      const result = await adminApi.inviteAdmin(getToken, email, inviteRole, inviteFeatures);
      if (result.emailSent) {
        toast(
          result.created
            ? "Invitation sent. They will receive an email to choose a password."
            : "That account already existed. Its access was updated and an email was sent.",
        );
      } else {
        toast(
          "The account access was saved, but the email did not send. Use Send again in the list below.",
          "danger",
        );
      }
      setInviteEmail("");
      await refresh();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That did not work.", "danger");
    } finally {
      setInviting(false);
    }
  };

  const resend = async (user: AdminUser) => {
    if (!user.email) return;
    setBusyUid(user.uid);
    try {
      await adminApi.sendPasswordEmail(getToken, user.uid);
      toast("Email sent. The link lets them set a new password.");
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The email did not send.", "danger");
    } finally {
      setBusyUid("");
    }
  };

  const refresh = useCallback(async () => {
    setError("");
    try {
      const result = await adminApi.listAdmins(getToken);
      setAdmins(result.admins);
    } catch (problem) {
      setAdmins([]);
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setRole = async (user: AdminUser, role: string, features = role === user.role ? user.features : defaultFeatures(role)) => {
    setBusyUid(user.uid);
    try {
      await adminApi.setAdminRole(getToken, user.uid, role, features);
      toast("Access updated. They will be signed out of their current session.");
      await refresh();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That did not work.", "danger");
    } finally {
      setBusyUid("");
    }
  };

  const toggleFeature = async (user: AdminUser, feature: AdminFeature) => {
    const current = user.features.filter((item): item is AdminFeature => ADMIN_FEATURES.includes(item as AdminFeature));
    const next = current.includes(feature)
      ? current.filter((item) => item !== feature)
      : [...current, feature];
    await setRole(user, user.role, next);
  };

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm("Remove this administrator account? This deletes the login and cannot be undone.")) return;
    setBusyUid(user.uid);
    try {
      await adminApi.deleteAdmin(getToken, user.uid);
      toast("Administrator account removed. The login no longer exists.");
      await refresh();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That account could not be removed.", "danger");
    } finally {
      setBusyUid("");
    }
  };

  return (
    <>
      <PageHeader
        title="Administrators"
        lede="Invite individual users, choose each feature they can open, revoke access, or remove an account."
      />

      <div className="mb-4">
        <Card>
          <p className="admin-label">Invite an administrator</p>
          <p className="admin-help" style={{ marginTop: 2 }}>
            They receive an email, choose their own password, and can then sign in here. Give
            each person the narrowest role that lets them do their job. A shared mailbox such
            as sales@ or info@ is refused: the access log records every action against whoever
            signed in, and a shared login cannot say who that was.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2.5">
            <div className="w-full sm:min-w-[240px] sm:flex-1">
              <Field label="Email address" htmlFor="invite-email">
                <input
                  id="invite-email"
                  type="email"
                  className="admin-input"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="name@medvillediabetes.com"
                />
              </Field>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[190px]">
              <Field label="Access" htmlFor="invite-role">
                <select
                  id="invite-role"
                  className="admin-select"
                  value={inviteRole}
                  onChange={(event) => {
                    const role = event.target.value;
                    setInviteRole(role);
                    setInviteFeatures(defaultFeatures(role));
                  }}
                >
                  <option value="sales">Sales</option>
                  <option value="marketing">Marketing</option>
                  {isOwner && <option value="owner">Owner</option>}
                </select>
              </Field>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary w-full sm:w-auto"
              disabled={inviting}
              onClick={() => void invite()}
            >
              <Send size={15} /> {inviting ? "Sending" : "Send invitation"}
            </button>
          </div>
          <p className="admin-help" style={{ marginTop: 10 }}>
            {ROLE_NOTE[inviteRole]}
          </p>
          {isOwner && inviteRole !== "owner" && (
            <FeaturePicker
              className="mt-4"
              selected={inviteFeatures}
              onToggle={(feature) => setInviteFeatures((current) => current.includes(feature)
                ? current.filter((item) => item !== feature)
                : [...current, feature])}
            />
          )}
        </Card>
      </div>

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <Card pad={false}>
        {admins === null ? (
          <Spinner label="Loading administrators" />
        ) : !admins.length ? (
          <Empty>No administrators have been given a role yet.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Last signed in</th>
                  <th scope="col">Access and features</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((user) => {
                  const isYou = user.uid === session?.user.uid;
                  const isProtectedOwner = !isOwner && user.role === "owner";
                  return (
                    <tr key={user.uid}>
                      <td data-label="Person">
                        <span className="font-semibold">{user.email || "No email"}</span>
                        {isYou && (
                          <span className="ml-2">
                            <Badge tone="new">You</Badge>
                          </span>
                        )}
                        {user.disabled && (
                          <span className="ml-2">
                            <Badge tone="danger">Disabled</Badge>
                          </span>
                        )}
                      </td>
                      <td data-label="Last signed in" style={{ color: "var(--a-text-muted)" }}>
                        {user.lastSignIn ? (
                          formatDateTime(user.lastSignIn)
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Badge tone="warn">Not signed in yet</Badge>
                            <button
                              type="button"
                              className="admin-btn admin-btn-quiet"
                              disabled={busyUid === user.uid || !user.email}
                              onClick={() => void resend(user)}
                            >
                              <Mail size={14} /> Send again
                            </button>
                          </span>
                        )}
                      </td>
                      <td data-label="Access and features" className="sm:min-w-[320px]">
                        <Field label="" htmlFor={`role-${user.uid}`}>
                          <select
                            id={`role-${user.uid}`}
                            className="admin-select"
                            value={user.role}
                            disabled={busyUid === user.uid || isYou || isProtectedOwner}
                            onChange={(event) => void setRole(user, event.target.value)}
                          >
                            {(isOwner || user.role === "owner") && <option value="owner">Owner</option>}
                            <option value="marketing">Marketing</option>
                            <option value="sales">Sales</option>
                            <option value="none">No access</option>
                          </select>
                        </Field>
                        <p className="admin-help">
                          {isYou
                            ? "You cannot change your own access."
                            : isProtectedOwner
                              ? "Only an Owner can change Owner access."
                              : ROLE_NOTE[user.role] ?? ""}
                        </p>
                        {!isYou && user.role !== "owner" && user.role !== "none" && (
                          <FeaturePicker
                            className="mt-3"
                            selected={user.features as AdminFeature[]}
                            disabled={busyUid === user.uid}
                            onToggle={(feature) => void toggleFeature(user, feature)}
                          />
                        )}
                        {!isYou && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {user.role !== "none" && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-quiet"
                                disabled={busyUid === user.uid || isProtectedOwner}
                                onClick={() => void setRole(user, "none", [])}
                              >
                                <ShieldOff size={14} /> Revoke access
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              disabled={busyUid === user.uid || isProtectedOwner}
                              onClick={() => void removeUser(user)}
                            >
                              <Trash2 size={14} /> Remove user
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function FeaturePicker({
  selected,
  onToggle,
  disabled = false,
  className = "",
}: {
  selected: AdminFeature[];
  onToggle: (feature: AdminFeature) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <fieldset className={className} disabled={disabled}>
      <legend className="admin-label">Feature access</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_FEATURES.filter((feature) => feature !== "audit" && feature !== "team").map((feature) => (
          <label key={feature} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[var(--a-line)] bg-[var(--a-surface-2)] px-3 py-2 text-[12px] font-semibold">
            <input
              type="checkbox"
              checked={selected.includes(feature)}
              onChange={() => onToggle(feature)}
              className="h-4 w-4 flex-none accent-[var(--a-brand)]"
            />
            {FEATURE_LABEL[feature]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
