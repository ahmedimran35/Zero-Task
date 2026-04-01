import type { Task, TaskStatus, Priority } from '../types';

export function filterTasks(
  tasks: Task[],
  search: string,
  priority: Priority | 'all',
  category: string | 'all',
  status: TaskStatus | 'all',
  assignee: string | 'all' = 'all'
): Task[] {
  return tasks.filter(task => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesPriority = priority === 'all' || task.priority === priority;
    const matchesCategory = category === 'all' || task.category === category;
    const matchesStatus = status === 'all' || task.status === status;
    const matchesAssignee = assignee === 'all' || task.assignee === assignee;

    return matchesSearch && matchesPriority && matchesCategory && matchesStatus && matchesAssignee;
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
