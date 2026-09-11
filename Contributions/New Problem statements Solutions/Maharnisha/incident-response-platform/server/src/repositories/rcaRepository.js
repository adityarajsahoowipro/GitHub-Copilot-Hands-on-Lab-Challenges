import { readJsonFile, writeJsonFile } from '../utils/fileStore.js';

const FILE_NAME = 'rcas.json';

export async function getAllRcas() {
  return readJsonFile(FILE_NAME, []);
}

export async function getRcaByIncidentId(incidentId) {
  const rcas = await getAllRcas();
  return rcas.find((rca) => rca.incidentId === incidentId) || null;
}

export async function saveRca(rca) {
  const rcas = await getAllRcas();
  rcas.push(rca);
  await writeJsonFile(FILE_NAME, rcas);
  return rca;
}

export async function updateRca(incidentId, updatedRca) {
  const rcas = await getAllRcas();
  const index = rcas.findIndex((rca) => rca.incidentId === incidentId);
  if (index === -1) return null;
  rcas[index] = updatedRca;
  await writeJsonFile(FILE_NAME, rcas);
  return updatedRca;
}
