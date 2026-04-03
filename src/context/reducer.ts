import type { AppState, AppAction, Task, ActivityLogEntry } from '../types';
import { defaultCategories, defaultTemplates } from '../data/defaults';
import { api } from '../utils/api';

const STORAGE_KEY = 'taskflow-global-state';

function saveUIState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentView: state.currentView, searchQuery: state.searchQuery,
      filterPriority: state.filterPriority, filterCategory: state.filterCategory,
      filterStatus: state.filterStatus, filterAssignee: state.filterAssignee,
      sidebarOpen: state.sidebarOpen, darkMode: state.darkMode,
      activeTimer: state.activeTimer,
    }));
  } catch { /* ignore */ }
}

function loadUIState(): Partial<AppState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

export const initialState: AppState = {
  tasks: [],
  categories: defaultCategories,
  templates: defaultTemplates,
  sprints: [],
  currentView: 'dashboard',
  activeTimer: null,
  searchQuery: '',
  filterPriority: 'all',
  filterCategory: 'all',
  filterStatus: 'all',
  filterAssignee: 'all',
  sidebarOpen: true,
  darkMode: false,
  selectedTask: null,
  showTaskModal: false,
  editingTask: null,
  selectedTasks: [],
  notifications: [],
  showQuickAdd: false,
  showCategoryManager: false,
  showExportImport: false,
  toasts: [],
  savedViews: [],
};

export function getInitialState(): AppState {
  const uiState = loadUIState();
  return {
    ...initialState,
    ...uiState,
    selectedTask: null,
    showTaskModal: false,
    editingTask: null,
    selectedTasks: [],
    showQuickAdd: false,
    showCategoryManager: false,
    showExportImport: false,
    toasts: [],
  };
}

function updateTaskProgress(task: Task): Task {
  if (!task.subtasks || task.subtasks.length === 0) return task;
  const completed = task.subtasks.filter(s => s.completed).length;
  return { ...task, progress: Math.round((completed / task.subtasks.length) * 100) };
}

function addActivity(task: Task, type: ActivityLogEntry['type'], message: string): Task {
  return {
    ...task,
    activityLog: [
      ...task.activityLog,
      { id: crypto.randomUUID?.() || Date.now().toString(), type, message, timestamp: new Date().toISOString() },
    ],
  };
}

