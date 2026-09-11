import SlaBadge from './SlaBadge.jsx';
import ProgressBar from './ProgressBar.jsx';
import { formatDuration, formatDateTime } from '../utils/formatters.js';

const PROGRESS_TONE = {
  WITHIN_SLA: 'success',
  APPROACHING_SLA: 'warning',
  SLA_BREACHED: 'danger',
  NOT_APPLICABLE: 'primary'
};

// Displays the full computed SLA object returned by the backend for one incident.
export default function SlaDetails({ sla }) {
  if (!sla) return null;

  const elapsed = sla.elapsedMilliseconds ?? 0;
  const remaining = sla.remainingMilliseconds ?? 0;
  const total = elapsed + Math.max(remaining, 0);
  const percentElapsed = total > 0 ? (elapsed / total) * 100 : 0;

  return (
    <div className="sla-details">
      <div className="sla-details-header">
        <SlaBadge status={sla.status} />
        {sla.requiresEscalation && (
          <span className="escalation-warning" role="alert">
            ⚠ Escalation recommended
          </span>
        )}
      </div>
      {sla.targetHours && (
        <div className="sla-progress-row">
          <div className="sla-progress-labels">
            <span>Time elapsed</span>
            <span>Deadline: {sla.deadline ? formatDateTime(sla.deadline) : 'N/A'}</span>
          </div>
          <ProgressBar percent={percentElapsed} tone={PROGRESS_TONE[sla.status] || 'primary'} label="SLA time elapsed" />
        </div>
      )}
      <dl className="sla-details-grid">
        <div>
          <dt>Target</dt>
          <dd>{sla.targetHours ? `${sla.targetHours}h` : 'N/A'}</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{formatDuration(sla.elapsedMilliseconds)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatDuration(sla.remainingMilliseconds)}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{sla.deadline ? formatDateTime(sla.deadline) : 'N/A'}</dd>
        </div>
      </dl>
      <p className="sla-message">{sla.message}</p>
    </div>
  );
}
