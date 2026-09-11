import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function RootCauseAnalysisPage() {
  const { incidentId } = useParams();
  const [rca, setRca] = useState(null);
  const [actions, setActions] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 10000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    fetch(`/api/incidents/${incidentId}/rca`).then(async (response) => response.ok ? response.json() : null).then((item) => { setRca(item); setLoadError(null); }).catch(() => setLoadError('Unable to load the root cause analysis.'));
  }, [incidentId]);

  useEffect(() => {
    if (!rca) return;
    fetch(`/api/incidents/${incidentId}/rca/actions`).then((response) => response.ok ? response.json() : []).then(setActions).catch(() => setActions([]));
  }, [incidentId, rca]);

  const generate = async () => {
    const response = await fetch(`/api/incidents/${incidentId}/rca`, { method: 'POST' });
    const nextRca = await response.json();
    if (!response.ok) { setToast({ message: nextRca.message || 'Unable to generate the RCA.', type: 'error' }); return; }
    setRca(nextRca);
    setToast({ message: 'RCA template generated. Add accountable follow-up actions below.', type: 'success' });
  };

  const save = async (event) => {
    event.preventDefault();
    const update = Object.fromEntries(new FormData(event.currentTarget));
    const hasChanges = Object.entries(update).some(([field, value]) => value !== rca[field]);
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/rca`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) });
      const nextRca = await response.json();
      if (!response.ok) { setToast({ message: nextRca.message || 'Unable to update the RCA.', type: 'warning' }); return; }
      setRca(nextRca);
      setToast({ message: 'RCA updated. You can now add and assign follow-up actions below.', type: 'success' });
    } catch {
      setToast({ message: 'Unable to update the RCA. Check your connection and try again.', type: 'error' });
    } finally { setIsSaving(false); }
  };

  const addAction = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`/api/incidents/${incidentId}/rca/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget)), status: 'OPEN' }) });
      const action = await response.json();
      if (!response.ok) { setToast({ message: action.message || 'Unable to add the RCA action.', type: 'warning' }); return; }
      setActions((current) => [...current, action]);
      event.currentTarget.reset();
      setToast({ message: 'RCA action added and assigned.', type: 'success' });
    } catch {
      setToast({ message: 'Unable to add the RCA action. Check your connection and try again.', type: 'error' });
    }
  };

  const completeAction = async (actionId) => {
    const response = await fetch(`/api/incidents/${incidentId}/rca/actions/${actionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETE' }) });
    const action = await response.json();
    if (!response.ok) { setToast({ message: action.message || 'Unable to complete the RCA action.', type: 'error' }); return; }
    setActions((current) => current.map((item) => item.actionId === actionId ? action : item));
    setToast({ message: 'RCA action marked complete.', type: 'success' });
  };

  return <main className="dashboard-shell"><nav className="topbar" aria-label="Primary navigation"><Link className="brand" to="/"><span className="brand-mark">IR</span><span>Incident Response</span></Link><Link className="nav-button" to="/dashboard/incidents">Incident register</Link></nav><section className="create-layout"><header className="create-header"><p className="eyebrow">Feature 4 / Root cause analysis</p><h1>RCA for {incidentId}</h1><p>Generate a structured starting point, then review and update the report.</p></header>{loadError ? <p className="inline-error" role="alert">{loadError}</p> : rca ? <><form className="create-form rca-form" onSubmit={save}>{[['incidentSummary', 'Incident summary'], ['rootCause', 'Root cause'], ['impactedServices', 'Impacted services'], ['resolution', 'Resolution'], ['lessonsLearned', 'Lessons learned'], ['recommendations', 'Recommendations']].map(([name, label]) => <label className="form-span" key={name}>{label}<textarea defaultValue={rca[name]} name={name} required /></label>)}<div className="form-actions form-span"><span>Generated {new Date(rca.generatedAt).toLocaleString()}</span><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving...' : 'Save RCA'}</button></div></form><section className="rca-actions"><header><div><p className="eyebrow">RCA governance</p><h2>Follow-up actions</h2></div><span>{actions.filter((action) => action.status === 'OPEN').length} open</span></header>{actions.length ? <div className="rca-action-list">{actions.map((action) => <article key={action.actionId}><div><strong>{action.description}</strong><span>{action.owner} / due {action.dueDate}</span></div><small>{action.status.replace('_', ' ')}</small>{action.status === 'OPEN' && <button className="nav-button" onClick={() => completeAction(action.actionId)} type="button">Complete</button>}</article>)}</div> : <p className="empty-state">No follow-up actions have been assigned.</p>}<form className="rca-action-form" onSubmit={addAction}><input aria-label="Action description" name="description" placeholder="Preventive action" required /><input aria-label="Action owner" name="owner" placeholder="Owner" required /><input aria-label="Action due date" name="dueDate" type="date" required /><button className="nav-button" type="submit">Add action</button></form></section></> : <button className="primary-button rca-generate" onClick={generate} type="button">Generate RCA template</button>}</section>{toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}</main>;
}

export default RootCauseAnalysisPage;