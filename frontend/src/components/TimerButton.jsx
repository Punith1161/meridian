export function TimerButton({ isRunning, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
        isRunning
          ? 'border-[var(--success)] text-[var(--success)]'
          : 'border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
      }`}
      title={isRunning ? 'Stop timer' : 'Start timer'}
    >
      {isRunning ? (
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      )}
    </button>
  );
}
