import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const initialForm = {
  title: '',
  description: '',
  severity: '',
  owner: '',
  impactedService: '',
};

function CreateIncidentPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [createdIncident, setCreatedIncident] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 10000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Enter an incident title.';
    if (!form.severity) nextErrors.severity = 'Select a severity level.';
    if (!form.impactedService.trim()) nextErrors.impactedService = 'Enter the impacted service.';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          impactedService: form.impactedService.trim(),
          owner: form.owner.trim(),
          description: form.description.trim(),
        }),
      });
      const incident = await response.json();
      if (!response.ok) {
        setToast({ message: incident.message || 'Unable to create the incident.', type: 'warning' });
        return;
      }
      setForm(initialForm);
      setCreatedIncident(incident);
      setToast({ message: `${incident.incidentId} created with status OPEN.`, type: 'success' });
    } catch (error) {
      setToast({ message: error.message || 'Unable to create the incident.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <Link className="brand" to="/"><span className="brand-mark">IR</span><span>Incident Response</span></Link>
        <Link className="nav-button" to="/dashboard">Back to dashboard</Link>
      </nav>
      <section className="create-layout">
        <header className="create-header"><p className="eyebrow">Incident management</p><h1>Create incident</h1><p>Record the initial signal. New incidents start in the OPEN state and receive a unique incident ID automatically.</p></header>
        {createdIncident ? <section className="created-confirmation" aria-live="polite"><p className="eyebrow">Incident created</p><strong>{createdIncident.incidentId}</strong><p>{createdIncident.title} is now OPEN and assigned to {createdIncident.owner || 'the unassigned queue'}.</p><div><Link className="text-link" to="/dashboard/incidents">View all incidents</Link><button className="primary-button" onClick={() => { setCreatedIncident(null); setToast(null); }} type="button">Create another</button></div></section> : <form className="create-form" noValidate onSubmit={handleSubmit}>
          <label>Incident title<input aria-invalid={Boolean(errors.title)} name="title" onChange={updateField} value={form.title} />{errors.title && <small>{errors.title}</small>}</label>
          <label>Severity<select aria-invalid={Boolean(errors.severity)} name="severity" onChange={updateField} value={form.severity}><option value="">Select severity</option><option value="P1">P1 - Critical</option><option value="P2">P2 - High</option><option value="P3">P3 - Medium</option></select>{errors.severity && <small>{errors.severity}</small>}</label>
          <label>Impacted service<input aria-invalid={Boolean(errors.impactedService)} name="impactedService" onChange={updateField} value={form.impactedService} />{errors.impactedService && <small>{errors.impactedService}</small>}</label>
          <label>Owner<input name="owner" onChange={updateField} value={form.owner} /></label>
          <label className="form-span">Description<textarea name="description" onChange={updateField} value={form.description} /></label>
          <div className="form-actions form-span"><Link className="text-link" to="/dashboard">Cancel</Link><button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Sending flares...' : 'Create incident'}</button></div>
        </form>}
      </section>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}
    </main>
  );
}

export default CreateIncidentPage;