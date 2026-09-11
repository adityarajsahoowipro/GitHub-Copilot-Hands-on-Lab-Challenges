import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth } from '../services/incidentService.js';

export default function LandingPage() {
  const [healthState, setHealthState] = useState('loading'); // loading | connected | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then(() => {
        if (!cancelled) setHealthState('connected');
      })
      .catch((err) => {
        if (!cancelled) {
          setHealthState('error');
          setErrorMessage(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="landing-page">
      <h1>Incident Response Platform</h1>
      <p>
        Track production incidents, control lifecycle transitions, monitor SLA compliance, and
        capture root cause analyses in one place. This demo uses fictional sample data only.
      </p>

      <div className={`health-status health-status-${healthState}`} role="status">
        {healthState === 'loading' && <span>Checking backend connection…</span>}
        {healthState === 'connected' && <span>✓ Backend connected</span>}
        {healthState === 'error' && <span>⚠ Backend unavailable: {errorMessage}</span>}
      </div>

      <div className="landing-actions">
        <Link className="btn btn-primary" to="/dashboard">
          View Dashboard
        </Link>
        <Link className="btn btn-secondary" to="/incidents/new">
          Report an Incident
        </Link>
      </div>
    </section>
  );
}
