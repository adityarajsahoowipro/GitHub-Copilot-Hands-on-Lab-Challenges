// Simple horizontal progress bar for SLA elapsed/remaining visualization.
export default function ProgressBar({ percent, tone = 'primary', label }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`progress-bar-fill progress-bar-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
