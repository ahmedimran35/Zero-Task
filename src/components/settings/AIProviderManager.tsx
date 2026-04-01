import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';
import {
  Sparkles, Plus, Trash2, Check, X, Key, Globe,
  Loader2, Power, RefreshCw,
} from 'lucide-react';

interface AIProvider {
  id: string;
  providerType: string;
  name: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  createdAt: string;
  hasKey: boolean;
}

interface ModelOption {
  id: string;
  name: string;
}

const providerTypes = [
  { id: 'openrouter', label: 'OpenRouter', icon: '🔀', placeholder: 'sk-or-...' },
  { id: 'openai', label: 'OpenAI', icon: '🤖', placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', icon: '🧠', placeholder: 'sk-ant-...' },
  { id: 'openai_compatible', label: 'OpenAI Compatible', icon: '🔌', placeholder: 'API key' },
  { id: 'kilococode', label: 'Kilo Code Gateway', icon: '⚡', placeholder: 'API key' },
];

export default function AIProviderManager() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Model selection state
  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [models, setModels] = useState<Record<string, ModelOption[]>>({});
  const [showModelPicker, setShowModelPicker] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await (api as any).getAIProviders?.();
      if (Array.isArray(data)) setProviders(data);
    } catch {}
  };

  const handleAdd = async () => {
    if (!selectedType || !newName.trim()) return;
    setLoading(true);
    try {
      const result = await (api as any).createAIProvider?.({
        providerType: selectedType,
        name: newName.trim(),
        apiKey: newKey,
        baseUrl: newBaseUrl,
      });
      if (result) {
        setProviders(prev => [result, ...prev]);
        setShowAdd(false);
        setSelectedType('');
        setNewName('');
        setNewKey('');
        setNewBaseUrl('');
      }
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    try { await (api as any).deleteAIProvider?.(id); } catch {}
    setProviders(prev => prev.filter(p => p.id !== id));
  };

  const handleActivate = async (id: string) => {
    try { await (api as any).activateAIProvider?.(id); } catch {}
    setProviders(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
  };

  const handleDeactivateAll = async () => {
    try { await (api as any).deactivateAllAIProviders?.(); } catch {}
    setProviders(prev => prev.map(p => ({ ...p, isActive: false })));
  };

  const handleFetchModels = async (provider: AIProvider) => {
    setFetchingModels(provider.id);
    try {
      const result = await (api as any).fetchAIModels?.({
        providerType: provider.providerType,
        apiKey: '', // server will use stored key
        baseUrl: provider.baseUrl,
      });
      if (result?.models) {
        setModels(prev => ({ ...prev, [provider.id]: result.models }));
        setShowModelPicker(provider.id);
      }
    } catch (err: any) {
      alert('Failed to fetch models: ' + (err?.message || 'Unknown error'));
    }
    setFetchingModels(null);
  };

  const handleSelectModel = async (providerId: string, modelId: string) => {
    try { await (api as any).updateAIProvider?.(providerId, { model: modelId }); } catch {}
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, model: modelId } : p));
    setShowModelPicker(null);
  };

  const handleUpdateKey = async (providerId: string, key: string) => {
    try { await (api as any).updateAIProvider?.(providerId, { apiKey: key }); } catch {}
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, hasKey: !!key } : p));
  };

  const getTypeConfig = (type: string) => providerTypes.find(t => t.id === type) || { id: type, label: type, icon: '🔧', placeholder: 'API key' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-violet-500" />
          <h2 className="text-lg font-semibold text-primary">AI Providers</h2>
          {providers.some(p => p.isActive) && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">Active</span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-500 text-white rounded-xl text-xs font-medium hover:bg-violet-600 transition-colors"
        >
          <Plus size={14} /> Add Provider
        </button>
      </div>

      {/* Provider List */}
      {providers.length === 0 && !showAdd ? (
        <div className="text-center py-8 bg-tertiary rounded-xl">
          <Sparkles size={32} className="text-tertiary mx-auto mb-2" />
          <p className="text-sm text-tertiary mb-1">No AI providers configured</p>
          <p className="text-xs text-tertiary">Add a provider to enable AI features</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(provider => {
            const typeConfig = getTypeConfig(provider.providerType);
            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 ${provider.isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-primary bg-tertiary'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{typeConfig.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-primary">{provider.name}</p>
                      <p className="text-xs text-tertiary">{typeConfig.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {provider.isActive ? (
                      <button onClick={handleDeactivateAll}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors">
                        <Check size={12} /> Active
                      </button>
                    ) : (
                      <button onClick={() => handleActivate(provider.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-tertiary border border-primary text-xs text-secondary hover:bg-primary-500/10 transition-colors">
                        <Power size={12} /> Activate
                      </button>
                    )}
                    <button onClick={() => handleDelete(provider.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-tertiary mb-1">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      defaultValue={provider.hasKey ? '••••••••••••••••' : ''}
                      placeholder={typeConfig.placeholder}
                      onBlur={e => { if (e.target.value && !e.target.value.includes('•')) handleUpdateKey(provider.id, e.target.value); }}
                      className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                </div>

                {/* Base URL for OpenAI Compatible */}
                {provider.providerType === 'openai_compatible' && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-tertiary mb-1">Base URL</label>
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-tertiary" />
                      <input
                        type="text"
                        defaultValue={provider.baseUrl}
                        placeholder="https://your-api.com"
                        onBlur={e => { if (e.target.value) (api as any).updateAIProvider?.(provider.id, { baseUrl: e.target.value }); }}
                        className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                      />
                    </div>
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Model</label>
                  <div className="flex items-center gap-2">
                    {provider.model ? (
                      <span className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary border border-primary">
                        {provider.model}
                      </span>
                    ) : (
                      <span className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-tertiary border border-primary">
                        No model selected
                      </span>
                    )}
                    <button
                      onClick={() => handleFetchModels(provider)}
                      disabled={fetchingModels === provider.id || !provider.hasKey}
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 text-violet-500 rounded-lg text-xs font-medium hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                    >
                      {fetchingModels === provider.id ? (
                        <><Loader2 size={12} className="animate-spin" /> Fetching...</>
                      ) : (
                        <><RefreshCw size={12} /> Fetch Models</>
                      )}
                    </button>
                  </div>

                  {/* Model Picker Dropdown */}
                  <AnimatePresence>
                    {showModelPicker === provider.id && models[provider.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 max-h-48 overflow-y-auto bg-card border border-primary rounded-xl shadow-lg"
                      >
                        <div className="p-2 border-b border-primary flex items-center justify-between">
                          <span className="text-xs font-medium text-tertiary">{models[provider.id].length} models available</span>
                          <button onClick={() => setShowModelPicker(null)} className="p-1 rounded hover:bg-tertiary">
                            <X size={12} className="text-tertiary" />
                          </button>
                        </div>
                        {models[provider.id].map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleSelectModel(provider.id, m.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-500/10 transition-colors ${
                              provider.model === m.id ? 'bg-violet-500/5 text-violet-500 font-medium' : 'text-primary'
                            }`}
                          >
                            {m.name || m.id}
                            {provider.model === m.id && <Check size={12} className="inline ml-2" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Provider Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-modal rounded-2xl w-full max-w-md shadow-xl border border-primary p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-primary">Add AI Provider</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-tertiary">
                  <X size={18} className="text-secondary" />
                </button>
              </div>

              {/* Provider Type Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-2">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {providerTypes.map(pt => (
                    <button
                      key={pt.id}
                      onClick={() => { setSelectedType(pt.id); if (!newName) setNewName(pt.label); }}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        selectedType === pt.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-primary bg-tertiary hover:bg-primary-500/5'
                      }`}
                    >
                      <span className="text-lg">{pt.icon}</span>
                      <span className="text-sm font-medium text-primary">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="My OpenAI Key"
                  className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-1.5">API Key</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                  <input
                    type="password"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder={providerTypes.find(t => t.id === selectedType)?.placeholder || 'API key'}
                    className="w-full pl-10 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              </div>

              {/* Base URL for OpenAI Compatible */}
              {selectedType === 'openai_compatible' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary mb-1.5">Base URL</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                    <input
                      type="text"
                      value={newBaseUrl}
                      onChange={e => setNewBaseUrl(e.target.value)}
                      placeholder="https://your-api.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={!selectedType || !newName.trim() || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 disabled:opacity-50">
                  {loading ? 'Adding...' : 'Add Provider'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
