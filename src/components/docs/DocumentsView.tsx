import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../utils/api';
import type { Document } from '../../types';
import {
  FileText, Plus, Search, Trash2, X, Save, Link2, Clock
} from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentsView() {
  const { dispatch } = useAppContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateDocument = async () => {
    try {
      const newDoc = await api.createDocument({
        title: 'Untitled Document',
        content: '',
      });
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setEditingTitle(true);
      setEditTitle(newDoc.title);
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Document created', type: 'success' } });
    } catch (err) {
      console.error('Failed to create document:', err);
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Failed to create document', type: 'error' } });
    }
  };

  const handleUpdateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      await api.updateDocument(id, updates);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d));
      if (selectedDoc?.id === id) {
        setSelectedDoc(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error('Failed to update document:', err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), message: 'Document deleted', type: 'success' } });
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleTitleSave = () => {
    if (selectedDoc && editTitle.trim()) {
      handleUpdateDocument(selectedDoc.id, { title: editTitle.trim() });
    }
    setEditingTitle(false);
  };

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Document List Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-card rounded-2xl border border-primary overflow-hidden">
        <div className="p-4 border-b border-primary">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <button
            onClick={handleCreateDocument}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl text-sm font-medium shadow-theme-md hover:shadow-theme-lg transition-all"
          >
            <Plus size={16} />
            New Document
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-tertiary text-sm">
              {searchQuery ? 'No documents found' : 'No documents yet. Click "New Document" to create one.'}
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => { setSelectedDoc(doc); setEditingTitle(false); }}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                  selectedDoc?.id === doc.id ? 'bg-primary-500/15' : 'hover:bg-tertiary'
                }`}
              >
                <FileText size={16} className={selectedDoc?.id === doc.id ? 'text-primary-500' : 'text-tertiary'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${selectedDoc?.id === doc.id ? 'text-primary font-medium' : 'text-secondary'}`}>
                    {doc.title}
                  </p>
                  <p className="text-[10px] text-tertiary flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 size={14} className="text-rose-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 flex flex-col bg-card rounded-2xl border border-primary overflow-hidden">
        {selectedDoc ? (
          <>
            {/* Document Header */}
            <div className="flex items-center gap-4 p-4 border-b border-primary">
              <FileText size={20} className="text-primary-500" />
              {editingTitle ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-input rounded-lg text-lg font-semibold text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <button onClick={handleTitleSave} className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20">
                    <Save size={16} className="text-emerald-500" />
                  </button>
                  <button onClick={() => setEditingTitle(false)} className="p-2 rounded-lg hover:bg-tertiary">
                    <X size={16} className="text-tertiary" />
                  </button>
                </div>
              ) : (
                <h2
                  onClick={() => { setEditingTitle(true); setEditTitle(selectedDoc.title); }}
                  className="flex-1 text-lg font-semibold text-primary cursor-pointer hover:text-primary-500 transition-colors"
                >
                  {selectedDoc.title}
                </h2>
              )}
              <div className="flex items-center gap-2 text-xs text-tertiary">
                <Clock size={12} />
                Updated {format(new Date(selectedDoc.updatedAt), 'MMM d, h:mm a')}
              </div>
            </div>

            {/* Document Content Editor */}
            <div className="flex-1 p-4 overflow-y-auto">
              <textarea
                value={selectedDoc.content}
                onChange={e => handleUpdateDocument(selectedDoc.id, { content: e.target.value })}
                placeholder="Start writing... (Markdown supported)"
                className="w-full h-full min-h-[400px] bg-transparent text-primary placeholder:text-tertiary resize-none outline-none text-sm leading-relaxed"
              />
            </div>

            {/* Document Footer */}
            <div className="flex items-center justify-between p-4 border-t border-primary text-xs text-tertiary">
              <div className="flex items-center gap-4">
                <span>Markdown supported</span>
                <span>•</span>
                <span>{selectedDoc.content.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedDoc.projectId && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-tertiary">
                    <Link2 size={12} />
                    Linked to project
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-tertiary">
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No document selected</p>
            <p className="text-sm">Select a document from the list or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}