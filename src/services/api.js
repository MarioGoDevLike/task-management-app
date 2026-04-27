import {
  firebaseAuthApi,
  firebaseTasksApi,
  firebaseAdminApi,
  firebaseTeamsApi,
  firebaseKanbanApi,
  firebaseProjectsApi,
  DEFAULT_KANBAN_COLUMNS,
  normalizeKanbanColumns,
} from './firebaseBackend';

export { DEFAULT_KANBAN_COLUMNS, normalizeKanbanColumns };

export const authAPI = {
  register: (userData) => firebaseAuthApi.register(userData),
  login: (credentials) => firebaseAuthApi.login(credentials),
  logout: () => firebaseAuthApi.logout(),
  getCurrentUser: () => firebaseAuthApi.me(),
};

export const tasksAPI = {
  getTasks: (params = {}) => firebaseTasksApi.getTasks(params),
  getTask: (id) => firebaseTasksApi.getTask(id),
  createTask: (taskData) => firebaseTasksApi.createTask(taskData),
  updateTask: (id, taskData) => firebaseTasksApi.updateTask(id, taskData),
  deleteTask: (id) => firebaseTasksApi.deleteTask(id),
  assignTask: (taskId, assignees) => firebaseTasksApi.assignTask(taskId, assignees),
};

export const adminAPI = {
  listUsers: () => firebaseAdminApi.listUsers(),
  createUser: (userData) => firebaseAdminApi.createUser(userData),
  updateUser: (id, userData) => firebaseAdminApi.updateUser(id, userData),
  deleteUser: (id) => firebaseAdminApi.deleteUser(id),
  updateUserRoles: (id, roles) => firebaseAdminApi.updateUserRoles(id, roles),
  updateUserTeams: (id, teams) => firebaseAdminApi.updateUserTeams(id, teams),
  updateUserPermissions: (id, permissions) =>
    firebaseAdminApi.updateUserPermissions(id, permissions),
  getAllTasks: (params) => firebaseAdminApi.getAllTasks(params),
  getTaskStats: () => firebaseAdminApi.getTaskStats(),
  assignTask: (taskId, userId) => firebaseAdminApi.assignTask(taskId, userId),
  updateTask: (taskId, taskData) => firebaseAdminApi.updateTask(taskId, taskData),
};

export const teamsAPI = {
  listTeams: () => firebaseTeamsApi.listTeams(),
  getTeam: (id) => firebaseTeamsApi.getTeam(id),
  createTeam: (teamData) => firebaseTeamsApi.createTeam(teamData),
  updateTeam: (id, teamData) => firebaseTeamsApi.updateTeam(id, teamData),
  deleteTeam: (id) => firebaseTeamsApi.deleteTeam(id),
  getAvailablePermissions: () => firebaseTeamsApi.getAvailablePermissions(),
};

export const kanbanAPI = {
  getKanbanColumns: () => firebaseKanbanApi.getKanbanColumns(),
  saveKanbanColumns: (body) => firebaseKanbanApi.saveKanbanColumns(body),
};

export const projectsAPI = {
  listProjects: () => firebaseProjectsApi.listProjects(),
  createProject: (body) => firebaseProjectsApi.createProject(body),
  updateProject: (id, body) => firebaseProjectsApi.updateProject(id, body),
  deleteProject: (id) => firebaseProjectsApi.deleteProject(id),
};

export async function healthCheck() {
  return { data: { status: 'OK', backend: 'firebase' } };
}
