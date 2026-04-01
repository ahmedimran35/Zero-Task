import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import type { Task } from '../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, subWeeks, addWeeks, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CalendarRange } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-500', high: 'bg-amber-500', medium: 'bg-primary-500', low: 'bg-slate-400',
};

const statusBorderColors: Record<string, string> = {
  todo: 'border-l-slate-400', 'in-progress': 'border-l-primary-500', review: 'border-l-amber-500', done: 'border-l-emerald-500',
};

type ViewMode = 'month' | 'week';

export default function CalendarView() {
  const { state, dispatch } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const days = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      const result: Date[] = [];
      let day = start;
      while (day <= end) { result.push(day); day = addDays(day, 1); }
      return result;
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const result: Date[] = [];
      for (let i = 0; i < 7; i++) result.push(addDays(start, i));
      return result;
    }
  }, [currentDate, viewMode]);

  const getTasksForDate = (date: Date): Task[] => {
    return state.tasks.filter(task => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), date);
    });
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const navigate = (dir: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  const headerFormat = viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy";

  if (state.tasks.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={40} className="text-tertiary" />}
        title="No tasks to display"
        description="Create tasks with due dates to see them on the calendar"
        actionLabel="Create Task"
        onAction={() => { dispatch({ type: 'SET_EDITING_TASK', payload: null }); dispatch({ type: 'SHOW_TASK_MODAL', payload: true }); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-primary">{format(currentDate, headerFormat)}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
              <ChevronLeft size={18} className="text-secondary" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-xl text-sm font-medium text-primary-600 bg-primary-500/10 hover:bg-primary-500/20 transition-colors">Today</button>
            <button onClick={() => navigate('next')} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
              <ChevronRight size={18} className="text-secondary" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-tertiary rounded-xl p-1">
          <button onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-card text-primary shadow-theme-sm' : 'text-tertiary'}`}>
            <CalendarDays size={14} /> Month
          </button>
          <button onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-card text-primary shadow-theme-sm' : 'text-tertiary'}`}>
            <CalendarRange size={14} /> Week
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-card rounded-2xl border border-primary overflow-hidden shadow-theme-sm">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-primary">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-xs font-semibold text-tertiary uppercase tracking-wider">{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const tasks = getTasksForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const todayDate = isToday(day);

              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }}
                  onClick={() => setSelectedDate(day)}
                  className={`${viewMode === 'week' ? 'min-h-[200px]' : 'min-h-[100px]'} p-2 border-b border-r border-primary cursor-pointer transition-colors ${
                    !isCurrentMonth && viewMode === 'month' ? 'bg-secondary/50' : 'hover:bg-card-hover'
                  } ${isSelected ? 'ring-2 ring-inset ring-primary-500' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                      todayDate ? 'bg-primary-500 text-white' : isCurrentMonth || viewMode === 'week' ? 'text-primary' : 'text-tertiary'
                    }`}>{format(day, 'd')}</span>
                    {tasks.length > 0 && <span className="text-[10px] text-tertiary">{tasks.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {tasks.slice(0, viewMode === 'week' ? 5 : 3).map(task => (
                      <div key={task.id}
                        onClick={e => { e.stopPropagation(); dispatch({ type: 'SELECT_TASK', payload: task }); }}
                        className={`text-[11px] px-1.5 py-0.5 rounded truncate border-l-2 ${statusBorderColors[task.status]} bg-secondary hover:bg-tertiary transition-colors cursor-pointer`}>
                        {task.title}
                      </div>
                    ))}
                    {tasks.length > (viewMode === 'week' ? 5 : 3) && (
                      <p className="text-[10px] text-tertiary pl-1">+{tasks.length - (viewMode === 'week' ? 5 : 3)} more</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-primary p-5 shadow-theme-sm">
            <h3 className="font-bold text-primary mb-1">{selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}</h3>
            <p className="text-sm text-tertiary mb-4">{selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}</p>

            {selectedDate ? (
              <div className="space-y-3">
                {selectedDateTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-tertiary mb-3">No tasks for this day</p>
                    <button onClick={() => { dispatch({ type: 'SET_EDITING_TASK', payload: null }); dispatch({ type: 'SHOW_TASK_MODAL', payload: true }); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
                      <Plus size={14} /> Add Task
                    </button>
                  </div>
                ) : (
                  selectedDateTasks.map(task => (
                    <div key={task.id} onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}
                      className="p-3 rounded-xl bg-secondary hover:bg-tertiary transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                        <span className="text-sm font-medium text-primary truncate">{task.title}</span>
                      </div>
                      <p className="text-xs text-tertiary line-clamp-2">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary text-secondary">{task.category}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          task.priority === 'urgent' ? 'bg-rose-500/15 text-rose-500' : task.priority === 'high' ? 'bg-amber-500/15 text-amber-500' :
                          task.priority === 'medium' ? 'bg-primary-500/15 text-primary-500' : 'bg-slate-500/15 text-slate-500'
                        }`}>{task.priority}</span>
                        {task.assignee && (
                          <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[8px] font-bold ml-auto">{task.assignee[0]}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-tertiary text-center py-6">Click a date to view tasks</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-2xl border border-primary p-5 shadow-theme-sm">
            <h3 className="font-bold text-primary mb-3">This Month</h3>
            {(() => {
              const monthStart = startOfMonth(currentDate);
              const monthEnd = endOfMonth(currentDate);
              const monthTasks = state.tasks.filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate); return d >= monthStart && d <= monthEnd; });
              const completed = monthTasks.filter(t => t.status === 'done').length;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-secondary">Total tasks</span><span className="text-sm font-semibold text-primary">{monthTasks.length}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-secondary">Completed</span><span className="text-sm font-semibold text-emerald-500">{completed}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-secondary">Remaining</span><span className="text-sm font-semibold text-amber-500">{monthTasks.length - completed}</span></div>
                  <div className="h-2 bg-tertiary rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: monthTasks.length > 0 ? `${(completed / monthTasks.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
