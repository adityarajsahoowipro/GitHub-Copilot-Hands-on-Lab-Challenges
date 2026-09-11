import { formatDateTime } from '../utils/formatters.js';

const TYPE_LABELS = {
  INCIDENT_CREATED: 'Incident Created',
  STATUS_UPDATED: 'Status Updated',
  STATUS_CHANGED: 'Status Updated', // legacy entries seeded before the type was renamed
  OWNER_CHANGED: 'Owner Changed',
  SEVERITY_CHANGED: 'Severity Changed',
  IMPACTED_SERVICE_CHANGED: 'Impacted Service Changed',
  SLA_BREACHED: 'SLA Breached',
  RCA_GENERATED: 'RCA Generated',
  RCA_UPDATED: 'RCA Updated'
};

const TYPE_ICONS = {
  INCIDENT_CREATED: '＋',
  STATUS_UPDATED: '⇄',
  STATUS_CHANGED: '⇄',
  OWNER_CHANGED: '◎',
  SEVERITY_CHANGED: '▲',
  IMPACTED_SERVICE_CHANGED: '▦',
  SLA_BREACHED: '⚠',
  RCA_GENERATED: '✓',
  RCA_UPDATED: '✎'
};

export default function HistoryTimeline({ history }) {
  if (!history || history.length === 0) {
    return <p>No activity recorded yet.</p>;
  }

  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <ol className="history-timeline">
      {sorted.map((entry, index) => (
        <li key={`${entry.timestamp}-${index}`} className={`history-entry history-entry-${entry.type}`}>
          <span className="history-entry-icon" aria-hidden="true">{TYPE_ICONS[entry.type] || '•'}</span>
          <div className="history-entry-header">
            <span className="history-entry-type">{TYPE_LABELS[entry.type] || entry.type}</span>
            <time dateTime={entry.timestamp}>{formatDateTime(entry.timestamp)}</time>
          </div>
          <p className="history-entry-message">{entry.message}</p>
        </li>
      ))}
    </ol>
  );
}
