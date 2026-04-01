import { useReducer, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import { appReducer, getInitialState } from './context/reducer';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import { api } from './utils/api';
import Layout from './components/layout/Layout';
import ToastContainer from './components/ui/Toast';
import LoginPage from './components/auth/LoginPage';

function AuthenticatedApp() {
  const { currentUser, isAuthenticated, viewAsUser } = useAuth();
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // Load data from API when user changes
  useEffect(() => {
    if (!currentUser) return;
    const effectiveUserId = viewAsUser?.id || currentUser.id;

    const loadData = async () => {
      try {
        const [tasks, categories, templates, notifications] = await Promise.all([
          api.getTasks(viewAsUser ? effectiveUserId : undefined),
          api.getCategories(),
          api.getTemplates(),
          api.getNotifications(),
        ]);
        dispatch({
          type: 'LOAD_STATE',
          payload: { tasks, categories, templates, notifications },
        });
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, [currentUser?.id, viewAsUser?.id]);

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
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
