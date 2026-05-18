import { useState, useEffect } from 'react';
import { getTodaySummary } from '../api/summary';
import { getTasks, updateTaskStatus } from '../api/tasks';
import { formatHoursMinutes } from '../utils/formatTime';

export default function Today() {
  const [summary, setSummary] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryData, tasksData] = await Promise.all([
        getTodaySummary(),
        getTasks(),
      ]);
      setSummary(summaryData);
      const today = new Date().toISOString().split('T')[0];
      setTodayTasks(tasksData.filter((t) => t.due_date === today));
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'todo' ? 'done' : 'todo';
    try {
      await updateTaskStatus(taskId, newStatus);
      fetchData();
    } catch (error) {
      console.error('Failed to update task');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="ml-14 p-6 min-h-screen bg-[var(--bg-primary)]">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Today</h1>

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <div className="text-[var(--text-secondary)] text-sm mb-1">Tasks today</div>
            <div className="text-3xl font-semibold text-[var(--text-primary)]">{summary.tasks_today}</div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <div className="text-[var(--text-secondary)] text-sm mb-1">Completed</div>
            <div className="text-3xl font-semibold text-[var(--success)]">{summary.completed}</div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
            <div className="text-[var(--text-secondary)] text-sm mb-1">Time tracked</div>
            <div className="text-3xl font-semibold text-[var(--accent)]">
              {formatHoursMinutes(summary.total_time_tracked)}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Tasks</h2>
        <div className="space-y-2">
          {todayTasks.map((task) => (
            <div key={task.id} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 flex items-center">
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={() => handleToggleTask(task.id, task.status)}
                className="mr-4"
              />
              <span className={`flex-1 ${task.status === 'done' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                {task.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
