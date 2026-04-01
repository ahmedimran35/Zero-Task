import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { getCompletionRate, getCategoryStats, getOverdueTasks, getDueTodayTasks } from '../../utils/taskUtils';
import {
  CheckCircle2, Clock, AlertTriangle, TrendingUp, BarChart3, Target, Zap,
  ArrowUpRight, ArrowDownRight, ListTodo,
} from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const statusColors: Record<string, string> = {
  todo: 'bg-slate-500', 'in-progress': 'bg-primary-500', review: 'bg-amber-500', done: 'bg-emerald-500',
};

export default function Dashboard() {
  const { state, dispatch } = useAppContext();
  const { tasks, categories } = state;
  const completionRate = getCompletionRate(tasks);
  const categoryStats = getCategoryStats(tasks, categories);
  const overdueTasks = getOverdueTasks(tasks);
  const dueTodayTasks = getDueTodayTasks(tasks);

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  // Compute week-over-week stats (simplified: use creation counts)
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const tasksThisWeek = tasks.filter(t => new Date(t.createdAt).getTime() > weekAgo).length;
  const completedThisWeek = tasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() > weekAgo).length;

  const totalTime = tasks.reduce((acc, t) => acc + t.timeLogs.reduce((a, l) => a + l.duration, 0), 0);
  const totalHours = Math.floor(totalTime / 3600);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo size={40} className="text-tertiary" />}
        title="Welcome to TaskFlow"
        description="Create your first task to start tracking your work and see your dashboard come alive"
        actionLabel="Create First Task"
        onAction={() => { dispatch({ type: 'SET_EDITING_TASK', payload: null }); dispatch({ type: 'SHOW_TASK_MODAL', payload: true }); }}
      />
    );
  }

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: BarChart3, color: 'from-primary-500 to-primary-600', change: `+${tasksThisWeek} this week`, positive: true },
    { label: 'Completed', value: completedTasks, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600', change: `${completedThisWeek} this week`, positive: true },
    { label: 'In Progress', value: inProgressTasks, icon: Clock, color: 'from-amber-500 to-amber-600', change: `${Math.round((inProgressTasks / Math.max(tasks.length, 1)) * 100)}% of total`, positive: inProgressTasks > 0 },
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'from-rose-500 to-rose-600', change: overdueTasks.length > 0 ? 'Action needed' : 'All clear', positive: overdueTasks.length === 0 },
  ];

  const recentTasks = [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl p-5 border border-primary shadow-theme-sm hover:shadow-theme-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-tertiary uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {stat.positive ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-rose-500" />}
              <span className={`text-xs font-medium ${stat.positive ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-primary shadow-theme-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-primary">Progress Overview</h2>
                <p className="text-sm text-tertiary">Category completion rates</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {totalTime > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-tertiary" />
                  <span className="text-sm text-secondary">{totalHours}h logged</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary-500" />
                <span className="text-sm font-semibold text-primary-500">{completionRate}% Complete</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {categoryStats.map((cat, i) => (
              <motion.div key={cat.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-primary">{cat.name}</span>
                  </div>
                  <span className="text-sm text-tertiary">{cat.completed}/{cat.total} tasks</span>
                </div>
                <div className="h-2.5 bg-tertiary rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }} transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Due Today */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl p-6 border border-primary shadow-theme-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-primary">Due Today</h2>
              <p className="text-sm text-tertiary">{dueTodayTasks.length} tasks</p>
            </div>
          </div>
          <div className="space-y-3">
            {dueTodayTasks.length === 0 ? (
              <p className="text-sm text-tertiary text-center py-6">No tasks due today</p>
            ) : (
              dueTodayTasks.map(task => (
                <div key={task.id} onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-tertiary transition-colors cursor-pointer">
                  <div className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{task.title}</p>
                    <p className="text-xs text-tertiary">{task.category}</p>
                  </div>
                  {task.assignee && (
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-bold">{task.assignee[0]}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity + Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl p-6 border border-primary shadow-theme-sm">
          <h2 className="font-bold text-primary mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentTasks.map(task => (
              <div key={task.id} onClick={() => dispatch({ type: 'SELECT_TASK', payload: task })}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-tertiary transition-colors cursor-pointer">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusColors[task.status]} bg-opacity-15`}>
                  <div className={`w-3 h-3 rounded-full ${statusColors[task.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{task.title}</p>
                  <p className="text-xs text-tertiary">{new Date(task.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  task.priority === 'urgent' ? 'bg-rose-500/15 text-rose-500' : task.priority === 'high' ? 'bg-amber-500/15 text-amber-500' :
                  task.priority === 'medium' ? 'bg-primary-500/15 text-primary-500' : 'bg-slate-500/15 text-slate-500'
                }`}>{task.priority}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card rounded-2xl p-6 border border-primary shadow-theme-sm">
          <h2 className="font-bold text-primary mb-4">Priority Distribution</h2>
          <div className="space-y-4">
            {(['urgent', 'high', 'medium', 'low'] as const).map(priority => {
              const count = tasks.filter(t => t.priority === priority).length;
              const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
              const colorMap = { urgent: 'bg-rose-500', high: 'bg-amber-500', medium: 'bg-primary-500', low: 'bg-slate-400' };
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-primary capitalize">{priority}</span>
                    <span className="text-sm text-tertiary">{count} tasks</span>
                  </div>
                  <div className="h-3 bg-tertiary rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${colorMap[priority]}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="font-bold text-primary mt-8 mb-4">Status Breakdown</h2>
          <div className="grid grid-cols-2 gap-3">
            {([{ key: 'todo', label: 'To Do', color: 'bg-slate-500' }, { key: 'in-progress', label: 'In Progress', color: 'bg-primary-500' },
              { key: 'review', label: 'In Review', color: 'bg-amber-500' }, { key: 'done', label: 'Done', color: 'bg-emerald-500' }] as const).map(status => {
              const count = tasks.filter(t => t.status === status.key).length;
              return (
                <div key={status.key} className="bg-secondary rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                    <span className="text-xs text-tertiary">{status.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{count}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
