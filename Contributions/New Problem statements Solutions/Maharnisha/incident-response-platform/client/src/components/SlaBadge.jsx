import { SLA_STATUS_LABELS } from '../utils/constants.js';

const ICONS = {
  WITHIN_SLA: '✓',
  APPROACHING_SLA: '!',
  SLA_BREACHED: '⚠',
  NOT_APPLICABLE: '–'
};

export default function SlaBadge({ status }) {
  return (
    <span className={`badge badge-sla badge-sla-${status}`}>
      <span aria-hidden="true">{ICONS[status] || ''}</span> {SLA_STATUS_LABELS[status] || status}
    </span>
  );
}
