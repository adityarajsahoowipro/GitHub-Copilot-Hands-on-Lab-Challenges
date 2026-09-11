import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { generateRca, getRca, updateRca } from '../services/rcaService.js';
import { getIncident } from '../services/incidentService.js';
import { formatDateTime } from '../utils/formatters.js';
import HistoryTimeline from '../components/HistoryTimeline.jsx';
import Notification from '../components/Notification.jsx';
import Card from '../components/Card.jsx';
import { IconChevronDown } from '../components/icons.jsx';
import { useNotification } from '../hooks/useNotification.js';

function RcaSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rca-section">
      <button type="button" className="rca-section-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {title}
        <IconChevronDown />
      </button>
      {open && <div className="rca-section-body">{children}</div>}
    </div>
  );
}

function ListEditor({ label, items, onChange }) {
  const addItem = () => onChange([...items, '']);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const updateItem = (index, value) => onChange(items.map((item, i) => (i === index ? value : item)));

  return (
    <div className="list-editor">
      <span className="list-editor-label">{label}</span>
      {items.map((item, index) => (
        <div key={index} className="list-editor-row">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            aria-label={`${label} item ${index + 1}`}
          />
          <button type="button" className="btn btn-secondary" onClick={() => removeItem(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={addItem}>
        Add {label.replace(/s$/, '')}
      </button>
    </div>
  );
}

export default function RcaPage() {
  const { incidentId } = useParams();
  const [status, setStatus] = useState('loading'); // loading | none | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [rca, setRca] = useState(null);
  const [form, setForm] = useState(null);
  const [incident, setIncident] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const { notification, notify, dismiss } = useNotification();

  // Single source of truth for pulling server state; reused by the initial load and by every save.
  const fetchLatest = useCallback(async () => {
    const [freshRca, freshIncident] = await Promise.all([
      getRca(incidentId),
      getIncident(incidentId).catch(() => null)
    ]);
    setRca(freshRca);
    setForm(freshRca);
    setIncident(freshIncident);
    setDirty(false);
    return freshRca;
  }, [incidentId]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      await fetchLatest();
      setStatus('ready');
    } catch (err) {
      if (err.status === 404) {
        setStatus('none');
      } else {
        setErrorMessage(err.message);
        setStatus('error');
      }
    }
  }, [fetchLatest]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateRca(incidentId);
      setRca(data);
      setForm(data);
      setStatus('ready');
      await fetchLatest().catch(() => {});
      notify('success', 'RCA draft generated. Please review before finalizing.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setValidationErrors([]);
    try {
      const updated = await updateRca(incidentId, {
        incidentSummary: form.incidentSummary,
        rootCause: form.rootCause,
        impactedServices: form.impactedServices.filter((s) => s.trim() !== ''),
        resolution: form.resolution,
        lessonsLearned: form.lessonsLearned,
        recommendations: form.recommendations.filter((r) => r.trim() !== '')
      });
      // Render the saved values right away, then reconcile with the server so the RCA record,
      // the incident timestamps and the RCA_UPDATED timeline entry are all current.
      setRca(updated);
      setForm(updated);
      setDirty(false);
      await fetchLatest().catch(() => {});
      notify('success', 'RCA updated successfully.');
    } catch (err) {
      if (err.status === 400) {
        setValidationErrors(err.errors);
      } else if (err.status === 409) {
        notify('error', 'This RCA was updated elsewhere. Reloading the latest version.');
        load();
      } else {
        notify('error', err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return <p className="visually-hidden">Loading RCA…</p>;
  }
  if (status === 'error') return <p className="server-error" role="alert">{errorMessage}</p>;

  const rcaHistory = (incident?.history || []).filter((entry) => entry.type.startsWith('RCA_'));

  return (
    <section className="rca-page">
      <Notification notification={notification} onDismiss={dismiss} />
      <Link className="btn btn-link" to={`/incidents/${incidentId}`}>
        ← Back to Incident
      </Link>
      <div className="page-header">
        <div>
          <h1>Root Cause Analysis — {incidentId}</h1>
          <p>Enterprise-style RCA report with review workflow and change history.</p>
        </div>
      </div>

      {status === 'none' && (
        <Card title="No RCA Yet">
          <p>No RCA has been generated yet for this incident.</p>
          <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate RCA'}
          </button>
        </Card>
      )}

      {status === 'ready' && form && (
        <>
          <p className="review-notice" role="note">
            ⚠ This RCA may include an automatically generated draft. Review all fields carefully before
            treating them as final.
          </p>

          <Card
            title="Report Status"
            actions={
              <span className={`save-indicator ${!dirty ? 'save-indicator-saved' : ''}`}>
                {dirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
            }
          >
            <dl className="rca-meta">
              <div><dt>Generated</dt><dd>{formatDateTime(rca.generatedAt)}</dd></div>
              <div><dt>Last Updated</dt><dd>{formatDateTime(rca.updatedAt)}</dd></div>
            </dl>
            {dirty && <p className="unsaved-warning" role="status">You have unsaved changes.</p>}
            {validationErrors.length > 0 && (
              <ul className="server-error" role="alert">
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </Card>

          <form onSubmit={handleSave}>
            <RcaSection title="Incident Summary">
              <div className="form-field">
                <label htmlFor="incidentSummary">Incident Summary</label>
                <textarea
                  id="incidentSummary"
                  rows={3}
                  value={form.incidentSummary}
                  onChange={(e) => updateField('incidentSummary', e.target.value)}
                />
              </div>
            </RcaSection>

            <RcaSection title="Root Cause">
              <div className="form-field">
                <label htmlFor="rootCause">Root Cause</label>
                <textarea
                  id="rootCause"
                  rows={3}
                  value={form.rootCause}
                  onChange={(e) => updateField('rootCause', e.target.value)}
                />
              </div>
            </RcaSection>

            <RcaSection title="Impact Analysis">
              <ListEditor label="Impacted Services" items={form.impactedServices} onChange={(v) => updateField('impactedServices', v)} />
            </RcaSection>

            <RcaSection title="Resolution">
              <div className="form-field">
                <label htmlFor="resolution">Resolution</label>
                <textarea
                  id="resolution"
                  rows={3}
                  value={form.resolution}
                  onChange={(e) => updateField('resolution', e.target.value)}
                />
              </div>
            </RcaSection>

            <RcaSection title="Lessons Learned">
              <div className="form-field">
                <label htmlFor="lessonsLearned">Lessons Learned</label>
                <textarea
                  id="lessonsLearned"
                  rows={3}
                  value={form.lessonsLearned}
                  onChange={(e) => updateField('lessonsLearned', e.target.value)}
                />
              </div>
            </RcaSection>

            <RcaSection title="Recommendations">
              <ListEditor label="Recommendations" items={form.recommendations} onChange={(v) => updateField('recommendations', v)} />
            </RcaSection>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save RCA'}
            </button>
          </form>

          {rcaHistory.length > 0 && (
            <Card title="RCA Activity">
              <HistoryTimeline history={rcaHistory} />
            </Card>
          )}
        </>
      )}
    </section>
  );
}
