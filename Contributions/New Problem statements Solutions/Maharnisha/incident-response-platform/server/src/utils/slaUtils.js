// Pure SLA calculation utility - no side effects, no I/O, easy to unit test.
const SLA_TARGET_HOURS = { P1: 2, P2: 4, P3: 8 };
const APPROACHING_THRESHOLD = 0.25; // 25% or less of SLA time remaining

export const SLA_STATUS = {
  WITHIN_SLA: 'WITHIN_SLA',
  APPROACHING_SLA: 'APPROACHING_SLA',
  SLA_BREACHED: 'SLA_BREACHED',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
};

/**
 * Computes the SLA state for an incident at a given reference time.
 * @param {{severity: string, status: string, createdAt: string}} incident
 * @param {Date} referenceTime defaults to now, injectable for deterministic tests
 */
export function computeSla(incident, referenceTime = new Date()) {
  const targetHours = SLA_TARGET_HOURS[incident.severity] ?? null;

  if (incident.status === 'CLOSED') {
    return {
      targetHours,
      elapsedMilliseconds: 0,
      remainingMilliseconds: 0,
      deadline: null,
      status: SLA_STATUS.NOT_APPLICABLE,
      requiresEscalation: false,
      message: 'Incident is closed; SLA tracking no longer applies.'
    };
  }

  const createdAt = new Date(incident.createdAt);
  if (!incident.createdAt || Number.isNaN(createdAt.getTime()) || !targetHours) {
    return {
      targetHours,
      elapsedMilliseconds: 0,
      remainingMilliseconds: 0,
      deadline: null,
      status: SLA_STATUS.NOT_APPLICABLE,
      requiresEscalation: false,
      message: 'SLA cannot be calculated due to missing or invalid data.'
    };
  }

  const targetMilliseconds = targetHours * 60 * 60 * 1000;
  const deadline = new Date(createdAt.getTime() + targetMilliseconds);
  const now = referenceTime.getTime();
  const elapsedMilliseconds = now - createdAt.getTime();
  const remainingMilliseconds = deadline.getTime() - now;

  let status;
  let message;
  let requiresEscalation = false;

  if (remainingMilliseconds <= 0) {
    status = SLA_STATUS.SLA_BREACHED;
    message = `SLA breached. Target of ${targetHours}h was exceeded.`;
    requiresEscalation = true;
  } else if (remainingMilliseconds / targetMilliseconds <= APPROACHING_THRESHOLD) {
    status = SLA_STATUS.APPROACHING_SLA;
    message = `Approaching SLA deadline. Less than ${Math.round(APPROACHING_THRESHOLD * 100)}% of the ${targetHours}h target remains.`;
  } else {
    status = SLA_STATUS.WITHIN_SLA;
    message = `Within SLA. More than ${Math.round(APPROACHING_THRESHOLD * 100)}% of the ${targetHours}h target remains.`;
  }

  return {
    targetHours,
    elapsedMilliseconds,
    remainingMilliseconds,
    deadline: deadline.toISOString(),
    status,
    requiresEscalation,
    message
  };
}
