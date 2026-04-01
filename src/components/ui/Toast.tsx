import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Undo2, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
  error: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
  info: 'bg-primary-500/10 border-primary-500/20 text-primary-600',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
};

export default function ToastContainer() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    const timers = state.toasts.map(toast =>
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id }), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [state.toasts, dispatch]);

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {state.toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-theme-lg backdrop-blur-sm ${colors[toast.type]}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{toast.message}</span>
              {toast.undoAction && (
                <button
                  onClick={() => {
                    dispatch(toast.undoAction!);
                    dispatch({ type: 'REMOVE_TOAST', payload: toast.id });
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-xs font-medium hover:bg-white/30 transition-colors"
                >
                  <Undo2 size={12} />
                  Undo
                </button>
              )}
              <button
                onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
