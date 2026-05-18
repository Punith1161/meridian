import { useState, useEffect } from 'react';
import { getTasks, createTask } from '../api/tasks';
import { formatTime } from '../utils/formatTime';
import { Modal } from '../components/Modal';
import { AppLayout } from '../components/AppLayout';

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '', time_estimate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    let filtered = tasks;
    if (priorityFilter) filtered = filtered.filter((t) => t.priority === priorityFilter);
    if (statusFilter) filtered = filtered.filter((t) => t.status === statusFilter);
    setFilteredTasks(filtered);
  }, [tasks, priorityFilter, statusFilter]);

  const fetchTasks = async () => {
    try {
      setError('');
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      setError('Could not load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        ...newTask,
        time_estimate: newTask.time_estimate ? parseInt(newTask.time_estimate) : null,
      };
      await createTask(payload);
      setNewTask({ title: '', priority: 'medium', due_date: '', time_estimate: '' });
      setIsCreateOpen(false);
      fetchTasks();
    } catch (error) {
      setError('Could not create task.');
    }
  };

  return (
    <AppLayout
      title="All tasks"
      actions={
        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New task
        </button>
      }
    >
      <div className="h-full overflow-y-auto">
        <div className="px-6 py-5">
          {loading ? (
            <div className="text-[var(--text-secondary)]">Loading...</div>
          ) : (
            <>
              {error && <div className="text-sm text-[var(--danger)] mb-4">{error}</div>}
              <div className="flex gap-3 mb-5">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="input-base max-w-[180px]"
                >
                  <option value="">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-base max-w-[180px]"
                >
                  <option value="">All statuses</option>
                  <option value="todo">To do</option>
                  <option value="inprogress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-primary)]">
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Title</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Priority</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Status</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Due</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Estimate</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Time spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsModalOpen(true);
                        }}
                        className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-3 text-[13px] text-[var(--text-primary)] font-medium">{task.title}</td>
                        <td className="px-3 py-3 text-[13px]">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            task.priority === 'high'
                              ? 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                              : task.priority === 'medium'
                              ? 'bg-[var(--warning-subtle)] text-[var(--warning)]'
                              : 'bg-[var(--success-subtle)] text-[var(--success)]'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[13px]">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            task.status === 'todo'
                              ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                              : task.status === 'inprogress'
                              ? 'bg-[var(--info-subtle)] text-[var(--info)]'
                              : 'bg-[var(--success-subtle)] text-[var(--success)]'
                          }`}>
                            {task.status === 'inprogress' ? 'In progress' : task.status === 'todo' ? 'To do' : 'Done'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-[var(--text-secondary)]">{task.due_date || '-'}</td>
                        <td className="px-3 py-3 text-[13px] text-[var(--text-secondary)]">{task.time_estimate ? `${task.time_estimate}m` : '-'}</td>
                        <td className="px-3 py-3 text-[12px] text-[var(--text-secondary)] font-['DM_Mono']">{formatTime(task.time_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedTask && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Task details">
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Title</label>
              <p className="text-[var(--text-primary)]">{selectedTask.title}</p>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Priority</label>
              <p className="text-[var(--text-primary)]">{selectedTask.priority}</p>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Status</label>
              <p className="text-[var(--text-primary)]">{selectedTask.status}</p>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Due date</label>
              <p className="text-[var(--text-primary)]">{selectedTask.due_date || '-'}</p>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Time spent</label>
              <p className="text-[var(--text-primary)]">{formatTime(selectedTask.time_spent)}</p>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Title</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="What needs to be done?"
              className="input-base"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="input-base"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Due date</label>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="input-base"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">Time estimate (min)</label>
            <input
              type="number"
              value={newTask.time_estimate}
              onChange={(e) => setNewTask({ ...newTask, time_estimate: e.target.value })}
              placeholder="30"
              className="input-base"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create task
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
