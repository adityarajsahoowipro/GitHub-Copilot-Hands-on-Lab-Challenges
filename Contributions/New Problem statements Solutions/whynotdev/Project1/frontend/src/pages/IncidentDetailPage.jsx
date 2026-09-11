import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ApiErrorState from '../components/ApiErrorState.jsx';

const slaHoursBySeverity = { P1: 2, P2: 4, P3: 8 };
const lifecycleSteps = [
  ['OPEN', 'Open'],
  ['IN_PROGRESS', 'In progress'],
  ['MITIGATED', 'Mitigated'],
  ['CLOSED', 'Closed'],
];

function withSlaDetails(incident) {
  const createdAt = new Date(incident.createdAt);
  const deadline = new Date(createdAt.getTime() + (slaHoursBySeverity[incident.severity] || 24) * 60 * 60 * 1000);
  const remainingSeconds = Math.floor((deadline.getTime() - Date.now()) / 1000);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));
  const slaStatus = incident.status === 'CLOSED' ? 'NOT_APPLICABLE' : remainingSeconds < 0 ? 'SLA_BREACHED' : remainingSeconds <= 60 * 60 ? 'APPROACHING_SLA' : 'WITHIN_SLA';
  return { ...incident, slaStatus, slaDeadline: deadline.toISOString(), elapsedSeconds, remainingSeconds };
}

function IncidentDetailPage() {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState(null);

  const loadIncident = () => fetch(`/api/incidents/${incidentId}`).then((response) => {
    if (!response.ok) {
      const fetchError = new Error('Unable to load this incident.');
      fetchError.status = response.status;
      throw fetchError;
    }
    return response.json();
  }).then((item) => {
    setIncident(withSlaDetails(item));
    setLoadError(null);
  });

  const loadHistory = () => fetch(`/api/incidents/${incidentId}/history`).then((response) => response.ok ? response.json() : []).then(setHistory).catch(() => setHistory([]));

  useEffect(() => {
    loadIncident().catch(setLoadError);
    loadHistory();
  }, [incidentId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 10000);
    return () => clearTimeout(timer);
  }, [toast]);

  const formatDuration = (seconds) => {
    const absoluteSeconds = Math.abs(seconds);
    return `${Math.floor(absoluteSeconds / 3600)}h ${Math.floor((absoluteSeconds % 3600) / 60)}m`;
  };

  const updateIncident = async (event) => {
    event.preventDefault();
    const response = await fetch(`/api/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    const updated = await response.json();
    if (!response.ok) {
      setToast(updated.message || 'Unable to update incident.');
      return;
    }
    setIncident(withSlaDetails(updated));
    setToast(`${updated.incidentId} updated.`);
    loadHistory();
  };

  const escalateIncident = async () => {
    const response = await fetch(`/api/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: 'Escalation queue' }),
    });
    const updated = await response.json();
    if (!response.ok) {
      setToast(updated.message || 'Unable to escalate incident.');
      return;
    }
    setIncident(withSlaDetails(updated));
    setToast(`${updated.incidentId} reassigned to the escalation queue.`);
    loadHistory();
  };

  const activeLifecycleStep = lifecycleSteps.findIndex(([status]) => status === incident?.status);

  return <main className="dashboard-shell"><nav className="topbar" aria-label="Primary navigation"><Link className="brand" to="/"><span className="brand-mark">IR</span><span>Incident Response</span></Link><Link className="nav-button" to="/dashboard/incidents">Incident register</Link></nav><section className="create-layout incident-detail-page">{loadError ? <ApiErrorState error={loadError} onRetry={() => loadIncident().catch(setLoadError)} /> : incident ? <><header className="create-header"><p className="eyebrow">Incident investigation</p><h1>{incident.title}</h1><p>{incident.incidentId} / {incident.impactedService}</p></header>{incident.slaStatus === 'SLA_BREACHED' && <div className="escalation-panel"><strong>SLA breached</strong><span>Immediate ownership review is required.</span><button onClick={escalateIncident} type="button">Reassign to escalation queue</button></div>}<div className="sla-timing"><div><span>Elapsed</span><strong>{formatDuration(incident.elapsedSeconds)}</strong></div><div><span>Remaining</span><strong>{incident.remainingSeconds < 0 ? `${formatDuration(incident.remainingSeconds)} overdue` : formatDuration(incident.remainingSeconds)}</strong></div><div><span>SLA deadline</span><strong>{new Date(incident.slaDeadline).toLocaleString()}</strong></div></div><div className="lifecycle-timeline" aria-label={`Incident lifecycle: ${incident.status.replaceAll('_', ' ')}`}>{lifecycleSteps.map(([status, label], index) => <div className={`lifecycle-step ${index === activeLifecycleStep ? 'active' : ''}`} key={status}><span aria-hidden="true"></span>{label}</div>)}</div><form className="create-form" onSubmit={updateIncident}><label>Status<select defaultValue={incident.status} name="status">{incident.status === 'CLOSED' ? <option value="IN_PROGRESS">Reopen incident</option> : <><option>OPEN</option><option>IN_PROGRESS</option><option>MITIGATED</option><option>CLOSED</option></>}</select></label><label>Severity<select defaultValue={incident.severity} name="severity"><option>P1</option><option>P2</option><option>P3</option></select></label><label>Owner<input defaultValue={incident.owner || ''} name="owner" /></label><label>Impacted service<input defaultValue={incident.impactedService} name="impactedService" /></label><div className="form-actions form-span"><Link className="text-link" to={`/dashboard/incidents/${incidentId}/rca`}>Open root cause analysis</Link><button className="primary-button" type="submit">Save changes</button></div></form><div className="history"><h2>Incident history</h2>{history.map((entry) => <p key={`${entry.type}-${entry.recordedAt}`}><strong>{entry.type.replaceAll('_', ' ')}</strong>{entry.message}</p>)}</div></> : <p className="empty-state">Loading incident details...</p>}</section>{toast && <div className="toast" role="status">{toast}</div>}</main>;
}

export default IncidentDetailPage;
