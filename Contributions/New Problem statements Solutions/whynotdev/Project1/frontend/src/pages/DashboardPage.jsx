import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ClipboardList, Network, Plus, SearchCheck, ShieldAlert } from 'lucide-react';
import ApiErrorState from '../components/ApiErrorState.jsx';

function DashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadIncidents = () => fetch('/api/incidents').then((response) => {
      if (!response.ok) {
        const fetchError = new Error('Unable to load incidents.');
        fetchError.status = response.status;
        throw fetchError;
      }
      return response.json();
    }).then((items) => { setIncidents(items); setError(null); }).catch((fetchError) => { setIncidents([]); setError(fetchError); });
    loadIncidents();
    const interval = window.setInterval(loadIncidents, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const count = (field, value) => incidents.filter((incident) => incident[field] === value).length;
  const maxSeverityCount = Math.max(1, ...['P1', 'P2', 'P3'].map((severity) => count('severity', severity)));
  const activeIncidents = incidents.filter((incident) => incident.status !== 'CLOSED');
  const attentionIncidents = activeIncidents.filter((incident) => incident.severity === 'P1' || !incident.owner?.trim()).slice(0, 4);

  return (
    <main className="dashboard-shell dashboard-console">
      <nav className="topbar" aria-label="Primary navigation">
        <Link className="brand" to="/" aria-label="Incident Response home"><span className="brand-mark">IR</span><span>Incident Response</span></Link>
        <div className="console-actions"><Link className="icon-link" title="Incident register" to="/dashboard/incidents"><ClipboardList size={18} /><span className="sr-only">Incidents</span></Link></div>
      </nav>
      <section className="dashboard-header">
        <div><p className="eyebrow">Operations command center</p><h1>Today's response</h1><p>Track active work, route ownership, and move incidents through their lifecycle.</p></div>
        <span className="monitoring-state"><Activity size={16} /><span>Systems monitored</span></span>
      </section>
      {error ? <ApiErrorState error={error} onRetry={() => window.location.reload()} /> : <><section className="metric-grid" aria-label="Incident metrics">
        <Link className="metric-card" to="/dashboard/incidents"><span>Total incidents</span><strong>{incidents.length}</strong></Link>
        <Link className="metric-card" to="/dashboard/incidents?status=OPEN"><span>Open</span><strong>{count('status', 'OPEN')}</strong></Link>
        <Link className="metric-card" to="/dashboard/incidents?status=IN_PROGRESS"><span>In progress</span><strong>{count('status', 'IN_PROGRESS')}</strong></Link>
        <Link className="metric-card" to="/dashboard/incidents?status=MITIGATED"><span>Mitigated</span><strong>{count('status', 'MITIGATED')}</strong></Link>
        <Link className="metric-card" to="/dashboard/incidents?status=CLOSED"><span>Closed</span><strong>{count('status', 'CLOSED')}</strong></Link>
        <Link className="metric-card sla-good" to="/dashboard/incidents?slaStatus=WITHIN_SLA"><span>Within SLA</span><strong>{count('slaStatus', 'WITHIN_SLA')}</strong></Link>
        <Link className="metric-card sla-warning" to="/dashboard/incidents?slaStatus=APPROACHING_SLA"><span>Approaching SLA</span><strong>{count('slaStatus', 'APPROACHING_SLA')}</strong></Link>
        <Link className="metric-card sla-breach" to="/dashboard/incidents?slaStatus=SLA_BREACHED"><span>SLA breached</span><strong>{count('slaStatus', 'SLA_BREACHED')}</strong></Link>
      </section>
      <section className="severity-chart" aria-label="Incidents by severity">
        <div><p className="eyebrow">Severity distribution</p><h2>Where attention is needed</h2></div>
        <div className="bar-list">{['P1', 'P2', 'P3'].map((severity) => <div className="bar-row" key={severity}><span className={`severity severity-${severity.toLowerCase()}`}>{severity}</span><div className="bar-track"><span style={{ width: `${count('severity', severity) / maxSeverityCount * 100}%` }} /></div><strong>{count('severity', severity)}</strong></div>)}</div>
      </section>
      <section className="dashboard-queues" aria-label="Response queues"><article><p className="eyebrow">Attention queue</p><h2>{attentionIncidents.length ? 'Prioritize these incidents' : 'No immediate attention required'}</h2>{attentionIncidents.length ? <div>{attentionIncidents.map((incident) => <Link key={incident.incidentId} to={`/dashboard/incidents/${incident.incidentId}`}><span className={`severity severity-${incident.severity.toLowerCase()}`}>{incident.severity}</span><strong>{incident.title}</strong><small>{incident.owner?.trim() || 'Unassigned'} / {incident.incidentId}</small></Link>)}</div> : <p>All active incidents have an owner and no P1 response is open.</p>}</article><article><p className="eyebrow">Response health</p><h2>Ownership coverage</h2><strong className="coverage-number">{activeIncidents.length ? Math.round((activeIncidents.filter((incident) => incident.owner?.trim()).length / activeIncidents.length) * 100) : 100}%</strong><p>{activeIncidents.filter((incident) => !incident.owner?.trim()).length} active incident{activeIncidents.filter((incident) => !incident.owner?.trim()).length === 1 ? '' : 's'} without an owner.</p></article></section>
      <section className="feature-grid" aria-label="Incident management actions">
        
        
        <Link className="feature-card" to="/dashboard/incidents/new"><Plus className="feature-icon" size={21} /><h2>Create incident</h2><p>Capture the title, severity, impacted service, and first owner for a new production incident.</p><span className="feature-action">Open form</span></Link>
        <Link className="feature-card" to="/dashboard/incidents"><ClipboardList className="feature-icon" size={21} /><h2>View all incidents</h2><p>Review the incident register, then select an entry to see its current ownership and impact.</p><span className="feature-action">Open register</span></Link>
        <Link className="feature-card" to="/dashboard/rcas"><SearchCheck className="feature-icon" size={21} /><h2>Root cause analysis</h2><p>Review saved root cause analyses and open an investigation to see its complete details.</p><span className="feature-action">Open RCA register</span></Link>
        <Link className="feature-card" to="/dashboard/related-incidents"><Network className="feature-icon" size={21} /><h2>Related incidents</h2><p>Compare incident signals to find and link events that may share an underlying cause.</p><span className="feature-action"><ShieldAlert size={15} />Detect connections</span></Link>
      </section>
      </>}
    </main>
  );
}

export default DashboardPage;