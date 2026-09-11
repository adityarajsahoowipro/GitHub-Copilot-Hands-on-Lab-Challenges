// Custom error types so the centralized error handler can map them to HTTP status codes.
export class AppError extends Error {
  // `details` holds extra top-level fields the API response should expose (e.g. existingIncidentId).
  constructor(message, statusCode = 500, errors = [], details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicting request', errors = [], details = {}) {
    super(message, 409, errors, details);
  }
}

export class DuplicateIncidentError extends ConflictError {
  constructor(existingIncidentId) {
    super('An active incident with the same title already exists.', [], { existingIncidentId });
    this.existingIncidentId = existingIncidentId;
  }
}
