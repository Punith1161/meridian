import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('meridian_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('meridian_token');
      window.location.href = '/login';
    }
    throw error;
  }
);

export const getTasks = () => api.get('/tasks');

export const createTask = (data) => api.post('/tasks', data);

export const getTask = (id) => api.get(`/tasks/${id}`);

export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);

export const updateTaskStatus = (id, status) =>
  api.patch(`/tasks/${id}/status`, { status });

export const deleteTask = (id) => api.delete(`/tasks/${id}`);

export const startTimer = (id) => api.post(`/tasks/${id}/timer/start`);

export const stopTimer = (id) => api.post(`/tasks/${id}/timer/stop`);

export const getTimer = (id) => api.get(`/tasks/${id}/timer`);
