import {
  getAllIncidents,
  getIncidentById as findIncidentById,
  saveIncident,
  updateIncident as persistIncidentUpdate,
  replaceAllIncidents
} from '../repositories/incidentRepository.js';
import { validateCreateIncident, validateUpdateIncident, findActiveDuplicateByTitle } from '../validators/incidentValidators.js';
import { ValidationError, NotFoundError, ConflictError, DuplicateIncidentError } from '../utils/errors.js';
import { generateIncidentId } from '../utils/idGenerator.js';
import { buildHistoryEntry } from '../utils/historyUtils.js';
import { computeSla, SLA_STATUS } from '../utils/slaUtils.js';

// Only these forward transitions are allowed; anything else is rejected.
const ALLOWED_TRANSITIONS = {
  OPEN: 'INVESTIGATING',
  INVESTIGATING: 'MITIGATED',
  MITIGATED: 'CLOSED'
};

const SEVERITY_RANK = { P1: 1, P2: 2, P3: 3 };
const SORTABLE_FIELDS = ['createdAt', 'severity'];
const VALID_STATUSES = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED'];
const VALID_SEVERITIES = ['P1', 'P2', 'P3'];
const VALID_SLA_STATUSES = Object.values(SLA_STATUS);

// Attaches the computed, non-persisted SLA object to an incident for API responses.
export function withSla(incident, referenceTime = new Date()) {
  return { ...incident, sla: computeSla(incident, referenceTime) };
}

export async function createIncident(payload) {
  const errors = validateCreateIncident(payload);
  if (errors.length > 0) {
    throw new ValidationError('Invalid incident data.', errors);
  }

  const existingIncidents = await getAllIncidents();

  const duplicate = findActiveDuplicateByTitle(existingIncidents, payload.title);
  if (duplicate) {
    throw new DuplicateIncidentError(duplicate.incidentId);
  }

  const now = new Date().toISOString();
  const incident = {
    incidentId: generateIncidentId(existingIncidents),
    title: payload.title.trim(),
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    severity: payload.severity,
    status: 'OPEN',
    owner: typeof payload.owner === 'string' ? payload.owner.trim() : '',
    impactedService: payload.impactedService.trim(),
    createdAt: now,
    updatedAt: now,
    history: [
      buildHistoryEntry({ type: 'INCIDENT_CREATED', message: 'Incident created.' })
    ]
  };

  await saveIncident(incident);
  return withSla(incident);
}

