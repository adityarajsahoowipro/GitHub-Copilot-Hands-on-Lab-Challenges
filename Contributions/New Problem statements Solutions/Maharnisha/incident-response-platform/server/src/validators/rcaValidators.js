function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyStringArray(value) {
  return isStringArray(value) && value.length > 0;
}

// Validates the full RCA payload used when saving/updating an RCA record.
export function validateRcaPayload(body) {
  const errors = [];

  if (!isNonEmptyString(body.incidentSummary)) {
    errors.push('incidentSummary cannot be blank.');
  }
  if (!isNonEmptyString(body.rootCause)) {
    errors.push('rootCause cannot be blank.');
  }
  if (!isNonEmptyStringArray(body.impactedServices)) {
    errors.push('impactedServices must be a non-empty array of strings.');
  }
  if (body.resolution !== undefined && typeof body.resolution !== 'string') {
    errors.push('resolution must be a string.');
  }
  if (body.lessonsLearned !== undefined && typeof body.lessonsLearned !== 'string') {
    errors.push('lessonsLearned must be a string.');
  }
  if (body.recommendations !== undefined && !isStringArray(body.recommendations)) {
    errors.push('recommendations must be an array of strings.');
  }

  return errors;
}
