import { useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import ApiErrorState from '../components/ApiErrorState.jsx';

function RootCauseAnalysisRegisterPage() {
  const [rcas, setRcas] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);

  const loadRcas = () => Promise.all([fetch('/api/root-cause-analyses'), fetch('/api/incidents')]).then(([rcaResponse, incidentResponse]) => {
    if (!rcaResponse.ok || !incidentResponse.ok) {
      const fetchError = new Error('Unable to load root cause analyses.');
      fetchError.status = !rcaResponse.ok ? rcaResponse.status : incidentResponse.status;
      throw fetchError;
    }
    return Promise.all([rcaResponse.json(), incidentResponse.json()]);
  }).then(([rcaItems, incidentItems]) => { setRcas(rcaItems); setIncidents(incidentItems); setError(null); });

  useEffect(() => { loadRcas().catch(setError); }, []);

  const incidentTitles = new Map(incidents.map((incident) => [incident.incidentId, incident.title]));

  return <main className="dashboard-shell"><nav className="topbar" aria-label="Primary navigation"><Link className="brand" to="/"><span className="brand-mark">IR</span><span>Incident Response</span></Link><Link className="nav-button" to="/dashboard">Dashboard</Link></nav><section className="rca-register-layout"><header className="register-header"><div><p className="eyebrow">Root cause analysis</p><h1>RCA register</h1><p>Saved investigations, ordered by their most recent update.</p></div><FileSearch className="rca-register-icon" size={34} aria-hidden="true" /></header>{error ? <ApiErrorState error={error} onRetry={() => loadRcas().catch(setError)} /> : <section className="rca-register-list" aria-label="Saved root cause analyses">{rcas.length ? rcas.map((rca) => <Link className="rca-register-row" key={rca.incidentId} to={`/dashboard/incidents/${rca.incidentId}/rca`}><div><strong>{rca.incidentId}</strong><span>{incidentTitles.get(rca.incidentId) || rca.incidentSummary}</span></div><p>{rca.rootCause}</p><time dateTime={rca.updatedAt}>Updated {new Date(rca.updatedAt).toLocaleString()}</time></Link>) : <p className="empty-state">No root cause analyses have been created yet.</p>}</section>}</section></main>;
}

export default RootCauseAnalysisRegisterPage;
