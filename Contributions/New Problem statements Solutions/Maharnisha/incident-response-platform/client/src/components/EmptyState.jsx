import { IconIncidents } from './icons.jsx';

// Consistent empty-state block for tables/lists with no matching results.
export default function EmptyState({ title = 'No results found', description, icon }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon || <IconIncidents width={28} height={28} />}
      </div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description">{description}</p>}
    </div>
  );
}
