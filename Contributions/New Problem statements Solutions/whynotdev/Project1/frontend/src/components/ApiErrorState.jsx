function ApiErrorState({ error, onRetry }) {
  const status = error?.status ? `HTTP ${error.status}` : 'Network error';

  return (
    <section className="api-error-state" role="alert" aria-live="assertive">
      <div className="api-error-signal" aria-hidden="true"><span /><span /><span /></div>
      <div>
        <p className="eyebrow">{status}</p>
        <h2>Service Signal Interrupted</h2>
        <p>The incident service could not be reached. Check the backend connection, then try again.</p>
      </div>
      <button className="primary-button" onClick={onRetry} type="button">Retry connection</button>
    </section>
  );
}

export default ApiErrorState;