function handleRecurringTask(task: Task): Task | null {
  if (!task.recurring || task.status !== 'done') return null;
  const now = new Date();
  let nextDue: Date | null = null;
  if (task.dueDate) {
    const current = new Date(task.dueDate);
    switch (task.recurring.type) {
      case 'daily': nextDue = new Date(current.getTime() + task.recurring.interval * 86400000); break;
      case 'weekly': nextDue = new Date(current.getTime() + task.recurring.interval * 7 * 86400000); break;
      case 'monthly': { nextDue = new Date(current); nextDue.setMonth(nextDue.getMonth() + task.recurring.interval); break; }
      case 'custom': nextDue = new Date(current.getTime() + task.recurring.interval * 86400000); break;
    }
  } else {
    nextDue = now;
  }
  return {
    ...task,
    id: crypto.randomUUID?.() || Date.now().toString(),
    status: 'todo',
    progress: 0,
    dueDate: nextDue?.toISOString() || null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: null,
    subtasks: task.subtasks.map(s => ({ ...s, id: crypto.randomUUID?.() || Date.now().toString(), completed: false })),
    timeLogs: [],
    comments: [],
    activityLog: [{ id: crypto.randomUUID?.() || Date.now().toString(), type: 'created', message: 'Created from recurring task', timestamp: now.toISOString() }],
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  let newState: AppState;

  switch (action.type) {
    case 'ADD_TASK': {
      const task = addActivity(action.payload, 'created', `Task created`);
      api.createTask(task as unknown as Record<string, unknown>).catch(() => {});
      newState = { ...state, tasks: [...state.tasks, task] };
      break;
    }

    case 'UPDATE_TASK': {
      const oldTask = state.tasks.find(t => t.id === action.payload.id);
      let updated = updateTaskProgress({ ...action.payload, updatedAt: new Date().toISOString() });
      if (oldTask && oldTask.status !== updated.status) {
        updated = addActivity(updated, 'status_changed', `Status changed to "${updated.status}"`);
        if (updated.status === 'done') {
          updated.completedAt = new Date().toISOString();
          const recurring = handleRecurringTask(updated);
          if (recurring) {
            api.createTask(recurring as unknown as Record<string, unknown>).catch(() => {});
            api.updateTask(updated.id, updated as unknown as Record<string, unknown>).catch(() => {});
            newState = { ...state, tasks: [...state.tasks.map(t => t.id === updated.id ? updated : t), recurring] };
            break;
          }
        }
      }
      if (oldTask && oldTask.dueDate !== updated.dueDate) {
        updated = addActivity(updated, 'due_date_changed', `Due date updated`);
      }
      api.updateTask(updated.id, updated as unknown as Record<string, unknown>).catch(() => {});
      newState = { ...state, tasks: state.tasks.map(t => t.id === updated.id ? updated : t) };
      break;
    }

    case 'DELETE_TASK':
      api.deleteTask(action.payload).catch(() => {});
      newState = {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
        selectedTask: state.selectedTask?.id === action.payload ? null : state.selectedTask,
        selectedTasks: state.selectedTasks.filter(id => id !== action.payload),
      };
      break;

    case 'REORDER_TASKS': {
      const { sourceStatus, destStatus, sourceIndex, destIndex } = action.payload;
      const sourceTasks = state.tasks.filter(t => t.status === sourceStatus);
      const taskToMove = sourceTasks[sourceIndex];
      if (!taskToMove) return state;
      let newTasks = state.tasks.filter(t => t.id !== taskToMove.id);
      const movedTask = { ...taskToMove, status: destStatus, updatedAt: new Date().toISOString() };
      api.updateTask(movedTask.id, movedTask as unknown as Record<string, unknown>).catch(() => {});
      const destTasks = newTasks.filter(t => t.status === destStatus);
      const otherTasks = newTasks.filter(t => t.status !== destStatus);
      destTasks.splice(destIndex, 0, movedTask);
      newState = { ...state, tasks: [...otherTasks, ...destTasks] };
      break;
    }

    case 'SET_VIEW': newState = { ...state, currentView: action.payload }; break;
    case 'SET_SEARCH': newState = { ...state, searchQuery: action.payload }; break;
    case 'SET_FILTER_PRIORITY': newState = { ...state, filterPriority: action.payload }; break;
    case 'SET_FILTER_CATEGORY': newState = { ...state, filterCategory: action.payload }; break;
    case 'SET_FILTER_STATUS': newState = { ...state, filterStatus: action.payload }; break;
    case 'SET_FILTER_ASSIGNEE': newState = { ...state, filterAssignee: action.payload }; break;
    case 'TOGGLE_SIDEBAR': newState = { ...state, sidebarOpen: !state.sidebarOpen }; break;
    case 'TOGGLE_DARK_MODE': newState = { ...state, darkMode: !state.darkMode }; break;
    case 'SELECT_TASK': newState = { ...state, selectedTask: action.payload }; break;
    case 'SHOW_TASK_MODAL': newState = { ...state, showTaskModal: action.payload }; break;
    case 'SET_EDITING_TASK': newState = { ...state, editingTask: action.payload, showTaskModal: action.payload !== null }; break;

    case 'ADD_CATEGORY':
      api.createCategory(action.payload as unknown as Record<string, unknown>).catch(() => {});
      newState = { ...state, categories: [...state.categories, action.payload] };
      break;
    case 'UPDATE_CATEGORY':
      api.updateCategory(action.payload.id, action.payload as unknown as Record<string, unknown>).catch(() => {});
      newState = { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
      break;
    case 'DELETE_CATEGORY': {
      const cat = state.categories.find(c => c.id === action.payload);
      const fallback = state.categories.find(c => c.id !== action.payload)?.name || 'Work';
      api.deleteCategory(action.payload).catch(() => {});
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload),
        tasks: state.tasks.map(t => cat && t.category === cat.name ? { ...t, category: fallback } : t),
      };
    }

    case 'SELECT_TASKS': newState = { ...state, selectedTasks: action.payload }; break;
    case 'TOGGLE_TASK_SELECTION': {
      const isSelected = state.selectedTasks.includes(action.payload);
      newState = {
        ...state,
        selectedTasks: isSelected
          ? state.selectedTasks.filter(id => id !== action.payload)
          : [...state.selectedTasks, action.payload],
      };
      break;
    }
    case 'CLEAR_SELECTION': newState = { ...state, selectedTasks: [] }; break;

    case 'BULK_UPDATE_STATUS':
      state.selectedTasks.forEach(id => {
        const t = state.tasks.find(task => task.id === id);
        if (t) {
          const updated = { ...t, status: action.payload, updatedAt: new Date().toISOString(), completedAt: action.payload === 'done' ? new Date().toISOString() : t.completedAt };
          api.updateTask(id, updated as unknown as Record<string, unknown>).catch(() => {});
        }
      });
      newState = {
        ...state,
        tasks: state.tasks.map(t =>
          state.selectedTasks.includes(t.id)
            ? addActivity({ ...t, status: action.payload, updatedAt: new Date().toISOString(), completedAt: action.payload === 'done' ? new Date().toISOString() : t.completedAt }, 'status_changed', `Bulk status change to "${action.payload}"`)
            : t
        ),
        selectedTasks: [],
      };
      break;

    case 'BULK_DELETE':
      state.selectedTasks.forEach(id => api.deleteTask(id).catch(() => {}));
      newState = {
        ...state,
        tasks: state.tasks.filter(t => !state.selectedTasks.includes(t.id)),
        selectedTasks: [],
      };
      break;

    case 'BULK_UPDATE_CATEGORY':
      state.selectedTasks.forEach(id => {
        const t = state.tasks.find(task => task.id === id);
        if (t) api.updateTask(id, { ...t, category: action.payload } as unknown as Record<string, unknown>).catch(() => {});
      });
      newState = {
        ...state,
        tasks: state.tasks.map(t =>
          state.selectedTasks.includes(t.id) ? { ...t, category: action.payload, updatedAt: new Date().toISOString() } : t
        ),
        selectedTasks: [],
      };
      break;

    case 'ADD_NOTIFICATION': newState = { ...state, notifications: [action.payload, ...state.notifications] }; break;
    case 'MARK_NOTIFICATION_READ':
      api.markNotificationRead(action.payload).catch(() => {});
      newState = { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
      break;
    case 'CLEAR_NOTIFICATIONS':
      api.clearNotifications().catch(() => {});
      newState = { ...state, notifications: [] };
      break;

    case 'ADD_TEMPLATE':
      api.createTemplate(action.payload as unknown as Record<string, unknown>).catch(() => {});
      newState = { ...state, templates: [...state.templates, action.payload] };
      break;
    case 'DELETE_TEMPLATE':
      api.deleteTemplate(action.payload).catch(() => {});
      newState = { ...state, templates: state.templates.filter(t => t.id !== action.payload) };
      break;

    case 'ADD_TOAST': newState = { ...state, toasts: [...state.toasts, action.payload] }; break;
    case 'REMOVE_TOAST': newState = { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }; break;

    case 'SHOW_QUICK_ADD': newState = { ...state, showQuickAdd: action.payload }; break;
    case 'SHOW_CATEGORY_MANAGER': newState = { ...state, showCategoryManager: action.payload }; break;
    case 'SHOW_EXPORT_IMPORT': newState = { ...state, showExportImport: action.payload }; break;

    case 'IMPORT_TASKS':
      action.payload.forEach(t => api.createTask(t as unknown as Record<string, unknown>).catch(() => {}));
      newState = { ...state, tasks: [...state.tasks, ...action.payload] };
      break;

    case 'START_TIMER':
      newState = { ...state, activeTimer: { taskId: action.payload.taskId, taskTitle: action.payload.taskTitle, startTime: new Date().toISOString() } };
      break;

    case 'STOP_TIMER': {
      if (!state.activeTimer) return state;
      const timerTask = state.tasks.find(t => t.id === state.activeTimer!.taskId);
      if (!timerTask) {
        newState = { ...state, activeTimer: null };
        break;
      }
      const now = new Date();
      const startTime = new Date(state.activeTimer.startTime);
      const duration = Math.round((now.getTime() - startTime.getTime()) / 1000);
      const newLog = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        startTime: state.activeTimer.startTime,
        endTime: now.toISOString(),
        duration,
      };
      const updatedTask = {
        ...timerTask,
        timeLogs: [...timerTask.timeLogs, newLog],
        updatedAt: now.toISOString(),
      };
      api.updateTask(updatedTask.id, updatedTask as unknown as Record<string, unknown>).catch(() => {});
      newState = {
        ...state,
        activeTimer: null,
        tasks: state.tasks.map(t => t.id === updatedTask.id ? updatedTask : t),
      };
      break;
    }

    case 'DUPLICATE_TASK': {
      api.duplicateTask(action.payload).catch(() => {});
      newState = state;
      break;
    }

    case 'ADD_TASK_SILENT': {
      if (state.tasks.find(t => t.id === action.payload.id)) { newState = state; break; }
      newState = { ...state, tasks: [...state.tasks, action.payload] };
      break;
    }
    case 'UPDATE_TASK_SILENT':
      newState = { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
      break;
    case 'DELETE_TASK_SILENT':
      newState = {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
        selectedTask: state.selectedTask?.id === action.payload ? null : state.selectedTask,
      };
      break;

    case 'SET_SAVED_VIEWS': newState = { ...state, savedViews: action.payload }; break;
    case 'ADD_SAVED_VIEW':
      api.createSavedView({ name: action.payload.name, viewType: action.payload.viewType, filters: action.payload.filters }).catch(() => {});
      newState = { ...state, savedViews: [action.payload, ...state.savedViews] };
      break;
    case 'DELETE_SAVED_VIEW':
      api.deleteSavedView(action.payload).catch(() => {});
      newState = { ...state, savedViews: state.savedViews.filter(v => v.id !== action.payload) };
      break;

    case 'SET_SPRINTS': newState = { ...state, sprints: action.payload }; break;
    case 'ADD_SPRINT': newState = { ...state, sprints: [action.payload, ...state.sprints] }; break;
    case 'UPDATE_SPRINT': newState = { ...state, sprints: state.sprints.map(s => s.id === action.payload.id ? action.payload : s) }; break;
    case 'DELETE_SPRINT': newState = { ...state, sprints: state.sprints.filter(s => s.id !== action.payload) }; break;

    case 'LOAD_STATE': {
      const { tasks, categories, templates, notifications, savedViews, sprints } = action.payload as any;
      newState = {
        ...state,
        ...(tasks !== undefined && { tasks }),
        ...(categories !== undefined && { categories }),
        ...(templates !== undefined && { templates }),
        ...(notifications !== undefined && { notifications }),
        ...(savedViews !== undefined && { savedViews }),
        ...(sprints !== undefined && { sprints }),
      };
      break;
    }

    default: return state;
  }

  saveUIState(newState);
  return newState;
}
