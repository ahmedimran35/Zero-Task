import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Sun, Moon, Plus, Filter, Download, Keyboard, LogOut,
} from 'lucide-react';
import Notifications from '../ui/Notifications';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  kanban: 'Kanban Board',
  list: 'Task List',
  calendar: 'Calendar',
  admin: 'Admin Panel',
  tickets: 'Support Tickets',
  gantt: 'Gantt Timeline',
  goals: 'Goals & OKRs',
  workload: 'Team Workload',
  sprints: 'Sprints',
  automations: 'Automations',
  projects: 'Projects',
  integrations: 'Integrations',
};

export default function Header() {
  const { state, dispatch } = useAppContext();
  const { currentUser, logout, viewAsUser } = useAuth();
  const [showFilter, setShowFilter] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="h-16 bg-card border-b border-primary flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-primary">
          {viewTitles[state.currentView] || state.currentView}
          {viewAsUser && <span className="text-sm font-normal text-tertiary ml-2">({viewAsUser.name})</span>}
        </h1>
        {isAdmin && state.currentView !== 'admin' && (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-500">Admin</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            placeholder="Search tasks... (Ctrl+K)"
            value={state.searchQuery}
            onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
            className="w-64 pl-9 pr-4 py-2 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilter ? 'bg-primary-500 border-primary-500 text-white' : 'bg-input border-primary hover:bg-tertiary'}`}
          >
            <Filter size={16} className={showFilter ? 'text-white' : 'text-secondary'} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl border border-primary shadow-theme-lg p-3 z-50">
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Priority</p>
              <div className="space-y-1 mb-3">
                {(['all', 'urgent', 'high', 'medium', 'low'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { dispatch({ type: 'SET_FILTER_PRIORITY', payload: p }); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      state.filterPriority === p ? 'bg-primary-500 text-white' : 'text-secondary hover:bg-tertiary'
                    }`}
                  >
                    {p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Status</p>
              <div className="space-y-1">
                {(['all', 'todo', 'in-progress', 'review', 'done'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { dispatch({ type: 'SET_FILTER_STATUS', payload: s }); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      state.filterStatus === s ? 'bg-primary-500 text-white' : 'text-secondary hover:bg-tertiary'
                    }`}
                  >
                    {s === 'all' ? 'All Statuses' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export/Import */}
        <button
          onClick={() => dispatch({ type: 'SHOW_EXPORT_IMPORT', payload: true })}
          className="p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors"
        >
          <Download size={16} className="text-secondary" />
        </button>

        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
          className="p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors"
        >
          {state.darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-secondary" />}
        </motion.button>

        {/* Notifications */}
        <Notifications />

        {/* Keyboard shortcuts */}
        <button
          onClick={() => {
            dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Shortcuts: N=new, Ctrl+K=quick add, D=dashboard, B=board, L=list, C=calendar', type: 'info' } });
          }}
          className="p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors"
        >
          <Keyboard size={16} className="text-secondary" />
        </button>

        {/* Add Task */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            dispatch({ type: 'SET_EDITING_TASK', payload: null });
            dispatch({ type: 'SHOW_TASK_MODAL', payload: true });
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl font-medium text-sm shadow-theme-md hover:shadow-theme-lg transition-all"
        >
          <Plus size={16} />
          Add Task
        </motion.button>

        {/* User avatar + logout */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-3 border-l border-primary">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isAdmin ? 'bg-violet-500 text-white' : 'bg-primary-500 text-white'
            }`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-tertiary transition-colors"
              title="Logout"
            >
              <LogOut size={16} className="text-secondary" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
