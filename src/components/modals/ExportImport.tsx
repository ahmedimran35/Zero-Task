import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import type { Task } from '../../types';
import { X, Download, Upload, FileJson, AlertTriangle } from 'lucide-react';

export default function ExportImport() {
  const { state, dispatch } = useAppContext();
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!state.showExportImport) return null;

  const handleClose = () => dispatch({ type: 'SHOW_EXPORT_IMPORT', payload: false });

  const handleExport = () => {
    const data = {
      tasks: state.tasks,
      categories: state.categories,
      templates: state.templates,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: 'ADD_TOAST', payload: { id: uuidv4(), message: 'Tasks exported successfully', type: 'success' } });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.tasks || !Array.isArray(data.tasks)) {
          setError('Invalid file format: missing tasks array');
          return;
        }

        const importedTasks: Task[] = data.tasks.map((t: Task) => ({
          ...t,
          id: t.id || uuidv4(),
          activityLog: t.activityLog || [],
          comments: t.comments || [],
          timeLogs: t.timeLogs || [],
          dependsOn: t.dependsOn || [],
          recurring: t.recurring || null,
          assignee: t.assignee || null,
          completedAt: t.completedAt || null,
        }));

        if (importMode === 'replace') {
          dispatch({ type: 'IMPORT_TASKS', payload: importedTasks });
        } else {
          dispatch({ type: 'IMPORT_TASKS', payload: importedTasks });
        }

        if (data.categories && Array.isArray(data.categories)) {
          data.categories.forEach((cat: { id: string; name: string; color: string }) => {
            if (!state.categories.find(c => c.id === cat.id)) {
              dispatch({ type: 'ADD_CATEGORY', payload: { ...cat, icon: 'folder', taskCount: 0 } });
            }
          });
        }

        dispatch({ type: 'ADD_TOAST', payload: { id: uuidv4(), message: `Imported ${importedTasks.length} tasks`, type: 'success' } });
        setError('');
        handleClose();
      } catch {
        setError('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-md overflow-hidden shadow-theme-xl border border-primary"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary">
          <h2 className="text-lg font-bold text-primary">Export / Import</h2>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
            <X size={18} className="text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Download size={20} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-primary text-sm">Export Data</h3>
                <p className="text-xs text-tertiary">Download all tasks as JSON</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <Download size={14} className="inline mr-2" />
              Export ({state.tasks.length} tasks)
            </button>
          </div>

          {/* Import */}
          <div className="border-t border-primary pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Upload size={20} className="text-primary-500" />
              </div>
              <div>
                <h3 className="font-semibold text-primary text-sm">Import Data</h3>
                <p className="text-xs text-tertiary">Load tasks from JSON file</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setImportMode('merge')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  importMode === 'merge' ? 'bg-primary-500 text-white' : 'bg-tertiary text-secondary'
                }`}
              >
                Merge
              </button>
              <button
                onClick={() => setImportMode('replace')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  importMode === 'replace' ? 'bg-amber-500 text-white' : 'bg-tertiary text-secondary'
                }`}
              >
                Add All
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <FileJson size={14} className="inline mr-2" />
              Choose JSON File
            </button>

            {error && (
              <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-rose-500/10 text-rose-500 text-xs">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
