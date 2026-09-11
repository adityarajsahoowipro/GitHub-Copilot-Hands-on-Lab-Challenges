import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function RelatedIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [incidentId, setIncidentId] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/incidents').then((response) => response.json()).then(setIncidents).catch(() => setMessage('Unable to load incidents.'));
  }, []);

  const findRelated = async () => {
    if (!incidentId) { setMessage('Select an incident to compare.'); return; }
    const response = await fetch(`/api/incidents/${incidentId}/related`);
    const data = await response.json();
    if (!response.ok) { setMessage(data.message || 'Unable to compare incidents.'); return; }
    setSuggestions(data);
    setMessage(data.length ? `${data.length} possible related incident${data.length === 1 ? '' : 's'} found.` : 'No related incidents found with the current matching rules.');
  };

  const linkIncidents = async (relatedIncidentId) => {
    const response = await fetch(`/api/incidents/${incidentId}/related/${relatedIncidentId}`, { method: 'POST' });
    if (!response.ok) { const data = await response.json(); setMessage(data.message || 'Unable to link incidents.'); return; }
    setSuggestions((current) => current.map((suggestion) => suggestion.incident.incidentId === relatedIncidentId ? { ...suggestion, linked: true } : suggestion));
    setMessage(`${incidentId} linked to ${relatedIncidentId}.`);
  };

  return (
    <main className="dashboard-shell">
      <nav className="topbar" aria-label="Primary navigation"><Link className="brand" to="/"><span className="brand-mark">IR</span><span>Incident Response</span></Link><Link className="nav-button" to="/dashboard">Dashboard</Link></nav>
      <section className="related-layout">
        <header className="create-header"><p className="eyebrow">Optional extension</p><h1>Related incidents</h1><p>Compare a selected incident against service, shared title or description keywords, and a 30-minute creation window.</p></header>
        <div className="related-controls"><select aria-label="Incident to compare" onChange={(event) => setIncidentId(event.target.value)} value={incidentId}><option value="">Select incident</option>{incidents.map((incident) => <option key={incident.incidentId} value={incident.incidentId}>{incident.incidentId} - {incident.title}</option>)}</select><button className="primary-button" onClick={findRelated} type="button">Find related incidents</button></div>
        {message && <p className="related-message" role="status">{message}</p>}
        <section className="suggestion-list" aria-label="Related incident suggestions">{suggestions.map((suggestion) => <article className="suggestion-card" key={suggestion.incident.incidentId}><div><span className={`severity severity-${suggestion.incident.severity.toLowerCase()}`}>{suggestion.incident.severity}</span><h2>{suggestion.incident.title}</h2><p>{suggestion.incident.incidentId} / {suggestion.incident.impactedService}</p></div><div className="reason-list"><strong>Match reasons</strong>{suggestion.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div><button className="nav-button" disabled={suggestion.linked} onClick={() => linkIncidents(suggestion.incident.incidentId)} type="button">{suggestion.linked ? 'Linked' : 'Link incidents'}</button></article>)}</section>
      </section>
    </main>
  );
}

export default RelatedIncidentsPage;