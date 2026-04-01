import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';
import { useAppContext } from '../../context/AppContext';
import type { Sprint, SprintStatus } from '../../types';
import { format, differenceInDays } from 'date-fns';
import { Zap, Plus, Trash2, CheckCircle2, Circle, Target, Calendar, X } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import BurndownChart from './BurndownChart';

const statusConfig: Record<SprintStatus, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'bg-slate-400' },
  active: { label: 'Active', color: 'bg-emerald-500' },
  completed: { label: 'Completed', color: 'bg-primary-500' },
};

export default function SprintView() {
  const { state } = useAppContext();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null);
  const [sprintDetail, setSprintDetail] = useState<Sprint & { tasks?: { id: string; title: string; status: string; priority: string }[]; completedTasks?: number } | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const loadSprints = async () => {
    try { setSprints(await api.getSprints()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadSprints(); }, []);

  useEffect(() => {
    if (selectedSprint) {
      api.getSprint(selectedSprint).then(setSprintDetail).catch(() => {});
    } else {
      setSprintDetail(null);
    }
  }, [selectedSprint]);

  const handleStatusChange = async (sprintId: string, status: SprintStatus) => {
    try {
      await api.updateSprint(sprintId, { status });
      setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, status } : s));
      if (sprintDetail?.id === sprintId) setSprintDetail(prev => prev ? { ...prev, status } : null);
    } catch { /* ignore */ }
  };

  const handleAddTaskToSprint = async (taskId: string) => {
    if (!selectedSprint) return;
    try {
      await api.addSprintTask(selectedSprint, taskId);
      const detail = await api.getSprint(selectedSprint);
      setSprintDetail(detail);
      setSprints(prev => prev.map(s => s.id === selectedSprint ? { ...s, totalTasks: (s.totalTasks || 0) + 1, taskIds: [...(s.taskIds || []), taskId] } : s));
    } catch { /* ignore */ }
  };

  const handleRemoveTask = async (taskId: string) => {
    if (!selectedSprint) return;
    try {
      await api.removeSprintTask(selectedSprint, taskId);
      const detail = await api.getSprint(selectedSprint);
      setSprintDetail(detail);
      setSprints(prev => prev.map(s => s.id === selectedSprint ? { ...s, totalTasks: Math.max(0, (s.totalTasks || 1) - 1), taskIds: (s.taskIds || []).filter(id => id !== taskId) } : s));
    } catch { /* ignore */ }
  };

  const activeSprint = sprints.find(s => s.status === 'active');

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            Sprints
          </h1>
          <p className="text-sm text-tertiary mt-1">Manage time-boxed work cycles</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium text-sm shadow-theme-md">
          <Plus size={16} /> New Sprint
        </motion.button>
      </div>

      {/* Active Sprint Highlight */}
      {activeSprint && !selectedSprint && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 p-5 cursor-pointer" onClick={() => setSelectedSprint(activeSprint.id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-lg font-bold text-primary">{activeSprint.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-semibold">ACTIVE</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-secondary">
              <span>{format(new Date(activeSprint.startDate), 'MMM d')} - {format(new Date(activeSprint.endDate), 'MMM d')}</span>
              <span className="font-semibold text-primary">{activeSprint.totalTasks} tasks</span>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Detail */}
      <AnimatePresence>
        {selectedSprint && sprintDetail && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setSelectedSprint(null)} className="text-sm text-primary-500 hover:underline">← Back to sprints</button>
            </div>
            <div className="bg-card rounded-2xl border border-primary p-5 shadow-theme-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-primary">{sprintDetail.name}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-tertiary">
                    <span className="flex items-center gap-1"><Calendar size={14} />{format(new Date(sprintDetail.startDate), 'MMM d')} - {format(new Date(sprintDetail.endDate), 'MMM d, yyyy')}</span>
                    <span>{differenceInDays(new Date(sprintDetail.endDate), new Date(sprintDetail.startDate))} days</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(['planning', 'active', 'completed'] as SprintStatus[]).map(s => (
                    <button key={s} onClick={() => handleStatusChange(sprintDetail.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sprintDetail.status === s ? `${statusConfig[s].color} text-white` : 'bg-tertiary text-secondary hover:bg-primary-500/10'}`}>
                      {statusConfig[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {sprintDetail.goal && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-secondary rounded-xl">
                  <Target size={14} className="text-amber-500" />
                  <span className="text-sm text-primary">{sprintDetail.goal}</span>
                </div>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-tertiary">Completion</span>
                  <span className="text-xs font-semibold text-primary">{sprintDetail.totalTasks > 0 ? Math.round(((sprintDetail.completedTasks || 0) / sprintDetail.totalTasks) * 100) : 0}%</span>
                </div>
                <div className="h-3 bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: sprintDetail.totalTasks > 0 ? `${((sprintDetail.completedTasks || 0) / sprintDetail.totalTasks) * 100}%` : '0%' }} />
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-tertiary">
                  <span>{sprintDetail.completedTasks || 0} completed</span>
                  <span>{sprintDetail.totalTasks} total</span>
                </div>
              </div>

              {/* Burndown Chart */}
              <BurndownChart sprint={sprintDetail} completedTasks={sprintDetail.completedTasks || 0} />

              {/* Tasks in sprint */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary">Tasks ({sprintDetail.tasks?.length || 0})</h3>
                <button onClick={() => setShowAddTask(!showAddTask)} className="text-xs text-primary-500 hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add task
                </button>
              </div>

              {/* Add task dropdown */}
              {showAddTask && (
                <div className="mb-3 p-3 bg-secondary rounded-xl border border-primary">
                  <p className="text-xs text-tertiary mb-2">Select a task to add:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {state.tasks.filter(t => !sprintDetail.taskIds?.includes(t.id)).slice(0, 10).map(task => (
                      <button key={task.id} onClick={() => { handleAddTaskToSprint(task.id); setShowAddTask(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary hover:bg-tertiary transition-colors flex items-center gap-2">
                        <Circle size={12} className="text-tertiary" />{task.title}
                      </button>
                    ))}
                    {state.tasks.filter(t => !sprintDetail.taskIds?.includes(t.id)).length === 0 && (
                      <p className="text-xs text-tertiary py-2">No more tasks available</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {sprintDetail.tasks?.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl group">
                    <div className="flex items-center gap-3">
                      {task.status === 'done' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-tertiary" />}
                      <span className={`text-sm ${task.status === 'done' ? 'line-through text-tertiary' : 'text-primary'}`}>{task.title}</span>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                        task.priority === 'urgent' ? 'bg-rose-500/15 text-rose-500' : task.priority === 'high' ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-500/15 text-slate-500'
                      }`}>{task.priority}</span>
                    </div>
                    <button onClick={() => handleRemoveTask(task.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(!sprintDetail.tasks || sprintDetail.tasks.length === 0) && (
                  <p className="text-sm text-tertiary text-center py-6">No tasks in this sprint yet</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sprint List */}
      {!selectedSprint && (
        <div className="space-y-3">
          {sprints.map(sprint => {
            const sc = statusConfig[sprint.status];
            const daysLeft = differenceInDays(new Date(sprint.endDate), new Date());
            return (
              <motion.div key={sprint.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedSprint(sprint.id)}
                className="bg-card rounded-xl p-4 border border-primary shadow-theme-sm hover:shadow-theme-md cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${sc.color}`} />
                    <div>
                      <h3 className="text-sm font-semibold text-primary">{sprint.name}</h3>
                      <p className="text-xs text-tertiary">{format(new Date(sprint.startDate), 'MMM d')} - {format(new Date(sprint.endDate), 'MMM d')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sprint.goal && <span className="text-xs text-tertiary truncate max-w-32">{sprint.goal}</span>}
                    <span className="text-sm font-bold text-primary">{sprint.totalTasks} tasks</span>
                    {sprint.status === 'active' && daysLeft >= 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">{daysLeft}d left</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {sprints.length === 0 && (
            <EmptyState icon={<Zap size={40} className="text-tertiary" />} title="No sprints yet" description="Create your first sprint to start organizing work in time-boxed cycles" actionLabel="Create Sprint" onAction={() => setShowCreate(true)} />
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateSprintModal onClose={() => { setShowCreate(false); loadSprints(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateSprintModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd'));
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    try {
      await api.createSprint({ name: name.trim(), startDate, endDate, goal: goal.trim() });
      onClose();
    } catch { setError('Failed to create sprint'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-md overflow-hidden shadow-theme-xl border border-primary">
        <div className="px-6 py-4 border-b border-primary flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Create Sprint</h2>
          <button onClick={onClose} className="text-tertiary hover:text-primary"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Sprint Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Sprint 12"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Sprint Goal (optional)</label>
            <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Complete auth module"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-theme-md">Create Sprint</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

