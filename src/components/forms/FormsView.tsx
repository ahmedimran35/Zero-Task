import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import {
  FileText, Plus, Trash2, Copy, ExternalLink, X, GripVertical,
  Type, AlignLeft, Calendar, Mail, Hash, List, CheckSquare,
} from 'lucide-react';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
}

interface Form {
  id: string;
  name: string;
  fields: FormField[];
  settings: Record<string, unknown>;
  createdAt: string;
}

const fieldTypes = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
];

export default function FormsView() {
  const { dispatch } = useAppContext();
  const [forms, setForms] = useState<Form[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getForms()
      .then((f: Form[]) => { if (Array.isArray(f)) setForms(f); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateForm = () => {
    setEditingForm({
      id: '',
      name: '',
      fields: [{ id: crypto.randomUUID(), type: 'text', label: 'Task Title', required: true }],
      settings: { defaultPriority: 'medium', defaultCategory: 'Work', successMessage: 'Thank you!' },
      createdAt: '',
    });
    setShowBuilder(true);
  };

  const handleAddField = (type: string) => {
    if (!editingForm) return;
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: 'New ' + type + ' field',
      required: false,
    };
    setEditingForm({ ...editingForm, fields: [...editingForm.fields, newField] });
  };

  const handleRemoveField = (fieldId: string) => {
    if (!editingForm) return;
    setEditingForm({ ...editingForm, fields: editingForm.fields.filter(f => f.id !== fieldId) });
  };

  const handleSaveForm = async () => {
    if (!editingForm || !editingForm.name.trim()) {
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Form name is required', type: 'error' } });
      return;
    }
    try {
      const result = await api.createForm({
        name: editingForm.name,
        fields: editingForm.fields,
        settings: editingForm.settings,
      });
      if (result) setForms(prev => [result, ...prev]);
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Form created!', type: 'success' } });
    } catch (err: any) {
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: err?.message || 'Failed to create form', type: 'error' } });
    }
    setShowBuilder(false);
    setEditingForm(null);
  };

  const handleDeleteForm = async (id: string) => {
    try { 
      await api.deleteForm(id); 
      setForms(prev => prev.filter(f => f.id !== id));
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Form deleted', type: 'success' } });
    } catch (err: any) {
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Failed to delete form', type: 'error' } });
    }
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(window.location.origin + '/forms/' + id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            Forms
          </h1>
          <p className="text-sm text-tertiary mt-1">Create public intake forms that auto-create tasks</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium text-sm shadow-theme-md hover:shadow-theme-lg transition-all">
          <Plus size={16} /> Create Form
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-card rounded-2xl border border-primary p-12 text-center">
          <FileText size={48} className="text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No forms yet</h3>
          <p className="text-sm text-tertiary mb-4">Create your first intake form to collect task submissions</p>
          <button onClick={handleCreateForm}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors">
            Create First Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <motion.div key={form.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-primary p-5 shadow-theme-sm hover:shadow-theme-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-primary">{form.name}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleCopyLink(form.id)} className="p-1.5 rounded-lg hover:bg-tertiary transition-colors" title="Copy link">
                    {copiedId === form.id
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12" /></svg>
                      : <Copy size={14} className="text-tertiary" />}
                  </button>
                  <a href={'/forms/' + form.id} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-tertiary transition-colors" title="Open">
                    <ExternalLink size={14} className="text-tertiary" />
                  </a>
                  <button onClick={() => handleDeleteForm(form.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors" title="Delete">
                    <Trash2 size={14} className="text-rose-500" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-tertiary mb-3">{form.fields.length} fields</p>
              <div className="flex flex-wrap gap-1.5">
                {form.fields.slice(0, 4).map(f => (
                  <span key={f.id} className="text-[10px] px-2 py-0.5 rounded-full bg-tertiary text-secondary">{f.label}</span>
                ))}
                {form.fields.length > 4 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-tertiary text-secondary">+{form.fields.length - 4} more</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showBuilder && editingForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
            onClick={() => setShowBuilder(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-modal rounded-2xl w-full max-w-2xl shadow-theme-xl border border-primary">
              <div className="sticky top-0 bg-modal border-b border-primary px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <h2 className="text-lg font-bold text-primary">Create Form</h2>
                <button onClick={() => setShowBuilder(false)} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
                  <X size={18} className="text-secondary" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">Form Name</label>
                  <input type="text" value={editingForm.name} onChange={e => setEditingForm({ ...editingForm, name: e.target.value })}
                    placeholder="e.g., Bug Report Form"
                    className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">Form Fields</label>
                  <div className="space-y-2">
                    {editingForm.fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-3 p-3 bg-tertiary rounded-xl">
                        <GripVertical size={16} className="text-tertiary flex-shrink-0" />
                        <input type="text" value={field.label}
                          onChange={e => {
                            const updated = [...editingForm.fields];
                            updated[idx] = { ...field, label: e.target.value };
                            setEditingForm({ ...editingForm, fields: updated });
                          }}
                          className="flex-1 px-3 py-1.5 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none focus:ring-1 focus:ring-primary-500/30" />
                        <span className="text-xs text-tertiary bg-input px-2 py-1 rounded">{field.type}</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={field.required}
                            onChange={e => {
                              const updated = [...editingForm.fields];
                              updated[idx] = { ...field, required: e.target.checked };
                              setEditingForm({ ...editingForm, fields: updated });
                            }} className="w-3.5 h-3.5 rounded" />
                          <span className="text-[10px] text-tertiary">Req</span>
                        </label>
                        <button onClick={() => handleRemoveField(field.id)} className="p-1 rounded hover:bg-rose-500/10 transition-colors">
                          <Trash2 size={14} className="text-rose-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {fieldTypes.map(ft => (
                      <button key={ft.type} onClick={() => handleAddField(ft.type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary text-xs text-secondary hover:bg-primary-500/10 hover:text-primary-500 transition-colors">
                        <ft.icon size={12} /> {ft.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">Task Settings</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-tertiary mb-1">Default Priority</label>
                      <select value={(editingForm.settings.defaultPriority as string) || 'medium'}
                        onChange={e => setEditingForm({ ...editingForm, settings: { ...editingForm.settings, defaultPriority: e.target.value } })}
                        className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none focus:ring-1 focus:ring-primary-500/30">
                        <option value="low">Low</option><option value="medium">Medium</option>
                        <option value="high">High</option><option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-tertiary mb-1">Default Category</label>
                      <select value={(editingForm.settings.defaultCategory as string) || 'Work'}
                        onChange={e => setEditingForm({ ...editingForm, settings: { ...editingForm.settings, defaultCategory: e.target.value } })}
                        className="w-full px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none focus:ring-1 focus:ring-primary-500/30">
                        <option value="Work">Work</option><option value="Personal">Personal</option>
                        <option value="Health">Health</option><option value="Learning">Learning</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-modal border-t border-primary px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setShowBuilder(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors">Cancel</button>
                <button onClick={handleSaveForm} disabled={!editingForm.name.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all">Create Form</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
