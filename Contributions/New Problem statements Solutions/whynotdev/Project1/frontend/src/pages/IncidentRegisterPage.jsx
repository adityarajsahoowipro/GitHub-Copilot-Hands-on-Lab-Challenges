import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ApiErrorState from '../components/ApiErrorState.jsx';

const slaHoursBySeverity = { P1: 2, P2: 4, P3: 8 };

function withSlaDetails(incident) {
  const createdAt = new Date(incident.createdAt);
  const deadline = new Date(createdAt.getTime() + (slaHoursBySeverity[incident.severity] || 24) * 60 * 60 * 1000);
  const remainingSeconds = Math.floor((deadline.getTime() - Date.now()) / 1000);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));
  const slaStatus = incident.status === 'CLOSED' ? 'NOT_APPLICABLE' : remainingSeconds < 0 ? 'SLA_BREACHED' : remainingSeconds <= 60 * 60 ? 'APPROACHING_SLA' : 'WITHIN_SLA';
  return { ...incident, slaStatus, slaDeadline: deadline.toISOString(), elapsedSeconds, remainingSeconds };
}

function IncidentRegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: searchParams.get('status') || '', severity: '', owner: '', slaStatus: searchParams.get('slaStatus') || '', sort: 'newest' });
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadIncidents = () => fetch('/api/incidents').then((response) => {
    if (!response.ok) {
      const error = new Error('Unable to load incidents.');
      error.status = response.status;
      throw error;
    }
    return response.json();
  }).then((items) => { setIncidents(items.map(withSlaDetails)); setLoadError(null); });

  useEffect(() => { loadIncidents().catch(setLoadError).finally(() => setIsLoading(false)); }, []);

  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  const owners = [...new Set(incidents.map((incident) => incident.owner || 'Unassigned'))].sort();
  const visibleIncidents = incidents
    .filter((incident) => !filters.status || incident.status === filters.status)
    .filter((incident) => !filters.severity || incident.severity === filters.severity)
    .filter((incident) => !filters.owner || (incident.owner || 'Unassigned') === filters.owner)
    .filter((incident) => !filters.slaStatus || incident.slaStatus === filters.slaStatus)
    .filter((incident) => incident.title.toLowerCase().includes(filters.search.toLowerCase()))
    .sort((first, second) => filters.sort === 'newest' ? new Date(second.createdAt) - new Date(first.createdAt) : first.severity.localeCompare(second.severity));

  return <main className="dashboard-shell"><nav className="topbar" aria-label="Primary navigation"><Link className="brand" to="/"><span className="brand-mark">IR</span><span>Incident Response</span></Link><Link className="nav-button" to="/dashboard">Dashboard</Link></nav><section className="register-layout"><header className="register-header"><div><p className="eyebrow">Incident operations</p><h1>Incidents</h1></div><Link className="primary-button" to="/dashboard/incidents/new">Create incident</Link></header>{loadError ? <ApiErrorState error={loadError} onRetry={() => { setIsLoading(true); loadIncidents().catch(setLoadError).finally(() => setIsLoading(false)); }} /> : <><div className="filters" aria-label="Incident filters"><input name="search" onChange={updateFilter} placeholder="Search title" value={filters.search} /><select name="status" onChange={updateFilter} value={filters.status}><option value="">All statuses</option><option>OPEN</option><option>IN_PROGRESS</option><option>MITIGATED</option><option>CLOSED</option></select><select name="severity" onChange={updateFilter} value={filters.severity}><option value="">All severities</option><option>P1</option><option>P2</option><option>P3</option></select><select name="owner" onChange={updateFilter} value={filters.owner}><option value="">All owners</option>{owners.map((owner) => <option key={owner}>{owner}</option>)}</select><select name="slaStatus" onChange={updateFilter} value={filters.slaStatus}><option value="">All SLA states</option><option>WITHIN_SLA</option><option>APPROACHING_SLA</option><option>SLA_BREACHED</option><option>NOT_APPLICABLE</option></select><select name="sort" onChange={updateFilter} value={filters.sort}><option value="newest">Newest first</option><option value="severity">Severity</option></select></div><section className="register-list" aria-busy={isLoading}>{isLoading ? <p className="empty-state">Loading incidents...</p> : visibleIncidents.length === 0 ? <p className="empty-state">No incidents match these filters.</p> : visibleIncidents.map((incident) => <button className={`register-row ${incident.slaStatus === 'SLA_BREACHED' ? 'breached-row' : ''}`} key={incident.incidentId} onClick={() => navigate(`/dashboard/incidents/${incident.incidentId}`)} type="button"><span className={`severity severity-${incident.severity.toLowerCase()}`}>{incident.severity}</span><div><strong>{incident.title}</strong><span>{incident.incidentId} / {incident.impactedService}</span></div><div className={`sla-badge sla-${incident.slaStatus.toLowerCase()}`}>{incident.slaStatus.replaceAll('_', ' ')}</div><span className="incident-state state-open">{incident.status.replaceAll('_', ' ')}</span></button>)}</section></>}</section></main>;
}

export default IncidentRegisterPage;
