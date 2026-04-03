import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import type { Project } from '../../types';
import {
  FolderOpen, BarChart3, CheckCircle2, Clock, AlertCircle, LayoutGrid, Plus
} from 'lucide-react';

export default function PortfolioView() {
  const { state, dispatch } = useAppContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const totalStats = {
    total: projects.reduce((sum, p) => sum + p.taskCount, 0),
    projects: projects.length,
  };

  const healthScore = totalStats.total > 0 
    ? Math.round(projects.reduce((sum, p) => {
        const completed = state.tasks.filter(t => t.projectId === p.id && t.status === 'done').length;
        return sum + (completed / Math.max(p.taskCount, 1)) * 100;
      }, 0) / projects.length)
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
          <p className="text-sm text-tertiary">Track progress across all your projects</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'projects' })}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl text-sm font-medium shadow-theme-md hover:shadow-theme-lg transition-all"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-tertiary">
          <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <FolderOpen size={40} className="text-primary-500" />
          </div>
          <p className="text-xl font-semibold text-primary mb-2">No projects yet</p>
          <p className="text-sm mb-6 text-center max-w-md">
            Projects group your tasks together. Create your first project to start organizing work.
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'projects' })}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl font-medium shadow-theme-md hover:shadow-theme-lg transition-all"
          >
            <Plus size={18} />
            Create First Project
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl p-5 border border-primary">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                  <LayoutGrid size={20} className="text-primary-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{projects.length}</p>
                  <p className="text-xs text-tertiary">Active Projects</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 border border-primary">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <BarChart3 size={20} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{totalStats.total}</p>
                  <p className="text-xs text-tertiary">Total Tasks</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 border border-primary">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {projects.reduce((sum, p) => {
                      const completed = state.tasks.filter(t => t.projectId === p.id && t.status === 'done').length;
                      return sum + completed;
                    }, 0)}
                  </p>
                  <p className="text-xs text-tertiary">Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 border border-primary">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  healthScore >= 70 ? 'bg-emerald-500/15' : healthScore >= 40 ? 'bg-amber-500/15' : 'bg-rose-500/15'
                }`}>
                  <AlertCircle size={20} className={
                    healthScore >= 70 ? 'text-emerald-500' : healthScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                  } />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${
                    healthScore >= 70 ? 'text-emerald-500' : healthScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {healthScore}%
                  </p>
                  <p className="text-xs text-tertiary">Health Score</p>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          <div>
            <h2 className="text-lg font-semibold text-primary mb-4">All Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => {
                const projectTasks = state.tasks.filter(t => t.projectId === project.id);
                const completed = projectTasks.filter(t => t.status === 'done').length;
                const inProgress = projectTasks.filter(t => t.status === 'in-progress').length;
                const overdue = projectTasks.filter(t => {
                  if (!t.dueDate) return false;
                  return t.status !== 'done' && new Date(t.dueDate) < new Date();
                }).length;
                const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
                
                return (
                  <div key={project.id} className="bg-card rounded-2xl p-5 border border-primary hover:border-primary-500 transition-colors">
                    <div className="flex items-start gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: project.color || '#3b82f6' }}
                      >
                        <FolderOpen size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-primary truncate">{project.name}</h3>
                        <p className="text-xs text-tertiary">{project.taskCount} tasks</p>
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-sm text-secondary mb-4 line-clamp-2">{project.description}</p>
                    )}

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-tertiary">Progress</span>
                        <span className="text-primary font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-tertiary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 size={12} />
                        {completed}
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Clock size={12} />
                        {inProgress}
                      </div>
                      {overdue > 0 && (
                        <div className="flex items-center gap-1 text-rose-500">
                          <AlertCircle size={12} />
                          {overdue} overdue
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}