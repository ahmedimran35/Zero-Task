import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { format, differenceInDays, addDays, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const statusColors: Record<string, string> = {
  todo: 'bg-slate-400',
  'in-progress': 'bg-primary-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
};

const priorityColors: Record<string, string> = {
  urgent: 'border-l-rose-500',
  high: 'border-l-amber-500',
  medium: 'border-l-primary-500',
  low: 'border-l-slate-400',
};

type ZoomLevel = 'week' | 'month';

export default function GanttView() {
  const { state, dispatch } = useAppContext();
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [startDate, setStartDate] = useState(() => subDays(startOfDay(new Date()), 7));

  const tasksWithDates = useMemo(() => {
    return state.tasks.filter(t => t.dueDate || t.createdAt);
  }, [state.tasks]);

  const endDate = useMemo(() => {
    if (zoom === 'week') return addDays(startDate, 7);
    return addDays(startDate, 30);
  }, [startDate, zoom]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: addDays(endDate, -1) });
  }, [startDate, endDate]);

  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, startDate);

  const navigateBack = () => {
    setStartDate(prev => addDays(prev, zoom === 'week' ? -7 : -30));
  };

  const navigateForward = () => {
    setStartDate(prev => addDays(prev, zoom === 'week' ? 7 : 30));
  };

  const navigateToday = () => {
    setStartDate(subDays(startOfDay(new Date()), zoom === 'week' ? 2 : 15));
  };

  if (state.tasks.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={40} className="text-tertiary" />}
        title="No tasks to display"
        description="Create tasks with due dates to see them on the Gantt timeline"
        actionLabel="Create Task"
        onAction={() => { dispatch({ type: 'SET_EDITING_TASK', payload: null }); dispatch({ type: 'SHOW_TASK_MODAL', payload: true }); }}
      />
    );
  }

  const colWidth = zoom === 'week' ? 120 : 60;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-primary">Gantt Timeline</h2>
          <span className="text-sm text-tertiary">{tasksWithDates.length} tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => z === 'week' ? 'month' : 'week')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-input border border-primary hover:bg-tertiary transition-colors">
            {zoom === 'week' ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
            {zoom === 'week' ? 'Week' : 'Month'}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={navigateBack} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
              <ChevronLeft size={18} className="text-secondary" />
            </button>
            <button onClick={navigateToday} className="px-3 py-1.5 rounded-xl text-xs font-medium text-primary-600 bg-primary-500/10 hover:bg-primary-500/20 transition-colors">
              Today
            </button>
            <button onClick={navigateForward} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
              <ChevronRight size={18} className="text-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-card rounded-2xl border border-primary overflow-hidden shadow-theme-sm">
        <div className="flex">
          {/* Task list (left) */}
          <div className="w-64 flex-shrink-0 border-r border-primary">
            <div className="h-10 px-4 flex items-center border-b border-primary bg-secondary">
              <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Task</span>
            </div>
            <div className="divide-y divide-primary">
              {tasksWithDates.map(task => (
                <div
                  key={task.id}
                  onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}
                  className="h-12 px-4 flex items-center gap-2 cursor-pointer hover:bg-tertiary transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} />
                  <span className="text-sm text-primary truncate">{task.title}</span>
                </div>
              ))}
              {tasksWithDates.length === 0 && (
                <div className="h-24 flex items-center justify-center text-sm text-tertiary">No tasks</div>
              )}
            </div>
          </div>

          {/* Timeline (right) */}
          <div className="flex-1 overflow-x-auto">
            {/* Date headers */}
            <div className="flex border-b border-primary bg-secondary" style={{ minWidth: days.length * colWidth }}>
              {days.map((day, i) => {
                const isToday = differenceInDays(day, today) === 0;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 h-10 flex flex-col items-center justify-center border-r border-primary ${
                      isToday ? 'bg-primary-500/10' : isWeekend ? 'bg-secondary' : ''
                    }`}
                    style={{ width: colWidth }}
                  >
                    <span className={`text-[10px] font-medium ${isToday ? 'text-primary-500' : 'text-tertiary'}`}>
                      {zoom === 'week' ? format(day, 'EEE') : format(day, 'EEE').charAt(0)}
                    </span>
                    <span className={`text-xs ${isToday ? 'text-primary-500 font-bold' : 'text-secondary'}`}>
                      {format(day, zoom === 'week' ? 'MMM d' : 'd')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Task bars */}
            <div className="relative" style={{ minWidth: days.length * colWidth }}>
              {/* Today line */}
              {todayOffset >= 0 && todayOffset < days.length && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500/50 z-10"
                  style={{ left: (todayOffset + 0.5) * colWidth }}
                />
              )}

              {/* Grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {days.map((_, i) => (
                  <div key={i} className="border-r border-primary/30 flex-shrink-0" style={{ width: colWidth }} />
                ))}
              </div>

              {tasksWithDates.map((task, rowIdx) => {
                const taskStart = startOfDay(new Date(task.createdAt));
                const taskEnd = task.dueDate ? startOfDay(new Date(task.dueDate)) : addDays(taskStart, 1);
                const startOffset = Math.max(0, differenceInDays(taskStart, startDate));
                const barWidth = Math.max(colWidth * 0.3, differenceInDays(taskEnd, taskStart) * colWidth);
                const isDone = task.status === 'done';

                // Only show if within visible range
                if (startOffset >= days.length && differenceInDays(taskEnd, startDate) <= 0) return null;

                const leftPos = startOffset * colWidth;

                return (
                  <div
                    key={task.id}
                    className="h-12 flex items-center relative"
                    onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}
                  >
                    {/* Task bar */}
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: rowIdx * 0.02, duration: 0.3 }}
                      className={`absolute h-7 rounded-md cursor-pointer hover:opacity-80 transition-opacity border-l-4 ${priorityColors[task.priority]} ${
                        isDone ? 'opacity-50' : ''
                      }`}
                      style={{
                        left: Math.max(0, leftPos),
                        width: Math.min(barWidth, days.length * colWidth - leftPos),
                        backgroundColor: state.categories.find(c => c.name === task.category)?.color || '#64748b',
                        transformOrigin: 'left',
                      }}
                      title={`${task.title}\n${format(taskStart, 'MMM d')} - ${format(taskEnd, 'MMM d')}`}
                    >
                      <span className="text-[10px] text-white font-medium px-2 leading-7 truncate block">
                        {task.title}
                      </span>
                    </motion.div>
                  </div>
                );
              })}

              {tasksWithDates.length === 0 && (
                <div className="h-24 flex items-center justify-center text-sm text-tertiary">
                  No tasks with dates to display
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-tertiary">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Status:</span>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="capitalize">{status === 'in-progress' ? 'In Progress' : status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-rose-500/50" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
