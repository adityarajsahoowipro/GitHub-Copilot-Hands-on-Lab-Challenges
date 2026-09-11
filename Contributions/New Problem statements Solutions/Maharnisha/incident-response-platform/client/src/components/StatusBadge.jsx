import { STATUS_LABELS } from '../utils/constants.js';

export default function StatusBadge({ status }) {
  return <span className={`badge badge-status badge-status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}
