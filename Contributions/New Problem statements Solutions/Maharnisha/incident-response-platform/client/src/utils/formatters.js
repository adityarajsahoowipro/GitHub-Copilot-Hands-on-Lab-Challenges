// Formats a millisecond duration as a short human-readable string, e.g. "1h 20m".
export function formatDuration(milliseconds) {
  const absMs = Math.abs(milliseconds);
  const totalMinutes = Math.floor(absMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sign = milliseconds < 0 ? '-' : '';
  if (hours === 0) return `${sign}${minutes}m`;
  return `${sign}${hours}h ${minutes}m`;
}

// Renders an ISO timestamp using the browser's local timezone.
export function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
