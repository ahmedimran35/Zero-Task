import type { Task, TaskStatus, Priority } from '../types';

interface ParsedSearch {
  query: string;
  filters: {
    status?: TaskStatus;
    priority?: Priority;
    category?: string;
    assignee?: string;
    dueDate?: 'today' | 'tomorrow' | 'thisweek' | 'overdue';
    hasTag?: string;
    hasProject?: string;
  };
}

export function parseSearchQuery(input: string): ParsedSearch {
  const result: ParsedSearch = { query: '', filters: {} };
  
  // Match operators like status:done, priority:high, #tag, @assignee, due:today
  const operatorRegex = /(status|priority|category|assignee|due):(\w+)|#(\w+)|@(\w+)/gi;
  let match;
  
  // Extract operators
  while ((match = operatorRegex.exec(input)) !== null) {
    if (match[1]) {
      // operator:value
      const key = match[1].toLowerCase();
      const value = match[2].toLowerCase();
      
      if (key === 'status') {
        if (['todo', 'in-progress', 'review', 'done'].includes(value)) {
          result.filters.status = value as TaskStatus;
        }
      } else if (key === 'priority') {
        if (['urgent', 'high', 'medium', 'low'].includes(value)) {
          result.filters.priority = value as Priority;
        }
      } else if (key === 'category') {
        result.filters.category = value;
      } else if (key === 'assignee') {
        result.filters.assignee = value;
      } else if (key === 'due') {
        if (['today', 'tomorrow', 'thisweek', 'overdue'].includes(value)) {
          result.filters.dueDate = value as 'today' | 'tomorrow' | 'thisweek' | 'overdue';
        }
      }
    } else if (match[3]) {
      // #tag
      result.filters.hasTag = match[3].toLowerCase();
    } else if (match[4]) {
      // @assignee
      result.filters.assignee = match[4].toLowerCase();
    }
  }
  
  // Get remaining text as query
  const cleanInput = input.replace(operatorRegex, '').trim();
  result.query = cleanInput;
  
  return result;
}

export function filterTasks(
  tasks: Task[],
  search: string,
  priority: Priority | 'all',
  category: string | 'all',
  status: TaskStatus | 'all',
  assignee: string | 'all' = 'all'
): Task[] {
  const parsed = parseSearchQuery(search);
  
  // Combine explicit filters with parsed search operators
  const effectivePriority = parsed.filters.priority || priority;
  const effectiveCategory = parsed.filters.category || category;
  const effectiveStatus = parsed.filters.status || status;
  const effectiveAssignee = parsed.filters.assignee || assignee;
  
  return tasks.filter(task => {
    // Text search (in query or title/description/tags)
    const query = parsed.query.toLowerCase();
    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.tags.some(tag => tag.toLowerCase().includes(query));

    // Tag filter from #tag
    const matchesTag = !parsed.filters.hasTag || task.tags.some(t => t.toLowerCase() === parsed.filters.hasTag);
    
    // Priority filter
    const matchesPriority = effectivePriority === 'all' || task.priority === effectivePriority;
    
    // Category filter
    const matchesCategory = effectiveCategory === 'all' || task.category === effectiveCategory;
    
    // Status filter
    const matchesStatus = effectiveStatus === 'all' || task.status === effectiveStatus;
    
    // Assignee filter
    const matchesAssignee = effectiveAssignee === 'all' || (task.assignee && task.assignee.toLowerCase().includes(effectiveAssignee));
    
    // Due date filter
    let matchesDueDate = true;
    if (parsed.filters.dueDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      if (!task.dueDate) {
        matchesDueDate = false;
      } else {
        const taskDate = new Date(task.dueDate);
        switch (parsed.filters.dueDate) {
          case 'today':
            matchesDueDate = taskDate >= today && taskDate < tomorrow;
            break;
          case 'tomorrow':
            matchesDueDate = taskDate >= tomorrow && taskDate < new Date(tomorrow.getTime() + 24*60*60*1000);
            break;
          case 'thisweek':
            matchesDueDate = taskDate >= today && taskDate < nextWeek;
            break;
          case 'overdue':
            matchesDueDate = taskDate < today && task.status !== 'done';
            break;
        }
      }
    }

    return matchesSearch && matchesPriority && matchesCategory && matchesStatus && matchesAssignee && matchesDueDate && matchesTag;
  });
}

export function getTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter(t => t.status === status);
}

export function getOverdueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < now;
  });
}

export function getDueTodayTasks(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate >= today && dueDate < tomorrow;
  });
}

export function getCategoryStats(tasks: Task[], categories: { id: string; name: string; color: string }[]) {
  return categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat.name);
    const completed = catTasks.filter(t => t.status === 'done').length;
    return {
      ...cat,
      total: catTasks.length,
      completed,
      percentage: catTasks.length > 0 ? Math.round((completed / catTasks.length) * 100) : 0,
    };
  });
}

export function getCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
}

export function getPriorityWeight(priority: Priority): number {
  switch (priority) {
    case 'urgent': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
  }
}
