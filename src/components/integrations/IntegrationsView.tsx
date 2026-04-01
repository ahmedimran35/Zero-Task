import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';
import { Link2, Plus, Trash2, ToggleLeft, ToggleRight, Send, Globe, X } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

const eventOptions = [
  { value: 'task.created', label: 'Task Created' },
  { value: 'task.updated', label: 'Task Updated' },
  { value: 'task.completed', label: 'Task Completed' },
  { value: 'task.deleted', label: 'Task Deleted' },
  { value: 'comment.added', label: 'Comment Added' },
  { value: 'sprint.started', label: 'Sprint Started' },
  { value: 'sprint.completed', label: 'Sprint Completed' },
];

export default function IntegrationsView() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [slackUrl, setSlackUrl] = useState('');
  const [slackSaved, setSlackSaved] = useState(false);

  const loadWebhooks = async () => {
    try { setWebhooks(await api.getWebhooks()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadWebhooks(); }, []);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await api.updateWebhook(id, { enabled: !enabled });
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled: !enabled } : w));
    } catch { /* ignore */ }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await api.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch { /* ignore */ }
  };

  const testWebhook = async (id: string) => {
    try {
      await api.testWebhook(id);
    } catch { /* ignore */ }
  };

  const saveSlack = async () => {
    if (!slackUrl.trim()) return;
    try {
      await api.createWebhook({ name: 'Slack Notifications', url: slackUrl.trim(), events: ['task.created', 'task.completed'] });
      setSlackSaved(true);
      loadWebhooks();
    } catch { /* ignore */ }
  };

  if (loading) return <div className="text-center py-12 text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Link2 size={20} className="text-white" />
            </div>
            Integrations
          </h1>
          <p className="text-sm text-tertiary mt-1">Connect TaskFlow to your favorite tools</p>
        </div>
      </div>

      {/* Quick Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slack */}
        <div className="bg-card rounded-2xl p-5 border border-primary shadow-theme-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">Slack</h3>
              <p className="text-xs text-tertiary">Send task notifications to Slack</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="url" value={slackUrl} onChange={e => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 px-3 py-2 bg-input rounded-lg text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" />
            <button onClick={saveSlack} disabled={!slackUrl.trim() || slackSaved}
              className="px-4 py-2 bg-[#4A154B] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {slackSaved ? 'Saved' : 'Connect'}
            </button>
          </div>
        </div>

        {/* GitHub */}
        <div className="bg-card rounded-2xl p-5 border border-primary shadow-theme-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">GitHub</h3>
              <p className="text-xs text-tertiary">Link commits & PRs to tasks</p>
            </div>
          </div>
          <p className="text-xs text-tertiary">Use the URL custom field on tasks to link GitHub commits and pull requests. Create a custom field of type "url" and paste GitHub links.</p>
        </div>

        {/* Google Calendar */}
        <div className="bg-card rounded-2xl p-5 border border-primary shadow-theme-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">Google Calendar</h3>
              <p className="text-xs text-tertiary">Sync tasks with due dates</p>
            </div>
          </div>
          <p className="text-xs text-tertiary">Tasks with due dates can be synced as calendar events. Use the ICS export feature to import into Google Calendar.</p>
        </div>

        {/* Custom Webhooks */}
        <div className="bg-card rounded-2xl p-5 border border-primary shadow-theme-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">Custom Webhooks</h3>
              <p className="text-xs text-tertiary">Send events to any URL</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
            <Plus size={14} className="inline mr-1" /> Add Webhook
          </button>
        </div>
      </div>

      {/* Webhooks List */}
      {webhooks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary">Active Webhooks</h3>
          {webhooks.map(hook => (
            <div key={hook.id} className={`bg-card rounded-xl p-4 border shadow-theme-sm flex items-center justify-between ${!hook.enabled ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleEnabled(hook.id, hook.enabled)}>
                  {hook.enabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-tertiary" />}
                </button>
                <div>
                  <p className="text-sm font-medium text-primary">{hook.name}</p>
                  <p className="text-xs text-tertiary truncate max-w-xs">{hook.url}</p>
                  <div className="flex gap-1 mt-1">
                    {hook.events.map(e => <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-tertiary text-secondary">{e}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => testWebhook(hook.id)} className="p-2 rounded-lg hover:bg-tertiary text-tertiary" title="Test">
                  <Send size={14} />
                </button>
                <button onClick={() => deleteWebhook(hook.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateWebhookModal onClose={() => { setShowCreate(false); loadWebhooks(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateWebhookModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['task.created', 'task.completed']);
  const [error, setError] = useState('');

  const toggleEvent = (ev: string) => {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL required'); return; }
    if (events.length === 0) { setError('Select at least one event'); return; }
    try {
      await api.createWebhook({ name: name.trim(), url: url.trim(), events });
      onClose();
    } catch { setError('Failed to create webhook'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-md overflow-hidden shadow-theme-xl border border-primary">
        <div className="px-6 py-4 border-b border-primary flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Create Webhook</h2>
          <button onClick={onClose} className="text-tertiary hover:text-primary"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My webhook"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Events</label>
            <div className="flex flex-wrap gap-2">
              {eventOptions.map(ev => (
                <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    events.includes(ev.value) ? 'bg-emerald-500 text-white' : 'bg-tertiary text-secondary hover:bg-primary-500/10'
                  }`}>{ev.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-theme-md">Create</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
