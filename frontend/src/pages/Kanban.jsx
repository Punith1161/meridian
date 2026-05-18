import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getTasks, createTask, updateTaskStatus } from '../api/tasks';
import { TaskCard } from '../components/TaskCard';
import { Modal } from '../components/Modal';

export default function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '', time_estimate: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        time_estimate: newTask.time_estimate ? parseInt(newTask.time_estimate) : null,
      };
      await createTask(taskData);
      setNewTask({ title: '', priority: 'medium', due_date: '', time_estimate: '' });
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Failed to create task');
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    try {
      await updateTaskStatus(taskId, newStatus);
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task status');
    }
  };

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    inprogress: tasks.filter((t) => t.status === 'inprogress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="ml-14 p-6 min-h-screen bg-[var(--bg-primary)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Kanban board</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--accent)] text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          Add task
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-6">
          {['todo', 'inprogress', 'done'].map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-[var(--bg-secondary)] rounded-lg p-4 min-h-[500px]"
                >
                  <h2 className="font-semibold text-[var(--text-primary)] mb-4">
                    {status === 'todo' && 'To do'}
                    {status === 'inprogress' && 'In progress'}
                    {status === 'done' && 'Done'}
                    <span className="text-[var(--text-secondary)] ml-2">({tasksByStatus[status].length})</span>
                  </h2>

                  {tasksByStatus[status].map((task, index) => (
                    <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <TaskCard task={task} onTimerToggle={() => {}} />
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title"
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none"
            required
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input
            type="date"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none"
          />
          <input
            type="number"
            value={newTask.time_estimate}
            onChange={(e) => setNewTask({ ...newTask, time_estimate: e.target.value })}
            placeholder="Time estimate (minutes)"
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none"
          />
          <button
            type="submit"
            className="w-full bg-[var(--accent)] text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            Create
          </button>
        </form>
      </Modal>
    </div>
  );
}
