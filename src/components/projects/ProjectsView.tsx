import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';
import { useAppContext } from '../../context/AppContext';
import type { Project } from '../../types';
import { FolderKanban, Plus, Trash2, Edit3, Archive, X } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const colorOptions = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

export default function ProjectsView() {
  const { state } = useAppContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const loadProjects = async () => {
    try { setProjects(await api.getProjects()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadProjects(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject === id) setSelectedProject(null);
    } catch { /* ignore */ }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.updateProject(id, { archived: true });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <FolderKanban size={20} className="text-white" />
            </div>
            Projects
          </h1>
          <p className="text-sm text-tertiary mt-1">Organize tasks into projects</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl font-medium text-sm shadow-theme-md">
          <Plus size={16} /> New Project
        </motion.button>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Inbox (default) */}
        <div
          onClick={() => setSelectedProject(null)}
          className={`bg-card rounded-2xl p-5 border shadow-theme-sm cursor-pointer hover:shadow-theme-md transition-all ${
            selectedProject === null ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-primary'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <FolderKanban size={20} className="text-slate-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">Inbox</h3>
              <p className="text-xs text-tertiary">Unassigned tasks</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">{state.tasks.filter(t => !t.projectId).length}</span>
            <span className="text-xs text-tertiary">tasks</span>
          </div>
        </div>

        {/* Projects */}
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            className={`bg-card rounded-2xl p-5 border shadow-theme-sm cursor-pointer hover:shadow-theme-md transition-all group ${
              selectedProject === project.id ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-primary'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
                  <FolderKanban size={20} style={{ color: project.color }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-primary">{project.name}</h3>
                  <p className="text-xs text-tertiary truncate max-w-32">{project.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); setEditingProject(project); }} className="p-1.5 rounded-lg hover:bg-tertiary text-tertiary"><Edit3 size={14} /></button>
                <button onClick={e => { e.stopPropagation(); handleArchive(project.id); }} className="p-1.5 rounded-lg hover:bg-tertiary text-tertiary"><Archive size={14} /></button>
                <button onClick={e => { e.stopPropagation(); handleDelete(project.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">{project.taskCount}</span>
              <span className="text-xs text-tertiary">tasks</span>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full">
            <EmptyState icon={<FolderKanban size={40} className="text-tertiary" />} title="No projects yet" description="Create your first project to organize tasks" actionLabel="Create Project" onAction={() => setShowCreate(true)} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {(showCreate || editingProject) && (
          <ProjectModal project={editingProject} onClose={() => { setShowCreate(false); setEditingProject(null); loadProjects(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || '#3b82f6');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    try {
      if (project) {
        await api.updateProject(project.id, { name: name.trim(), description, color });
      } else {
        await api.createProject({ name: name.trim(), description, color });
      }
      onClose();
    } catch { setError('Failed to save project'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-md overflow-hidden shadow-theme-xl border border-primary">
        <div className="px-6 py-4 border-b border-primary flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">{project ? 'Edit Project' : 'Create Project'}</h2>
          <button onClick={onClose} className="text-tertiary hover:text-primary"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Project Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Website Redesign"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description..."
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none resize-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Color</label>
            <div className="flex gap-2">
              {colorOptions.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-500 shadow-theme-md">
              {project ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
