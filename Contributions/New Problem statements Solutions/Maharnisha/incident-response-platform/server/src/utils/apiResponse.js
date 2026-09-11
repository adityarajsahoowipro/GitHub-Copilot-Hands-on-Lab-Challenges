// Keeps every API response in a single consistent shape.
export function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function error(res, message, statusCode = 500, errors = [], details = {}) {
  return res.status(statusCode).json({ success: false, message, errors, ...details });
}
