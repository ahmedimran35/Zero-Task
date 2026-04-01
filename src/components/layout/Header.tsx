import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { SavedView } from '../../types';
import {
  Search, Sun, Moon, Plus, Filter, Download, Keyboard, LogOut,
  Bookmark, Trash2, X, Menu,
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
  settings: 'Settings',
  forms: 'Forms',
};

export default function Header() {
  const { state, dispatch, wsStatus } = useAppContext();
  const { currentUser, logout, viewAsUser } = useAuth();
  const isMobile = useIsMobile();
  const [showFilter, setShowFilter] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  const handleSaveView = () => {
    if (!saveViewName.trim()) return;
    const view: SavedView = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      name: saveViewName.trim(),
      viewType: state.currentView,
      filters: {
        search: state.searchQuery,
        priority: state.filterPriority,
        category: state.filterCategory,
        status: state.filterStatus,
        assignee: state.filterAssignee,
        view: state.currentView,
      },
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SAVED_VIEW', payload: view });
    setSaveViewName('');
    setShowSaveInput(false);
  };

  const applySavedView = (view: SavedView) => {
    const f = view.filters;
    if (f.search !== undefined) dispatch({ type: 'SET_SEARCH', payload: f.search });
    if (f.priority) dispatch({ type: 'SET_FILTER_PRIORITY', payload: f.priority as typeof state.filterPriority });
    if (f.status) dispatch({ type: 'SET_FILTER_STATUS', payload: f.status as typeof state.filterStatus });
    if (f.category) dispatch({ type: 'SET_FILTER_CATEGORY', payload: f.category });
    if (f.assignee) dispatch({ type: 'SET_FILTER_ASSIGNEE', payload: f.assignee });
    if (f.view) dispatch({ type: 'SET_VIEW', payload: f.view as typeof state.currentView });
    setShowFilter(false);
  };

  return (
    <header className={`h-16 bg-card border-b border-primary flex items-center justify-between sticky top-0 z-30 ${isMobile ? 'px-3' : 'px-6'}`}>
      <div className="flex items-center gap-2">
        {isMobile && (
          <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
            <Menu size={20} className="text-secondary" />
          </button>
        )}
        <h1 className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-primary truncate`}>
          {viewTitles[state.currentView] || state.currentView}
          {viewAsUser && <span className="text-xs font-normal text-tertiary ml-1">({viewAsUser.name})</span>}
        </h1>
        {isAdmin && state.currentView !== 'admin' && (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-500">Admin</span>
        )}
      </div>

      <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-3'}`}>
        {/* Search - hidden on mobile */}
        {!isMobile && (
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
        )}

        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilter ? 'bg-primary-500 border-primary-500 text-white' : 'bg-input border-primary hover:bg-tertiary'}`}
          >
            <Filter size={16} className={showFilter ? 'text-white' : 'text-secondary'} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border border-primary shadow-theme-lg p-3 z-50">
              {/* Saved Views */}
              {state.savedViews.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Saved Views</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    {state.savedViews.map(sv => (
                      <div key={sv.id} className="flex items-center group">
                        <button
                          onClick={() => applySavedView(sv)}
                          className="flex-1 flex items-center gap-2 text-left px-3 py-1.5 rounded-lg text-sm text-secondary hover:bg-tertiary transition-colors"
                        >
                          <Bookmark size={12} className="text-primary-500" />
                          {sv.name}
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_SAVED_VIEW', payload: sv.id })}
                          className="p-1 rounded hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} className="text-rose-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-primary my-2" />
                </>
              )}

              {/* Save current view */}
              {showSaveInput ? (
                <div className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={saveViewName}
                    onChange={e => setSaveViewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveView()}
                    placeholder="View name..."
                    autoFocus
                    className="flex-1 px-2 py-1 bg-input rounded-lg text-xs text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                  />
                  <button onClick={handleSaveView} disabled={!saveViewName.trim()}
                    className="px-2 py-1 bg-primary-500 text-white rounded-lg text-xs font-medium disabled:opacity-50">Save</button>
                  <button onClick={() => { setShowSaveInput(false); setSaveViewName(''); }}
                    className="p-1 rounded hover:bg-tertiary"><X size={14} className="text-tertiary" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-primary-500 hover:bg-primary-500/10 transition-colors mb-3"
                >
                  <Bookmark size={12} /> Save Current View
                </button>
              )}

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

        {/* Export/Import - hidden on mobile */}
        {!isMobile && (
          <button
            onClick={() => dispatch({ type: 'SHOW_EXPORT_IMPORT', payload: true })}
            className="p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors"
          >
            <Download size={16} className="text-secondary" />
          </button>
        )}

        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
          className={`p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors ${isMobile ? 'p-2' : ''}`}
        >
          {state.darkMode ? <Sun size={isMobile ? 14 : 16} className="text-amber-400" /> : <Moon size={isMobile ? 14 : 16} className="text-secondary" />}
        </motion.button>

        {/* Notifications */}
        <Notifications />

        {/* Keyboard shortcuts - hidden on mobile */}
        {!isMobile && (
          <button
            onClick={() => {
              dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Shortcuts: N=new, Ctrl+K=quick add, D=dashboard, B=board, L=list, C=calendar', type: 'info' } });
            }}
            className="p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors"
          >
            <Keyboard size={16} className="text-secondary" />
          </button>
        )}

        {/* Add Task */}
        <motion.button
          whileHover={{ scale: isMobile ? 1 : 1.02 }}
          whileTap={{ scale: isMobile ? 0.95 : 0.98 }}
          onClick={() => {
            dispatch({ type: 'SET_EDITING_TASK', payload: null });
            dispatch({ type: 'SHOW_TASK_MODAL', payload: true });
          }}
          className={`flex items-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl font-medium text-sm shadow-theme-md hover:shadow-theme-lg transition-all ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'}`}
        >
          <Plus size={16} />
          {!isMobile && 'Add Task'}
        </motion.button>

        {/* Connection status - hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center gap-1.5 px-2" title={wsStatus === 'connected' ? 'Real-time connected' : 'Disconnected'}>
            <div className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
            }`} />
            <span className="text-[10px] text-tertiary">
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? '...' : 'Offline'}
            </span>
          </div>
        )}

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
