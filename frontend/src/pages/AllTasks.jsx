import { useState, useEffect } from 'react';
import { getTasks } from '../api/tasks';
import { formatTime } from '../utils/formatTime';
import { Modal } from '../components/Modal';

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="ml-14 p-6 min-h-screen bg-[var(--bg-primary)]">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">All tasks</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)]"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)]"
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
              <th className="text-left px-4 py-2 text-[var(--text-secondary)] font-semibold">Title</th>
              <th className="text-left px-4 py-2 text-[var(--text-secondary)] font-semibold">Priority</th>
              <th className="text-left px-4 py-2 text-[var(--text-secondary)] font-semibold">Status</th>
              <th className="text-left px-4 py-2 text-[var(--text-secondary)] font-semibold">Due date</th>
              <th className="text-left px-4 py-2 text-[var(--text-secondary)] font-semibold">Estimate</th>
              <th className="text-left px-4 py-2 text-[var(--text-secondary)] font-semibold">Time spent</th>
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
                <td className="px-4 py-3 text-[var(--text-primary)]">{task.title}</td>
                <td className="px-4 py-3 text-[var(--text-primary)]">{task.priority}</td>
                <td className="px-4 py-3 text-[var(--text-primary)]">{task.status}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{task.due_date || '-'}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{task.time_estimate ? `${task.time_estimate}m` : '-'}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{formatTime(task.time_spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTask && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Task details">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Title</label>
              <p className="text-[var(--text-primary)]">{selectedTask.title}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Priority</label>
              <p className="text-[var(--text-primary)]">{selectedTask.priority}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Status</label>
              <p className="text-[var(--text-primary)]">{selectedTask.status}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Due date</label>
              <p className="text-[var(--text-primary)]">{selectedTask.due_date || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Time spent</label>
              <p className="text-[var(--text-primary)]">{formatTime(selectedTask.time_spent)}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
