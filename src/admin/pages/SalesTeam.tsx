import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, RefreshCw, UserCheck } from "lucide-react";
import {
  adminApi,
  AdminApiError,
  isAdminApiConfigured,
  memberName,
  type SalesMember,
  type SalesPersonFigures,
  type SalesTeamSummary,
  type StaffAlert,
} from "../api";
import { useAdminAuth } from "../auth";
import { StatTile } from "../charts";
import { Badge, Banner, Card, Empty, PageHeader, Spinner, formatDateTime, useToast } from "../ui";

/*
  The sales team overview, for the sales manager and the owner.

  Two sources meet here and neither sees the other's data. The identity
  service supplies the team: names, email addresses and sign-in times, which
  are workforce details. The AWS lead service supplies counts per salesperson,
  read without a single patient name or phone number. Opening this screen is
  still written to the access log, because the counts describe patient
  records.
*/

const EMPTY: SalesPersonFigures = {
  assigned: 0, open: 0, new: 0, callbacksDue: 0, calledToday: 0, calls: 0,
  qualified: 0, notQualified: 0, closed: 0, oldestNewAt: null, lastDialAt: null,
};

/* "3 hours" rather than a timestamp: the question is how long a patient has
   been waiting for a first call. */
function waitingFor(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

export default function SalesTeam() {
  const { getToken, session } = useAdminAuth();
  const toast = useToast();
  const [members, setMembers] = useState<SalesMember[] | null>(null);
  const [summary, setSummary] = useState<SalesTeamSummary | null>(null);
  const [alerts, setAlerts] = useState<Map<string, StaffAlert>>(() => new Map());
  const [alertBusy, setAlertBusy] = useState("");
  const [error, setError] = useState("");
  const connected = isAdminApiConfigured();
  const myUid = session!.user.uid;

  const refresh = useCallback(async () => {
    setError("");
    setSummary(null);
    try {
      const [team, figures, alertList] = await Promise.all([
        adminApi.salesTeam(getToken),
        adminApi.salesTeamSummary(getToken),
        adminApi.listAlerts(getToken).catch(() => ({ alerts: [] as StaffAlert[] })),
      ]);
      setMembers(team.members);
      setSummary(figures);
      setAlerts(new Map(alertList.alerts.map((item) => [item.uid, item])));
    } catch (problem) {
      setMembers([]);
      setSummary({ people: {}, unassigned: { open: 0, new: 0, oldestNewAt: null }, total: 0 });
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken]);

  useEffect(() => {
    if (connected) void refresh();
  }, [connected, refresh]);

  const header = (
    <PageHeader
      title="Sales team"
      lede="How each salesperson is doing with the enquiries assigned to them."
      actions={
        <>
          <button type="button" className="admin-btn admin-btn-quiet" disabled={!connected} onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => { window.location.hash = "leads"; }}>
            <UserCheck size={16} /> Assign enquiries
          </button>
        </>
      }
    />
  );

  const toggleAlerts = async (uid: string, enabled: boolean) => {
    setAlertBusy(uid);
    try {
      await adminApi.setAlerts(getToken, uid, enabled);
      setAlerts((current) => new Map(current).set(uid, { uid, enabled, lastStatus: current.get(uid)?.lastStatus ?? "", lastSentAt: current.get(uid)?.lastSentAt ?? null }));
      toast(enabled ? "Email alerts are on. Counting starts now." : "Email alerts are off.");
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The alert setting did not save.", "danger");
    } finally {
      setAlertBusy("");
    }
  };

  if (!connected) {
    return <>{header}<Card><Empty>Figures will appear here once the enquiry service is connected.</Empty></Card></>;
  }
  if (!summary || !members) {
    return <>{header}<Card><Spinner label="Counting the team's enquiries" /></Card></>;
  }

  /* Everyone on the team appears, including a salesperson with no leads yet.
     Leads still held by an account that has since left the team are shown
     too, so nothing assigned can drop out of sight. */
  const known = new Set(members.map((member) => member.uid));
  const rows = [
    ...members.map((member) => ({ uid: member.uid, member, figures: summary.people[member.uid] ?? EMPTY })),
    ...Object.entries(summary.people)
      .filter(([uid]) => !known.has(uid))
      .map(([uid, figures]) => ({ uid, member: undefined, figures })),
  ].sort((a, b) => b.figures.open - a.figures.open);

  const totals = rows.reduce((sum, row) => ({
    open: sum.open + row.figures.open,
    calledToday: sum.calledToday + row.figures.calledToday,
    qualified: sum.qualified + row.figures.qualified,
  }), { open: 0, calledToday: 0, qualified: 0 });

  return (
    <>
      {header}
      {error && <div className="mb-4"><Banner tone="warn">{error}</Banner></div>}

      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatTile
          label="Waiting for a salesperson"
          value={summary.unassigned.new}
          hint={summary.unassigned.oldestNewAt ? `Oldest has waited ${waitingFor(summary.unassigned.oldestNewAt)}` : "None waiting"}
        />
        <StatTile label="Open with the team" value={totals.open} hint="Assigned and not finished" />
        <StatTile label="Called today" value={totals.calledToday} hint="Enquiries, Pacific time" />
        <StatTile label="Qualified" value={totals.qualified} hint="All time" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-[260px]">
            <p className="admin-label">Your email alerts</p>
            <p className="admin-help" style={{ marginTop: 2 }}>
              An email when new enquiries are waiting to be assigned, when enquiries are assigned to
              you, and when your callbacks are due. Alerts give counts only. They never include a
              patient&apos;s name, number or answers.
            </p>
            <AlertState alert={alerts.get(myUid)} />
          </div>
          <AlertToggle enabled={alerts.get(myUid)?.enabled === true} busy={alertBusy === myUid} onToggle={(next) => void toggleAlerts(myUid, next)} />
        </div>
      </Card>

      {summary.unassigned.new > 0 && (
        <div className="mb-4">
          <Banner tone="warn">
            {summary.unassigned.new} new {summary.unassigned.new === 1 ? "enquiry has" : "enquiries have"} not been
            assigned. Open Enquiries and choose Not assigned yet to give them to the team.
          </Banner>
        </div>
      )}

      <Card pad={false}>
        {!rows.length ? (
          <Empty>
            Nobody has the Sales role yet. An Owner can give it to each salesperson on the
            Administrators screen.
          </Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Salesperson</th>
                  <th scope="col">Email alerts</th>
                  <th scope="col">Open</th>
                  <th scope="col">Not called yet</th>
                  <th scope="col">Callbacks due</th>
                  <th scope="col">Called today</th>
                  <th scope="col">Calls made</th>
                  <th scope="col">Qualified</th>
                  <th scope="col">Not qualified</th>
                  <th scope="col">Closed</th>
                  <th scope="col">Last call</th>
                  <th scope="col">Last signed in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ uid, member, figures }) => (
                  <tr key={uid}>
                    <td data-label="Salesperson">
                      <span className="font-semibold">{memberName(member)}</span>
                      {member?.role === "manager" && <span className="ml-2"><Badge tone="new">Manager</Badge></span>}
                      {member?.disabled && <span className="ml-2"><Badge tone="danger">Disabled</Badge></span>}
                      {!member && <span className="ml-2"><Badge tone="warn">Reassign these</Badge></span>}
                      {member?.name && member.email && (
                        <span className="block text-[12px]" style={{ color: "var(--a-text-muted)" }}>{member.email}</span>
                      )}
                    </td>
                    <td data-label="Email alerts">
                      {member && !member.disabled ? (
                        <>
                          <AlertToggle
                            enabled={alerts.get(uid)?.enabled === true}
                            busy={alertBusy === uid}
                            label={memberName(member)}
                            onToggle={(next) => void toggleAlerts(uid, next)}
                          />
                          <AlertState alert={alerts.get(uid)} />
                        </>
                      ) : ""}
                    </td>
                    <td data-label="Open">{figures.open}</td>
                    <td data-label="Not called yet">
                      {figures.new}
                      {figures.oldestNewAt && (
                        <span className="block text-[12px]" style={{ color: "var(--a-text-muted)" }}>
                          Oldest waiting {waitingFor(figures.oldestNewAt)}
                        </span>
                      )}
                    </td>
                    <td data-label="Callbacks due">
                      {figures.callbacksDue > 0 ? <Badge tone="warn">{figures.callbacksDue} due</Badge> : 0}
                    </td>
                    <td data-label="Called today">{figures.calledToday}</td>
                    <td data-label="Calls made">{figures.calls}</td>
                    <td data-label="Qualified">{figures.qualified}</td>
                    <td data-label="Not qualified">{figures.notQualified}</td>
                    <td data-label="Closed">{figures.closed}</td>
                    <td data-label="Last call" style={{ color: "var(--a-text-muted)" }}>
                      {figures.lastDialAt ? formatDateTime(figures.lastDialAt) : "No calls yet"}
                    </td>
                    <td data-label="Last signed in" style={{ color: "var(--a-text-muted)" }}>
                      {member?.lastSignIn ? formatDateTime(member.lastSignIn) : member ? <Badge tone="warn">Not signed in yet</Badge> : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="admin-help mt-3">
        A call is counted when the salesperson presses Call. Opening this screen is recorded in the
        access log. Alerts are checked every two minutes and go to the email address on each
        person&apos;s dashboard account.
      </p>
    </>
  );
}

function AlertToggle({ enabled, busy, label, onToggle }: { enabled: boolean; busy: boolean; label?: string; onToggle: (next: boolean) => void }) {
  return (
    <button
      type="button"
      className={`admin-btn admin-btn-sm ${enabled ? "admin-btn-quiet" : "admin-btn-primary"}`}
      disabled={busy}
      aria-label={label ? `${enabled ? "Turn off" : "Turn on"} email alerts for ${label}` : undefined}
      onClick={() => onToggle(!enabled)}
    >
      {enabled ? <BellOff size={14} aria-hidden="true" /> : <BellRing size={14} aria-hidden="true" />}
      {busy ? "Saving" : enabled ? "Turn off" : "Turn on"}
    </button>
  );
}

function AlertState({ alert }: { alert: StaffAlert | undefined }) {
  if (!alert?.enabled) return <span className="mt-1 block text-[12px]" style={{ color: "var(--a-text-muted)" }}>Off</span>;
  if (alert.lastStatus === "failed") {
    return <span className="mt-1 block"><Badge tone="danger">On, last email failed</Badge></span>;
  }
  return (
    <span className="mt-1 block text-[12px]" style={{ color: "var(--a-text-muted)" }}>
      On{alert.lastSentAt ? `, last sent ${formatDateTime(alert.lastSentAt)}` : ", nothing sent yet"}
    </span>
  );
}
