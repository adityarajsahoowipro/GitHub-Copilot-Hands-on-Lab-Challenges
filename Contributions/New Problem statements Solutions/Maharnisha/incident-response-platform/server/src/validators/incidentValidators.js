const VALID_SEVERITIES = ['P1', 'P2', 'P3'];

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

// Validates the payload for creating a new incident. Returns an array of error messages.
export function validateCreateIncident(body) {
  const errors = [];

  if (isBlank(body.title)) {
    errors.push('title is required and cannot be blank.');
  }
  if (isBlank(body.impactedService)) {
    errors.push('impactedService is required and cannot be blank.');
  }
  if (!VALID_SEVERITIES.includes(body.severity)) {
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}.`);
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string.');
  }
  if (body.owner !== undefined && typeof body.owner !== 'string') {
    errors.push('owner must be a string.');
  }

  return errors;
}

const UPDATABLE_FIELDS = ['status', 'owner', 'severity', 'impactedService'];

// Titles are compared trimmed and case-insensitively so near-identical reports collide.
export function normalizeTitle(title) {
  return typeof title === 'string' ? title.trim().toLowerCase() : '';
}

// Returns the first non-CLOSED incident sharing the same normalized title, or undefined.
export function findActiveDuplicateByTitle(incidents, title) {
  const normalized = normalizeTitle(title);
  if (!normalized) return undefined;
  return incidents.find(
    (incident) => incident.status !== 'CLOSED' && normalizeTitle(incident.title) === normalized
  );
}

// Validates a PATCH payload. Only known, updatable fields are considered.
export function validateUpdateIncident(body) {
  const errors = [];
  const suppliedFields = UPDATABLE_FIELDS.filter((field) => body[field] !== undefined);

  if (suppliedFields.length === 0) {
    errors.push(`At least one supported field must be supplied: ${UPDATABLE_FIELDS.join(', ')}.`);
    return { errors, suppliedFields };
  }

  if (body.status !== undefined) {
    const validStatuses = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED'];
    if (!validStatuses.includes(body.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}.`);
    }
  }
  if (body.severity !== undefined && !VALID_SEVERITIES.includes(body.severity)) {
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}.`);
  }
  if (body.owner !== undefined && isBlank(body.owner)) {
    errors.push('owner cannot be blank when supplied.');
  }
  if (body.impactedService !== undefined && isBlank(body.impactedService)) {
    errors.push('impactedService cannot be blank when supplied.');
  }

  return { errors, suppliedFields };
}

export { VALID_SEVERITIES, UPDATABLE_FIELDS };
