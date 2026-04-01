import { useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import { X, Plus, Trash2, Edit3 } from 'lucide-react';

const colorOptions = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

export default function CategoryManager() {
  const { state, dispatch } = useAppContext();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!state.showCategoryManager) return null;

  const handleClose = () => dispatch({ type: 'SHOW_CATEGORY_MANAGER', payload: false });

  const addCategory = () => {
    if (!newName.trim()) return;
    dispatch({
      type: 'ADD_CATEGORY',
      payload: { id: uuidv4(), name: newName.trim(), color: newColor, icon: 'folder', taskCount: 0 },
    });
    setNewName('');
    setNewColor('#3b82f6');
  };

  const startEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    dispatch({
      type: 'UPDATE_CATEGORY',
      payload: { id: editingId, name: editName.trim(), color: editColor, icon: 'folder', taskCount: 0 },
    });
    setEditingId(null);
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
          <h2 className="text-lg font-bold text-primary">Manage Categories</h2>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-tertiary transition-colors">
            <X size={18} className="text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Existing categories */}
          {state.categories.map(cat => {
            const taskCount = state.tasks.filter(t => t.category === cat.name).length;
            return (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary group">
                {editingId === cat.id ? (
                  <>
                    <div className="flex gap-1">
                      {colorOptions.slice(0, 5).map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-5 h-5 rounded-full border-2 ${editColor === c ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="flex-1 px-2 py-1 bg-input rounded-lg text-sm text-primary border border-primary focus:outline-none"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="text-xs text-primary-500 font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-tertiary">Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm font-medium text-primary">{cat.name}</span>
                    <span className="text-xs text-tertiary">{taskCount} tasks</span>
                    <button
                      onClick={() => startEdit(cat.id, cat.name, cat.color)}
                      className="p-1.5 rounded-lg hover:bg-tertiary opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit3 size={14} className="text-tertiary" />
                    </button>
                    {confirmDelete === cat.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { dispatch({ type: 'DELETE_CATEGORY', payload: cat.id }); setConfirmDelete(null); }} className="text-[10px] text-rose-500 font-medium px-1.5 py-0.5 rounded bg-rose-500/10">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-tertiary px-1.5 py-0.5 rounded bg-tertiary">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(cat.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} className="text-rose-500" />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Add new */}
          <div className="pt-3 border-t border-primary">
            <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Add Category</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {colorOptions.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder="Category name..."
                className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
              <button onClick={addCategory} disabled={!newName.trim()} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
