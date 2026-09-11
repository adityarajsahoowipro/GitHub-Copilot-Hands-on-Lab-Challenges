import { readJsonFile, writeJsonFile } from '../utils/fileStore.js';

const FILE_NAME = 'incidents.json';

// All direct file access for incidents is isolated here so services never touch the filesystem.
export async function getAllIncidents() {
  return readJsonFile(FILE_NAME, []);
}

export async function getIncidentById(incidentId) {
  const incidents = await getAllIncidents();
  return incidents.find((incident) => incident.incidentId === incidentId) || null;
}

export async function saveIncident(incident) {
  const incidents = await getAllIncidents();
  incidents.push(incident);
  await writeJsonFile(FILE_NAME, incidents);
  return incident;
}

export async function updateIncident(incidentId, updatedIncident) {
  const incidents = await getAllIncidents();
  const index = incidents.findIndex((incident) => incident.incidentId === incidentId);
  if (index === -1) return null;
  incidents[index] = updatedIncident;
  await writeJsonFile(FILE_NAME, incidents);
  return updatedIncident;
}

export async function replaceAllIncidents(incidents) {
  await writeJsonFile(FILE_NAME, incidents);
  return incidents;
}
