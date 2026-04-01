import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import type { SupportTicket, TicketStatus } from '../../types';
import { format } from 'date-fns';
import { LifeBuoy, Plus, Clock, AlertCircle, CheckCircle2, XCircle, Search, Filter, Trash2, MessageSquare } from 'lucide-react';
import CreateTicketModal from './CreateTicketModal';
import TicketDetail from './TicketDetail';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../modals/ConfirmDialog';

const statusConfig: Record<TicketStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-primary-500', icon: AlertCircle },
  'in-progress': { label: 'In Progress', color: 'bg-amber-500', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-emerald-500', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-slate-400', icon: XCircle },
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-500/15 text-rose-500',
  high: 'bg-amber-500/15 text-amber-500',
  medium: 'bg-primary-500/15 text-primary-500',
  low: 'bg-slate-500/15 text-slate-500',
};

export default function TicketList() {
  const { currentUser } = useAuth();
  const { state, dispatch } = useAppContext();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SupportTicket | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  const loadTickets = async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
    // Mark ticket_message notifications as read
    state.notifications
      .filter(n => n.type === 'ticket_message' && !n.read)
      .forEach(n => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id }));
  }, []);

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = !searchQuery || t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteTicket(confirmDelete.id);
      setTickets(prev => prev.filter(t => t.id !== confirmDelete.id));
    } catch { /* ignore */ }
    setConfirmDelete(null);
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await api.updateTicket(ticketId, { status: newStatus });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch { /* ignore */ }
  };

  if (selectedTicket) {
    return <TicketDetail ticketId={selectedTicket} onBack={() => { setSelectedTicket(null); loadTickets(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
              <LifeBuoy size={20} className="text-white" />
            </div>
            Support Tickets
          </h1>
          <p className="text-sm text-tertiary mt-1">
            {isAdmin ? 'Manage all support tickets' : 'Get help from our support team'}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl font-medium text-sm shadow-theme-md"
        >
          <Plus size={16} />
          New Ticket
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['open', 'in-progress', 'resolved', 'closed'] as TicketStatus[]).map(status => {
          const sc = statusConfig[status];
          const count = tickets.filter(t => t.status === status).length;
          return (
            <div key={status} className="bg-card rounded-xl p-4 border border-primary shadow-theme-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${sc.color}`} />
                <span className="text-xs text-tertiary">{sc.label}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilter ? 'bg-primary-500 border-primary-500 text-white' : 'bg-input border-primary hover:bg-tertiary'}`}
          >
            <Filter size={16} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-xl border border-primary shadow-theme-lg p-2 z-50">
              {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setShowFilter(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    statusFilter === s ? 'bg-primary-500 text-white' : 'text-secondary hover:bg-tertiary'
                  }`}
                >
                  {s === 'all' ? 'All Statuses' : statusConfig[s].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="text-center py-12 text-tertiary">Loading...</div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={40} className="text-tertiary" />}
          title="No tickets found"
          description={isAdmin ? 'No support tickets match your filters' : 'Create a support ticket to get help'}
          actionLabel="Create Ticket"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const sc = statusConfig[ticket.status];
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 border border-primary shadow-theme-sm hover:shadow-theme-md transition-all cursor-pointer group"
                onClick={() => setSelectedTicket(ticket.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${sc.color}`} />
                    <h3 className="text-sm font-semibold text-primary">{ticket.subject}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select
                          value={ticket.status}
                          onChange={e => { e.stopPropagation(); handleStatusChange(ticket.id, e.target.value as TicketStatus); }}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] px-2 py-1 rounded-lg bg-tertiary text-secondary border-0 cursor-pointer"
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(ticket); }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-tertiary line-clamp-1 mb-2">{ticket.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-tertiary">
                      {isAdmin ? `by ${ticket.userName}` : `#${ticket.id.slice(0, 8)}`}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-tertiary">
                      <MessageSquare size={12} />
                      {ticket.messageCount}
                    </div>
                  </div>
                  <span className="text-xs text-tertiary">{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateTicketModal onClose={() => { setShowCreate(false); loadTickets(); }} />}
        {confirmDelete && (
          <ConfirmDialog
            title="Delete Ticket"
            message={`Delete "${confirmDelete.subject}"? This cannot be undone.`}
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
