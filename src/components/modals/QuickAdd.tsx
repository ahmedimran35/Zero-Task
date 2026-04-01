import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import type { Priority, TaskStatus } from '../../types';
import { format } from 'date-fns';
import { Search, Plus, Clock, Sparkles, Wand2 } from 'lucide-react';
import { parseNaturalLanguage } from '../../utils/naturalLanguage';

export default function QuickAdd() {
  const { state, dispatch } = useAppContext();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('Work');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiDraftingDesc, setAiDraftingDesc] = useState(false);
  const [aiSubtasks, setAiSubtasks] = useState<string[]>([]);
  const [aiSubtasksLoading, setAiSubtasksLoading] = useState(false);

  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.showQuickAdd) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('Work');
      setDueDate('');
      setShowAdvanced(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.showQuickAdd]);

  const handleClose = () => dispatch({ type: 'SHOW_QUICK_ADD', payload: false });

  const handleSubmit = () => {
    if (!title.trim()) return;
    // Parse natural language
    const parsed = parseNaturalLanguage(title.trim());
    const task = {
      id: uuidv4(),
      title: parsed.title || title.trim(),
      description: description.trim(),
      status: 'todo' as TaskStatus,
      priority: parsed.priority || priority,
      category,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate).toISOString() : (dueDate ? new Date(dueDate).toISOString() : null),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: [],
      tags: parsed.tags.length > 0 ? parsed.tags : [],
      progress: 0,
      assignee: null,
      recurring: null,
      dependsOn: [],
      timeLogs: [],
      comments: [],
      activityLog: [{ id: uuidv4(), type: 'created' as const, message: 'Quick created', timestamp: new Date().toISOString() }],
      completedAt: null,
      projectId: null,
      storyPoints: 0,
      timeEstimate: 0,
    };
    dispatch({ type: 'ADD_TASK', payload: task });
    const msg = [parsed.priority, parsed.dueDate, parsed.tags.length > 0 ? `#${parsed.tags.join(' #')}` : ''].filter(Boolean).join(', ');
    dispatch({ type: 'ADD_TOAST', payload: { id: uuidv4(), message: msg ? `Task created (${msg})` : 'Task created', type: 'success' } });
    handleClose();
  };


  const handleAIParse = async () => {
    if (!title.trim()) return;
    setAiParsing(true);
    try {
      const result = await api.parseTask(title.trim());
      if (result.title) setTitle(result.title);
      if (result.priority) setPriority(result.priority);
      if (result.dueDate) setDueDate(result.dueDate);
      if (!showAdvanced && (result.priority || result.dueDate)) setShowAdvanced(true);
      dispatch({ type: 'ADD_TOAST', payload: { id: crypto.randomUUID(), message: 'AI parsed your task!', type: 'success' } });
    } catch { /* AI parse failed */ }
    setAiParsing(false);
  };

  const handleAIDraftDescription = async () => {
    if (!title.trim()) return;
    setAiDraftingDesc(true);
    try {
      const result = await api.generateDescription({ title: title.trim(), existingDescription: description });
      if (result.description) {
        setDescription(result.description);
        if (!showAdvanced) setShowAdvanced(true);
        dispatch({ type: 'ADD_TOAST', payload: { id: crypto.randomUUID(), message: 'Description drafted!', type: 'success' } });
      }
    } catch {}
    setAiDraftingDesc(false);
  };

  const handleAIGenerateSubtasks = async () => {
    if (!title.trim()) return;
    setAiSubtasksLoading(true);
    setAiSubtasks([]);
    try {
      const result = await api.generateSubtasks({ title: title.trim(), description });
      if (result.subtasks && result.subtasks.length > 0) {
        setAiSubtasks(result.subtasks);
      }
    } catch {}
    setAiSubtasksLoading(false);
  };


  if (!state.showQuickAdd) return null;

  const recentTasks = state.tasks.slice(-5).reverse();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: -20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-xl overflow-hidden shadow-theme-xl border border-primary"
      >
        {/* Search/Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-primary">
          <Search size={18} className="text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') handleClose();
            }}
            placeholder="Type a task title and press Enter..."
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary outline-none"
          />
          <button
            onClick={handleAIParse}
            disabled={aiParsing || !title.trim()}
            className="text-xs text-violet-500 hover:text-violet-600 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <Wand2 size={12} />
            {aiParsing ? 'Parsing...' : 'AI Parse'}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
        </div>

        {showAdvanced && (
          <div className="px-5 py-4 border-b border-primary space-y-3">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description..."
              rows={2}
              className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-none"
            />
            <div className="flex gap-3">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              >
                {state.categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
            </div>
            {/* AI Buttons */}
            <div className="flex gap-2">
              <button onClick={handleAIDraftDescription} disabled={aiDraftingDesc || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-xs font-medium hover:bg-violet-500/20 transition-colors disabled:opacity-50">
                <Wand2 size={12} /> {aiDraftingDesc ? 'Drafting...' : 'Draft Description'}
              </button>
              <button onClick={handleAIGenerateSubtasks} disabled={aiSubtasksLoading || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-xs font-medium hover:bg-violet-500/20 transition-colors disabled:opacity-50">
                <Sparkles size={12} /> {aiSubtasksLoading ? 'Generating...' : 'Suggest Subtasks'}
              </button>
            </div>
            {aiSubtasks.length > 0 && (
              <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
                <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-2">Suggested Subtasks</p>
                {aiSubtasks.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-sm text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent tasks */}
        {!showAdvanced && (
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider mb-2">Recent Tasks</p>
            <div className="space-y-1">
              {recentTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => {
                    dispatch({ type: 'SELECT_TASK', payload: task });
                    handleClose();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-tertiary transition-colors cursor-pointer"
                >
                  <Clock size={14} className="text-tertiary flex-shrink-0" />
                  <span className="text-sm text-secondary truncate flex-1">{task.title}</span>
                  <span className="text-[10px] text-tertiary">{format(new Date(task.updatedAt), 'MMM d')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        {!showAdvanced && state.templates.length > 0 && (
          <div className="px-5 py-3 border-t border-primary">
            <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider mb-2">Templates</p>
            <div className="flex flex-wrap gap-2">
              {state.templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setTitle(tmpl.defaultTitle);
                    setDescription(tmpl.defaultDescription);
                    setPriority(tmpl.defaultPriority);
                    setCategory(tmpl.defaultCategory);
                    setShowAdvanced(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary text-xs text-secondary hover:bg-primary-500/10 hover:text-primary-500 transition-colors"
                >
                  <Sparkles size={12} />
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit hint */}
        <div className="px-5 py-3 border-t border-primary flex items-center justify-between">
          <p className="text-xs text-tertiary">Press <kbd className="px-1.5 py-0.5 rounded bg-tertiary text-secondary font-mono text-[10px]">Enter</kbd> to create</p>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl text-xs font-semibold shadow-theme-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus size={14} />
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
