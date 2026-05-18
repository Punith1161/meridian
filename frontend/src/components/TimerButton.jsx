export function TimerButton({ isRunning, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
        isRunning
          ? 'border border-[var(--success)] text-[var(--success)]'
          : 'border border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:text-[var(--accent)]'
      }`}
    >
      {isRunning ? '⏸' : '▶'}
    </button>
  );
}
