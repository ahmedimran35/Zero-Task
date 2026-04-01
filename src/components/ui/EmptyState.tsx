import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-tertiary flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
      <p className="text-sm text-tertiary max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-theme-md hover:shadow-theme-lg transition-all"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
