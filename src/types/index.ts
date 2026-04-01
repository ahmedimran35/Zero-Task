export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type ViewType = 'dashboard' | 'kanban' | 'list' | 'calendar' | 'admin' | 'tickets' | 'gantt' | 'goals' | 'workload' | 'sprints' | 'automations' | 'projects' | 'integrations';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'archived';
export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number;
}

export interface ActivityLogEntry {
  id: string;
  type: 'created' | 'status_changed' | 'edited' | 'subtask_completed' | 'comment_added' | 'time_logged' | 'assigned' | 'due_date_changed';
  message: string;
  timestamp: string;
}

export interface Recurrence {
  type: RecurrenceType;
  interval: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  category: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  tags: string[];
  progress: number;
  assignee: string | null;
  recurring: Recurrence | null;
  dependsOn: string[];
  projectId: string | null;
  timeLogs: TimeLog[];
  comments: Comment[];
  activityLog: ActivityLogEntry[];
  completedAt: string | null;
  storyPoints: number;
  timeEstimate: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  taskCount: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: Priority;
  defaultCategory: string;
  defaultSubtasks: string[];
  defaultTags: string[];
}

export interface Notification {
  id: string;
  type: 'due_soon' | 'overdue' | 'assigned' | 'completed' | 'info' | 'ticket_message';
  title: string;
  message: string;
  taskId: string | null;
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  assignedTo: string | null;
  assignedName: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: string;
}

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: GoalStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  keyResults: KeyResult[];
  progress: number;
}

export interface SavedView {
  id: string;
  name: string;
  viewType: string;
  filters: {
    search: string;
    priority: string;
    category: string;
    status: string;
    assignee: string;
    view: string;
  };
  createdAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  goal: string;
  createdAt: string;
  taskIds: string[];
  totalTasks: number;
  completedTasks?: number;
  tasks?: { id: string; title: string; status: string; priority: string }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  taskCount: number;
  createdAt: string;
}

export interface CustomField {
  id: string;
  name: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'url' | 'email' | 'checkbox';
  options: string[];
  createdAt: string;
}

export interface CustomFieldValue {
  fieldId: string;
  name: string;
  fieldType: string;
  options: string[];
  value: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  url: string;
}

export interface Automation {
  id: string;
  name: string;
  triggerType: 'status_changed' | 'due_date_passed' | 'task_created' | 'priority_changed';
  triggerCondition: Record<string, string>;
  actionType: 'set_status' | 'set_priority' | 'set_assignee' | 'add_tag' | 'notify';
  actionConfig: Record<string, string>;
  enabled: boolean;
  createdAt: string;
}

export interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  startTime: string;
}

export interface AppState {
  tasks: Task[];
  categories: Category[];
  templates: TaskTemplate[];
  currentView: ViewType;
  activeTimer: ActiveTimer | null;
  searchQuery: string;
  filterPriority: Priority | 'all';
  filterCategory: string | 'all';
  filterStatus: TaskStatus | 'all';
  filterAssignee: string | 'all';
  sidebarOpen: boolean;
  darkMode: boolean;
  selectedTask: Task | null;
  showTaskModal: boolean;
  editingTask: Task | null;
  selectedTasks: string[];
  notifications: Notification[];
  showQuickAdd: boolean;
  showCategoryManager: boolean;
  showExportImport: boolean;
  toasts: ToastMessage[];
  savedViews: SavedView[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  undoAction?: AppAction;
}

export type AppAction =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'REORDER_TASKS'; payload: { sourceStatus: TaskStatus; destStatus: TaskStatus; sourceIndex: number; destIndex: number } }
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER_PRIORITY'; payload: Priority | 'all' }
  | { type: 'SET_FILTER_CATEGORY'; payload: string | 'all' }
  | { type: 'SET_FILTER_STATUS'; payload: TaskStatus | 'all' }
  | { type: 'SET_FILTER_ASSIGNEE'; payload: string | 'all' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SELECT_TASK'; payload: Task | null }
  | { type: 'SHOW_TASK_MODAL'; payload: boolean }
  | { type: 'SET_EDITING_TASK'; payload: Task | null }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SELECT_TASKS'; payload: string[] }
  | { type: 'TOGGLE_TASK_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'BULK_UPDATE_STATUS'; payload: TaskStatus }
  | { type: 'BULK_DELETE' }
  | { type: 'BULK_UPDATE_CATEGORY'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'ADD_TEMPLATE'; payload: TaskTemplate }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SHOW_QUICK_ADD'; payload: boolean }
  | { type: 'SHOW_CATEGORY_MANAGER'; payload: boolean }
  | { type: 'SHOW_EXPORT_IMPORT'; payload: boolean }
  | { type: 'IMPORT_TASKS'; payload: Task[] }
  | { type: 'START_TIMER'; payload: { taskId: string; taskTitle: string } }
  | { type: 'STOP_TIMER' }
  | { type: 'DUPLICATE_TASK'; payload: string }
  | { type: 'ADD_TASK_SILENT'; payload: Task }
  | { type: 'UPDATE_TASK_SILENT'; payload: Task }
  | { type: 'DELETE_TASK_SILENT'; payload: string }
  | { type: 'SET_SAVED_VIEWS'; payload: SavedView[] }
  | { type: 'ADD_SAVED_VIEW'; payload: SavedView }
  | { type: 'DELETE_SAVED_VIEW'; payload: string }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };
