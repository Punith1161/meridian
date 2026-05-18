import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getTasks, createTask, updateTaskStatus, startTimer, stopTimer } from '../api/tasks';
import { TaskCard } from '../components/TaskCard';
import { Modal } from '../components/Modal';
import { AppLayout } from '../components/AppLayout';

export default function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '', time_estimate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setError('');
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      setError('Could not load tasks. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const taskData = {
        ...newTask,
        time_estimate: newTask.time_estimate ? parseInt(newTask.time_estimate) : null,
      };
      await createTask(taskData);
      setNewTask({ title: '', priority: 'medium', due_date: '', time_estimate: '' });
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      setError('Could not create task.');
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    try {
      setError('');
      await updateTaskStatus(taskId, newStatus);
      fetchTasks();
    } catch (error) {
      setError('Could not move task.');
    }
  };

  const handleTimerToggle = async (taskId, isRunning) => {
    try {
      setError('');
      if (isRunning) {
        await stopTimer(taskId);
      } else {
        await startTimer(taskId);
      }
      fetchTasks();
    } catch (error) {
      setError('Could not update the timer.');
    }
  };

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    inprogress: tasks.filter((t) => t.status === 'inprogress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <AppLayout
      title="Kanban"
      actions={
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New task
        </button>
      }
    >
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">Loading tasks...</div>
        ) : (
          <div className="h-full">
            {error && (
              <div className="px-6 pt-4 text-sm text-[var(--danger)]">{error}</div>
            )}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 px-6 py-5 overflow-x-auto h-full">
                {[
                  { id: 'todo', label: 'To do', color: 'var(--text-tertiary)' },
                  { id: 'inprogress', label: 'In progress', color: 'var(--info)' },
                  { id: 'done', label: 'Done', color: 'var(--success)' },
                ].map((col) => (
                  <Droppable key={col.id} droppableId={col.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="w-[270px] flex-shrink-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1 pb-2">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                            <span className="w-2 h-2 rounded-full" style={{ background: col.color }}></span>
                            {col.label}
                          </div>
                          <span className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                            {tasksByStatus[col.id].length}
                          </span>
                        </div>
                        {tasksByStatus[col.id].length === 0 && (
                          <div className="border border-dashed border-[var(--border-primary)] rounded-md px-4 py-6 text-center text-[12px] text-[var(--text-tertiary)]">
                            No tasks here
                          </div>
                        )}
                        {tasksByStatus[col.id].map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <TaskCard
                                  task={task}
                                  showTimer={col.id !== 'done'}
                                  onTimerToggle={(id) => handleTimerToggle(id, task.timer_started_at !== null)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New task">
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
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn">
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
