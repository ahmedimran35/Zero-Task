const API_BASE = '/api';

const TOKEN_KEY = 'taskflow-token';
const SESSION_KEY = 'taskflow-current-user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function uploadFile(path: string, file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export const api = {
  login: async (email: string, password: string) => {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(data.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    return data.user;
  },
  getSession: () => request('/session'),
  getUsers: () => request('/users'),
  createUser: (data: { email: string; password: string; name: string }) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Record<string, unknown>) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, password: string) => request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  toggleUserActive: (id: string) => request(`/users/${id}/toggle`, { method: 'PUT' }),
  getUserTaskCount: (userId: string) => request(`/users/${userId}/task-count`),
  getTasks: (userId?: string) => request(`/tasks${userId ? `?userId=${userId}` : ''}`),
  createTask: (task: Record<string, unknown>) => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: string, task: Record<string, unknown>) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: 'DELETE' }),
  duplicateTask: (id: string) => request(`/tasks/${id}/duplicate`, { method: 'POST' }),
  getCategories: () => request('/categories'),
  createCategory: (data: Record<string, unknown>) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Record<string, unknown>) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),
  getTemplates: () => request('/templates'),
  createTemplate: (data: Record<string, unknown>) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) => request(`/templates/${id}`, { method: 'DELETE' }),
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  clearNotifications: () => request('/notifications', { method: 'DELETE' }),
  getTickets: () => request('/tickets'),
  getTicket: (id: string) => request(`/tickets/${id}`),
  createTicket: (data: { subject: string; description: string; priority: string }) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  updateTicket: (id: string, data: Record<string, unknown>) => request(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addTicketMessage: (ticketId: string, message: string) => request(`/tickets/${ticketId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
  deleteTicket: (id: string) => request(`/tickets/${id}`, { method: 'DELETE' }),
  getUnreadTicketCount: () => request('/tickets/unread-count'),
  getGoals: () => request('/goals'),
  createGoal: (data: Record<string, unknown>) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: Record<string, unknown>) => request(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateKeyResult: (goalId: string, krId: string, currentValue: number) => request(`/goals/${goalId}/key-results/${krId}`, { method: 'PUT', body: JSON.stringify({ currentValue }) }),
  deleteGoal: (id: string) => request(`/goals/${id}`, { method: 'DELETE' }),
  getSavedViews: () => request('/saved-views'),
  createSavedView: (data: { name: string; viewType: string; filters: Record<string, unknown> }) => request('/saved-views', { method: 'POST', body: JSON.stringify(data) }),
  deleteSavedView: (id: string) => request(`/saved-views/${id}`, { method: 'DELETE' }),
  getSprints: () => request('/sprints'),
  getSprint: (id: string) => request(`/sprints/${id}`),
  createSprint: (data: Record<string, unknown>) => request('/sprints', { method: 'POST', body: JSON.stringify(data) }),
  updateSprint: (id: string, data: Record<string, unknown>) => request(`/sprints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addSprintTask: (sprintId: string, taskId: string) => request(`/sprints/${sprintId}/tasks`, { method: 'POST', body: JSON.stringify({ taskId }) }),
  removeSprintTask: (sprintId: string, taskId: string) => request(`/sprints/${sprintId}/tasks/${taskId}`, { method: 'DELETE' }),
  deleteSprint: (id: string) => request(`/sprints/${id}`, { method: 'DELETE' }),
  getProjects: () => request('/projects'),
  createProject: (data: Record<string, unknown>) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Record<string, unknown>) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
  getCustomFields: () => request('/custom-fields'),
  createCustomField: (data: Record<string, unknown>) => request('/custom-fields', { method: 'POST', body: JSON.stringify(data) }),
  deleteCustomField: (id: string) => request(`/custom-fields/${id}`, { method: 'DELETE' }),
  getCustomFieldValues: (taskId: string) => request(`/custom-fields/values/${taskId}`),
  setCustomFieldValue: (taskId: string, fieldId: string, value: string) => request(`/custom-fields/values/${taskId}/${fieldId}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  getAttachments: (taskId: string) => request(`/attachments/${taskId}`),
  uploadAttachment: (taskId: string, file: File) => uploadFile(`/attachments/${taskId}`, file),
  deleteAttachment: (id: string) => request(`/attachments/${id}`, { method: 'DELETE' }),
  getAutomations: () => request('/automations'),
  createAutomation: (data: Record<string, unknown>) => request('/automations', { method: 'POST', body: JSON.stringify(data) }),
  updateAutomation: (id: string, data: Record<string, unknown>) => request(`/automations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAutomation: (id: string) => request(`/automations/${id}`, { method: 'DELETE' }),
  getWebhooks: () => request('/webhooks'),
  createWebhook: (data: Record<string, unknown>) => request('/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  updateWebhook: (id: string, data: Record<string, unknown>) => request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWebhook: (id: string) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (id: string) => request(`/webhooks/test/${id}`, { method: 'POST' }),
  getForms: () => request('/forms'),
  createForm: (data: Record<string, unknown>) => request('/forms', { method: 'POST', body: JSON.stringify(data) }),
  deleteForm: (id: string) => request(`/forms/${id}`, { method: 'DELETE' }),
  getNotificationPreferences: () => request('/notification-preferences'),
  updateNotificationPreferences: (data: Record<string, unknown>) => request('/notification-preferences', { method: 'PUT', body: JSON.stringify(data) }),
  parseTask: (input: string) => request('/ai/parse-task', { method: 'POST', body: JSON.stringify({ input }) }),
  summarizeTask: (data: Record<string, unknown>) => request('/ai/summarize', { method: 'POST', body: JSON.stringify(data) }),
  generateSubtasks: (data: Record<string, unknown>) => request('/ai/generate-subtasks', { method: 'POST', body: JSON.stringify(data) }),
  smartSearch: (query: string) => request('/ai/search', { method: 'POST', body: JSON.stringify({ query }) }),
  getStandup: () => request('/ai/standup'),
  workspaceQ: (question: string) => request('/ai/workspace-q', { method: 'POST', body: JSON.stringify({ question }) }),
  generateDescription: (data: Record<string, unknown>) => request('/ai/generate-description', { method: 'POST', body: JSON.stringify(data) }),
  suggestPriority: (data: Record<string, unknown>) => request('/ai/suggest-priority', { method: 'POST', body: JSON.stringify(data) }),
  suggestTags: (data: Record<string, unknown>) => request('/ai/suggest-tags', { method: 'POST', body: JSON.stringify(data) }),
  getWeeklySummary: () => request('/ai/weekly-summary', { method: 'POST', body: JSON.stringify({}) }),

  // AI Providers
  getAIProviders: () => request('/ai-providers'),
  getActiveAIProvider: () => request('/ai-providers/active'),
  createAIProvider: (data: Record<string, unknown>) => request('/ai-providers', { method: 'POST', body: JSON.stringify(data) }),
  updateAIProvider: (id: string, data: Record<string, unknown>) => request('/ai-providers/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  activateAIProvider: (id: string) => request('/ai-providers/' + id + '/activate', { method: 'PUT' }),
  deactivateAllAIProviders: () => request('/ai-providers/deactivate-all', { method: 'PUT' }),
  deleteAIProvider: (id: string) => request('/ai-providers/' + id, { method: 'DELETE' }),
  fetchAIModels: (data: Record<string, unknown>) => request('/ai-providers/fetch-models', { method: 'POST', body: JSON.stringify(data) }),
};
