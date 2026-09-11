// Simple toast-style notification for success/error feedback after user actions.
export default function Notification({ notification, onDismiss }) {
  if (!notification) return null;

  return (
    <div className={`notification notification-${notification.type}`} role="status">
      <span>{notification.message}</span>
      <button type="button" className="notification-close" onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}
