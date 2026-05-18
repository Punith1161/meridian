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

export const register = (email, password) =>
  api.post('/auth/register', { email, password });

export const login = (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  return axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, formData);
};

export const getMe = () => api.get('/auth/me');