export async function listIncidents(query) {
  const incidents = await getAllIncidents();
  const errors = [];

  const { status, severity, owner, impactedService, search, sortBy, order, slaStatus } = query;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }
  if (severity !== undefined && !VALID_SEVERITIES.includes(severity)) {
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}.`);
  }
  if (sortBy !== undefined && !SORTABLE_FIELDS.includes(sortBy)) {
    errors.push(`sortBy must be one of: ${SORTABLE_FIELDS.join(', ')}.`);
  }
  if (order !== undefined && !['asc', 'desc'].includes(order)) {
    errors.push('order must be either asc or desc.');
  }
  if (slaStatus !== undefined && !VALID_SLA_STATUSES.includes(slaStatus)) {
    errors.push(`slaStatus must be one of: ${VALID_SLA_STATUSES.join(', ')}.`);
  }
  if (errors.length > 0) {
    throw new ValidationError('Invalid query parameters.', errors);
  }

  // Work on a copy so filtering/sorting never mutates the stored (persisted) order.
  let results = incidents.map((incident) => withSla(incident));

  if (status) results = results.filter((incident) => incident.status === status);
  if (severity) results = results.filter((incident) => incident.severity === severity);
  if (owner) results = results.filter((incident) => incident.owner.toLowerCase() === owner.toLowerCase());
  if (impactedService) {
    results = results.filter(
      (incident) => incident.impactedService.toLowerCase() === impactedService.toLowerCase()
    );
  }
  if (slaStatus) results = results.filter((incident) => incident.sla.status === slaStatus);
  if (search) {
    const term = search.toLowerCase();
    results = results.filter((incident) => incident.title.toLowerCase().includes(term));
  }

  if (sortBy) {
    const direction = order === 'desc' ? -1 : 1;
    results = [...results].sort((a, b) => {
      if (sortBy === 'severity') {
        return (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) * direction;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    });
  }

  return results;
}

export async function getIncident(incidentId) {
  const incident = await findIncidentById(incidentId);
  if (!incident) {
    throw new NotFoundError(`Incident ${incidentId} was not found.`);
  }
  return withSla(incident);
}

// Returns the raw (undecorated) incident or throws - used internally by other services (e.g. RCA).
export async function getRawIncidentOrThrow(incidentId) {
  const incident = await findIncidentById(incidentId);
  if (!incident) {
    throw new NotFoundError(`Incident ${incidentId} was not found.`);
  }
  return incident;
}

export async function updateIncident(incidentId, payload) {
  const incident = await findIncidentById(incidentId);
  if (!incident) {
    throw new NotFoundError(`Incident ${incidentId} was not found.`);
  }

  const { errors, suppliedFields } = validateUpdateIncident(payload);
  if (errors.length > 0) {
    throw new ValidationError('Invalid update data.', errors);
  }

  // Status transitions are validated separately because they raise a 409, not a 400.
  if (suppliedFields.includes('status') && payload.status !== incident.status) {
    const allowedNext = ALLOWED_TRANSITIONS[incident.status];
    if (payload.status !== allowedNext) {
      throw new ConflictError(
        `Invalid status transition: ${incident.status} → ${payload.status}`,
        [
          allowedNext
            ? `The only valid next status for ${incident.status} is ${allowedNext}.`
            : `${incident.status} is a terminal status and cannot be changed.`
        ]
      );
    }
  }

  const historyEntries = [];
  const updated = { ...incident };

  if (suppliedFields.includes('status') && payload.status !== incident.status) {
    historyEntries.push(
      buildHistoryEntry({
        type: 'STATUS_UPDATED',
        message: `Status changed from ${incident.status} to ${payload.status}`,
        previousValue: incident.status,
        newValue: payload.status
      })
    );
    updated.status = payload.status;
  }
  if (suppliedFields.includes('owner') && payload.owner !== incident.owner) {
    historyEntries.push(
      buildHistoryEntry({
        type: 'OWNER_CHANGED',
        message: `Owner changed from "${incident.owner || 'unassigned'}" to "${payload.owner}".`,
        previousValue: incident.owner,
        newValue: payload.owner
      })
    );
    updated.owner = payload.owner.trim();
  }
  if (suppliedFields.includes('severity') && payload.severity !== incident.severity) {
    historyEntries.push(
      buildHistoryEntry({
        type: 'SEVERITY_CHANGED',
        message: `Severity changed from ${incident.severity} to ${payload.severity}.`,
        previousValue: incident.severity,
        newValue: payload.severity
      })
    );
    updated.severity = payload.severity;
  }
  if (suppliedFields.includes('impactedService') && payload.impactedService !== incident.impactedService) {
    historyEntries.push(
      buildHistoryEntry({
        type: 'IMPACTED_SERVICE_CHANGED',
        message: `Impacted service changed from "${incident.impactedService}" to "${payload.impactedService}".`,
        previousValue: incident.impactedService,
        newValue: payload.impactedService
      })
    );
    updated.impactedService = payload.impactedService.trim();
  }

  if (historyEntries.length === 0) {
    // Nothing actually changed (e.g. same value re-submitted); avoid a no-op history/updatedAt bump.
    return withSla(incident);
  }

  updated.updatedAt = new Date().toISOString();
  updated.history = [...incident.history, ...historyEntries];

  await persistIncidentUpdate(incidentId, updated);
  return withSla(updated);
}

// Explicit, safe endpoint that scans active incidents and records SLA_BREACHED history once each.
export async function evaluateSlaBreaches() {
  const incidents = await getAllIncidents();
  const now = new Date();
  let breachedCount = 0;

  for (const incident of incidents) {
    if (incident.status === 'CLOSED') continue;
    const sla = computeSla(incident, now);
    if (sla.status !== SLA_STATUS.SLA_BREACHED) continue;

    const alreadyRecorded = incident.history.some((entry) => entry.type === 'SLA_BREACHED');
    if (alreadyRecorded) continue;

    incident.history = [
      ...incident.history,
      buildHistoryEntry({
        type: 'SLA_BREACHED',
        message: `SLA breached: ${sla.message}`
      })
    ];
    incident.updatedAt = now.toISOString();
    breachedCount += 1;
  }

  if (breachedCount > 0) {
    await replaceAllIncidents(incidents);
  }

  return { evaluated: incidents.length, newlyBreached: breachedCount };
}

export { ALLOWED_TRANSITIONS };
