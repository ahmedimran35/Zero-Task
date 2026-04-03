import { useReducer, useEffect, useState } from 'react';
import { AppContext } from './context/AppContext';
import { appReducer, getInitialState } from './context/reducer';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import { api, getToken } from './utils/api';
import { connectWS, disconnectWS, onWSMessage, getWSStatus } from './utils/ws';
import type { WSEvent } from './utils/ws';
import Layout from './components/layout/Layout';
import ToastContainer from './components/ui/Toast';
import LoginPage from './components/auth/LoginPage';

function AuthenticatedApp() {
  const { currentUser, isAuthenticated, viewAsUser } = useAuth();
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Load data from API when user changes
  useEffect(() => {
    if (!currentUser) return;
    const effectiveUserId = viewAsUser?.id || currentUser.id;

    const loadData = async () => {
      try {
        const [tasks, categories, templates, notifications, savedViews, sprints] = await Promise.all([
          api.getTasks(viewAsUser ? effectiveUserId : undefined),
          api.getCategories(),
          api.getTemplates(),
          api.getNotifications(),
          api.getSavedViews().catch(() => []),
          api.getSprints().catch(() => []),
        ]);
        dispatch({
          type: 'LOAD_STATE',
          payload: { tasks, categories, templates, notifications, savedViews, sprints },
        });
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, [currentUser?.id, viewAsUser?.id]);

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectWS();
      setWsStatus('disconnected');
      return;
    }

    const token = getToken();
    if (token) {
      connectWS(token);
      const interval = setInterval(() => setWsStatus(getWSStatus()), 2000);
      return () => { clearInterval(interval); disconnectWS(); };
    }
  }, [isAuthenticated]);

  // Handle incoming WebSocket events
  useEffect(() => {
    const unsub = onWSMessage((event: WSEvent) => {
      switch (event.type) {
        case 'TASK_CREATED':
          dispatch({ type: 'ADD_TASK_SILENT', payload: event.payload as any });
          break;
        case 'TASK_UPDATED':
          dispatch({ type: 'UPDATE_TASK_SILENT', payload: event.payload as any });
          break;
        case 'TASK_DELETED':
          dispatch({ type: 'DELETE_TASK_SILENT', payload: (event.payload as any).id });
          break;
      }
    });
    return unsub;
  }, []);

  // Dark mode
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't trigger shortcuts when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      // Don't trigger if any modifier besides Ctrl/Meta is held
      if (e.altKey) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'SHOW_QUICK_ADD', payload: true });
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        dispatch({ type: 'SET_EDITING_TASK', payload: null });
        dispatch({ type: 'SHOW_TASK_MODAL', payload: true });
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT_TASK', payload: null });
        dispatch({ type: 'SHOW_TASK_MODAL', payload: false });
        dispatch({ type: 'SHOW_QUICK_ADD', payload: false });
        dispatch({ type: 'SHOW_CATEGORY_MANAGER', payload: false });
        dispatch({ type: 'SHOW_EXPORT_IMPORT', payload: false });
      }
      if (e.key === 'd' && !e.ctrlKey) dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
      if (e.key === 'b' && !e.ctrlKey) dispatch({ type: 'SET_VIEW', payload: 'kanban' });
      if (e.key === 'l' && !e.ctrlKey) dispatch({ type: 'SET_VIEW', payload: 'list' });
      if (e.key === 'c' && !e.ctrlKey) dispatch({ type: 'SET_VIEW', payload: 'calendar' });
      if ((e.key === 'k' || e.key === 'K') && !e.ctrlKey) dispatch({ type: 'SET_VIEW', payload: 'portfolio' });
      if ((e.key === 'x' || e.key === 'X') && !e.ctrlKey) dispatch({ type: 'SET_VIEW', payload: 'docs' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppContext.Provider value={{ state, dispatch, wsStatus }}>
      <Layout />
      <ToastContainer />
    </AppContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
