import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Tasks API
export const tasksAPI = {
  getTasks: (params = {}) => api.get('/tasks', { params }),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (taskData) => api.post('/tasks', taskData),
  updateTask: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  assignTask: (taskId, assignees) => api.patch(`/tasks/${taskId}/assign`, { assignees }),
};

// Admin API
export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.patch(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRoles: (id, roles) => api.patch(`/admin/users/${id}/roles`, { roles }),
  updateUserTeams: (id, teams) => api.patch(`/admin/users/${id}/teams`, { teams }),
  updateUserPermissions: (id, permissions) => api.patch(`/admin/users/${id}/permissions`, { permissions }),
  // Task management
  getAllTasks: (params) => api.get('/admin/tasks', { params }),
  getTaskStats: () => api.get('/admin/tasks/stats'),
  assignTask: (taskId, userId) => api.patch(`/admin/tasks/${taskId}/assign`, { userId }),
  updateTask: (taskId, taskData) => api.patch(`/admin/tasks/${taskId}`, taskData),
};

// Teams API
export const teamsAPI = {
  listTeams: () => api.get('/teams'),
  getTeam: (id) => api.get(`/teams/${id}`),
  createTeam: (teamData) => api.post('/teams', teamData),
  updateTeam: (id, teamData) => api.patch(`/teams/${id}`, teamData),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  getAvailablePermissions: () => api.get('/teams/permissions/available'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
