import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../utils/api';
import type { Automation } from '../../types';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, ArrowRight, X } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const triggerLabels: Record<string, string> = {
  status_changed: 'Status changes',
  priority_changed: 'Priority changes',
  task_created: 'Task is created',
  due_date_passed: 'Due date passes',
};

const actionLabels: Record<string, string> = {
  set_status: 'Set status to',
  set_priority: 'Set priority to',
  set_assignee: 'Assign to',
  add_tag: 'Add tag',
  notify: 'Send notification',
};

export default function AutomationsView() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadAutomations = async () => {
    try { setAutomations(await api.getAutomations()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadAutomations(); }, []);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await api.updateAutomation(id, { enabled: !enabled });
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !enabled } : a));
    } catch { /* ignore */ }
  };

  const deleteAutomation = async (id: string) => {
    try {
      await api.deleteAutomation(id);
      setAutomations(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const getActionSummary = (a: Automation) => {
    switch (a.actionType) {
      case 'set_status': return `${actionLabels[a.actionType]} "${a.actionConfig.status}"`;
      case 'set_priority': return `${actionLabels[a.actionType]} "${a.actionConfig.priority}"`;
      case 'set_assignee': return `${actionLabels[a.actionType]} "${a.actionConfig.assignee}"`;
      case 'add_tag': return `${actionLabels[a.actionType]} "${a.actionConfig.tag}"`;
      case 'notify': return `${actionLabels[a.actionType]}: "${a.actionConfig.message || 'Automation triggered'}"`;
      default: return a.actionType;
    }
  };

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            Automations
          </h1>
          <p className="text-sm text-tertiary mt-1">Set up rules to automate your workflow</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm shadow-theme-md">
          <Plus size={16} /> New Rule
        </motion.button>
      </div>

      {automations.length === 0 ? (
        <EmptyState icon={<Zap size={40} className="text-tertiary" />} title="No automations yet" description="Create rules like 'When status changes to Done, set priority to Low'" actionLabel="Create Rule" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-3">
          {automations.map(auto => (
            <motion.div key={auto.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-card rounded-xl p-4 border shadow-theme-sm transition-all ${!auto.enabled ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleEnabled(auto.id, auto.enabled)} className="flex-shrink-0">
                    {auto.enabled ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-tertiary" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{auto.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-tertiary">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">{triggerLabels[auto.triggerType] || auto.triggerType}</span>
                      <ArrowRight size={12} />
                      <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-500">{getActionSummary(auto)}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteAutomation(auto.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && <CreateAutomationModal onClose={() => { setShowCreate(false); loadAutomations(); }} />}
    </div>
  );
}

function CreateAutomationModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('status_changed');
  const [triggerFrom, setTriggerFrom] = useState('');
  const [triggerTo, setTriggerTo] = useState('');
  const [actionType, setActionType] = useState('set_status');
  const [actionValue, setActionValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    const triggerCondition: Record<string, string> = {};
    if (triggerFrom) triggerCondition.from = triggerFrom;
    if (triggerTo) triggerCondition.to = triggerTo;
    const actionConfig: Record<string, string> = {};
    switch (actionType) {
      case 'set_status': actionConfig.status = actionValue; break;
      case 'set_priority': actionConfig.priority = actionValue; break;
      case 'set_assignee': actionConfig.assignee = actionValue; break;
      case 'add_tag': actionConfig.tag = actionValue; break;
      case 'notify': actionConfig.message = actionValue; break;
    }
    try {
      await api.createAutomation({ name: name.trim(), triggerType, triggerCondition, actionType, actionConfig });
      onClose();
    } catch { setError('Failed to create automation'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-lg overflow-hidden shadow-theme-xl border border-primary">
        <div className="px-6 py-4 border-b border-primary flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Create Automation</h2>
          <button onClick={onClose} className="text-tertiary hover:text-primary"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Rule Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Auto-close done tasks"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" autoFocus />
          </div>
          <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <p className="text-xs font-semibold text-amber-500 mb-2">WHEN</p>
            <select value={triggerType} onChange={e => setTriggerType(e.target.value)}
              className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none mb-2">
              <option value="status_changed">Status changes</option>
              <option value="priority_changed">Priority changes</option>
              <option value="task_created">Task is created</option>
              <option value="due_date_passed">Due date passes</option>
            </select>
            {triggerType === 'status_changed' && (
              <div className="grid grid-cols-2 gap-2">
                <select value={triggerFrom} onChange={e => setTriggerFrom(e.target.value)} className="px-3 py-2 bg-input rounded-lg text-xs text-primary border border-primary">
                  <option value="">Any status</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="done">Done</option>
                </select>
                <select value={triggerTo} onChange={e => setTriggerTo(e.target.value)} className="px-3 py-2 bg-input rounded-lg text-xs text-primary border border-primary">
                  <option value="">Any status</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="done">Done</option>
                </select>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary-500/5 rounded-xl border border-primary-500/10">
            <p className="text-xs font-semibold text-primary-500 mb-2">THEN</p>
            <select value={actionType} onChange={e => setActionType(e.target.value)}
              className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none mb-2">
              <option value="set_status">Set status</option><option value="set_priority">Set priority</option>
              <option value="set_assignee">Assign to</option><option value="add_tag">Add tag</option><option value="notify">Send notification</option>
            </select>
            {actionType === 'set_status' && (
              <select value={actionValue} onChange={e => setActionValue(e.target.value)} className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary">
                <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="done">Done</option>
              </select>
            )}
            {actionType === 'set_priority' && (
              <select value={actionValue} onChange={e => setActionValue(e.target.value)} className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            )}
            {(actionType === 'set_assignee' || actionType === 'add_tag' || actionType === 'notify') && (
              <input type="text" value={actionValue} onChange={e => setActionValue(e.target.value)}
                placeholder={actionType === 'notify' ? 'Notification message' : 'Value'}
                className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none" />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-theme-md">Create Rule</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
