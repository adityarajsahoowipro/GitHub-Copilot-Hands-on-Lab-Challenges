import axios from 'axios';

// Base URL is relative so the Vite dev proxy (and any future prod reverse proxy) can route it.
const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Normalizes Axios errors into a plain object so components don't need to know about Axios.
export function toApiError(err) {
  if (err.response) {
    return {
      status: err.response.status,
      message: err.response.data?.message || 'Request failed.',
      errors: err.response.data?.errors || [],
      existingIncidentId: err.response.data?.existingIncidentId
    };
  }
  if (err.request) {
    return { status: 0, message: 'Could not reach the server. Please check your connection.', errors: [] };
  }
  return { status: 0, message: err.message || 'An unexpected error occurred.', errors: [] };
}

export default apiClient;
