import { createContext, useContext } from 'react';
import type { AppState, AppAction } from '../types';

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  wsStatus?: 'connected' | 'connecting' | 'disconnected';
} | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
