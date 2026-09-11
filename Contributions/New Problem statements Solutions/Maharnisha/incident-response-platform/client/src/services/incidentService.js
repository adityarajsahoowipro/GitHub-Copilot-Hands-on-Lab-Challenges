import apiClient, { toApiError } from './apiClient.js';

export async function checkHealth() {
  try {
    const res = await apiClient.get('/health');
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createIncident(payload) {
  try {
    const res = await apiClient.post('/incidents', payload);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listIncidents(params = {}) {
  try {
    const res = await apiClient.get('/incidents', { params });
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getIncident(incidentId) {
  try {
    const res = await apiClient.get(`/incidents/${incidentId}`);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateIncident(incidentId, payload) {
  try {
    const res = await apiClient.patch(`/incidents/${incidentId}`, payload);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function evaluateSla() {
  try {
    const res = await apiClient.post('/incidents/evaluate-sla');
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getRelatedIncidents(incidentId) {
  try {
    const res = await apiClient.get(`/incidents/${incidentId}/related`);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function linkIncidents(incidentId, relatedIncidentId) {
  try {
    const res = await apiClient.post(`/incidents/${incidentId}/link/${relatedIncidentId}`);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}
