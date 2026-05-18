import { useTimer } from '../hooks/useTimer';
import { formatTime } from '../utils/formatTime';

export function TaskCard({ task, onTimerToggle }) {
  const displaySeconds = useTimer(task.timer_started_at !== null, task.time_spent);
  
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'bg-[var(--danger-subtle)] text-[var(--danger)]';
      case 'medium':
        return 'bg-[var(--warning-subtle)] text-[var(--warning)]';
      case 'low':
        return 'bg-[var(--success-subtle)] text-[var(--success)]';
      default:
        return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
    }
  };

  const progressPercent = task.time_estimate
    ? Math.min((task.time_spent / (task.time_estimate * 60)) * 100, 100)
    : 0;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-[var(--text-primary)] flex-1">{task.title}</h3>
        <button
          onClick={() => onTimerToggle(task.id)}
          className="ml-2 w-7 h-7 flex items-center justify-center rounded-full border border-[var(--border-secondary)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
        >
          {task.timer_started_at ? '⏸' : '▶'}
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor()}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-xs text-[var(--text-secondary)]">{task.due_date}</span>
        )}
      </div>

      {task.time_estimate && (
        <div className="mb-2">
          <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">
            {formatTime(displaySeconds)} / {formatTime(task.time_estimate * 60)}
          </div>
        </div>
      )}
    </div>
  );
}
