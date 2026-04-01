import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import type { TaskStatus, Priority } from '../../types';
import { format, isPast, isToday } from 'date-fns';
import {
  X, CheckCircle2, Circle, Clock, AlertCircle, Calendar,
  Edit3, Trash2, MessageSquare, Timer, FolderOpen, User, Link, Play, Square, Copy,
} from 'lucide-react';
import { useTimer, formatElapsed } from '../../hooks/useTimer';
import { api } from '../../utils/api';

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: typeof Circle }> = {
  todo: { label: 'To Do', color: 'bg-slate-500', icon: Circle },
  'in-progress': { label: 'In Progress', color: 'bg-primary-500', icon: Clock },
  review: { label: 'In Review', color: 'bg-amber-500', icon: AlertCircle },
  done: { label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 },
};

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'text-rose-500', bg: 'bg-rose-500/15' },
  high: { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500/15' },
  medium: { label: 'Medium', color: 'text-primary-500', bg: 'bg-primary-500/15' },
  low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-500/15' },
};

export default function TaskDetailPanel() {
  const { state, dispatch } = useAppContext();
  const { startTimer, stopTimer, isTimerRunning, elapsed } = useTimer();
  const task = state.selectedTask;

  if (!task) return null;

  const sc = statusConfig[task.status];
  const pc = priorityConfig[task.priority];
  const timerActive = isTimerRunning(task.id);

  const handleDuplicate = async () => {
    try {
      await api.duplicateTask(task.id);
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: `Duplicated "${task.title}"`, type: 'success' } });
      const tasks = await api.getTasks();
      dispatch({ type: 'LOAD_STATE', payload: { tasks } });
    } catch { /* ignore */ }
  };
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const totalTime = task.timeLogs.reduce((acc, log) => acc + log.duration, 0);
  const totalHours = Math.floor(totalTime / 3600);
  const totalMins = Math.floor((totalTime % 3600) / 60);

  const handleClose = () => dispatch({ type: 'SELECT_TASK', payload: null });

  const handleStatusChange = (newStatus: TaskStatus) => {
    dispatch({ type: 'UPDATE_TASK', payload: { ...task, status: newStatus } });
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    dispatch({ type: 'UPDATE_TASK', payload: { ...task, subtasks: updatedSubtasks } });
  };

  const [commentText, setCommentText] = React.useState('');

  const addComment = () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();

    // Parse @mentions and create notifications
    const mentionMatches = text.match(/@(\w+)/g);
    if (mentionMatches) {
      for (const _match of mentionMatches) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: crypto.randomUUID?.() || Date.now().toString(),
            type: 'info',
            title: 'You were mentioned',
            message: `You were mentioned in a comment on "${task.title}"`,
            taskId: task.id,
            read: false,
            createdAt: new Date().toISOString(),
          },
        });
      }
    }

    const updated = {
      ...task,
      comments: [...task.comments, { id: crypto.randomUUID?.() || Date.now().toString(), text, author: 'You', createdAt: new Date().toISOString() }],
    };
    dispatch({ type: 'UPDATE_TASK', payload: updated });
    setCommentText('');
  };

  // Render text with @mentions highlighted
  const renderWithMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-primary-500 font-semibold bg-primary-500/10 px-1 rounded">@$1</span>');
  };

  const blockedBy = state.tasks.filter(t => task.dependsOn.includes(t.id));
  const dependentTasks = state.tasks.filter(t => t.dependsOn.includes(task.id));
  const category = state.categories.find(c => c.name === task.category);

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
        onClick={e => e.stopPropagation()}
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
              {(['todo', 'in-progress', 'review', 'done'] as TaskStatus[]).map(s => {
                const ssc = statusConfig[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      task.status === s ? `${ssc.color} text-white` : 'bg-tertiary text-secondary hover:bg-primary-500/10'
                    }`}
                  >
                    {ssc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">
                Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
              </p>
              <div className="h-2 bg-tertiary rounded-full overflow-hidden mb-3">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
              </div>
              <div className="space-y-2">
                {task.subtasks.map(subtask => (
                  <button
                    key={subtask.id}
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-tertiary transition-colors text-left"
                  >
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
          {task.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-tertiary text-secondary">
                    #{tag}
                  </span>
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
                  {blockedBy.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-secondary p-2 rounded-lg bg-rose-500/5">
                      <Link size={12} className="text-rose-500" />
                      {t.title}
                    </div>
                  ))}
                </div>
              )}
              {dependentTasks.length > 0 && (
                <div>
                  <p className="text-xs text-tertiary mb-1">Blocks:</p>
                  {dependentTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-secondary p-2 rounded-lg bg-tertiary">
                      <Link size={12} className="text-tertiary" />
                      {t.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time Logs */}
          {task.timeLogs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Time Logs</p>
              <div className="space-y-2">
                {task.timeLogs.map(log => {
                  const hrs = Math.floor(log.duration / 3600);
                  const mins = Math.floor((log.duration % 3600) / 60);
                  return (
                    <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg bg-tertiary">
                      <div className="flex items-center gap-2">
                        <Timer size={14} className="text-tertiary" />
                        <span className="text-xs text-secondary">{format(new Date(log.startTime), 'MMM d, h:mm a')}</span>
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
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">
              Comments ({task.comments.length})
            </p>
            <div className="space-y-3 mb-3">
              {task.comments.map(comment => (
                <div key={comment.id} className="p-3 rounded-xl bg-tertiary">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-primary">{comment.author}</span>
                    <span className="text-[10px] text-tertiary">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-secondary" dangerouslySetInnerHTML={{ __html: renderWithMentions(comment.text) }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
              <button onClick={addComment} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
                <MessageSquare size={16} />
              </button>
            </div>
          </div>

          {/* Activity Log */}
          {task.activityLog.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Activity</p>
              <div className="space-y-2">
                {task.activityLog.slice().reverse().slice(0, 10).map(entry => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary">{entry.message}</p>
                      <p className="text-[10px] text-tertiary">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-modal border-t border-primary px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:bg-tertiary transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

