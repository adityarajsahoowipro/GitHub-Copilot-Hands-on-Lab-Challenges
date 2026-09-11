import { useEffect, useState } from 'react';

// Small hook pairing Notification with automatic dismissal after a few seconds.
export function useNotification() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const notify = (type, message) => setNotification({ type, message });

  return { notification, notify, dismiss: () => setNotification(null) };
}
