import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appReducer, initialState } from '../context/reducer';
import type { AppState, Task, Category, SavedView, ToastMessage } from '../types';

vi.mock('../utils/api', () => ({
  api: {
    createTask: vi.fn().mockResolvedValue({}),
    updateTask: vi.fn().mockResolvedValue({}),
    deleteTask: vi.fn().mockResolvedValue({}),
    createCategory: vi.fn().mockResolvedValue({}),
    updateCategory: vi.fn().mockResolvedValue({}),
    deleteCategory: vi.fn().mockResolvedValue({}),
    markNotificationRead: vi.fn().mockResolvedValue({}),
    clearNotifications: vi.fn().mockResolvedValue({}),
    createTemplate: vi.fn().mockResolvedValue({}),
    deleteTemplate: vi.fn().mockResolvedValue({}),
    duplicateTask: vi.fn().mockResolvedValue({}),
    createSavedView: vi.fn().mockResolvedValue({}),
    deleteSavedView: vi.fn().mockResolvedValue({}),
  },
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    category: 'Work',
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subtasks: [],
    tags: [],
    progress: 0,
    assignee: null,
    recurring: null,
    dependsOn: [],
    timeLogs: [],
    comments: [],
    activityLog: [],
    completedAt: null,
    projectId: null,
    sprintId: null,
    storyPoints: 0,
    timeEstimate: 0,
    ...overrides,
  };
}

describe('appReducer', () => {
  let state: AppState;

  beforeEach(() => {
    state = { ...initialState };
  });

  it('adds a task', () => {
    const task = makeTask();
    const result = appReducer(state, { type: 'ADD_TASK', payload: task });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe('task-1');
  });

  it('updates a task', () => {
    state.tasks = [makeTask()];
    const updated = makeTask({ title: 'Updated Title' });
    const result = appReducer(state, { type: 'UPDATE_TASK', payload: updated });
    expect(result.tasks[0].title).toBe('Updated Title');
  });

  it('deletes a task', () => {
    state.tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
    const result = appReducer(state, { type: 'DELETE_TASK', payload: 't1' });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe('t2');
  });

  it('sets view', () => {
    const result = appReducer(state, { type: 'SET_VIEW', payload: 'kanban' });
    expect(result.currentView).toBe('kanban');
  });

  it('sets search query', () => {
    const result = appReducer(state, { type: 'SET_SEARCH', payload: 'test' });
    expect(result.searchQuery).toBe('test');
  });

  it('sets filter priority', () => {
    const result = appReducer(state, { type: 'SET_FILTER_PRIORITY', payload: 'urgent' });
    expect(result.filterPriority).toBe('urgent');
  });

  it('sets filter status', () => {
    const result = appReducer(state, { type: 'SET_FILTER_STATUS', payload: 'done' });
    expect(result.filterStatus).toBe('done');
  });

  it('toggles sidebar', () => {
    state.sidebarOpen = true;
    const result = appReducer(state, { type: 'TOGGLE_SIDEBAR' });
    expect(result.sidebarOpen).toBe(false);
  });

  it('toggles dark mode', () => {
    state.darkMode = false;
    const result = appReducer(state, { type: 'TOGGLE_DARK_MODE' });
    expect(result.darkMode).toBe(true);
  });

  it('adds a category', () => {
    const cat: Category = { id: 'c1', name: 'Test', color: '#fff', icon: 'test', taskCount: 0 };
    const result = appReducer(state, { type: 'ADD_CATEGORY', payload: cat });
    expect(result.categories).toContainEqual(cat);
  });

  it('deletes a category', () => {
    state.categories = [
      { id: 'c1', name: 'ToDelete', color: '#fff', icon: 'test', taskCount: 0 },
      { id: 'c2', name: 'Keep', color: '#000', icon: 'test', taskCount: 0 },
    ];
    const result = appReducer(state, { type: 'DELETE_CATEGORY', payload: 'c1' });
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].id).toBe('c2');
  });

  it('selects and deselects tasks', () => {
    state.selectedTasks = [];
    let result = appReducer(state, { type: 'TOGGLE_TASK_SELECTION', payload: 't1' });
    expect(result.selectedTasks).toContain('t1');

    result = appReducer(result, { type: 'TOGGLE_TASK_SELECTION', payload: 't1' });
    expect(result.selectedTasks).not.toContain('t1');
  });

  it('clears selection', () => {
    state.selectedTasks = ['t1', 't2'];
    const result = appReducer(state, { type: 'CLEAR_SELECTION' });
    expect(result.selectedTasks).toHaveLength(0);
  });

  it('adds and removes toasts', () => {
    const toast: ToastMessage = { id: 'toast-1', message: 'Test', type: 'info' };
    let result = appReducer(state, { type: 'ADD_TOAST', payload: toast });
    expect(result.toasts).toHaveLength(1);

    result = appReducer(result, { type: 'REMOVE_TOAST', payload: 'toast-1' });
    expect(result.toasts).toHaveLength(0);
  });

  it('adds and deletes saved views', () => {
    const view: SavedView = {
      id: 'sv1', name: 'My View', viewType: 'kanban',
      filters: { search: '', priority: 'all', category: 'all', status: 'all', assignee: 'all', view: 'kanban' },
      createdAt: new Date().toISOString(),
    };
    let result = appReducer(state, { type: 'ADD_SAVED_VIEW', payload: view });
    expect(result.savedViews).toHaveLength(1);
    expect(result.savedViews[0].name).toBe('My View');

    result = appReducer(result, { type: 'DELETE_SAVED_VIEW', payload: 'sv1' });
    expect(result.savedViews).toHaveLength(0);
  });

  it('sets saved views', () => {
    const views: SavedView[] = [
      { id: 'sv1', name: 'View 1', viewType: 'kanban', filters: { search: '', priority: 'all', category: 'all', status: 'all', assignee: 'all', view: 'kanban' }, createdAt: '' },
    ];
    const result = appReducer(state, { type: 'SET_SAVED_VIEWS', payload: views });
    expect(result.savedViews).toHaveLength(1);
  });

  it('loads state', () => {
    const task = makeTask();
    const result = appReducer(state, { type: 'LOAD_STATE', payload: { tasks: [task], darkMode: true } as any });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe(task.id);
    // darkMode should NOT be loaded (not whitelisted)
    expect(result.darkMode).toBe(false);
  });

  it('progress updates when subtask is toggled', () => {
    state.tasks = [makeTask({
      id: 't1',
      subtasks: [
        { id: 's1', title: 'Sub 1', completed: false },
        { id: 's2', title: 'Sub 2', completed: false },
      ],
    })];
    const updated = makeTask({
      id: 't1',
      subtasks: [
        { id: 's1', title: 'Sub 1', completed: true },
        { id: 's2', title: 'Sub 2', completed: false },
      ],
    });
    const result = appReducer(state, { type: 'UPDATE_TASK', payload: updated });
    expect(result.tasks[0].progress).toBe(50);
  });
});
