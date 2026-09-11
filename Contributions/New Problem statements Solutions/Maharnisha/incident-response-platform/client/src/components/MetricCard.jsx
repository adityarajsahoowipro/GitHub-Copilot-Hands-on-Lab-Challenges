// Dashboard summary tile with icon, value and optional trend/tone styling.
export default function MetricCard({ icon, label, value, tone = 'default', hint }) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="metric-card-body">
        <span className="metric-value">{value}</span>
        <span className="metric-label">{label}</span>
        {hint && <span className="metric-hint">{hint}</span>}
      </div>
    </div>
  );
}
