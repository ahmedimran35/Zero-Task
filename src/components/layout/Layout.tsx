import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../dashboard/Dashboard';
import KanbanBoard from '../kanban/KanbanBoard';
import TaskList from '../list/TaskList';
import CalendarView from '../calendar/CalendarView';
import AdminPanel from '../admin/AdminPanel';
import TicketList from '../tickets/TicketList';
import GanttView from '../gantt/GanttView';
import GoalsView from '../goals/GoalsView';
import WorkloadView from '../workload/WorkloadView';
import SprintView from '../sprints/SprintView';
import AutomationsView from '../automations/AutomationsView';
import ProjectsView from '../projects/ProjectsView';
import IntegrationsView from '../integrations/IntegrationsView';
import SettingsView from '../settings/SettingsView';
import FormsView from '../forms/FormsView';
import TaskModal from '../modals/TaskModal';
import TaskDetailPanel from '../detail/TaskDetailPanel';
import QuickAdd from '../modals/QuickAdd';
import CategoryManager from '../modals/CategoryManager';
import ExportImport from '../modals/ExportImport';
import ConfirmDialog from '../modals/ConfirmDialog';

const views: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  kanban: KanbanBoard,
  list: TaskList,
  calendar: CalendarView,
  admin: AdminPanel,
  tickets: TicketList,
  gantt: GanttView,
  goals: GoalsView,
  workload: WorkloadView,
  sprints: SprintView,
  automations: AutomationsView,
  projects: ProjectsView,
  integrations: IntegrationsView,
  settings: SettingsView,
  forms: FormsView,
};

export default function Layout() {
  const { state } = useAppContext();
  const CurrentView = views[state.currentView] || Dashboard;
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning';
  } | null>(null);

  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      <motion.div
        initial={false}
        animate={{ marginLeft: state.sidebarOpen ? 280 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col min-h-screen"
      >
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentView />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      <AnimatePresence>
        {state.showTaskModal && <TaskModal />}
        {state.selectedTask && <TaskDetailPanel />}
        {state.showQuickAdd && <QuickAdd />}
        {state.showCategoryManager && <CategoryManager />}
        {state.showExportImport && <ExportImport />}
        {confirmConfig && (
          <ConfirmDialog
            title={confirmConfig.title}
            message={confirmConfig.message}
            variant={confirmConfig.variant}
            onConfirm={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }}
            onCancel={() => setConfirmConfig(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
