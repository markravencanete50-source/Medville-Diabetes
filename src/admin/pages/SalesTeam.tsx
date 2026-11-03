import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellOff, BellRing, RefreshCw, Repeat, Shuffle, UserCheck, UserMinus } from "lucide-react";
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
import { Badge, Banner, Card, Drawer, Empty, PageHeader, Spinner, formatDateTime, useToast } from "../ui";

/*
  The sales team overview, for the sales manager and the owner.

  Two sources meet here and neither sees the other's data. The identity
  service supplies the team: names, email addresses and sign-in times, which
  are workforce details. The AWS lead service supplies counts per salesperson,
  read without a single patient name or phone number. Opening this screen is
  still written to the access log, because the counts describe patient
  records.

  Each person is one card, sorted so whoever needs the manager's attention
  comes first: callbacks due, calls with no outcome recorded, and patients
  not called yet. A call counts only once its outcome is recorded.
*/

const EMPTY: SalesPersonFigures = {
  assigned: 0, open: 0, new: 0, callbacksDue: 0, calledToday: 0, calls: 0, notLogged: 0,
  qualified: 0, notQualified: 0, closed: 0, oldestNewAt: null, lastDialAt: null,
};

type SortKey = "attention" | "open" | "today" | "name";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "attention", label: "Needs attention first" },
  { key: "open", label: "Most open enquiries" },
  { key: "today", label: "Most calls today" },
  { key: "name", label: "Name" },
];

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

const attention = (f: SalesPersonFigures) => f.callbacksDue * 3 + f.notLogged * 2 + f.new;

