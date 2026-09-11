"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { incidentApi, incidentApiEnabled } from "./lib/incident-api";
import { ElephantAssistant } from "./components/elephant-assistant";

type Severity = "P1" | "P2" | "P3";
type Status = "OPEN" | "INVESTIGATING" | "MITIGATED" | "CLOSED";
type Incident = {
  incidentId: string;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  owner: string;
  impactedService: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

type Rca = { rootCause: string; resolution: string; lessonsLearned: string; recommendations: string };
type Activity = { id: string; incidentId: string; label: string; detail: string; at: string; tone: "purple" | "amber" | "green" | "gray" };
type IncidentFilter = "ALL" | Status | Severity | "WITHIN_SLA" | "APPROACHING_SLA" | "SLA_BREACHED";

const seedIncidents: Incident[] = [
  { incidentId: "INC-1042", title: "Checkout latency spike", description: "Payment authorization requests are timing out for a subset of EU traffic.", severity: "P1", status: "INVESTIGATING", owner: "Maya Chen", impactedService: "Checkout API", createdAt: "2026-09-09T07:30:00Z", updatedAt: "2026-09-09T08:18:00Z" },
  { incidentId: "INC-1043", title: "Checkout payment timeout", description: "Payment gateway timeouts are affecting checkout confirmation requests.", severity: "P2", status: "OPEN", owner: "Devon Price", impactedService: "Checkout API", createdAt: "2026-09-09T08:02:00Z", updatedAt: "2026-09-09T08:12:00Z" },
  { incidentId: "INC-1044", title: "Checkout authorization retries", description: "Repeated authorization retries are increasing checkout response times.", severity: "P2", status: "MITIGATED", owner: "Alex Rivera", impactedService: "Checkout API", createdAt: "2026-09-09T05:45:00Z", updatedAt: "2026-09-09T06:40:00Z" },
  { incidentId: "INC-1041", title: "Search indexing lag", description: "New catalog items are appearing in search several minutes late.", severity: "P2", status: "OPEN", owner: "Unassigned", impactedService: "Search Indexer", createdAt: "2026-09-09T08:48:00Z", updatedAt: "2026-09-09T08:48:00Z" },
  { incidentId: "INC-1038", title: "Webhook delivery retries", description: "Partner webhooks are recovering after an upstream certificate rotation.", severity: "P3", status: "MITIGATED", owner: "Devon Price", impactedService: "Events Gateway", createdAt: "2026-09-09T03:10:00Z", updatedAt: "2026-09-09T05:44:00Z" },
  { incidentId: "INC-1035", title: "Mobile login failures", description: "Expired sessions caused elevated sign-in failures on older mobile clients.", severity: "P2", status: "CLOSED", owner: "Alex Rivera", impactedService: "Identity", createdAt: "2026-09-09T06:20:00Z", updatedAt: "2026-09-09T07:40:00Z", closedAt: new Date(Date.now() - 2 * 36e5).toISOString() },
];

const transitions: Record<Status, Status[]> = {
  OPEN: ["INVESTIGATING"],
  INVESTIGATING: ["MITIGATED"],
  MITIGATED: ["CLOSED"],
  CLOSED: [],
};

const slaHours: Record<Severity, number> = { P1: 2, P2: 4, P3: 8 };
const incidentStorageKey = "signal-room-incidents-v2";
const activityStorageKey = "signal-room-activity-v2";

const seedActivity: Activity[] = [
  { id: "a1", incidentId: "INC-1042", label: "Incident commander assigned", detail: "Maya Chen owns the response channel.", at: "2026-09-09T08:18:00Z", tone: "purple" },
  { id: "a2", incidentId: "INC-1042", label: "Customer impact confirmed", detail: "Checkout API is the primary impacted service.", at: "2026-09-09T07:42:00Z", tone: "amber" },
  { id: "a3", incidentId: "INC-1041", label: "Signal received", detail: "Automated monitoring opened the incident.", at: "2026-09-09T08:48:00Z", tone: "gray" },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getSla(incident: Incident, now = Date.now()) {
  if (incident.status === "CLOSED") return { label: "Resolved", tone: "quiet", percent: 100 };
  const elapsed = (now - new Date(incident.createdAt).getTime()) / 36e5;
  const remaining = slaHours[incident.severity] - elapsed;
  if (remaining <= 0) return { label: "Breached", tone: "danger", percent: 100 };
  const percent = Math.max(8, Math.min(100, (elapsed / slaHours[incident.severity]) * 100));
  if (remaining <= slaHours[incident.severity] * 0.25) return { label: `${Math.ceil(remaining * 60)}m left`, tone: "warning", percent };
  return { label: `${Math.ceil(remaining)}h left`, tone: "good", percent };
}

export default function Home() {
  const [incidents, setIncidents] = useState(seedIncidents);
  const [selectedId, setSelectedId] = useState("INC-1042");
  const [filter, setFilter] = useState<IncidentFilter>("ALL");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [rca, setRca] = useState<Rca | null>(null);
  const [activity, setActivity] = useState<Activity[]>(seedActivity);
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (incidentApiEnabled) {
      incidentApi.list()
        .then((remoteIncidents) => setIncidents(remoteIncidents))
        .catch(() => setNotice("Incident API unavailable. Showing local workspace data."));
      return;
    }
    const saved = window.localStorage.getItem(incidentStorageKey);
    const savedActivity = window.localStorage.getItem(activityStorageKey);
    if (saved) setIncidents(JSON.parse(saved));
    if (savedActivity) setActivity(JSON.parse(savedActivity));
  }, []);

  useEffect(() => {
    if (incidentApiEnabled) return;
    window.localStorage.setItem(incidentStorageKey, JSON.stringify(incidents));
    window.localStorage.setItem(activityStorageKey, JSON.stringify(activity));
  }, [incidents, activity]);

  const selected = incidents.find((incident) => incident.incidentId === selectedId) ?? incidents[0];
  const visibleIncidents = incidents.filter((incident) => {
    const sla = getSla(incident, now);
    const matchesFilter = filter === "ALL" || incident.status === filter || incident.severity === filter || (filter === "WITHIN_SLA" && sla.tone === "good") || (filter === "APPROACHING_SLA" && sla.tone === "warning") || (filter === "SLA_BREACHED" && sla.tone === "danger");
    const matchesQuery = `${incident.title} ${incident.impactedService} ${incident.owner}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
  const metrics = useMemo(() => ({
    active: incidents.filter((item) => item.status !== "CLOSED").length,
    investigating: incidents.filter((item) => item.status === "INVESTIGATING").length,
    breached: incidents.filter((item) => getSla(item, now).tone === "danger").length,
    approaching: incidents.filter((item) => getSla(item, now).tone === "warning").length,
    within: incidents.filter((item) => getSla(item, now).tone === "good").length,
    critical: incidents.filter((item) => item.severity === "P1").length,
  }), [incidents, now]);
  const relatedIncidents = incidents.filter((incident) => incident.incidentId !== selected.incidentId && (incident.impactedService === selected.impactedService || selected.title.toLowerCase().split(" ").some((word) => word.length > 4 && incident.title.toLowerCase().includes(word))));
  const serviceCount = new Set(incidents.map((incident) => incident.impactedService)).size;

  function updateIncident(changes: Partial<Incident>) {
    setIncidents((current) => current.map((item) => item.incidentId === selected.incidentId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item));
  }

  function addActivity(label: string, detail: string, tone: Activity["tone"] = "purple") {
    setActivity((current) => [{ id: crypto.randomUUID(), incidentId: selected.incidentId, label, detail, at: new Date().toISOString(), tone }, ...current]);
  }

  function escalateIncident() {
    addActivity("SLA escalation raised", `${selected.incidentId} requires immediate attention and owner review.`, "amber");
    setNotice(`${selected.incidentId} escalation added to the response timeline.`);
  }

  function moveStatus() {
    if (selected.status === "CLOSED") {
      const resolvedAt = new Date(selected.closedAt ?? selected.updatedAt).getTime();
      const withinReopenWindow = Date.now() - resolvedAt <= 24 * 36e5;
      if (!withinReopenWindow) {
        setNotice(`${selected.incidentId} can no longer be reopened because the 24-hour window has expired.`);
        return;
      }
      updateIncident({ status: "INVESTIGATING", closedAt: undefined });
      addActivity("Incident reopened", "The incident returned to investigation within the 24-hour reopen window.", "amber");
      setNotice(`${selected.incidentId} reopened for investigation.`);
      return;
    }
    const next = transitions[selected.status][0];
    if (!next) {
      setNotice(`${selected.incidentId} is closed and cannot move forward.`);
      return;
    }
    updateIncident({ status: next, ...(next === "CLOSED" ? { closedAt: new Date().toISOString() } : {}) });
    addActivity(`Incident moved to ${next}`, `${selected.owner} advanced the response lifecycle.`, next === "MITIGATED" ? "green" : "purple");
    setNotice(`${selected.incidentId} moved to ${next}.`);
  }

  function generateRca() {
    setRca({
      rootCause: `${selected.impactedService} experienced a failure pattern described as: ${selected.description}`,
      resolution: "Stabilize the impacted dependency, verify recovery through the service health signal, and monitor the incident for regression.",
      lessonsLearned: "The timeline should capture the first customer signal, owner handoff, mitigation decision, and recovery evidence.",
      recommendations: "Add an early-warning alert, document the rollback path, and rehearse the responder handoff for this service.",
    });
    addActivity("RCA draft generated", "Copilot prepared an evidence-linked first draft for review.", "purple");
  }

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) return;
    addActivity("Responder note added", note.trim(), "green");
    setNote("");
    setNotice("Note added to the incident room.");
  }

  function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const incident: Incident = {
      incidentId: `INC-${1043 + incidents.length}`,
      title: String(form.get("title")),
      description: String(form.get("description")),
      severity: String(form.get("severity")) as Severity,
      status: "OPEN",
      owner: String(form.get("owner")) || "Unassigned",
      impactedService: String(form.get("service")),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIncidents((current) => [incident, ...current]);
    setActivity((current) => [{ id: crypto.randomUUID(), incidentId: incident.incidentId, label: "Incident created", detail: "New signal is ready for triage.", at: incident.createdAt, tone: "amber" }, ...current]);
    setSelectedId(incident.incidentId);
    setShowCreate(false);
    setNotice(`${incident.incidentId} created and ready for triage.`);
    event.currentTarget.reset();
  }

  return (
    <main className="app-shell">
      <header className="command-bar">
        <div className="brand"><span className="brand-mark">◎</span><span>Signal Room</span><small>OPS / EAST</small></div>
        <div className="system-pulse"><span className="pulse-dot" />All systems nominal <span className="muted">Updated just now</span></div>
        <div className="command-actions"><button className="ghost-button" onClick={() => setShowCreate(true)}>＋ New incident</button><button className="avatar">MC</button></div>
      </header>

      <section className="workspace-heading">
        <div><p className="eyebrow">Wednesday · 09 September 2026</p><h1>Command center</h1><p className="lede">A live view of customer impact, response velocity, and the decisions that move incidents forward.</p></div>
        <div className="heading-meta"><span className="meta-label">ON CALL</span><strong>Maya Chen</strong><span className="availability"><span className="pulse-dot" />Available</span></div>
      </section>
      <section className="operations-grid">
        <div className="rail-panel collaboration-panel">
          <div className="panel-heading"><div><span className="eyebrow">WAR ROOM</span><h3>Responder activity</h3></div><span className="live-label"><span className="pulse-dot" />{activity.filter((item) => item.incidentId === selected.incidentId).length} EVENTS</span></div>
          <form className="note-form" onSubmit={addNote}><input aria-label="Add incident note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a handoff note or decision..." /><button className="text-button" type="submit">Post</button></form>
          <div className="activity-list">{activity.filter((item) => item.incidentId === selected.incidentId).slice(0, 4).map((item) => <div className="activity-row" key={item.id}><span className={`timeline-marker ${item.tone}`} /><div><strong>{item.label}</strong><p>{item.detail}</p></div><time>{formatTime(item.at)}</time></div>)}</div>
        </div>
        <div className="rail-panel related-panel">
          <div className="panel-heading"><div><span className="eyebrow">CORRELATION SIGNAL</span><h3>Related incidents</h3></div><span className="status-chip draft">RULE-BASED</span></div>
          {relatedIncidents.length ? relatedIncidents.slice(0, 2).map((incident) => <button className="related-row" key={incident.incidentId} onClick={() => setSelectedId(incident.incidentId)}><span className={`severity-dot ${incident.severity.toLowerCase()}`} /><span><strong>{incident.incidentId}</strong><small>{incident.title}</small></span><span className="related-reason">{incident.impactedService === selected.impactedService ? "same service" : "shared keyword"}</span></button>) : <div className="empty-state compact"><span>⌁</span><p>No strong correlation candidates for this incident.</p></div>}
        </div>
        <div className="rail-panel executive-panel">
          <div className="panel-heading"><div><span className="eyebrow">EXECUTIVE SIGNAL</span><h3>Operational posture</h3></div><span className="availability"><span className="pulse-dot" />STABLE</span></div>
          <div className="posture-score"><strong>{Math.max(62, 100 - metrics.breached * 18 - metrics.critical * 4)}%</strong><span>response health</span></div>
          <div className="posture-lines"><span><b>{serviceCount}</b> services in view</span><span><b>{incidents.filter((item) => item.status === "CLOSED").length}</b> resolved today</span><span><b>{Math.max(0, 100 - metrics.breached * 25)}%</b> estimated SLA compliance</span></div>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-block metric-primary"><span className="metric-label">ACTIVE INCIDENTS</span><strong>{metrics.active}</strong><span className="metric-foot">Across 4 services</span></div>
        <div className="metric-block"><span className="metric-label">INVESTIGATING</span><strong>{metrics.investigating}</strong><span className="metric-foot accent-text">Response in motion</span></div>
        <div className="metric-block"><span className="metric-label">SLA BREACHES</span><strong className={metrics.breached ? "danger-text" : ""}>{metrics.breached}</strong><span className="metric-foot">{metrics.approaching} approaching · {metrics.within} within</span></div>
        <div className="metric-block"><span className="metric-label">P1 CRITICAL</span><strong className="critical-text">{metrics.critical}</strong><span className="metric-foot">Customer-facing impact</span></div>
        <div className="signal-chart"><div className="chart-title"><span>RESPONSE VELOCITY</span><strong>+18.4%</strong></div><div className="bars">{[42, 58, 46, 72, 64, 83, 76, 94, 88, 100, 91, 100].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-axis"><span>08:00</span><span>NOW</span></div></div>
      </section>

      <section className="main-grid">
        <div className="incident-feed panel">
          <div className="panel-heading"><div><span className="eyebrow">LIVE QUEUE</span><h2>Incidents <span>{incidents.length}</span></h2></div><button className="icon-button" title="Refresh queue">↻</button></div>
          <div className="feed-tools"><input aria-label="Search incidents" placeholder="Search title, service, owner" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter incidents" value={filter} onChange={(event) => setFilter(event.target.value as IncidentFilter)}><option value="ALL">All signals</option><option value="WITHIN_SLA">Within SLA</option><option value="APPROACHING_SLA">Approaching SLA</option><option value="SLA_BREACHED">SLA breached</option><option value="P1">P1 critical</option><option value="P2">P2 high</option><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="MITIGATED">Mitigated</option><option value="CLOSED">Closed</option></select></div>
          <div className="incident-list">{visibleIncidents.map((incident) => { const sla = getSla(incident, now); return <button className={`incident-row ${selected.incidentId === incident.incidentId ? "selected" : ""}`} key={incident.incidentId} onClick={() => setSelectedId(incident.incidentId)}><span className={`severity-dot ${incident.severity.toLowerCase()}`} /><span className="incident-summary"><strong>{incident.title}</strong><small>{incident.incidentId} · {incident.impactedService}</small></span><span className={`status-chip ${incident.status.toLowerCase()}`}>{incident.status}</span><span className={`sla-chip ${sla.tone}`}>{sla.label}</span></button> })}</div>
        </div>

        <div className="investigation panel"><div className="investigation-top"><div><span className={`severity-tag ${selected.severity.toLowerCase()}`}>{selected.severity} · {selected.severity === "P1" ? "CRITICAL" : selected.severity === "P2" ? "HIGH" : "MEDIUM"}</span><h2>{selected.title}</h2><p>{selected.description}</p></div><div className="incident-id">{selected.incidentId}<br /><span>Updated {formatTime(selected.updatedAt)}</span></div></div>
          <div className="owner-strip"><div className="owner-avatar">{selected.owner === "Unassigned" ? "?" : selected.owner.split(" ").map((name) => name[0]).join("")}</div><div><span className="metric-label">INCIDENT COMMANDER</span><strong>{selected.owner}</strong></div><select aria-label="Assign incident owner" value={selected.owner} onChange={(event) => updateIncident({ owner: event.target.value })}><option>Unassigned</option><option>Maya Chen</option><option>Devon Price</option><option>Alex Rivera</option></select></div>
          <div className="response-grid"><div className="response-card"><span className="metric-label">LIFECYCLE</span><div className="lifecycle"><span className="done">OPEN</span><i /><span className={selected.status !== "OPEN" ? "done" : "current"}>INVESTIGATING</span><i /><span className={selected.status === "MITIGATED" || selected.status === "CLOSED" ? "done" : ""}>MITIGATED</span><i /><span className={selected.status === "CLOSED" ? "done" : ""}>CLOSED</span></div><button className="primary-button" onClick={moveStatus}>{selected.status === "CLOSED" ? "Reopen incident" : `Advance to ${transitions[selected.status][0] ?? "next stage"}`}</button>{selected.status === "CLOSED" && <small className="reopen-hint">Reopen is available for 24 hours after resolution.</small>}</div><div className={`response-card sla-card ${getSla(selected, now).tone}`}><span className="metric-label">SLA CLOCK · {slaHours[selected.severity]}H TARGET</span><strong>{getSla(selected, now).label}</strong><div className="progress-track"><span style={{ width: `${getSla(selected, now).percent}%` }} /></div><small>{getSla(selected, now).tone === "danger" ? "Escalation recommended immediately" : "Time remaining is calculated from incident creation"}</small>{getSla(selected, now).tone !== "quiet" && <button className="escalate-button" onClick={escalateIncident}>Raise escalation</button>}</div></div>
          <div className="timeline"><div className="panel-heading"><div><span className="eyebrow">DECISION LOG</span><h3>Response timeline</h3></div><span className="live-label"><span className="pulse-dot" />LIVE</span></div>{activity.filter((item) => item.incidentId === selected.incidentId).slice(0, 6).map((item) => <div className="timeline-item" key={item.id}><span className={`timeline-marker ${item.tone}`} /><div><strong>{item.label}</strong><p>{item.detail}</p></div><time>{formatTime(item.at)}</time></div>)}</div>
        </div>

        <aside className="right-rail"><div className="rail-panel ai-panel"><span className="eyebrow">ASSISTED RESPONSE</span><h3>Copilot brief</h3><p>Evidence-linked guidance for the incident commander.</p><div className="ai-suggestion"><span>✦</span><div><strong>Next best action</strong><p>Verify connection-pool saturation before changing retry policy.</p></div></div><button className="text-button" onClick={generateRca}>Generate RCA draft <span>↗</span></button></div><div className="rail-panel"><div className="panel-heading"><div><span className="eyebrow">ROOT CAUSE</span><h3>RCA workspace</h3></div><span className="status-chip draft">DRAFT</span></div>{rca ? <div className="rca-form"><label>Root cause<textarea value={rca.rootCause} onChange={(event) => setRca({ ...rca, rootCause: event.target.value })} /></label><label>Resolution<textarea value={rca.resolution} onChange={(event) => setRca({ ...rca, resolution: event.target.value })} /></label><label>Recommendations<textarea value={rca.recommendations} onChange={(event) => setRca({ ...rca, recommendations: event.target.value })} /></label></div> : <div className="empty-state"><span>◎</span><p>Select “Generate RCA draft” to create an editable response document from this incident.</p></div>}</div></aside>
      </section>
      <ElephantAssistant incident={selected} slaLabel={getSla(selected, now).label} relatedCount={relatedIncidents.length} timelineCount={activity.filter((item) => item.incidentId === selected.incidentId).length} />
      {notice && <button className="toast" onClick={() => setNotice("")}>{notice} <span>×</span></button>}
      {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="create-modal" onSubmit={createIncident} onClick={(event) => event.stopPropagation()}><div className="panel-heading"><div><span className="eyebrow">NEW SIGNAL</span><h2>Create incident</h2></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)}>×</button></div><label>Title<input name="title" required placeholder="What is happening?" /></label><label>Impacted service<input name="service" required placeholder="e.g. Checkout API" /></label><label>Description<textarea name="description" required placeholder="Describe the customer or system impact" /></label><div className="form-row"><label>Severity<select name="severity" defaultValue="P2"><option>P1</option><option>P2</option><option>P3</option></select></label><label>Owner<select name="owner" defaultValue="Unassigned"><option>Unassigned</option><option>Maya Chen</option><option>Devon Price</option><option>Alex Rivera</option></select></label></div><button className="primary-button" type="submit">Create incident</button></form></div>}
    </main>
  );
}
