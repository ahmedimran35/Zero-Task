import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useAppContext } from '../../context/AppContext';
import type { Task, TaskStatus } from '../../types';
import { filterTasks } from '../../utils/taskUtils';
import { format, isPast, isToday } from 'date-fns';
import {
  Calendar, MoreHorizontal, CheckCircle2, Circle, AlertCircle,
  Repeat, ArrowUpDown, ListTodo, Play, Copy,
} from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useTimer } from '../../hooks/useTimer';

const columns: { id: TaskStatus; label: string; color: string; icon: typeof Circle }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-500', icon: Circle },
  { id: 'in-progress', label: 'In Progress', color: 'bg-primary-500', icon: AlertCircle },
  { id: 'review', label: 'In Review', color: 'bg-amber-500', icon: AlertCircle },
  { id: 'done', label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 },
];

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
  high: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
  medium: 'bg-primary-500/15 text-primary-500 border-primary-500/20',
  low: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
};

type SortField = 'priority' | 'dueDate' | 'title' | 'createdAt';

function KanbanCard({ task, selected, index }: { task: Task; selected: boolean; index: number }) {
  const { state, dispatch } = useAppContext();
  const { startTimer, isTimerRunning } = useTimer();
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const categoryColor = state.categories.find(c => c.name === task.category)?.color || '#94a3b8';
  const totalTime = (task.timeLogs || []).reduce((a, l) => a + l.duration, 0);
  const blocked = (task.dependsOn || []).some(id => {
    const dep = state.tasks.find(t => t.id === id);
    return dep && dep.status !== 'done';
  });
  const timerActive = isTimerRunning(task.id);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await import('../../utils/api').then(m => m.api.duplicateTask(task.id));
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: `Duplicated "${task.title}"`, type: 'success' } });
      // Reload tasks
      const tasks = await import('../../utils/api').then(m => m.api.getTasks());
      dispatch({ type: 'LOAD_STATE', payload: { tasks } });
    } catch { /* ignore */ }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-card rounded-xl p-4 border shadow-theme-sm hover:shadow-theme-md group transition-all ${
            snapshot.isDragging ? 'shadow-theme-lg ring-2 ring-primary-500/30 rotate-2' : ''
          } ${selected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-primary'}`}
          onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={e => {
                  e.stopPropagation();
                  dispatch({ type: 'TOGGLE_TASK_SELECTION', payload: task.id });
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {selected ? (
                  <CheckCircle2 size={16} className="text-primary-500" />
                ) : (
                  <Circle size={16} className="text-tertiary" />
                )}
              </button>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {task.recurring && <Repeat size={12} className="text-violet-500" />}
              {blocked && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500">blocked</span>}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); startTimer(task); }}
                className={`p-1 rounded-lg transition-colors ${timerActive ? 'bg-emerald-500/20 text-emerald-500' : 'hover:bg-tertiary text-tertiary'}`}
                title="Start timer"
              >
                <Play size={14} />
              </button>
              <button
                onClick={handleDuplicate}
                className="p-1 rounded-lg hover:bg-tertiary transition-colors text-tertiary"
                title="Duplicate"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); dispatch({ type: 'SET_EDITING_TASK', payload: task }); }}
                className="p-1 rounded-lg hover:bg-tertiary transition-colors text-tertiary"
                title="Edit"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-primary mb-1 line-clamp-2">{task.title}</h3>
          {task.description && <p className="text-xs text-tertiary mb-2 line-clamp-2">{task.description}</p>}

          {(task.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {(task.tags || []).slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-tertiary text-secondary">#{tag}</span>
              ))}
            </div>
          )}

          {(task.subtasks || []).length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-tertiary">{(task.subtasks || []).filter(s => s.completed).length}/{(task.subtasks || []).length} subtasks</span>
                <span className="text-[10px] font-medium text-secondary">{task.progress}%</span>
              </div>
              <div className="h-1.5 bg-tertiary rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-tertiary">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
              {task.category}
            </div>
            <div className="flex items-center gap-2">
              {totalTime > 0 && (
                <span className="text-[10px] text-tertiary">{Math.floor(totalTime / 3600)}h{Math.floor((totalTime % 3600) / 60)}m</span>
              )}
              {task.assignee && (
                <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {task.assignee[0]}
                </div>
              )}
              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-rose-500' : isToday(new Date(task.dueDate)) ? 'text-amber-500' : 'text-tertiary'}`}>
                  <Calendar size={12} />
                  {format(new Date(task.dueDate), 'MMM d')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard() {
  const { state, dispatch } = useAppContext();
  const [sortBy, setSortBy] = useState<Record<string, SortField | undefined>>({});

  const filteredTasks = filterTasks(state.tasks, state.searchQuery, state.filterPriority, state.filterCategory, 'all');

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = state.tasks.find(t => t.id === draggableId);
    if (!task) return;

    const destStatus = destination.droppableId as TaskStatus;
    if (task.status !== destStatus) {
      dispatch({ type: 'UPDATE_TASK', payload: { ...task, status: destStatus } });
    }
  };

  const sortTasks = (tasks: Task[], field: SortField | undefined): Task[] => {
    if (!field) return tasks;
    return [...tasks].sort((a, b) => {
      switch (field) {
        case 'priority': {
          const w = { urgent: 4, high: 3, medium: 2, low: 1 };
          return w[b.priority] - w[a.priority];
        }
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'title': return a.title.localeCompare(b.title);
        case 'createdAt': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  };

  const cycleSort = (colId: string) => {
    const fields: (SortField | undefined)[] = [undefined, 'priority', 'dueDate', 'title', 'createdAt'];
    const current = sortBy[colId];
    const idx = fields.indexOf(current);
    const next = fields[(idx + 1) % fields.length];
    setSortBy(prev => ({ ...prev, [colId]: next }));
  };

  if (state.tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo size={40} className="text-tertiary" />}
        title="No tasks yet"
        description="Create your first task to get started with the Kanban board"
        actionLabel="Create Task"
        onAction={() => { dispatch({ type: 'SET_EDITING_TASK', payload: null }); dispatch({ type: 'SHOW_TASK_MODAL', payload: true }); }}
      />
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-8rem)]">
        {columns.map(column => {
          let columnTasks = filteredTasks.filter(t => t.status === column.id);
          columnTasks = sortTasks(columnTasks, sortBy[column.id]);

          return (
            <div key={column.id} className="flex flex-col bg-secondary rounded-2xl border border-primary overflow-hidden">
              <div className="p-4 border-b border-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-semibold text-primary text-sm">{column.label}</h3>
                    <span className="text-xs text-tertiary bg-tertiary px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                  </div>
                  <button
                    onClick={() => cycleSort(column.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-tertiary hover:bg-tertiary transition-colors"
                  >
                    <ArrowUpDown size={12} />
                    {sortBy[column.id] || 'Sort'}
                  </button>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary-500/5' : ''
                    }`}
                  >
                    {columnTasks.map((task, i) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        index={i}
                        selected={state.selectedTasks.includes(task.id)}
                      />
                    ))}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center py-12 text-tertiary">
                        <column.icon size={32} className="mb-2 opacity-40" />
                        <p className="text-sm">No tasks</p>
                      </div>
                    )}
                    {snapshot.isDraggingOver && columnTasks.length === 0 && (
                      <div className="flex items-center justify-center py-12 border-2 border-dashed border-primary-500/50 rounded-xl text-primary-500 text-sm">
                        Drop here
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
