import { SEVERITY_LABELS } from '../utils/constants.js';

// Severity is shown as text plus a distinct shape/icon prefix, not color alone.
const ICONS = { P1: '⛔', P2: '▲', P3: '●' };

export default function SeverityBadge({ severity }) {
  return (
    <span className={`badge badge-severity badge-severity-${severity}`}>
      <span aria-hidden="true">{ICONS[severity] || '●'}</span> {SEVERITY_LABELS[severity] || severity}
    </span>
  );
}
