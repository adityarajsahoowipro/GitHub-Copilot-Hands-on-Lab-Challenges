// Generates readable, sequential incident IDs such as INC-1001.
const PREFIX = 'INC-';
const START = 1001;

export function generateIncidentId(existingIncidents) {
  let maxNumber = START - 1;
  for (const incident of existingIncidents) {
    const match = /^INC-(\d+)$/.exec(incident.incidentId || '');
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) maxNumber = number;
    }
  }
  return `${PREFIX}${maxNumber + 1}`;
}
