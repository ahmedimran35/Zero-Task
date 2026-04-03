import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import type { Task, TaskStatus, Priority, Subtask, Recurrence } from '../../types';
import { format } from 'date-fns';
import { X, Plus, Trash2, Calendar, Tag, Flag, FolderOpen, CheckSquare, Square, User, Repeat, Sparkles, Zap } from 'lucide-react';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500' },
  { value: 'high', label: 'High', color: 'bg-amber-500' },
  { value: 'medium', label: 'Medium', color: 'bg-primary-500' },
  { value: 'low', label: 'Low', color: 'bg-slate-400' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const assigneeOptions = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan'];

export default function TaskModal() {
  const { state, dispatch } = useAppContext();
  const editingTask = state.editingTask;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [category, setCategory] = useState('Work');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [recurring, setRecurring] = useState<Recurrence | null>(null);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [storyPoints, setStoryPoints] = useState(0);
  const [timeEstimate, setTimeEstimate] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setCategory(editingTask.category);
      setDueDate(editingTask.dueDate ? format(new Date(editingTask.dueDate), 'yyyy-MM-dd') : '');
      setSubtasks(editingTask.subtasks);
      setTags(editingTask.tags);
      setAssignee(editingTask.assignee);
      setRecurring(editingTask.recurring);
      setDependsOn(editingTask.dependsOn);
      setStoryPoints(editingTask.storyPoints || 0);
      setTimeEstimate(editingTask.timeEstimate || 0);
      setSelectedSprint(editingTask.sprintId || null);
    } else {
      setTitle(''); setDescription(''); setPriority('medium'); setStatus('todo'); setCategory('Work');
      setDueDate(''); setSubtasks([]); setTags([]); setAssignee(null); setRecurring(null); setDependsOn([]);
      setStoryPoints(0); setTimeEstimate(0);
      setSelectedSprint(state.sprints.find(s => s.status === 'active')?.id || null);
    }
    setShowTemplates(!editingTask);
  }, [editingTask]);

  const handleClose = () => {
    dispatch({ type: 'SHOW_TASK_MODAL', payload: false });
    dispatch({ type: 'SET_EDITING_TASK', payload: null });
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = state.templates.find(t => t.id === templateId);
    if (!tmpl) return;
    setTitle(tmpl.defaultTitle);
    setDescription(tmpl.defaultDescription);
    setPriority(tmpl.defaultPriority);
    setCategory(tmpl.defaultCategory);
    setSubtasks(tmpl.defaultSubtasks.map(s => ({ id: uuidv4(), title: s, completed: false })));
    setTags([...tmpl.defaultTags]);
    setShowTemplates(false);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

    const task: Task = {
      id: editingTask?.id || uuidv4(),
      title: title.trim(), description: description.trim(), status, priority, category,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdAt: editingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks, tags, progress, assignee, recurring, dependsOn,
      timeLogs: editingTask?.timeLogs || [],
      comments: editingTask?.comments || [],
      activityLog: editingTask?.activityLog || [{ id: uuidv4(), type: 'created', message: 'Task created', timestamp: new Date().toISOString() }],
      completedAt: editingTask?.completedAt || null,
      projectId: editingTask?.projectId || null,
      sprintId: selectedSprint,
      storyPoints,
      timeEstimate,
    };

    if (editingTask) {
      dispatch({ type: 'UPDATE_TASK', payload: task });
    } else {
      dispatch({ type: 'ADD_TASK', payload: task });
    }
    dispatch({ type: 'ADD_TOAST', payload: { id: uuidv4(), message: editingTask ? 'Task updated' : 'Task created', type: 'success' } });
    handleClose();
  };

  const handleDelete = () => {
    if (editingTask) {
      dispatch({ type: 'DELETE_TASK', payload: editingTask.id });
      dispatch({ type: 'ADD_TOAST', payload: { id: uuidv4(), message: 'Task deleted', type: 'success', undoAction: { type: 'ADD_TASK', payload: editingTask } } });
      handleClose();
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { id: uuidv4(), title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  };

  const toggleSubtask = (id: string) => setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  const removeSubtask = (id: string) => setSubtasks(prev => prev.filter(s => s.id !== id));

  const addTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    setTags(prev => [...prev, newTag.trim().toLowerCase()]);
    setNewTag('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-theme-xl border border-primary">

        <div className="flex items-center justify-between px-6 py-4 border-b border-primary">
          <h2 className="text-lg font-bold text-primary">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-tertiary transition-colors"><X size={18} className="text-secondary" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Templates */}
          {!editingTask && showTemplates && state.templates.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><Sparkles size={14} /> Templates</label>
              <div className="flex flex-wrap gap-2">
                {state.templates.map(tmpl => (
                  <button key={tmpl.id} onClick={() => applyTemplate(tmpl.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors">
                    <Sparkles size={12} />{tmpl.name}
                  </button>
                ))}
                <button onClick={() => setShowTemplates(false)} className="px-3 py-1.5 rounded-lg text-xs text-tertiary hover:bg-tertiary transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter task title..."
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a description..." rows={3}
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><Flag size={14} /> Priority</label>
              <div className="space-y-1.5">
                {priorityOptions.map(opt => (
                  <button key={opt.value} onClick={() => setPriority(opt.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      priority === opt.value ? `${opt.color} text-white` : 'bg-input text-secondary hover:bg-tertiary border border-primary'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${opt.color}`} />{opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><CheckSquare size={14} /> Status</label>
              <div className="space-y-1.5">
                {statusOptions.map(opt => (
                  <button key={opt.value} onClick={() => setStatus(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      status === opt.value ? 'bg-primary-500 text-white' : 'bg-input text-secondary hover:bg-tertiary border border-primary'
                    }`}>{opt.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><FolderOpen size={14} /> Category</label>
              <div className="space-y-1.5">
                {state.categories.map(cat => (
                  <button key={cat.id} onClick={() => setCategory(cat.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat.name ? 'bg-primary-500 text-white' : 'bg-input text-secondary hover:bg-tertiary border border-primary'
                    }`}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}
                  </button>
                ))}
              </div>
            </div>

            {state.sprints.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><Zap size={14} /> Sprint</label>
                <select value={selectedSprint || ''} onChange={e => setSelectedSprint(e.target.value || null)}
                  className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all">
                  <option value="">No Sprint</option>
                  {state.sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name} ({sprint.status})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Due Date + Assignee + Recurring */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><Calendar size={14} /> Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><User size={14} /> Assignee</label>
              <select value={assignee || ''} onChange={e => setAssignee(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all">
                <option value="">Unassigned</option>
                {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><Repeat size={14} /> Recurring</label>
              <select value={recurring?.type || ''} onChange={e => {
                if (!e.target.value) { setRecurring(null); return; }
                setRecurring({ type: e.target.value as Recurrence['type'], interval: 1 });
              }}
                className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all">
                <option value="">Not recurring</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Story Points & Time Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Story Points</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 5, 8, 13].map(sp => (
                  <button key={sp} type="button"
                    onClick={() => setStoryPoints(sp)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      storyPoints === sp ? 'bg-primary-500 text-white' : 'bg-input border border-primary hover:bg-primary-500/10'
                    }`}>
                    {sp}
                  </button>
                ))}
                {storyPoints > 0 && (
                  <button type="button" onClick={() => setStoryPoints(0)}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Time Estimate (minutes)</label>
              <input type="number" min={0} value={timeEstimate || ''} onChange={e => setTimeEstimate(parseInt(e.target.value) || 0)} placeholder="e.g., 120"
                className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" />
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Blocked By</label>
            <select value="" onChange={e => {
              if (e.target.value && !dependsOn.includes(e.target.value)) setDependsOn(prev => [...prev, e.target.value]);
            }}
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all">
              <option value="">Add dependency...</option>
              {state.tasks.filter(t => t.id !== editingTask?.id && !dependsOn.includes(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {dependsOn.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dependsOn.map(depId => {
                  const dep = state.tasks.find(t => t.id === depId);
                  return dep ? (
                    <span key={depId} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500">
                      {dep.title}
                      <button onClick={() => setDependsOn(prev => prev.filter(id => id !== depId))} className="hover:text-rose-700"><X size={12} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><CheckSquare size={14} /> Subtasks</label>
            <div className="space-y-2 mb-2">
              {subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleSubtask(subtask.id)} className="flex-shrink-0">
                    {subtask.completed ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} className="text-tertiary" />}
                  </button>
                  <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-tertiary' : 'text-primary'}`}>{subtask.title}</span>
                  <button onClick={() => removeSubtask(subtask.id)} className="p-1 rounded hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14} className="text-rose-500" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="Add subtask..." className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
              <button onClick={addSubtask} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"><Plus size={16} /></button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-primary mb-1.5"><Tag size={14} /> Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-tertiary text-secondary group">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition-colors"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add tag..." className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
              <button onClick={addTag} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"><Plus size={16} /></button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-primary bg-secondary">
          <div>
            {editingTask && (
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:bg-tertiary transition-colors">Cancel</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={!title.trim()}
              className="px-5 py-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-theme-md hover:shadow-theme-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {editingTask ? 'Update Task' : 'Create Task'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
