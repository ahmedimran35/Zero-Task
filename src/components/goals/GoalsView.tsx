import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';
import type { Goal, GoalStatus } from '../../types';
import { format } from 'date-fns';
import { Target, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const statusConfig: Record<GoalStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-primary-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' },
  archived: { label: 'Archived', color: 'bg-slate-400' },
};

export default function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const loadGoals = async () => {
    try { setGoals(await api.getGoals()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadGoals(); }, []);

  const handleKeyResultUpdate = async (goalId: string, krId: string, value: number) => {
    try {
      await api.updateKeyResult(goalId, krId, value);
      setGoals(prev => prev.map(g => {
        if (g.id !== goalId) return g;
        const krs = g.keyResults.map(kr => kr.id === krId ? { ...kr, currentValue: value } : kr);
        const progress = krs.length > 0 ? Math.round(krs.reduce((s, kr) => s + (kr.currentValue / kr.targetValue * 100), 0) / krs.length) : 0;
        return { ...g, keyResults: krs, progress: Math.min(100, progress) };
      }));
    } catch { /* ignore */ }
  };

  const handleStatusChange = async (goalId: string, status: GoalStatus) => {
    try {
      await api.updateGoal(goalId, { status });
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status } : g));
    } catch { /* ignore */ }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await api.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
              <Target size={20} className="text-white" />
            </div>
            Goals & OKRs
          </h1>
          <p className="text-sm text-tertiary mt-1">Track objectives and key results</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-medium text-sm shadow-theme-md">
          <Plus size={16} /> New Goal
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(['active', 'completed', 'archived'] as GoalStatus[]).map(status => {
          const sc = statusConfig[status];
          const count = goals.filter(g => g.status === status).length;
          return (
            <div key={status} className="bg-card rounded-xl p-4 border border-primary shadow-theme-sm">
              <div className="flex items-center gap-2 mb-2"><div className={`w-2.5 h-2.5 rounded-full ${sc.color}`} /><span className="text-xs text-tertiary">{sc.label}</span></div>
              <p className="text-2xl font-bold text-primary">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <EmptyState icon={<Target size={40} className="text-tertiary" />} title="No goals yet" description="Create your first goal to start tracking objectives" actionLabel="Create Goal" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const sc = statusConfig[goal.status];
            const isExpanded = expandedGoal === goal.id;
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-primary shadow-theme-sm overflow-hidden">
                <div className="p-5 cursor-pointer" onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${sc.color}`} />
                      <h3 className="text-base font-semibold text-primary">{goal.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={goal.status} onChange={e => { e.stopPropagation(); handleStatusChange(goal.id, e.target.value as GoalStatus); }}
                        onClick={e => e.stopPropagation()} className="text-[10px] px-2 py-1 rounded-lg bg-tertiary text-secondary border-0 cursor-pointer">
                        <option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
                      </select>
                      <button onClick={e => { e.stopPropagation(); handleDelete(goal.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                      {isExpanded ? <ChevronUp size={16} className="text-tertiary" /> : <ChevronDown size={16} className="text-tertiary" />}
                    </div>
                  </div>
                  {goal.description && <p className="text-sm text-tertiary mb-3">{goal.description}</p>}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-tertiary">Progress</span>
                        <span className="text-xs font-semibold text-primary">{goal.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-tertiary rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500" />
                      </div>
                    </div>
                    {goal.targetDate && (
                      <div className="flex items-center gap-1.5 text-xs text-tertiary">
                        <AlertTriangle size={12} />
                        {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                      </div>
                    )}
                    <span className="text-xs text-tertiary">{goal.keyResults.length} KRs</span>
                  </div>
                </div>

                {/* Expanded Key Results */}
                <AnimatePresence>
                  {isExpanded && goal.keyResults.length > 0 && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 space-y-3 border-t border-primary pt-4">
                        <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Key Results</p>
                        {goal.keyResults.map(kr => {
                          const pct = Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
                          return (
                            <div key={kr.id} className="p-3 bg-secondary rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-primary">{kr.title}</span>
                                <span className="text-xs text-tertiary">{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input type="range" min={0} max={kr.targetValue} step={kr.targetValue > 100 ? 1 : 0.1}
                                  value={kr.currentValue}
                                  onChange={e => handleKeyResultUpdate(goal.id, kr.id, parseFloat(e.target.value))}
                                  className="flex-1 h-1.5 rounded-full appearance-none bg-tertiary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-500"
                                />
                                <input type="number" value={kr.currentValue} min={0} max={kr.targetValue}
                                  onChange={e => handleKeyResultUpdate(goal.id, kr.id, parseFloat(e.target.value) || 0)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-16 px-2 py-1 bg-input rounded-lg text-xs text-primary text-center border border-primary focus:outline-none"
                                />
                              </div>
                              <div className="h-1.5 bg-tertiary rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateGoalModal onClose={() => { setShowCreate(false); loadGoals(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [keyResults, setKeyResults] = useState<{ title: string; targetValue: number; unit: string }[]>([]);
  const [newKr, setNewKr] = useState('');
  const [error, setError] = useState('');

  const addKr = () => {
    if (!newKr.trim()) return;
    setKeyResults(prev => [...prev, { title: newKr.trim(), targetValue: 100, unit: '%' }]);
    setNewKr('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title required'); return; }
    try {
      await api.createGoal({ title: title.trim(), description, targetDate: targetDate || null, keyResults });
      onClose();
    } catch { setError('Failed to create goal'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-lg overflow-hidden shadow-theme-xl border border-primary">
        <div className="px-6 py-4 border-b border-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center"><Target size={18} className="text-white" /></div>
            <h2 className="text-lg font-bold text-primary">Create Goal</h2>
          </div>
          <button onClick={onClose} className="text-tertiary hover:text-primary"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Goal Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Launch v2 by Q2"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description..."
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none resize-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Target Date</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Key Results</label>
            <div className="space-y-2 mb-2">
              {keyResults.map((kr, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                  <span className="flex-1 text-sm text-primary">{kr.title}</span>
                  <span className="text-xs text-tertiary">Target: {kr.targetValue}{kr.unit}</span>
                  <button type="button" onClick={() => setKeyResults(prev => prev.filter((_, j) => j !== i))} className="text-rose-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newKr} onChange={e => setNewKr(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKr())}
                placeholder="Add key result..." className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" />
              <button type="button" onClick={addKr} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600"><Plus size={16} /></button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-orange-500 shadow-theme-md">Create Goal</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

