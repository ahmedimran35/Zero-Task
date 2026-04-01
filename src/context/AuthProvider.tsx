import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { User, SessionUser } from '../types/auth';
import { api, setToken, getToken } from '../utils/api';

const SESSION_KEY = 'taskflow-current-user';

function loadSession(): SessionUser | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored && getToken()) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function saveSession(user: SessionUser | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => loadSession());
  const [viewAsUser, setViewAsUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      api.getUsers().then(u => setUsers(u)).catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    saveSession(currentUser);
  }, [currentUser]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const user = await api.login(email, password);
      const session: SessionUser = { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar };
      setCurrentUser(session);
      setViewAsUser(null);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setViewAsUser(null);
    setUsers([]);
  }, []);

  const createUser = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const newUser = await api.createUser({ email, password, name });
      setUsers(prev => [...prev, { ...newUser, password, createdAt: newUser.createdAt || new Date().toISOString() }]);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Create failed' };
    }
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<Pick<User, 'name' | 'email' | 'isActive'>>): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.updateUser(id, data);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
  }, []);

  const deleteUserFn = useCallback(async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { /* ignore */ }
  }, []);

  const resetPassword = useCallback(async (id: string, newPassword: string) => {
    try {
      await api.resetPassword(id, newPassword);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u));
    } catch { /* ignore */ }
  }, []);

  const toggleUserActive = useCallback(async (id: string) => {
    try {
      await api.toggleUserActive(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    } catch { /* ignore */ }
  }, []);

  const getUserTaskCount = useCallback(async (userId: string): Promise<number> => {
    try {
      const res = await api.getUserTaskCount(userId);
      return res.count || 0;
    } catch {
      return 0;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      isAuthenticated: !!currentUser,
      login,
      logout,
      createUser,
      updateUser,
      deleteUser: deleteUserFn,
      resetPassword,
      toggleUserActive,
      getUserTaskCount,
      viewAsUser,
      setViewAsUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
