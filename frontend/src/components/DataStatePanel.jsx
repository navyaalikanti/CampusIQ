const DataStatePanel = ({
  loading,
  error,
  empty,
  onRetry,
  loadingLabel = 'Loading workspace...',
  emptyTitle = 'Nothing here yet',
  emptyBody = 'Data will appear here once your CampusIQ workspace becomes active.',
}) => {
  if (loading) {
    return <div className="workspace-state-panel is-loading">{loadingLabel}</div>;
  }

  if (error) {
    return (
      <div className="workspace-state-panel is-error">
        <strong>{error}</strong>
        {onRetry ? (
          <button className="btn btn-secondary" onClick={onRetry} type="button">
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="workspace-state-panel">
        <strong>{emptyTitle}</strong>
        <p>{emptyBody}</p>
      </div>
    );
  }

  return null;
};

export default DataStatePanel;
