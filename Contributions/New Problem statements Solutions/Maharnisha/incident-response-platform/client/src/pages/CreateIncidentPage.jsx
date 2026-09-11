import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIncident } from '../services/incidentService.js';
import Card from '../components/Card.jsx';
import { SEVERITIES, SEVERITY_LABELS } from '../utils/constants.js';
const initialForm = { title: '', description: '', severity: '', owner: '', impactedService: '' };

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.severity) errors.severity = 'Severity is required.';
  if (!form.impactedService.trim()) errors.impactedService = 'Impacted service is required.';
  return errors;
}

export default function CreateIncidentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [duplicateIncidentId, setDuplicateIncidentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return; // guard against duplicate submissions

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setServerError('');
    setDuplicateIncidentId('');
    try {
      const incident = await createIncident(form);
      navigate(`/incidents/${incident.incidentId}`);
    } catch (err) {
      setServerError(err.message);
      setDuplicateIncidentId(err.existingIncidentId || '');
      setSubmitting(false);
    }
  };

  return (
    <section className="form-page">
      <div className="page-header">
        <div>
          <h1>Report an Incident</h1>
          <p>Provide the details below so responders can triage quickly.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <Card title="Basic Details" description="What happened and why it matters.">
          <div className="form-field">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" value={form.title} onChange={handleChange('title')} aria-invalid={!!fieldErrors.title} aria-describedby={fieldErrors.title ? 'title-error' : undefined} />
            {fieldErrors.title && <p id="title-error" className="field-error">{fieldErrors.title}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={form.description} onChange={handleChange('description')} rows={4} />
          </div>
        </Card>

        <Card title="Severity Selection" description="How critical is the impact right now?">
          <div className="form-field">
            <label htmlFor="severity">Severity</label>
            <select id="severity" value={form.severity} onChange={handleChange('severity')} aria-invalid={!!fieldErrors.severity} aria-describedby={fieldErrors.severity ? 'severity-error' : undefined}>
              <option value="">Select severity…</option>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_LABELS[severity]}
                </option>
              ))}
            </select>
            {fieldErrors.severity && <p id="severity-error" className="field-error">{fieldErrors.severity}</p>}
          </div>
        </Card>

        <Card title="Ownership" description="Who is currently responsible for this incident?">
          <div className="form-field">
            <label htmlFor="owner">Owner</label>
            <input id="owner" type="text" value={form.owner} onChange={handleChange('owner')} />
          </div>
        </Card>

        <Card title="Impacted Service" description="Which service or system is affected?">
          <div className="form-field">
            <label htmlFor="impactedService">Impacted Service</label>
            <input id="impactedService" type="text" value={form.impactedService} onChange={handleChange('impactedService')} aria-invalid={!!fieldErrors.impactedService} aria-describedby={fieldErrors.impactedService ? 'impactedService-error' : undefined} />
            {fieldErrors.impactedService && <p id="impactedService-error" className="field-error">{fieldErrors.impactedService}</p>}
          </div>
        </Card>

        {serverError && (
          <div className="server-error" role="alert">
            <p>{serverError}</p>
            {duplicateIncidentId && (
              <button
                type="button"
                className="btn btn-link"
                onClick={() => navigate(`/incidents/${duplicateIncidentId}`)}
              >
                View Existing Incident
              </button>
            )}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Incident'}
        </button>
      </form>
    </section>
  );
}
