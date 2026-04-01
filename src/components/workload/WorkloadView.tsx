import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WorkloadData {
  userId: string;
  userName: string;
  email: string;
  totalTasks: number;
  overdueTasks: number;
  tasksByDay: Record<string, number>;
}

export default function WorkloadView() {
  const { dispatch } = useAppContext();
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    const load = async () => {
      try {
        const users = await api.getUsers();
        const data: WorkloadData[] = [];
        for (const user of users) {
          const tasks = await api.getTasks(user.id);
          const now = new Date();
          const overdue = tasks.filter((t: Record<string, unknown>) => !t.dueDate || t.status === 'done' ? false : new Date(t.dueDate as string) < now).length;
          const tasksByDay: Record<string, number> = {};
          for (const day of days) {
            const dayStr = format(day, 'yyyy-MM-dd');
            tasksByDay[dayStr] = tasks.filter((t: Record<string, unknown>) => {
              if (!t.dueDate) return false;
              return format(new Date(t.dueDate as string), 'yyyy-MM-dd') === dayStr && t.status !== 'done';
            }).length;
          }
          data.push({ userId: user.id, userName: user.name, email: user.email, totalTasks: tasks.length, overdueTasks: overdue, tasksByDay });
        }
        setWorkloadData(data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-tertiary';
    if (count <= 2) return 'bg-emerald-500/60';
    if (count <= 4) return 'bg-amber-500/60';
    return 'bg-rose-500/60';
  };

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          Team Workload
        </h1>
        <p className="text-sm text-tertiary mt-1">See who's overloaded and who has capacity</p>
      </div>

      <div className="bg-card rounded-2xl border border-primary overflow-hidden shadow-theme-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary">
                <th className="text-left px-5 py-3 text-xs font-semibold text-tertiary uppercase tracking-wider w-48">Team Member</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-tertiary uppercase tracking-wider">Overdue</th>
                {days.map(day => (
                  <th key={format(day, 'yyyy-MM-dd')} className={`text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider ${isToday(day) ? 'text-primary-500' : 'text-tertiary'}`}>
                    <div>{format(day, 'EEE')}</div>
                    <div className="font-normal">{format(day, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workloadData.map((user, i) => (
                <motion.tr key={user.userId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="border-b border-primary hover:bg-tertiary/30 transition-colors cursor-pointer"
                  onClick={() => dispatch({ type: 'SET_VIEW', payload: 'list' })}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{user.userName}</p>
                        <p className="text-[10px] text-tertiary">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-4">
                    <span className="text-sm font-bold text-primary">{user.totalTasks}</span>
                  </td>
                  <td className="text-center px-3 py-4">
                    {user.overdueTasks > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500">
                        <AlertTriangle size={12} />{user.overdueTasks}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle2 size={12} />
                      </span>
                    )}
                  </td>
                  {days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const count = user.tasksByDay[dayStr] || 0;
                    return (
                      <td key={dayStr} className="text-center px-3 py-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${getHeatColor(count)} ${isToday(day) ? 'ring-2 ring-primary-500/30' : ''}`}>
                          <span className={`text-sm font-bold ${count > 0 ? 'text-white' : 'text-tertiary'}`}>{count}</span>
                        </div>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
              {workloadData.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-tertiary">No team members found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-tertiary">
        <span className="font-semibold">Task Density:</span>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-tertiary" /><span>0</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-emerald-500/60" /><span>1-2</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-amber-500/60" /><span>3-4</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-rose-500/60" /><span>5+</span></div>
      </div>
    </div>
  );
}
