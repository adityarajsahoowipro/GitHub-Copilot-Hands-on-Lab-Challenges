import apiClient, { toApiError } from './apiClient.js';

export async function getDashboardMetrics() {
  try {
    const res = await apiClient.get('/dashboard/metrics');
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}
