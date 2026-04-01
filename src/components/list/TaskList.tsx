import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import type { Task, TaskStatus, Priority } from '../../types';
import { filterTasks } from '../../utils/taskUtils';
import { format, isPast, isToday } from 'date-fns';
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle,
  Trash2, Edit3, ChevronsUpDown, ListTodo, Repeat, Play, Copy,
} from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useTimer } from '../../hooks/useTimer';
import { api } from '../../utils/api';

type SortKey = 'title' | 'priority' | 'dueDate' | 'status' | 'category';
type SortDir = 'asc' | 'desc';

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'bg-slate-500' },
  'in-progress': { label: 'In Progress', color: 'bg-primary-500' },
  review: { label: 'In Review', color: 'bg-amber-500' },
  done: { label: 'Done', color: 'bg-emerald-500' },
};

const priorityConfig: Record<Priority, { label: string; color: string; weight: number }> = {
  urgent: { label: 'Urgent', color: 'text-rose-500', weight: 4 },
  high: { label: 'High', color: 'text-amber-500', weight: 3 },
  medium: { label: 'Medium', color: 'text-primary-500', weight: 2 },
  low: { label: 'Low', color: 'text-slate-400', weight: 1 },
};

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: SortKey; currentSort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void }) {
  const isActive = currentSort.key === sortKey;
  return (
    <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 text-xs font-semibold text-tertiary uppercase tracking-wider hover:text-primary transition-colors">
      {label}
      {isActive ? (currentSort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} className="opacity-40" />}
    </button>
  );
}

