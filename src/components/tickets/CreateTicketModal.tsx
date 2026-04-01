import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { Priority } from '../../types';
import { X, AlertCircle, LifeBuoy, User } from 'lucide-react';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-400' },
  { value: 'medium', label: 'Medium', color: 'bg-primary-500' },
  { value: 'high', label: 'High', color: 'bg-amber-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500' },
];

export default function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const { currentUser, users } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await api.createTicket({ subject: subject.trim(), description: description.trim(), priority });
      if (isAdmin && assignedTo && ticket?.id) {
        await api.updateTicket(ticket.id, { assignedTo });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-lg overflow-hidden shadow-theme-xl border border-primary"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
              <LifeBuoy size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-primary">New Support Ticket</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
            <X size={18} className="text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertCircle size={16} className="text-rose-400" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of your issue..."
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Priority</label>
            <div className="flex gap-2">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    priority === opt.value ? `${opt.color} text-white` : 'bg-input text-secondary hover:bg-tertiary border border-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Assign To</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all appearance-none"
                >
                  <option value="">Unassigned</option>
                  {users.filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-cyan-600 shadow-theme-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
