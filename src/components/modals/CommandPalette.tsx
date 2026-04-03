import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import type { Priority, TaskStatus } from '../../types';
import {
  Search, Plus, Sparkles, Wand2, Target, Zap, Users, Calendar, BarChart3,
  Columns3, List, LayoutDashboard, FolderOpen, Link2, Settings, LifeBuoy, ChevronRight,
  X, CheckCircle2, AlertCircle, Circle,
} from 'lucide-react';
import { parseNaturalLanguage } from '../../utils/naturalLanguage';

type CommandCategory = 'actions' | 'tasks' | 'views' | 'projects' | 'recent' | 'ai';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: CommandCategory;
  action?: () => void;
  shortcut?: string;
  keywords?: string[];
}

export default function CommandPalette() {
  const { state, dispatch } = useAppContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Task creation state
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('Work');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (state.showQuickAdd) {
      setQuery('');
      setShowAdvanced(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('Work');
      setDueDate('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.showQuickAdd]);

  // View navigation commands
  const viewCommands = useMemo<Command[]>(() => [
    { id: 'view-dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); close(); }, shortcut: 'D' },
    { id: 'view-kanban', label: 'Go to Kanban Board', icon: <Columns3 size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'kanban' }); close(); }, shortcut: 'B' },
    { id: 'view-list', label: 'Go to Task List', icon: <List size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'list' }); close(); }, shortcut: 'L' },
    { id: 'view-calendar', label: 'Go to Calendar', icon: <Calendar size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'calendar' }); close(); }, shortcut: 'C' },
    { id: 'view-gantt', label: 'Go to Gantt Timeline', icon: <BarChart3 size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'gantt' }); close(); }, shortcut: 'G' },
    { id: 'view-goals', label: 'Go to Goals & OKRs', icon: <Target size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'goals' }); close(); }, shortcut: 'O' },
    { id: 'view-sprints', label: 'Go to Sprints', icon: <Zap size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'sprints' }); close(); }, shortcut: 'P' },
    { id: 'view-projects', label: 'Go to Projects', icon: <FolderOpen size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'projects' }); close(); }, shortcut: 'J' },
    { id: 'view-workload', label: 'Go to Workload', icon: <Users size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'workload' }); close(); }, shortcut: 'W' },
    { id: 'view-automations', label: 'Go to Automations', icon: <Zap size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'automations' }); close(); }, shortcut: 'A' },
    { id: 'view-integrations', label: 'Go to Integrations', icon: <Link2 size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'integrations' }); close(); }, shortcut: 'I' },
    { id: 'view-tickets', label: 'Go to Support Tickets', icon: <LifeBuoy size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'tickets' }); close(); }, shortcut: 'H' },
    { id: 'view-settings', label: 'Go to Settings', icon: <Settings size={16} />, category: 'views', action: () => { dispatch({ type: 'SET_VIEW', payload: 'settings' }); close(); } },
  ], [dispatch]);

  // Action commands
  const actionCommands = useMemo<Command[]>(() => [
    { id: 'action-new-task', label: 'Create New Task', icon: <Plus size={16} />, category: 'actions', action: () => openTaskCreator(), shortcut: 'N' },
    { id: 'action-quick-add', label: 'Quick Add Task', icon: <Sparkles size={16} />, category: 'actions', action: () => { /* already here */ } },
    { id: 'action-search', label: 'Search Everything', icon: <Search size={16} />, category: 'actions', action: () => inputRef.current?.focus() },
  ], []);

  // Filtered results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const all: Command[] = [];

    // Add action commands
    if (!showAdvanced) {
      actionCommands.forEach(cmd => {
        if (!q || cmd.label.toLowerCase().includes(q) || cmd.keywords?.some(k => k.includes(q))) {
          all.push(cmd);
        }
      });
    }

    // Add view commands
    viewCommands.forEach(cmd => {
      if (!q || cmd.label.toLowerCase().includes(q) || cmd.shortcut?.includes(q)) {
        all.push(cmd);
      }
    });

    // Add recent tasks as searchable items
    if (!showAdvanced && q.length >= 2) {
      const matchingTasks = state.tasks
        .filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
        .slice(0, 5);
      matchingTasks.forEach(task => {
        all.push({
          id: `task-${task.id}`,
          label: task.title,
          icon: getStatusIcon(task.status),
          category: 'tasks',
          action: () => {
            dispatch({ type: 'SELECT_TASK', payload: task });
            close();
          },
          keywords: [task.category, ...task.tags],
        });
      });
    }

    return all;
  }, [query, state.tasks, actionCommands, viewCommands, showAdvanced]);

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showAdvanced && title.trim()) {
        handleCreateTask();
      } else if (results[selectedIndex]?.action) {
        results[selectedIndex].action();
      } else if (title.trim() && !showAdvanced) {
        openTaskCreator();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const close = () => {
    dispatch({ type: 'SHOW_QUICK_ADD', payload: false });
  };

  const openTaskCreator = () => {
    setShowAdvanced(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCreateTask = () => {
    if (!title.trim()) return;
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
      sprintId: null,
      storyPoints: 0,
      timeEstimate: 0,
    };
    dispatch({ type: 'ADD_TASK', payload: task });
    const msg = [parsed.priority, parsed.dueDate, parsed.tags.length > 0 ? `#${parsed.tags.join(' #')}` : ''].filter(Boolean).join(', ');
    dispatch({ type: 'ADD_TOAST', payload: { id: uuidv4(), message: msg ? `Task created (${msg})` : 'Task created', type: 'success' } });
    close();
  };

  const handleAIParse = async () => {
    if (!title.trim()) return;
    setAiParsing(true);
    try {
      const result = await api.parseTask(title.trim());
      if (result.title) setTitle(result.title);
      if (result.priority) setPriority(result.priority);
      if (result.dueDate) setDueDate(result.dueDate);
    } catch { /* AI parse failed */ }
    setAiParsing(false);
  };

  if (!state.showQuickAdd) return null;

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[12vh]"
      onClick={close}
    >
      <motion.div
        initial={{ scale: 0.95, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: -20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-2xl overflow-hidden shadow-theme-xl border border-primary"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-primary">
          <Search size={18} className="text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={showAdvanced ? title : query}
            onChange={e => showAdvanced ? setTitle(e.target.value) : setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
                        placeholder={showAdvanced ? "Task title..." : "Search tasks, views, or type: task status:done priority:high #tag @john due:today"}
            className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary outline-none"
          />
          <div className="flex items-center gap-2">
            {!showAdvanced && (
              <button
                onClick={() => {
                  dispatch({ type: 'SET_EDITING_TASK', payload: null });
                  dispatch({ type: 'SHOW_TASK_MODAL', payload: true });
                  close();
                }}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                Advanced
              </button>
            )}
            <button onClick={close} className="p-1 rounded hover:bg-tertiary">
              <X size={16} className="text-tertiary" />
            </button>
          </div>
        </div>

        {/* Advanced Task Creator */}
        {showAdvanced && (
          <div className="px-5 py-4 border-b border-primary space-y-3">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)..."
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
            <div className="flex items-center justify-between">
              <button 
                onClick={handleAIParse} 
                disabled={aiParsing || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-xs font-medium hover:bg-violet-500/20 transition-colors disabled:opacity-50"
              >
                <Wand2 size={12} />
                {aiParsing ? 'Parsing...' : 'AI Parse'}
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!title.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl text-xs font-semibold shadow-theme-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Plus size={14} />
                Create Task
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        {!showAdvanced && results.length > 0 && (
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {/* Group by category */}
            {['actions', 'tasks', 'views'].map(cat => {
              const catResults = results.filter(r => r.category === cat);
              if (catResults.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="px-5 py-2 text-[10px] font-semibold text-tertiary uppercase tracking-wider">
                    {cat === 'actions' ? 'Actions' : cat === 'tasks' ? 'Tasks' : 'Views'}
                  </p>
                  {catResults.map((cmd) => {
                    const globalIdx = results.indexOf(cmd);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={cmd.id}
                        data-selected={isSelected}
                        onClick={() => cmd.action?.()}
                        className={`mx-2 px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-500/15' : 'hover:bg-tertiary'
                        }`}
                      >
                        <div className={`flex-shrink-0 ${isSelected ? 'text-primary-500' : 'text-tertiary'}`}>
                          {cmd.icon}
                        </div>
                        <span className={`flex-1 text-sm ${isSelected ? 'text-primary font-medium' : 'text-secondary'}`}>
                          {cmd.label}
                        </span>
                        {cmd.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-tertiary text-[10px] text-tertiary font-mono">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        <ChevronRight size={14} className="text-tertiary" />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state hint */}
        {!showAdvanced && results.length === 0 && query && (
          <div className="px-5 py-8 text-center">
            <Search size={32} className="text-tertiary mx-auto mb-2 opacity-50" />
            <p className="text-sm text-tertiary">No results found for "{query}"</p>
            <p className="text-xs text-tertiary mt-1">Try a different search or press Enter to create a task</p>
          </div>
        )}

        {/* Footer hints */}
        {!showAdvanced && (
          <div className="px-5 py-3 border-t border-primary flex items-center justify-between text-[10px] text-tertiary">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1 py-0.5 rounded bg-tertiary font-mono">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-tertiary font-mono">Enter</kbd> Select</span>
              <span><kbd className="px-1 py-0.5 rounded bg-tertiary font-mono">Esc</kbd> Close</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-500">Search: status: | priority: | #tag | @user | due:today</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'done': return <CheckCircle2 size={16} className="text-emerald-500" />;
    case 'review': return <AlertCircle size={16} className="text-amber-500" />;
    case 'in-progress': return <Circle size={16} className="text-primary-500" />;
    default: return <Circle size={16} className="text-slate-400" />;
  }
}