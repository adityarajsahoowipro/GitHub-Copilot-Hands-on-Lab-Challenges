import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getIncident, updateIncident, getRelatedIncidents, linkIncidents } from '../services/incidentService.js';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SlaDetails from '../components/SlaDetails.jsx';
import LifecycleProgress from '../components/LifecycleProgress.jsx';
import HistoryTimeline from '../components/HistoryTimeline.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Notification from '../components/Notification.jsx';
import Card from '../components/Card.jsx';
import SkeletonRows from '../components/SkeletonRows.jsx';
import { useConfirm } from '../hooks/useConfirm.js';
import { useNotification } from '../hooks/useNotification.js';
import { SEVERITIES, STATUSES, STATUS_LABELS, NEXT_STATUS, NEXT_ACTION_LABEL } from '../utils/constants.js';
import { formatDateTime } from '../utils/formatters.js';

export default function IncidentDetailPage() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [errorMessage, setErrorMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [ownerDraft, setOwnerDraft] = useState('');
  const [severityDraft, setSeverityDraft] = useState('');
  const [serviceDraft, setServiceDraft] = useState('');
  const [editError, setEditError] = useState('');

  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();
  const { notification, notify, dismiss } = useNotification();

  const loadIncident = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getIncident(incidentId);
      setIncident(data);
      setStatusDraft(data.status);
      setOwnerDraft(data.owner);
      setSeverityDraft(data.severity);
      setServiceDraft(data.impactedService);
      setStatus('ready');
      getRelatedIncidents(incidentId)
        .then(setRelated)
        .catch(() => setRelated([]));
    } catch (err) {
      if (err.status === 404) {
        setStatus('notfound');
      } else {
        setErrorMessage(err.message);
        setStatus('error');
      }
    }
  }, [incidentId]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  const applyUpdate = async (payload, successMessage) => {
    setUpdating(true);
    try {
      const updated = await updateIncident(incidentId, payload);
      // Replacing the incident refreshes details, history, lifecycle progress and updatedAt in one go.
      setIncident(updated);
      setStatusDraft(updated.status);
      setOwnerDraft(updated.owner);
      setSeverityDraft(updated.severity);
      setServiceDraft(updated.impactedService);
      setEditError('');
      notify('success', successMessage);
      return true;
    } catch (err) {
      setEditError(err.message);
      notify('error', err.message);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleTransition = async () => {
    const nextStatus = NEXT_STATUS[incident.status];
    if (!nextStatus) return;
    const confirmed = await confirm(`Change status from ${incident.status} to ${nextStatus}?`);
    if (!confirmed) return;
    applyUpdate({ status: nextStatus }, `Status updated to ${nextStatus}.`);
  };

  const handleEditSave = (event) => {
    event.preventDefault();
    if (updating) return;

    const owner = ownerDraft.trim();
    const impactedService = serviceDraft.trim();
    if (!impactedService) {
      setEditError('Impacted service cannot be blank.');
      return;
    }

    const payload = {};
    if (statusDraft !== incident.status) payload.status = statusDraft;
    if (owner !== incident.owner) payload.owner = owner;
    if (severityDraft !== incident.severity) payload.severity = severityDraft;
    if (impactedService !== incident.impactedService) payload.impactedService = impactedService;

    if (Object.keys(payload).length === 0) {
      setEditError('No changes to save.');
      return;
    }
    if (payload.owner === '') {
      setEditError('Owner cannot be blank.');
      return;
    }

    setEditError('');
    applyUpdate(payload, 'Incident updated successfully.');
  };

  const handleLink = async (relatedIncidentId) => {
    try {
      await linkIncidents(incidentId, relatedIncidentId);
      notify('success', `Linked to ${relatedIncidentId}.`);
      const refreshed = await getRelatedIncidents(incidentId);
      setRelated(refreshed);
    } catch (err) {
      notify('error', err.message);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <p className="visually-hidden">Loading incident…</p>
        <SkeletonRows rows={4} columns={3} />
      </>
    );
  }
  if (status === 'notfound') {
    return (
      <section>
        <h1>Incident Not Found</h1>
        <p>No incident exists with ID "{incidentId}".</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/incidents')}>
          Back to Incident List
        </button>
      </section>
    );
  }
  if (status === 'error') {
    return <p className="server-error" role="alert">{errorMessage}</p>;
  }

  const nextAction = NEXT_ACTION_LABEL[incident.status];

  return (
    <section className="incident-detail">
      <Notification notification={notification} onDismiss={dismiss} />
      <ConfirmDialog message={confirmState?.message} onConfirm={handleConfirm} onCancel={handleCancel} />

      <button type="button" className="btn btn-link" onClick={() => navigate('/incidents')}>
        ← Back to Incident List
      </button>

      <div className="incident-detail-header">
        <div className="incident-detail-heading">
          <span className="incident-detail-id">{incident.incidentId}</span>
          <h1>{incident.title}</h1>
          <div className="incident-detail-badges">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <p className="incident-detail-meta">
            <span>Owner: {incident.owner || '—'}</span>
            <span>Created: {formatDateTime(incident.createdAt)}</span>
          </p>
        </div>
        {nextAction && (
          <button type="button" className="btn btn-primary" onClick={handleTransition} disabled={updating}>
            {updating ? 'Updating…' : nextAction}
          </button>
        )}
      </div>

      <LifecycleProgress status={incident.status} />

      <div className="card-grid">
        <Card title="Incident Information">
          <dl className="incident-fields">
            <div><dt>Incident ID</dt><dd>{incident.incidentId}</dd></div>
            <div><dt>Description</dt><dd>{incident.description || 'No description provided.'}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(incident.createdAt)}</dd></div>
            <div><dt>Last Updated</dt><dd>{formatDateTime(incident.updatedAt)}</dd></div>
          </dl>
        </Card>

        <Card title="SLA Information">
          <SlaDetails sla={incident.sla} />
        </Card>

        <Card title="Update Incident" description="Change status, owner, severity or impacted service.">
          <form className="incident-edit-form" onSubmit={handleEditSave}>
            <div className="action-panel-grid">
              <div className="form-field">
                <label htmlFor="status-input">Status</label>
                <div className="status-field">
                  <select
                    id="status-input"
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    disabled={updating}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <StatusBadge status={incident.status} />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="owner-input">Owner</label>
                <input id="owner-input" type="text" value={ownerDraft} onChange={(e) => setOwnerDraft(e.target.value)} disabled={updating} />
              </div>

              <div className="form-field">
                <label htmlFor="severity-input">Severity</label>
                <select id="severity-input" value={severityDraft} onChange={(e) => setSeverityDraft(e.target.value)} disabled={updating}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="service-input">Impacted Service</label>
                <input id="service-input" type="text" value={serviceDraft} onChange={(e) => setServiceDraft(e.target.value)} disabled={updating} />
              </div>
            </div>

            {editError && <p className="server-error" role="alert">{editError}</p>}

            <button type="submit" className="btn btn-primary" disabled={updating}>
              {updating ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Card>

        <Card title="RCA Summary" actions={<Link className="btn btn-secondary btn-sm" to={`/incidents/${incidentId}/rca`}>View / Generate RCA</Link>}>
          <p className="form-hint">Root cause analysis is tracked on a dedicated report page, including summary, impact, resolution and lessons learned.</p>
        </Card>

        {related.length > 0 && (
          <Card title="Related Incidents (suggested)">
            <ul className="related-list">
              {related.map((r) => (
                <li key={r.incidentId} className="related-item">
                  <Link to={`/incidents/${r.incidentId}`}>{r.incidentId} — {r.title}</Link>
                  <ul className="related-reasons">
                    {r.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                  </ul>
                  {r.linked ? (
                    <span className="linked-badge">Linked</span>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleLink(r.incidentId)}>
                      Confirm Link
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Activity Timeline">
          <HistoryTimeline history={incident.history} />
        </Card>
      </div>
    </section>
  );
}
