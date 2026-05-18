import { useTimer } from '../hooks/useTimer';
import { formatTime } from '../utils/formatTime';
import { relativeDate } from '../utils/dateHelpers';
import { TimerButton } from './TimerButton';

export function TaskCard({ task, onTimerToggle, showTimer = true }) {
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

  const dueLabel = task.due_date ? relativeDate(task.due_date) : null;

  return (
    <div className="card p-3">
      <div className="text-sm font-medium text-[var(--text-primary)] mb-2 leading-5">
        {task.title}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getPriorityColor()}`}>
          {task.priority}
        </span>
        {dueLabel && (
          <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {dueLabel}
          </span>
        )}
      </div>

      {task.time_estimate && (
        <div className="mb-2">
          <div className="h-[3px] bg-[var(--bg-hover)] rounded">
            <div
              className="h-full bg-[var(--accent)] rounded transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--text-tertiary)] font-['DM_Mono']">
          {formatTime(displaySeconds)}
        </span>
        {showTimer ? (
          <TimerButton isRunning={task.timer_started_at !== null} onClick={() => onTimerToggle(task.id)} />
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="var(--success)" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </div>
  );
}
