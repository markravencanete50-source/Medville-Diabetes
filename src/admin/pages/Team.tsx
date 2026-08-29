import { useCallback, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail, Send } from "lucide-react";
import { adminApi, AdminApiError, type AdminUser } from "../api";
import { adminAuth, useAdminAuth } from "../auth";
import { Badge, Banner, Card, Empty, Field, PageHeader, Spinner, formatDateTime, useToast } from "../ui";

/*
  Administrators.

  Section 3.4(b) of the agreement requires individual logins with role-based
  access rather than one shared account. This is the screen that keeps that
  true over time, and the roles it grants are the same ones the server checks.

  An owner invites somebody by email. The function creates the account and
  gives it a role but sets no password, so the invitation is not a credential:
  the person can only get in by following the link emailed to them and
  choosing their own password. An intercepted invitation grants nothing.

  The email is sent by Identity Platform itself rather than through a mail
  service. That keeps the stack inside the products covered by the BAA, adds
  no monthly cost, and means there is no third party holding a list of who can
  reach patient records. The wording of the email is edited in the Google
  Cloud console under Identity Platform, Templates.

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
  editor: "The website only. Cannot open enquiries or patient details.",
  agent: "Enquiries only. Cannot change the website.",
  none: "Signed out of everything. The account stays but has no access.",
};

export default function Team() {
  const { getToken, session } = useAdminAuth();
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);

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
      const result = await adminApi.inviteAdmin(getToken, email, inviteRole);
      try {
        await sendPasswordResetEmail(adminAuth(), email);
        toast(
          result.created
            ? "Invitation sent. They will receive an email to choose a password."
            : "That account already existed. Its access was updated and an email was sent.",
        );
      } catch {
        toast(
          "The account was created but the email did not send. Use Resend invitation.",
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
      await sendPasswordResetEmail(adminAuth(), user.email);
      toast("Email sent. The link lets them set a new password.");
    } catch {
      toast("The email did not send.", "danger");
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

  const setRole = async (user: AdminUser, role: string) => {
    setBusyUid(user.uid);
    try {
      await adminApi.setAdminRole(getToken, user.uid, role);
      toast("Access updated. They will be signed out of their current session.");
      await refresh();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "That did not work.", "danger");
    } finally {
      setBusyUid("");
    }
  };

  return (
    <>
      <PageHeader
        title="Administrators"
        lede="Who can sign in to this dashboard and what each person is allowed to open."
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
            <div className="min-w-[240px] flex-1">
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
            <div className="min-w-[190px]">
              <Field label="Access" htmlFor="invite-role">
                <select
                  id="invite-role"
                  className="admin-select"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                >
                  <option value="editor">Website editor</option>
                  <option value="agent">Enquiries</option>
                  <option value="owner">Owner</option>
                </select>
              </Field>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={inviting}
              onClick={() => void invite()}
            >
              <Send size={15} /> {inviting ? "Sending" : "Send invitation"}
            </button>
          </div>
          <p className="admin-help" style={{ marginTop: 10 }}>
            {ROLE_NOTE[inviteRole]}
          </p>
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
                  <th scope="col">Access</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((user) => {
                  const isYou = user.uid === session?.user.uid;
                  return (
                    <tr key={user.uid}>
                      <td>
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
                      <td style={{ color: "var(--a-text-muted)" }}>
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
                              <Mail size={14} /> Resend
                            </button>
                          </span>
                        )}
                      </td>
                      <td style={{ minWidth: 230 }}>
                        <Field label="" htmlFor={`role-${user.uid}`}>
                          <select
                            id={`role-${user.uid}`}
                            className="admin-select"
                            value={user.role}
                            disabled={busyUid === user.uid || isYou}
                            onChange={(event) => void setRole(user, event.target.value)}
                          >
                            <option value="owner">Owner</option>
                            <option value="editor">Website editor</option>
                            <option value="agent">Enquiries</option>
                            <option value="none">No access</option>
                          </select>
                        </Field>
                        <p className="admin-help">
                          {isYou
                            ? "You cannot change your own access."
                            : ROLE_NOTE[user.role] ?? ""}
                        </p>
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
