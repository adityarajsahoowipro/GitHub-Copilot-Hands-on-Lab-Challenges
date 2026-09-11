// Appends a structured, timestamped entry to an incident's history array.
export function buildHistoryEntry({ type, message, previousValue, newValue }) {
  const entry = {
    type,
    message,
    timestamp: new Date().toISOString()
  };
  if (previousValue !== undefined) entry.previousValue = previousValue;
  if (newValue !== undefined) entry.newValue = newValue;
  return entry;
}
