import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { useTimer, formatElapsed } from '../../hooks/useTimer';
import {
  LayoutDashboard, Columns3, List, Calendar, ChevronLeft, ChevronRight,
  FolderKanban, Plus, CheckCircle2, Clock, AlertTriangle, Settings,
  Shield, LogOut, Eye, LifeBuoy, Square, BarChart3, Target, Users, Zap, FolderOpen, Link2, FileText,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, key: 'D' },
  { id: 'kanban' as const, label: 'Kanban Board', icon: Columns3, key: 'B' },
  { id: 'list' as const, label: 'Task List', icon: List, key: 'L' },
  { id: 'calendar' as const, label: 'Calendar', icon: Calendar, key: 'C' },
  { id: 'gantt' as const, label: 'Gantt', icon: BarChart3, key: 'G' },
  { id: 'goals' as const, label: 'Goals', icon: Target, key: 'O' },
  { id: 'sprints' as const, label: 'Sprints', icon: Zap, key: 'P' },
  { id: 'projects' as const, label: 'Projects', icon: FolderOpen, key: 'J' },
  { id: 'workload' as const, label: 'Workload', icon: Users, key: 'W' },
  { id: 'automations' as const, label: 'Automations', icon: Zap, key: 'A' },
  { id: 'integrations' as const, label: 'Integrations', icon: Link2, key: 'I' },
  { id: 'forms' as const, label: 'Forms', icon: FileText, key: 'F' },
  { id: 'tickets' as const, label: 'Support', icon: LifeBuoy, key: 'H' },
];

export default function Sidebar() {
  const { state, dispatch } = useAppContext();
  const { currentUser, logout, viewAsUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [unreadTickets, setUnreadTickets] = useState(0);
  const { elapsed, stopTimer, activeTimer } = useTimer();

  // Compute unread from notifications in state + poll API
  useEffect(() => {
    const ticketNotifs = state.notifications.filter(n => n.type === 'ticket_message' && !n.read).length;
    setUnreadTickets(ticketNotifs);
  }, [state.notifications]);

  // Poll for new ticket notifications every 30s
  useEffect(() => {
    const loadUnread = () => {
      api.getUnreadTicketCount().then(r => setUnreadTickets(r.count)).catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const taskStats = {
    total: state.tasks.length,
    completed: state.tasks.filter(t => t.status === 'done').length,
    inProgress: state.tasks.filter(t => t.status === 'in-progress').length,
    overdue: state.tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: state.sidebarOpen ? 280 : 72 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-sidebar h-screen flex flex-col fixed left-0 top-0 z-40 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
          <FolderKanban size={20} className="text-white" />
        </div>
        {state.sidebarOpen && (
          <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-white font-bold text-lg whitespace-nowrap">
            TaskFlow
          </motion.span>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {state.sidebarOpen && (
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-3 mb-2">Navigation</p>
        )}
        {navItems.map(item => {
          const isActive = state.currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SET_VIEW', payload: item.id })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {state.sidebarOpen && (
                <>
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  {item.id === 'tickets' && unreadTickets > 0 ? (
                    <span className="ml-auto w-5 h-5 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                      {unreadTickets > 9 ? '9+' : unreadTickets}
                    </span>
                  ) : (
                    <kbd className="ml-auto text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded">{item.key}</kbd>
                  )}
                </>
              )}
              {isActive && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-400 rounded-r-full" />
              )}
            </button>
          );
        })}

        {/* Admin Panel Nav Item */}
        {isAdmin && (
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'admin' })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
              state.currentView === 'admin' ? 'bg-violet-500/20 text-violet-300' : 'text-white/60 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Shield size={20} className="flex-shrink-0" />
            {state.sidebarOpen && (
              <>
                <span className="text-sm font-medium whitespace-nowrap">Admin Panel</span>
                <span className="ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">Admin</span>
              </>
            )}
            {state.currentView === 'admin' && (
              <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-400 rounded-r-full" />
            )}
          </button>
        )}


        {/* Settings Nav Item */}
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'settings' })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
            state.currentView === 'settings' ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'
          }`}
        >
          <Settings size={20} className="flex-shrink-0" />
          {state.sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
          {state.currentView === 'settings' && (
            <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-400 rounded-r-full" />
          )}
        </button>
        {/* Categories */}
        {state.sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-3 mt-6 mb-2">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Categories</p>
              <button
                onClick={() => dispatch({ type: 'SHOW_CATEGORY_MANAGER', payload: true })}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Settings size={12} className="text-white/40" />
              </button>
            </div>
            {state.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => dispatch({ type: 'SET_FILTER_CATEGORY', payload: state.filterCategory === cat.name ? 'all' : cat.name })}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                  state.filterCategory === cat.name ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm whitespace-nowrap">{cat.name}</span>
                <span className="ml-auto text-xs text-white/40">
                  {state.tasks.filter(t => t.category === cat.name).length}
                </span>
              </button>
            ))}
            {state.filterCategory !== 'all' && (
              <button
                onClick={() => dispatch({ type: 'SET_FILTER_CATEGORY', payload: 'all' })}
                className="w-full text-left px-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Clear filter
              </button>
            )}
          </>
        )}
      </nav>

      {/* Stats */}
      {state.sidebarOpen && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1"><CheckCircle2 size={13} /><span className="text-[10px] font-medium uppercase">Done</span></div>
              <p className="text-white font-bold text-lg">{taskStats.completed}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-primary-400 mb-1"><Clock size={13} /><span className="text-[10px] font-medium uppercase">Active</span></div>
              <p className="text-white font-bold text-lg">{taskStats.inProgress}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1"><AlertTriangle size={13} /><span className="text-[10px] font-medium uppercase">Overdue</span></div>
              <p className="text-white font-bold text-lg">{taskStats.overdue}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-violet-400 mb-1"><Plus size={13} /><span className="text-[10px] font-medium uppercase">Total</span></div>
              <p className="text-white font-bold text-lg">{taskStats.total}</p>
            </div>
          </div>
        </div>
      )}

      {/* Running Timer */}
      {state.sidebarOpen && activeTimer && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl p-3 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Timer Running</span>
              </div>
              <button
                onClick={stopTimer}
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
              >
                <Square size={12} />
              </button>
            </div>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">{formatElapsed(elapsed)}</p>
            <p className="text-xs text-white/50 truncate mt-1">{activeTimer.taskTitle}</p>
          </div>
        </div>
      )}

      {/* User Info + Logout */}
      {state.sidebarOpen && currentUser && (
        <div className="px-4 py-3 border-t border-white/10">
          {viewAsUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-primary-500/10 text-primary-400">
              <Eye size={12} />
              <span className="text-[10px] font-medium">Viewing as {viewAsUser.name}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              isAdmin ? 'bg-violet-500 text-white' : 'bg-primary-500 text-white'
            }`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-white/40 truncate">{currentUser.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="absolute top-[18px] -right-3 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-theme-md hover:bg-primary-500 transition-colors z-50"
      >
        {state.sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </motion.aside>
  );
}
