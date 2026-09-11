export const SEVERITIES = ['P1', 'P2', 'P3'];
export const SEVERITY_LABELS = { P1: 'P1 - Critical', P2: 'P2 - High', P3: 'P3 - Medium' };

export const STATUSES = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED'];
export const STATUS_LABELS = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  MITIGATED: 'Mitigated',
  CLOSED: 'Closed'
};

// Maps each status to the single next valid transition (or null if terminal).
export const NEXT_STATUS = {
  OPEN: 'INVESTIGATING',
  INVESTIGATING: 'MITIGATED',
  MITIGATED: 'CLOSED',
  CLOSED: null
};

export const NEXT_ACTION_LABEL = {
  OPEN: 'Start Investigation',
  INVESTIGATING: 'Mark as Mitigated',
  MITIGATED: 'Close Incident',
  CLOSED: null
};

export const SLA_STATUS_LABELS = {
  WITHIN_SLA: 'Within SLA',
  APPROACHING_SLA: 'Approaching SLA',
  SLA_BREACHED: 'SLA Breached',
  NOT_APPLICABLE: 'Not Applicable'
};
