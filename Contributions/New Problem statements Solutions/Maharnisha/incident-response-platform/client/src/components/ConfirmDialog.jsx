// Accessible confirmation dialog used before destructive/state-changing actions.
export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  if (!message) return null;

  return (
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-message">
        <p id="confirm-dialog-message">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} autoFocus>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