function TaskRow({ task, index, isSelected }: { task: Task; index: number; isSelected: boolean }) {
  const { state, dispatch } = useAppContext();
  const { startTimer } = useTimer();
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const sc = statusConfig[task.status];
  const categoryColor = state.categories.find(c => c.name === task.category)?.color || '#94a3b8';
  const blocked = task.dependsOn.some(id => { const dep = state.tasks.find(t => t.id === id); return dep && dep.status !== 'done'; });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`grid grid-cols-[40px_1fr_90px_90px_90px_70px_110px] gap-3 items-center px-4 py-3 rounded-xl border transition-all group ${
        isSelected ? 'bg-primary-500/5 border-primary-500' : 'bg-card border-primary hover:shadow-theme-sm'
      }`}
    >
      {/* Select */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_TASK_SELECTION', payload: task.id })}
        className="flex-shrink-0"
      >
        {isSelected ? (
          <CheckCircle2 size={18} className="text-primary-500" />
        ) : (
          <Circle size={18} className="text-tertiary group-hover:text-primary-500 transition-colors" />
        )}
      </button>

      {/* Title */}
      <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-tertiary' : 'text-primary'}`}>{task.title}</p>
            {task.recurring && <Repeat size={12} className="text-violet-500 flex-shrink-0" />}
            {blocked && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 flex-shrink-0">blocked</span>}
          </div>
          <p className="text-xs text-tertiary truncate">{task.description}</p>
        </div>
      </div>

      {/* Priority */}
      <span className={`text-xs font-semibold ${priorityConfig[task.priority].color} capitalize`}>{priorityConfig[task.priority].label}</span>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${sc.color}`} />
        <span className="text-xs text-secondary">{sc.label}</span>
      </div>

      {/* Category */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
        <span className="text-xs text-secondary truncate">{task.category}</span>
      </div>

      {/* Due date */}
      <span className={`text-xs ${isOverdue ? 'text-rose-500 font-medium' : isToday(new Date(task.dueDate || '')) ? 'text-amber-500' : 'text-tertiary'}`}>
        {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '-'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => startTimer(task)}
          className="p-1.5 rounded-lg hover:bg-tertiary transition-colors"
          title="Start timer"
        >
          <Play size={14} className="text-tertiary" />
        </button>
        <button
          onClick={async () => {
            await api.duplicateTask(task.id);
            dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: `Duplicated "${task.title}"`, type: 'success' } });
            const tasks = await api.getTasks();
            dispatch({ type: 'LOAD_STATE', payload: { tasks } });
          }}
          className="p-1.5 rounded-lg hover:bg-tertiary transition-colors"
          title="Duplicate"
        >
          <Copy size={14} className="text-tertiary" />
        </button>
        <button onClick={() => dispatch({ type: 'SET_EDITING_TASK', payload: task })} className="p-1.5 rounded-lg hover:bg-tertiary transition-colors">
          <Edit3 size={14} className="text-tertiary" />
        </button>
        <button onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })} className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors">
          <Trash2 size={14} className="text-rose-500" />
        </button>
      </div>
    </motion.div>
  );
}

export default function TaskList() {
  const { state, dispatch } = useAppContext();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'priority', dir: 'desc' });

  const filteredTasks = filterTasks(state.tasks, state.searchQuery, state.filterPriority, state.filterCategory, state.filterStatus);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    switch (sort.key) {
      case 'title': comparison = a.title.localeCompare(b.title); break;
      case 'priority': comparison = priorityConfig[b.priority].weight - priorityConfig[a.priority].weight; break;
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'status': comparison = a.status.localeCompare(b.status); break;
      case 'category': comparison = a.category.localeCompare(b.category); break;
    }
    return sort.dir === 'asc' ? comparison : -comparison;
  });

  const handleSort = (key: SortKey) => {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  if (state.tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo size={40} className="text-tertiary" />}
        title="No tasks yet"
        description="Create your first task to see it in the list view"
        actionLabel="Create Task"
        onAction={() => { dispatch({ type: 'SET_EDITING_TASK', payload: null }); dispatch({ type: 'SHOW_TASK_MODAL', payload: true }); }}
      />
    );
  }

  const hasSelected = state.selectedTasks.length > 0;

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      <AnimatePresence>
        {hasSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-3 bg-primary-500/10 rounded-xl border border-primary-500/20"
          >
            <span className="text-sm font-medium text-primary-500">{state.selectedTasks.length} selected</span>
            <div className="flex gap-2 ml-auto">
              {(['todo', 'in-progress', 'review', 'done'] as TaskStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: 'BULK_UPDATE_STATUS', payload: s })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card text-secondary hover:bg-primary-500 hover:text-white transition-colors border border-primary"
                >
                  {statusConfig[s].label}
                </button>
              ))}
              <button
                onClick={() => dispatch({ type: 'BULK_DELETE' })}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-tertiary hover:text-primary transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <p className="text-sm text-tertiary">Showing <span className="font-semibold text-primary">{sortedTasks.length}</span> tasks</p>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_90px_90px_90px_70px_110px] gap-3 items-center px-4 py-2.5 bg-secondary rounded-xl">
        <button
          onClick={() => {
            if (state.selectedTasks.length === sortedTasks.length) {
              dispatch({ type: 'CLEAR_SELECTION' });
            } else {
              dispatch({ type: 'SELECT_TASKS', payload: sortedTasks.map(t => t.id) });
            }
          }}
          className="flex-shrink-0"
        >
          <CheckCircle2 size={18} className={state.selectedTasks.length === sortedTasks.length && sortedTasks.length > 0 ? 'text-primary-500' : 'text-tertiary'} />
        </button>
        <SortableHeader label="Task" sortKey="title" currentSort={sort} onSort={handleSort} />
        <SortableHeader label="Priority" sortKey="priority" currentSort={sort} onSort={handleSort} />
        <SortableHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} />
        <SortableHeader label="Category" sortKey="category" currentSort={sort} onSort={handleSort} />
        <SortableHeader label="Due" sortKey="dueDate" currentSort={sort} onSort={handleSort} />
        <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Actions</span>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {sortedTasks.map((task, i) => (
          <TaskRow key={task.id} task={task} index={i} isSelected={state.selectedTasks.includes(task.id)} />
        ))}
        {sortedTasks.length === 0 && (
          <div className="text-center py-12">
            <Circle size={48} className="mx-auto mb-3 text-tertiary opacity-40" />
            <p className="text-tertiary">No tasks match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