function initials(member: SalesMember | undefined) {
  const name = memberName(member);
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/* Qualified out of every finished enquiry. Nothing finished yet shows a dash. */
function qualifiedRate(f: SalesPersonFigures) {
  const finished = f.qualified + f.notQualified + f.closed;
  return finished ? Math.round((f.qualified / finished) * 100) : null;
}

export default function SalesTeam() {
  const { getToken, session } = useAdminAuth();
  const toast = useToast();
  const [members, setMembers] = useState<SalesMember[] | null>(null);
  const [summary, setSummary] = useState<SalesTeamSummary | null>(null);
  const [alerts, setAlerts] = useState<Map<string, StaffAlert>>(() => new Map());
  const [alertBusy, setAlertBusy] = useState("");
  const [rota, setRota] = useState<Set<string>>(() => new Set());
  const [rotaBusy, setRotaBusy] = useState("");
  const [sort, setSort] = useState<SortKey>("attention");
  const [shuffleOpen, setShuffleOpen] = useState(false);
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
        adminApi.listAlerts(getToken).catch(() => ({ alerts: [] as StaffAlert[], autoAssign: [] as string[] })),
      ]);
      setMembers(team.members);
      setSummary(figures);
      setAlerts(new Map(alertList.alerts.map((item) => [item.uid, item])));
      setRota(new Set(alertList.autoAssign ?? []));
    } catch (problem) {
      setMembers([]);
      setSummary({ people: {}, unassigned: { open: 0, new: 0, oldestNewAt: null }, total: 0 });
      setError(problem instanceof AdminApiError ? problem.message : "That did not work.");
    }
  }, [getToken]);

  useEffect(() => {
    if (connected) void refresh();
  }, [connected, refresh]);

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

  const toggleRota = async (uid: string, enabled: boolean) => {
    setRotaBusy(uid);
    try {
      await adminApi.setAutoAssign(getToken, uid, enabled);
      setRota((current) => {
        const next = new Set(current);
        if (enabled) next.add(uid); else next.delete(uid);
        return next;
      });
      toast(enabled ? "They will now receive new enquiries in turn." : "They will no longer receive new enquiries automatically.");
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The assignment setting did not save.", "danger");
    } finally {
      setRotaBusy("");
    }
  };

  /* Everyone on the team appears, including a salesperson with no leads yet.
     Leads still held by an account that has since left the team are shown
     too, so nothing assigned can drop out of sight. */
  const rows = useMemo(() => {
    if (!members || !summary) return [];
    const known = new Set(members.map((member) => member.uid));
    const all = [
      ...members.map((member) => ({ uid: member.uid, member, figures: summary.people[member.uid] ?? EMPTY })),
      ...Object.entries(summary.people)
        .filter(([uid]) => !known.has(uid))
        .map(([uid, figures]) => ({ uid, member: undefined as SalesMember | undefined, figures })),
    ];
    const byName = (a: typeof all[number], b: typeof all[number]) => memberName(a.member).localeCompare(memberName(b.member));
    return all.sort((a, b) => {
      if (sort === "name") return byName(a, b);
      if (sort === "open") return b.figures.open - a.figures.open || byName(a, b);
      if (sort === "today") return b.figures.calledToday - a.figures.calledToday || byName(a, b);
      return attention(b.figures) - attention(a.figures) || b.figures.open - a.figures.open || byName(a, b);
    });
  }, [members, summary, sort]);

  const header = (
    <PageHeader
      title="Sales team"
      lede="Who is working on what, and who needs your help next."
      actions={
        <>
          <button type="button" className="admin-btn admin-btn-quiet" disabled={!connected} onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="admin-btn admin-btn-quiet" disabled={!connected || !members?.length} onClick={() => setShuffleOpen(true)}>
            <Shuffle size={16} /> Reshuffle leads
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => { window.location.hash = "leads"; }}>
            <UserCheck size={16} /> Assign enquiries
          </button>
        </>
      }
    />
  );

  if (!connected) {
    return <>{header}<Card><Empty>Figures will appear here once the enquiry service is connected.</Empty></Card></>;
  }
  if (!summary || !members) {
    return <>{header}<Card><Spinner label="Counting the team's enquiries" /></Card></>;
  }

  /* Anyone on the rota who is no longer an active member would still be sent
     enquiries they cannot open, so they are shown with a way to take them off. */
  const active = new Set(members.filter((member) => !member.disabled).map((member) => member.uid));
  const strayOnRota = [...rota].filter((uid) => !active.has(uid));
  const onRota = [...rota].filter((uid) => active.has(uid)).length;

  const totals = rows.reduce((sum, row) => ({
    open: sum.open + row.figures.open,
    calledToday: sum.calledToday + row.figures.calledToday,
    notLogged: sum.notLogged + row.figures.notLogged,
    qualified: sum.qualified + row.figures.qualified,
  }), { open: 0, calledToday: 0, notLogged: 0, qualified: 0 });

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
        <StatTile label="Calls recorded today" value={totals.calledToday} hint="Outcome saved, Pacific time" />
        <StatTile label="Calls not recorded" value={totals.notLogged} hint="Dialled, stage not updated yet" />
        <StatTile label="Qualified" value={totals.qualified} hint="All time" />
      </div>

      {summary.unassigned.new > 0 && (
        <div className="mb-4">
          <Banner tone="warn">
            {summary.unassigned.new} new {summary.unassigned.new === 1 ? "enquiry has" : "enquiries have"} not been
            assigned. Use Reshuffle leads to share them out, or open Enquiries and choose Not assigned yet.
          </Banner>
        </div>
      )}

      <div className="mb-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 basis-[220px]">
              <p className="admin-label">Your email alerts</p>
              <p className="admin-help" style={{ marginTop: 2 }}>
                Counts only, never a patient&apos;s name, number or answers: new enquiries waiting,
                enquiries assigned to you, and callbacks due.
              </p>
              <AlertState alert={alerts.get(myUid)} />
            </div>
            <AlertToggle enabled={alerts.get(myUid)?.enabled === true} busy={alertBusy === myUid} onToggle={(next) => void toggleAlerts(myUid, next)} />
          </div>
        </Card>
        <Card>
          <p className="admin-label">Automatic assignment</p>
          <p className="admin-help" style={{ marginTop: 2 }}>
            {onRota
              ? `On. Each new enquiry goes to the next person in turn, out of ${onRota} ${onRota === 1 ? "person" : "people"}.`
              : "Off. New enquiries wait until someone assigns them. Turn on Gets new enquiries on each card below."}
          </p>
          {strayOnRota.map((uid) => (
            <div key={uid} className="mt-3 flex flex-wrap items-center gap-3">
              <Badge tone="warn">{memberName(members.find((member) => member.uid === uid))} is disabled or has left the team</Badge>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-quiet" disabled={rotaBusy === uid} onClick={() => void toggleRota(uid, false)}>
                <UserMinus size={14} aria-hidden="true" /> {rotaBusy === uid ? "Saving" : "Stop sending them enquiries"}
              </button>
            </div>
          ))}
        </Card>
      </div>

      {!rows.length ? (
        <Card>
          <Empty>
            Nobody has the Sales role yet. An Owner can give it to each salesperson on the
            Administrators screen.
          </Empty>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="admin-label m-0">{rows.length} {rows.length === 1 ? "person" : "people"}</p>
            <label className="flex items-center gap-2 text-[13px]">
              <span style={{ color: "var(--a-text-muted)" }}>Sort by</span>
              <select className="admin-select" style={{ width: "auto" }} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                {SORTS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <ul className="admin-team-board">
            {rows.map(({ uid, member, figures }) => {
              const rate = qualifiedRate(figures);
              const usable = Boolean(member && !member.disabled);
              return (
                <li key={uid} className="admin-team-card">
                  <div className="admin-team-head">
                    <span className="admin-team-avatar" aria-hidden="true">{initials(member)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="admin-team-name">{memberName(member)}</p>
                      {member?.name && member.email && <p className="admin-team-sub">{member.email}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {member?.role === "manager" && <Badge tone="new">Manager</Badge>}
                      {member?.disabled && <Badge tone="danger">Disabled</Badge>}
                      {!member && <Badge tone="warn">Reassign these</Badge>}
                      {member && !member.lastSignIn && <Badge tone="warn">Not signed in yet</Badge>}
                    </div>
                  </div>

                  {(figures.callbacksDue > 0 || figures.notLogged > 0 || figures.new > 0) && (
                    <div className="admin-team-flags">
                      {figures.callbacksDue > 0 && <Badge tone="warn">{figures.callbacksDue} {figures.callbacksDue === 1 ? "callback" : "callbacks"} due</Badge>}
                      {figures.notLogged > 0 && <Badge tone="danger">{figures.notLogged} {figures.notLogged === 1 ? "call" : "calls"} not recorded</Badge>}
                      {figures.new > 0 && <Badge tone="quiet">{figures.new} not called yet{figures.oldestNewAt ? `, oldest ${waitingFor(figures.oldestNewAt)}` : ""}</Badge>}
                    </div>
                  )}

                  <dl className="admin-team-figures">
                    <div><dt>Open</dt><dd>{figures.open}</dd></div>
                    <div><dt>Calls today</dt><dd>{figures.calledToday}</dd></div>
                    <div><dt>Calls recorded</dt><dd>{figures.calls}</dd></div>
                    <div><dt>Qualified</dt><dd>{figures.qualified}</dd></div>
                    <div><dt>Not qualified</dt><dd>{figures.notQualified}</dd></div>
                    <div><dt>Closed</dt><dd>{figures.closed}</dd></div>
                  </dl>

                  <div className="admin-team-rate" aria-label={rate === null ? "No finished enquiries yet" : `${rate} percent of finished enquiries qualified`}>
                    <span className="admin-team-rate-bar"><span style={{ width: `${rate ?? 0}%` }} /></span>
                    <span className="admin-team-sub">{rate === null ? "No finished enquiries yet" : `${rate}% of finished enquiries qualified`}</span>
                  </div>

                  <p className="admin-team-sub">
                    {figures.lastDialAt ? `Last dialled ${formatDateTime(figures.lastDialAt)}.` : "No calls yet."}
                    {member ? (member.lastSignIn ? ` Last signed in ${formatDateTime(member.lastSignIn)}.` : " Never signed in.") : ""}
                  </p>

                  {usable && (
                    <div className="admin-team-settings">
                      <div>
                        <span className="admin-team-setting-label">Gets new enquiries</span>
                        <RotaToggle enabled={rota.has(uid)} busy={rotaBusy === uid} label={memberName(member)} onToggle={(next) => void toggleRota(uid, next)} />
                      </div>
                      <div>
                        <span className="admin-team-setting-label">Email alerts</span>
                        <AlertToggle enabled={alerts.get(uid)?.enabled === true} busy={alertBusy === uid} label={memberName(member)} onToggle={(next) => void toggleAlerts(uid, next)} />
                        <AlertState alert={alerts.get(uid)} />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="admin-help mt-3">
        A call is counted only when the person who made it saves the lead&apos;s stage afterwards.
        A dial with no stage saved shows as a call not recorded. Automatic assignments and reshuffles
        are written to each enquiry&apos;s history and to the access log. Opening this screen is
        recorded in the access log.
      </p>

      <ReshuffleDrawer
        open={shuffleOpen}
        onClose={() => setShuffleOpen(false)}
        members={members.filter((member) => !member.disabled)}
        summary={summary}
        rota={rota}
        onDone={() => { setShuffleOpen(false); void refresh(); }}
      />
    </>
  );
}

/*
  Reshuffle: take the open enquiries of the chosen people, or the ones nobody
  holds yet, and share them out again among the people who should receive
  them. The server does the sharing, oldest first and evenly, and never hands
  a lead back to the person it came from.
*/
function ReshuffleDrawer({
  open,
  onClose,
  members,
  summary,
  rota,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  members: SalesMember[];
  summary: SalesTeamSummary;
  rota: Set<string>;
  onDone: () => void;
}) {
  const { getToken } = useAdminAuth();
  const toast = useToast();
  const [scope, setScope] = useState<"new" | "open">("new");
  const [from, setFrom] = useState<Set<string>>(() => new Set(["unassigned"]));
  const [to, setTo] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  /* The choices reset each time the drawer opens, and only then: the lists
     it is given are rebuilt on every render of the screen. */
  const latest = useRef({ members, rota });
  latest.current = { members, rota };
  useEffect(() => {
    if (!open) return;
    const { members: people, rota: inTurn } = latest.current;
    setScope("new");
    setFrom(new Set(["unassigned"]));
    const receivers = people.filter((member) => inTurn.has(member.uid)).map((member) => member.uid);
    setTo(new Set(receivers.length ? receivers : people.map((member) => member.uid)));
  }, [open]);

  const count = (uid: string) => {
    if (uid === "unassigned") return scope === "new" ? summary.unassigned.new : summary.unassigned.open;
    const f = summary.people[uid];
    return f ? (scope === "new" ? f.new : f.open) : 0;
  };
  const moving = [...from].reduce((sum, uid) => sum + count(uid), 0);
  const toggle = (set: Set<string>, uid: string, update: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(uid)) next.delete(uid); else next.add(uid);
    update(next);
  };

  const run = async () => {
    setBusy(true);
    try {
      const result = await adminApi.reshuffleLeads(getToken, [...from], [...to], scope);
      const parts = [`${result.moved} ${result.moved === 1 ? "enquiry" : "enquiries"} shared out.`];
      if (result.skipped) parts.push(`${result.skipped} changed while you were sharing them and were left as they were.`);
      if (result.remaining) parts.push(`${result.remaining} more are waiting. Run it again to share them.`);
      toast(parts.join(" "));
      onDone();
    } catch (problem) {
      toast(problem instanceof AdminApiError ? problem.message : "The reshuffle did not work.", "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Reshuffle leads"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="admin-btn admin-btn-quiet" onClick={onClose}>Cancel</button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !from.size || !to.size || !moving} onClick={() => void run()}>
            <Shuffle size={16} /> {busy ? "Sharing out" : `Share out ${moving} ${moving === 1 ? "enquiry" : "enquiries"}`}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <fieldset className="admin-team-fieldset">
          <legend className="admin-label">Which enquiries</legend>
          <label className="admin-team-choice">
            <input type="radio" name="reshuffle-scope" checked={scope === "new"} onChange={() => setScope("new")} />
            <span><strong>Not called yet</strong><span className="admin-team-sub">New enquiries nobody has called.</span></span>
          </label>
          <label className="admin-team-choice">
            <input type="radio" name="reshuffle-scope" checked={scope === "open"} onChange={() => setScope("open")} />
            <span><strong>Every open enquiry</strong><span className="admin-team-sub">Includes callbacks and leads in progress. Finished leads never move.</span></span>
          </label>
        </fieldset>

        <fieldset className="admin-team-fieldset">
          <legend className="admin-label">Take them from</legend>
          <label className="admin-team-choice">
            <input type="checkbox" checked={from.has("unassigned")} onChange={() => toggle(from, "unassigned", setFrom)} />
            <span><strong>Not assigned yet</strong><span className="admin-team-sub">{count("unassigned")} waiting</span></span>
          </label>
          {members.map((member) => (
            <label key={member.uid} className="admin-team-choice">
              <input type="checkbox" checked={from.has(member.uid)} onChange={() => toggle(from, member.uid, setFrom)} />
              <span><strong>{memberName(member)}</strong><span className="admin-team-sub">{count(member.uid)} {scope === "new" ? "not called yet" : "open"}</span></span>
            </label>
          ))}
        </fieldset>

        <fieldset className="admin-team-fieldset">
          <legend className="admin-label">Share them among</legend>
          {members.map((member) => (
            <label key={member.uid} className="admin-team-choice">
              <input type="checkbox" checked={to.has(member.uid)} onChange={() => toggle(to, member.uid, setTo)} />
              <span><strong>{memberName(member)}</strong>{rota.has(member.uid) && <span className="admin-team-sub">Gets new enquiries</span>}</span>
            </label>
          ))}
        </fieldset>

        <p className="admin-help">
          Oldest first, and evenly: each enquiry goes to whoever has received the fewest so far, and
          never back to the person it came from. Up to 225 move at a time. Each move is written to the
          enquiry&apos;s history.
        </p>
      </div>
    </Drawer>
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

function RotaToggle({ enabled, busy, label, onToggle }: { enabled: boolean; busy: boolean; label: string; onToggle: (next: boolean) => void }) {
  return (
    <>
      <button
        type="button"
        className={`admin-btn admin-btn-sm ${enabled ? "admin-btn-quiet" : "admin-btn-primary"}`}
        disabled={busy}
        aria-pressed={enabled}
        aria-label={`${enabled ? "Stop giving" : "Give"} new enquiries to ${label} automatically`}
        onClick={() => onToggle(!enabled)}
      >
        {enabled ? <UserMinus size={14} aria-hidden="true" /> : <Repeat size={14} aria-hidden="true" />}
        {busy ? "Saving" : enabled ? "Turn off" : "Turn on"}
      </button>
      <span className="mt-1 block text-[12px]" style={{ color: "var(--a-text-muted)" }}>{enabled ? "In the rota" : "Off"}</span>
    </>
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
