import {
  getRcaByIncidentId,
  saveRca,
  updateRca as persistRcaUpdate
} from '../repositories/rcaRepository.js';
import { getRawIncidentOrThrow } from './incidentService.js';
import { updateIncident as persistIncidentUpdate } from '../repositories/incidentRepository.js';
import { validateRcaPayload } from '../validators/rcaValidators.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { buildHistoryEntry } from '../utils/historyUtils.js';

// Builds a deterministic draft RCA from known incident facts only - no invented root cause.
function buildDraftRca(incident) {
  const incidentSummary =
    `${incident.title}. ${incident.description || 'No additional description was provided.'} ` +
    `Impact reported on ${incident.impactedService} at ${incident.severity} severity.`;

  const rootCause =
    'Root cause not yet confirmed. Investigation findings must be reviewed and entered here ' +
    'once the responsible team has identified the underlying technical cause.';

  const severityRecommendations = {
    P1: 'Given the P1 severity, prioritize a post-incident review within 48 hours and validate rollback/runbook readiness.',
    P2: 'Given the P2 severity, schedule a post-incident review within one week and confirm monitoring coverage.',
    P3: 'Given the P3 severity, document findings and revisit monitoring thresholds during the next maintenance cycle.'
  };

  return {
    incidentSummary,
    rootCause,
    impactedServices: [incident.impactedService],
    resolution: 'Resolution details pending human review.',
    lessonsLearned: 'Lessons learned pending human review.',
    recommendations: [
      severityRecommendations[incident.severity] || 'Review monitoring and alerting coverage for this service.',
      `Confirm whether other incidents affecting ${incident.impactedService} share a common trigger.`,
      'This draft was generated automatically and requires human review before it is considered final.'
    ]
  };
}

async function appendIncidentHistory(incidentId, type, message) {
  const incident = await getRawIncidentOrThrow(incidentId);
  const updated = {
    ...incident,
    updatedAt: new Date().toISOString(),
    history: [...incident.history, buildHistoryEntry({ type, message })]
  };
  await persistIncidentUpdate(incidentId, updated);
}

export async function generateRca(incidentId) {
  const incident = await getRawIncidentOrThrow(incidentId);

  const existing = await getRcaByIncidentId(incidentId);
  if (existing) {
    throw new ConflictError(`An RCA already exists for incident ${incidentId}.`);
  }

  const now = new Date().toISOString();
  const draft = buildDraftRca(incident);
  const rca = {
    incidentId,
    ...draft,
    generatedAt: now,
    updatedAt: now
  };

  await saveRca(rca);
  await appendIncidentHistory(incidentId, 'RCA_GENERATED', 'RCA draft generated and requires human review.');

  return rca;
}

export async function getRca(incidentId) {
  await getRawIncidentOrThrow(incidentId);
  const rca = await getRcaByIncidentId(incidentId);
  if (!rca) {
    throw new NotFoundError(`No RCA exists yet for incident ${incidentId}.`);
  }
  return rca;
}

export async function updateRca(incidentId, payload) {
  await getRawIncidentOrThrow(incidentId);

  const existing = await getRcaByIncidentId(incidentId);
  if (!existing) {
    throw new NotFoundError(`No RCA exists yet for incident ${incidentId}. Generate one first.`);
  }

  const errors = validateRcaPayload(payload);
  if (errors.length > 0) {
    throw new ValidationError('Invalid RCA data.', errors);
  }

  const updated = {
    ...existing,
    incidentSummary: payload.incidentSummary,
    rootCause: payload.rootCause,
    impactedServices: payload.impactedServices,
    resolution: payload.resolution ?? existing.resolution,
    lessonsLearned: payload.lessonsLearned ?? existing.lessonsLearned,
    recommendations: payload.recommendations ?? existing.recommendations,
    updatedAt: new Date().toISOString()
  };

  await persistRcaUpdate(incidentId, updated);
  await appendIncidentHistory(incidentId, 'RCA_UPDATED', 'RCA reviewed and updated.');

  return updated;
}
