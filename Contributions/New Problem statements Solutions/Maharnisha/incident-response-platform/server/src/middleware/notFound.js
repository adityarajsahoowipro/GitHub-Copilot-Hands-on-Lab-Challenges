import { error } from '../utils/apiResponse.js';

// Catches requests to routes that don't exist.
export function notFoundHandler(req, res) {
  error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
