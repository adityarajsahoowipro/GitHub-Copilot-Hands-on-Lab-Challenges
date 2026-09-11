import apiClient, { toApiError } from './apiClient.js';

export async function generateRca(incidentId) {
  try {
    const res = await apiClient.post(`/incidents/${incidentId}/rca/generate`);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getRca(incidentId) {
  try {
    const res = await apiClient.get(`/incidents/${incidentId}/rca`);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateRca(incidentId, payload) {
  try {
    const res = await apiClient.put(`/incidents/${incidentId}/rca`, payload);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}
