import { getAllIncidents } from '../repositories/incidentRepository.js';
import { computeSla, SLA_STATUS } from '../utils/slaUtils.js';

const STATUSES = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED'];
const SEVERITIES = ['P1', 'P2', 'P3'];

// Aggregates dashboard metrics across every stored incident (filters do not apply here).
export async function getDashboardMetrics() {
  const incidents = await getAllIncidents();
  const now = new Date();

  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  const bySeverity = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
  const bySla = {
    [SLA_STATUS.WITHIN_SLA]: 0,
    [SLA_STATUS.APPROACHING_SLA]: 0,
    [SLA_STATUS.SLA_BREACHED]: 0,
    [SLA_STATUS.NOT_APPLICABLE]: 0
  };

  for (const incident of incidents) {
    if (byStatus[incident.status] !== undefined) byStatus[incident.status] += 1;
    if (bySeverity[incident.severity] !== undefined) bySeverity[incident.severity] += 1;
    const sla = computeSla(incident, now);
    bySla[sla.status] += 1;
  }

  return {
    total: incidents.length,
    byStatus,
    bySeverity,
    bySla
  };
}
