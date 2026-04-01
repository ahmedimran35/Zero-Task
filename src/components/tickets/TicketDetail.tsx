import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import type { SupportTicket, TicketMessage, TicketStatus, Priority } from '../../types';
import { format } from 'date-fns';
import { ArrowLeft, Send, Shield } from 'lucide-react';

const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-primary-500' },
  'in-progress': { label: 'In Progress', color: 'bg-amber-500' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500' },
  closed: { label: 'Closed', color: 'bg-slate-400' },
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-500/15 text-rose-500', high: 'bg-amber-500/15 text-amber-500',
  medium: 'bg-primary-500/15 text-primary-500', low: 'bg-slate-500/15 text-slate-500',
};

export default function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { currentUser, users } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = currentUser?.role === 'admin';

  const loadTicket = async () => {
    try {
      const data = await api.getTicket(ticketId);
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadTicket(); }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !ticket || ticket.status === 'closed') return;
    setSending(true);
    try {
      const msg = await api.addTicketMessage(ticketId, newMessage.trim());
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    try {
      await api.updateTicket(ticketId, { status: newStatus });
      setTicket(prev => prev ? { ...prev, status: newStatus } : null);
    } catch { /* ignore */ }
  };

  const handlePriorityChange = async (newPriority: Priority) => {
    if (!ticket) return;
    try {
      await api.updateTicket(ticketId, { priority: newPriority });
      setTicket(prev => prev ? { ...prev, priority: newPriority } : null);
    } catch { /* ignore */ }
  };

  const handleAssignChange = async (userId: string) => {
    if (!ticket) return;
    try {
      await api.updateTicket(ticketId, { assignedTo: userId || null });
      const assignedUser = users.find(u => u.id === userId);
      setTicket(prev => prev ? { ...prev, assignedTo: userId || null, assignedName: assignedUser?.name || null } : null);
    } catch { /* ignore */ }
  };

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;
  if (!ticket) return <div className="text-center py-12 text-tertiary">Ticket not found</div>;

  const sc = statusConfig[ticket.status];
  const isClosed = ticket.status === 'closed';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
          <ArrowLeft size={18} className="text-secondary" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-primary">{ticket.subject}</h2>
          <p className="text-xs text-tertiary">Ticket #{ticket.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Messages */}
        <div className="bg-card rounded-2xl border border-primary overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 14rem)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => {
              const isOwn = msg.userId === currentUser?.id;
              const isAdminMsg = msg.userRole === 'admin';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {!isOwn && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isAdminMsg ? 'bg-violet-500 text-white' : 'bg-primary-500 text-white'
                        }`}>
                          {msg.userName.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-medium text-primary">{isOwn ? 'You' : msg.userName}</span>
                      {isAdminMsg && <Shield size={10} className="text-violet-500" />}
                      <span className="text-[10px] text-tertiary">{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <div className={`px-4 py-3 rounded-2xl text-sm ${
                      isOwn
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-tertiary text-primary rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {!isClosed ? (
            <div className="p-4 border-t border-primary">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-primary text-center text-sm text-tertiary">
              This ticket is closed. Reopen it to continue the conversation.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-primary p-4 shadow-theme-sm space-y-4">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Status</p>
              {isAdmin ? (
                <div className="flex flex-wrap gap-1.5">
                  {(['open', 'in-progress', 'resolved', 'closed'] as TicketStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ticket.status === s ? `${statusConfig[s].color} text-white` : 'bg-tertiary text-secondary hover:bg-primary-500/10'
                      }`}
                    >
                      {statusConfig[s].label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${sc.color}`} />
                  <span className="text-sm font-medium text-primary">{sc.label}</span>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Priority</p>
              {isAdmin ? (
                <div className="flex flex-wrap gap-1.5">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ticket.priority === p ? priorityColors[p] : 'bg-tertiary text-secondary'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2 pt-2 border-t border-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs text-tertiary">Created by</span>
                <span className="text-xs font-medium text-primary">{ticket.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tertiary">Assigned to</span>
                {isAdmin ? (
                  <select
                    value={ticket.assignedTo || ''}
                    onChange={e => handleAssignChange(e.target.value)}
                    className="text-xs bg-input rounded-lg px-2 py-1 border border-primary text-primary focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                  >
                    <option value="">Unassigned</option>
                    {users.filter(u => u.isActive).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-medium text-primary">{ticket.assignedName || 'Unassigned'}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tertiary">Created</span>
                <span className="text-xs text-secondary">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tertiary">Updated</span>
                <span className="text-xs text-secondary">{format(new Date(ticket.updatedAt), 'MMM d, h:mm a')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tertiary">Messages</span>
                <span className="text-xs font-medium text-primary">{messages.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
