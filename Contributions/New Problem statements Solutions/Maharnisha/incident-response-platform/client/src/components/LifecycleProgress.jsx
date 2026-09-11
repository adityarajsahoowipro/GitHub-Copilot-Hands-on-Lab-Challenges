import { STATUSES, STATUS_LABELS } from '../utils/constants.js';

// Simple horizontal progress indicator across the four lifecycle stages.
export default function LifecycleProgress({ status }) {
  const currentIndex = STATUSES.indexOf(status);

  return (
    <ol className="lifecycle-progress" aria-label="Incident lifecycle progress">
      {STATUSES.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return (
          <li key={step} className={`lifecycle-step lifecycle-step-${state}`}>
            <span className="lifecycle-step-label">
              {STATUS_LABELS[step]}
              {state === 'current' && <span className="visually-hidden"> (current status)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
