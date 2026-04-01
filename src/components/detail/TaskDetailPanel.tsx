import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import type { TaskStatus } from '../../types';
import { format, isPast, isToday } from 'date-fns';
import {
  X, CheckCircle2, Circle, Clock, Calendar,
  Edit3, Trash2, MessageSquare, Timer, FolderOpen, User, Link, Play, Square, Copy, Wand2,
} from 'lucide-react';
import { useTimer, formatElapsed } from '../../hooks/useTimer';
import { api } from '../../utils/api';

const statusConfig: Record<string, { label: string; color: string }> = {
  'todo': { label: 'To Do', color: 'bg-slate-500' },
  'in-progress': { label: 'In Progress', color: 'bg-primary-500' },
  'review': { label: 'In Review', color: 'bg-amber-500' },
  'done': { label: 'Done', color: 'bg-emerald-500' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  'urgent': { label: 'Urgent', color: 'text-rose-500', bg: 'bg-rose-500/15' },
  'high': { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500/15' },
  'medium': { label: 'Medium', color: 'text-primary-500', bg: 'bg-primary-500/15' },
  'low': { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-500/15' },
};

class PanelErrorBoundary extends React.Component<{ children: React.ReactNode; onClose: () => void }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('TaskDetailPanel error:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={this.props.onClose}>
          <div className="bg-modal rounded-2xl p-6 border border-primary shadow-xl max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-primary font-medium mb-3">Something went wrong loading this task.</p>
            <button onClick={this.props.onClose} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium">Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TaskDetailPanel() {
  const { state, dispatch } = useAppContext();
  const { startTimer, stopTimer, isTimerRunning, elapsed } = useTimer();
  const task = state.selectedTask;

  if (!task) return null;

  const handleClose = () => dispatch({ type: 'SELECT_TASK', payload: null });

  return (
    <PanelErrorBoundary onClose={handleClose}>
      <TaskDetailContent task={task} state={state} dispatch={dispatch} startTimer={startTimer} stopTimer={stopTimer} isTimerRunning={isTimerRunning} elapsed={elapsed} />
    </PanelErrorBoundary>
  );
}

function TaskDetailContent({ task, state, dispatch, startTimer, stopTimer, isTimerRunning, elapsed }: any) {
  const subtasks = task.subtasks || [];
  const comments = task.comments || [];
  const timeLogs = task.timeLogs || [];
  const tags = task.tags || [];
  const dependsOn = task.dependsOn || [];
  const activityLog = task.activityLog || [];

  const sc = statusConfig[task.status] || statusConfig['todo'];
  const pc = priorityConfig[task.priority] || priorityConfig['medium'];
  const timerActive = isTimerRunning(task.id);
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const totalTime = timeLogs.reduce((acc: number, log: any) => acc + (log.duration || 0), 0);
  const totalHours = Math.floor(totalTime / 3600);
  const totalMins = Math.floor((totalTime % 3600) / 60);

  const [commentText, setCommentText] = React.useState('');
  const [aiSummary, setAiSummary] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiPriority, setAiPriority] = React.useState<any>(null);
  const [aiPriorityLoading, setAiPriorityLoading] = React.useState(false);
  const [aiDescLoading, setAiDescLoading] = React.useState(false);

  const handleClose = () => dispatch({ type: 'SELECT_TASK', payload: null });

  const handleDuplicate = async () => {
    try {
      await api.duplicateTask(task.id);
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: `Duplicated "${task.title}"`, type: 'success' } });
      const tasks = await api.getTasks();
      dispatch({ type: 'LOAD_STATE', payload: { tasks } });
    } catch {}
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    dispatch({ type: 'UPDATE_TASK', payload: { ...task, status: newStatus } });
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.map((s: any) => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    dispatch({ type: 'UPDATE_TASK', payload: { ...task, subtasks: updatedSubtasks } });
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    const mentionMatches = text.match(/@(\w+)/g);
    if (mentionMatches) {
      for (const _match of mentionMatches) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: crypto.randomUUID?.() || Date.now().toString(),
            type: 'info', title: 'You were mentioned',
            message: `You were mentioned in a comment on "${task.title}"`,
            taskId: task.id, read: false, createdAt: new Date().toISOString(),
          },
        });
      }
    }
    const updated = {
      ...task,
      comments: [...comments, { id: crypto.randomUUID?.() || Date.now().toString(), text, author: 'You', createdAt: new Date().toISOString() }],
    };
    dispatch({ type: 'UPDATE_TASK', payload: updated });
    setCommentText('');
  };

  const renderWithMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-primary-500 font-semibold bg-primary-500/10 px-1 rounded">@$1</span>');
  };

  const handleAISummarize = async () => {
    setAiLoading(true); setAiSummary('');
    try {
      const result = await (api as any).summarizeTask({ taskTitle: task.title, comments, description: task.description });
      setAiSummary(result.summary || 'No summary.');
    } catch { setAiSummary('AI unavailable.'); }
    setAiLoading(false);
  };

  const handleAISuggestPriority = async () => {
    setAiPriorityLoading(true); setAiPriority(null);
    try {
      const result = await api.suggestPriority({ title: task.title, description: task.description, dueDate: task.dueDate });
      setAiPriority(result);
    } catch { setAiPriority({ priority: 'medium', reason: 'Could not determine' }); }
    setAiPriorityLoading(false);
  };

  const handleAIDraftDescription = async () => {
    setAiDescLoading(true);
    try {
      const result = await api.generateDescription({ title: task.title, existingDescription: task.description });
      if (result.description) {
        dispatch({ type: 'UPDATE_TASK', payload: { ...task, description: result.description } });
        dispatch({ type: 'ADD_TOAST', payload: { id: crypto.randomUUID(), message: 'Description drafted!', type: 'success' } });
      }
    } catch {}
    setAiDescLoading(false);
  };

  const blockedBy = state.tasks.filter((t: any) => dependsOn.includes(t.id));
  const dependentTasks = state.tasks.filter((t: any) => (t.dependsOn || []).includes(task.id));
  const category = state.categories.find((c: any) => c.name === task.category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
      onClick={handleClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e: any) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-lg bg-modal border-l border-primary shadow-theme-xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-modal border-b border-primary px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${sc.color}`} />
            <span className="text-sm font-medium text-secondary">{sc.label}</span>
            {timerActive && (
              <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{formatElapsed(elapsed)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timerActive ? (
              <button onClick={stopTimer} className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors" title="Stop timer">
                <Square size={16} />
              </button>
            ) : (
              <button onClick={() => startTimer(task)} className="p-2 rounded-xl hover:bg-tertiary transition-colors" title="Start timer">
                <Play size={16} className="text-secondary" />
              </button>
            )}
            <button onClick={handleDuplicate} className="p-2 rounded-xl hover:bg-tertiary transition-colors" title="Duplicate">
              <Copy size={16} className="text-secondary" />
            </button>
            <button onClick={() => dispatch({ type: 'SET_EDITING_TASK', payload: task })} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
              <Edit3 size={16} className="text-secondary" />
            </button>
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
              <X size={16} className="text-secondary" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Title & Priority */}
          <div>
            <div className="flex items-start gap-3 mb-2">
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${pc.bg} ${pc.color} border border-current/20 mt-0.5`}>
                {pc.label}
              </span>
              {task.recurring && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500 border border-violet-500/20 mt-0.5">
                  {task.recurring.type}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-primary">{task.title}</h2>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* AI Tools */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleAISummarize} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 text-xs font-medium transition-colors disabled:opacity-50">
              <Wand2 size={12} /> {aiLoading ? 'Summarizing...' : 'Summarize'}
            </button>
            <button onClick={handleAIDraftDescription} disabled={aiDescLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 text-xs font-medium transition-colors disabled:opacity-50">
              <Wand2 size={12} /> {aiDescLoading ? 'Drafting...' : 'Draft Description'}
            </button>
            <button onClick={handleAISuggestPriority} disabled={aiPriorityLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 text-xs font-medium transition-colors disabled:opacity-50">
              <Wand2 size={12} /> {aiPriorityLoading ? 'Analyzing...' : 'Suggest Priority'}
            </button>
          </div>
          {aiSummary && (
            <div className="mt-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-1">Summary</p>
              <p className="text-sm text-secondary leading-relaxed">{aiSummary}</p>
            </div>
          )}
          {aiPriority && (
            <div className="mt-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-1">Suggested Priority</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  aiPriority.priority === 'urgent' ? 'text-rose-500' : aiPriority.priority === 'high' ? 'text-amber-500' : aiPriority.priority === 'medium' ? 'text-primary-500' : 'text-slate-500'
                }`}>{String(aiPriority.priority || 'medium').charAt(0).toUpperCase() + String(aiPriority.priority || 'medium').slice(1)}</span>
                <span className="text-xs text-tertiary">— {aiPriority.reason || ''}</span>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            {task.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className={isOverdue ? 'text-rose-500' : 'text-tertiary'} />
                <span className={isOverdue ? 'text-rose-500 font-medium' : 'text-secondary'}>
                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  {isOverdue && ' (Overdue)'}
                  {isToday(new Date(task.dueDate)) && ' (Today)'}
                </span>
              </div>
            )}
            {category && (
              <div className="flex items-center gap-2 text-sm">
                <FolderOpen size={14} className="text-tertiary" />
                <span className="text-secondary">{category.name}</span>
              </div>
            )}
            {task.assignee && (
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-tertiary" />
                <span className="text-secondary">{task.assignee}</span>
              </div>
            )}
            {totalTime > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Timer size={14} className="text-tertiary" />
                <span className="text-secondary">{totalHours}h {totalMins}m</span>
              </div>
            )}
            {task.storyPoints > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-semibold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full">{task.storyPoints} SP</span>
              </div>
            )}
            {task.timeEstimate > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-tertiary" />
                <span className="text-secondary">Est: {Math.floor(task.timeEstimate / 60)}h {task.timeEstimate % 60}m</span>
              </div>
            )}
          </div>

          {/* Status selector */}
          <div>
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Status</p>
            <div className="flex gap-2">
              {(['todo', 'in-progress', 'review', 'done'] as string[]).map(s => {
                const ssc = statusConfig[s] || statusConfig['todo'];
                return (
                  <button key={s} onClick={() => handleStatusChange(s as TaskStatus)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      task.status === s ? `${ssc.color} text-white` : 'bg-tertiary text-secondary hover:bg-primary-500/10'
                    }`}>
                    {ssc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">
                Subtasks ({subtasks.filter((s: any) => s.completed).length}/{subtasks.length})
              </p>
              <div className="h-2 bg-tertiary rounded-full overflow-hidden mb-3">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${task.progress || 0}%` }} />
              </div>
              <div className="space-y-2">
                {subtasks.map((subtask: any) => (
                  <button key={subtask.id} onClick={() => handleToggleSubtask(subtask.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-tertiary transition-colors text-left">
                    {subtask.completed ? (
                      <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle size={18} className="text-tertiary flex-shrink-0" />
                    )}
                    <span className={`text-sm ${subtask.completed ? 'line-through text-tertiary' : 'text-primary'}`}>
                      {subtask.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-tertiary text-secondary">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {(blockedBy.length > 0 || dependentTasks.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Dependencies</p>
              {blockedBy.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-rose-500 mb-1">Blocked by:</p>
                  {blockedBy.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-secondary p-2 rounded-lg bg-rose-500/5">
                      <Link size={12} className="text-rose-500" /> {t.title}
                    </div>
                  ))}
                </div>
              )}
              {dependentTasks.length > 0 && (
                <div>
                  <p className="text-xs text-tertiary mb-1">Blocks:</p>
                  {dependentTasks.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-secondary p-2 rounded-lg bg-tertiary">
                      <Link size={12} className="text-tertiary" /> {t.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time Logs */}
          {timeLogs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Time Logs</p>
              <div className="space-y-2">
                {timeLogs.map((log: any) => {
                  const hrs = Math.floor((log.duration || 0) / 3600);
                  const mins = Math.floor(((log.duration || 0) % 3600) / 60);
                  return (
                    <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg bg-tertiary">
                      <div className="flex items-center gap-2">
                        <Timer size={14} className="text-tertiary" />
                        <span className="text-xs text-secondary">{log.startTime ? format(new Date(log.startTime), 'MMM d, h:mm a') : ''}</span>
                      </div>
                      <span className="text-xs font-medium text-primary">{hrs > 0 ? `${hrs}h ` : ''}{mins}m</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-right">
                <span className="text-sm font-semibold text-primary">Total: {totalHours}h {totalMins}m</span>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Comments ({comments.length})</p>
            <div className="space-y-3 mb-3">
              {comments.map((comment: any) => (
                <div key={comment.id} className="p-3 rounded-xl bg-tertiary">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-primary">{comment.author}</span>
                    <span className="text-[10px] text-tertiary">{comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, h:mm a') : ''}</span>
                  </div>
                  <p className="text-sm text-secondary" dangerouslySetInnerHTML={{ __html: renderWithMentions(comment.text || '') }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
              <button onClick={addComment} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
                <MessageSquare size={16} />
              </button>
            </div>
          </div>

          {/* Activity Log */}
          {activityLog.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Activity</p>
              <div className="space-y-2">
                {activityLog.slice().reverse().slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary">{entry.message}</p>
                      <p className="text-[10px] text-tertiary">{entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, h:mm a') : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-modal border-t border-primary px-6 py-4 flex items-center justify-between">
          <button onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors">
            <Trash2 size={16} /> Delete
          </button>
          <button onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:bg-tertiary transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

