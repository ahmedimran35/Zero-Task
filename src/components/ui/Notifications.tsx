import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { Bell, Clock, AlertTriangle, CheckCircle2, LifeBuoy } from 'lucide-react';
import { format } from 'date-fns';

const typeIcons = {
  due_soon: Clock,
  overdue: AlertTriangle,
  assigned: Bell,
  completed: CheckCircle2,
  info: Bell,
  ticket_message: LifeBuoy,
};

const typeColors = {
  due_soon: 'text-amber-500',
  overdue: 'text-rose-500',
  assigned: 'text-primary-500',
  completed: 'text-emerald-500',
  info: 'text-tertiary',
  ticket_message: 'text-cyan-500',
};

export default function Notifications() {
  const { state, dispatch } = useAppContext();
  const [open, setOpen] = useState(false);

  const unreadCount = state.notifications.filter(n => !n.read).length;

  const toggle = () => {
    setOpen(!open);
    if (!open) {
      state.notifications.filter(n => !n.read).forEach(n =>
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id })
      );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="p-2.5 rounded-xl bg-input border border-primary hover:bg-tertiary transition-colors relative"
      >
        <Bell size={16} className="text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border border-primary shadow-theme-lg overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary">
              <h3 className="font-semibold text-sm text-primary">Notifications</h3>
              {state.notifications.length > 0 && (
                <button
                  onClick={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
                  className="text-xs text-tertiary hover:text-rose-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {state.notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-tertiary opacity-40" />
                  <p className="text-sm text-tertiary">No notifications</p>
                </div>
              ) : (
                state.notifications.map(notif => {
                  const Icon = typeIcons[notif.type];
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.type === 'ticket_message') {
                          dispatch({ type: 'SET_VIEW', payload: 'tickets' });
                        } else if (notif.taskId) {
                          const task = state.tasks.find(t => t.id === notif.taskId);
                          if (task) dispatch({ type: 'SELECT_TASK', payload: task });
                        }
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 px-4 py-3 border-b border-primary hover:bg-tertiary transition-colors cursor-pointer"
                    >
                      <Icon size={16} className={`${typeColors[notif.type]} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary">{notif.title}</p>
                        <p className="text-xs text-tertiary truncate">{notif.message}</p>
                        <p className="text-[10px] text-tertiary mt-1">{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
