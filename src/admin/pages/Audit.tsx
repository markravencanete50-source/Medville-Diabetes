import { useCallback, useEffect, useState } from "react";
import { adminApi, AdminApiError, type AuditEntry } from "../api";
import { useAdminAuth } from "../auth";
import { Badge, Banner, Card, Empty, PageHeader, Spinner, formatDateTime } from "../ui";

/*
  The access log.

  Section 3.4(c) of the agreement promises an audit log recording who accessed
  or modified patient records and when, and Section 3.6 promises a written
  record at handover. This screen is where the client reads it.

  The entries deliberately hold no patient details. They say who did what, to
  which record, at what time. An audit log that repeated the data would double
  the number of places that data exists.
*/

const ACTION_LABEL: Record<string, string> = {
  "leads.list": "Opened the enquiry list",
  "leads.read": "Opened one enquiry",
  "leads.update": "Changed an enquiry",
  "leads.stats": "Viewed the overview figures",
  "admins.setRole": "Changed someone's access",
  "access.denied": "Was refused access",
};

export default function Audit() {
  const { getToken } = useAdminAuth();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const result = await adminApi.listAudit(getToken);
      setEntries(result.entries);
    } catch (problem) {
      setEntries([]);
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <PageHeader
        title="Access log"
        lede="Every time someone opened or changed patient information, and who they were."
      />

      <div className="mb-4">
        <Banner tone="info">
          This log holds no patient details of its own. It records who did what and when, which is
          what a compliance reviewer asks for.
        </Banner>
      </div>

      {error && (
        <div className="mb-4">
          <Banner tone="warn">{error}</Banner>
        </div>
      )}

      <Card pad={false}>
        {entries === null ? (
          <Spinner label="Loading the access log" />
        ) : !entries.length ? (
          <Empty>Nothing has been recorded yet.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">What</th>
                  <th scope="col">Record</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ color: "var(--a-text-muted)" }}>{formatDateTime(entry.at)}</td>
                    <td>
                      <span className="font-medium">{entry.actorEmail || "Unknown"}</span>
                      <span className="ml-2">
                        <Badge tone="quiet">{entry.actorRole}</Badge>
                      </span>
                    </td>
                    <td>
                      {entry.action === "access.denied" ? (
                        <Badge tone="danger">{ACTION_LABEL[entry.action]}</Badge>
                      ) : (
                        ACTION_LABEL[entry.action] ?? entry.action
                      )}
                    </td>
                    <td style={{ color: "var(--a-text-muted)" }}>
                      {entry.leadId
                        ? `Enquiry ${entry.leadId.slice(0, 8)}`
                        : entry.count !== null
                          ? `${entry.count} records`
                          : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
