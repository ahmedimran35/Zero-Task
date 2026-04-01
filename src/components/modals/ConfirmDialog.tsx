import { motion } from 'framer-motion';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: { icon: 'text-rose-500', bg: 'bg-rose-500/10', button: 'bg-rose-500 hover:bg-rose-600' },
  warning: { icon: 'text-amber-500', bg: 'bg-amber-500/10', button: 'bg-amber-500 hover:bg-amber-600' },
  info: { icon: 'text-primary-500', bg: 'bg-primary-500/10', button: 'bg-primary-500 hover:bg-primary-600' },
};

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }: ConfirmDialogProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-md overflow-hidden shadow-theme-xl border border-primary"
      >
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-6 h-6 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-primary text-center mb-2">{title}</h3>
          <p className="text-sm text-secondary text-center">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-theme-md transition-colors ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
