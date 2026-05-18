import { useState, useEffect } from 'react';
import { getTodaySummary } from '../api/summary';
import { getTasks, updateTaskStatus } from '../api/tasks';
import { formatHoursMinutes, formatTime } from '../utils/formatTime';
import { AppLayout } from '../components/AppLayout';

export default function Today() {
  const [summary, setSummary] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError('');
      const [summaryData, tasksData] = await Promise.all([
        getTodaySummary(),
        getTasks(),
      ]);
      setSummary(summaryData);
      const today = new Date().toISOString().split('T')[0];
      setTodayTasks(tasksData.filter((t) => t.due_date === today));
    } catch (error) {
      setError('Could not load today summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'todo' ? 'done' : 'todo';
    try {
      setError('');
      await updateTaskStatus(taskId, newStatus);
      fetchData();
    } catch (error) {
      setError('Could not update task.');
    }
  };

  return (
    <AppLayout title="Today">
      <div className="h-full overflow-y-auto">
        <div className="px-6 py-6 max-w-[720px]">
          {loading ? (
            <div className="text-[var(--text-secondary)]">Loading...</div>
          ) : (
            <>
              {error && <div className="text-sm text-[var(--danger)] mb-4">{error}</div>}
              {summary && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4">
                    <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] mb-2">
                      Tasks today
                    </div>
                    <div className="text-2xl font-semibold text-[var(--text-primary)] font-['DM_Mono']">
                      {summary.tasks_today}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Assigned for today</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4">
                    <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] mb-2">
                      Completed
                    </div>
                    <div className="text-2xl font-semibold text-[var(--success)] font-['DM_Mono']">
                      {summary.completed}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Done today</div>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4">
                    <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] mb-2">
                      Time tracked
                    </div>
                    <div className="text-2xl font-semibold text-[var(--accent)] font-['DM_Mono']">
                      {formatHoursMinutes(summary.total_time_tracked)}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Across all tasks</div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-3">
                  Today&#39;s tasks
                </div>
                {todayTasks.length === 0 && (
                  <div className="text-[13px] text-[var(--text-tertiary)] py-6 text-center">No tasks due today</div>
                )}
                <div className="space-y-2">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-4 py-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          task.status === 'done'
                            ? 'bg-[var(--success)] border-[var(--success)]'
                            : 'border-[var(--border-secondary)]'
                        }`}
                        aria-label="Toggle task"
                      >
                        {task.status === 'done' && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                        {task.title}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        task.priority === 'high'
                          ? 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                          : task.priority === 'medium'
                          ? 'bg-[var(--warning-subtle)] text-[var(--warning)]'
                          : 'bg-[var(--success-subtle)] text-[var(--success)]'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] font-['DM_Mono']">
                        {formatTime(task.time_spent)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
