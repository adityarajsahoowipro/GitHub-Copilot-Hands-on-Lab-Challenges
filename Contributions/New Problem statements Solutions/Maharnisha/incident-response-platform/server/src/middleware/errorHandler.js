import { AppError } from '../utils/errors.js';
import { error } from '../utils/apiResponse.js';

// Centralized error handler: converts thrown errors (known or unknown) into the standard error shape.
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return error(res, err.message, err.statusCode, err.errors, err.details);
  }

  // Malformed JSON bodies are thrown by express.json() as SyntaxError instances.
  if (err instanceof SyntaxError && 'body' in err) {
    return error(res, 'Request body contains invalid JSON.', 400);
  }

  console.error('Unexpected error:', err);
  return error(res, 'An unexpected server error occurred.', 500);
}
