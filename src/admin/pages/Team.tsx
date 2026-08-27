import { useCallback, useEffect, useState } from "react";
import { adminApi, AdminApiError, type AdminUser } from "../api";
import { useAdminAuth } from "../auth";
import { Badge, Banner, Card, Empty, Field, PageHeader, Spinner, formatDateTime, useToast } from "../ui";

/*
  Administrators.

  Section 3.4(b) of the agreement requires individual logins with role-based
  access rather than one shared account. This is the screen that keeps that
  true over time, and the roles it grants are the same ones the server checks.

  Accounts are created in the Google Cloud console rather than here. That is
  deliberate: creating a user is the one action that would let this dashboard
  mint access to patient information, and it belongs with the person who holds
  the Google account, behind their own two-factor login.

  Changing a role revokes that person's current session, so a removal takes
  effect on their next request rather than whenever their token happens to
  expire.
*/

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
        <Banner tone="info">
          To add someone, create their account in Identity Platform in the Google Cloud console,
          then give them a role here. Never share a login: the access log records actions against
          the person who signed in.
        </Banner>
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
                        {formatDateTime(user.lastSignIn)}
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
