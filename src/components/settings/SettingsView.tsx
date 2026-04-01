import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import AIProviderManager from './AIProviderManager';
import {
  Settings as SettingsIcon, Bell, Sparkles, Palette, User, Moon, Sun,
  Save, Check,
} from 'lucide-react';

type Tab = 'notifications' | 'ai' | 'appearance' | 'account';

export default function SettingsView() {
  const { state, dispatch } = useAppContext();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const [saved, setSaved] = useState(false);

  const [prefs, setPrefs] = useState({
    taskAssigned: { inApp: true, email: true },
    taskDue: { inApp: true, email: true },
    mentionedInComment: { inApp: true, email: true },
    taskCompleted: { inApp: true, email: false },
    dailyDigest: { enabled: true },
  });

  useEffect(() => {
    try {
      (api as any).getNotificationPreferences?.().then((p: any) => {
        if (p && typeof p === 'object') setPrefs(p);
      }).catch(() => {});
    } catch {}
  }, []);

  const handleSavePrefs = async () => {
    try {
      await (api as any).updateNotificationPreferences?.(prefs);
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
  ];

  const togglePref = (key: string, channel: 'inApp' | 'email') => {
    setPrefs(prev => {
      const current = (prev as any)[key] || {};
      return { ...prev, [key]: { ...current, [channel]: !current[channel] } };
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
          <SettingsIcon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Settings</h1>
          <p className="text-sm text-tertiary">Manage your preferences and configuration</p>
        </div>
      </div>

      <div className="flex gap-1 bg-tertiary rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-primary shadow-theme-sm"
      >
        {activeTab === 'notifications' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-primary">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { key: 'taskAssigned', label: 'Task Assigned', desc: 'When a task is assigned to you' },
                { key: 'taskDue', label: 'Task Due Soon', desc: 'When a task due date is approaching' },
                { key: 'mentionedInComment', label: 'Mentioned in Comment', desc: 'When someone @mentions you' },
                { key: 'taskCompleted', label: 'Task Completed', desc: 'When a task you follow is completed' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-primary last:border-0">
                  <div>
                    <p className="text-sm font-medium text-primary">{item.label}</p>
                    <p className="text-xs text-tertiary">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(prefs as any)[item.key]?.inApp ?? true}
                        onChange={() => togglePref(item.key, 'inApp')}
                        className="w-4 h-4 rounded border-primary text-primary-500" />
                      <span className="text-xs text-secondary">In-app</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(prefs as any)[item.key]?.email ?? false}
                        onChange={() => togglePref(item.key, 'email')}
                        className="w-4 h-4 rounded border-primary text-primary-500" />
                      <span className="text-xs text-secondary">Email</span>
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-primary">Daily Digest</p>
                  <p className="text-xs text-tertiary">Receive a daily summary of your tasks</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={prefs.dailyDigest?.enabled ?? true}
                    onChange={() => setPrefs(prev => ({ ...prev, dailyDigest: { enabled: !prev.dailyDigest?.enabled } }))}
                    className="w-4 h-4 rounded border-primary text-primary-500" />
                  <span className="text-xs text-secondary">Enabled</span>
                </label>
              </div>
            </div>
            <button onClick={handleSavePrefs}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors">
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved!' : 'Save Preferences'}
            </button>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="p-6 space-y-4">
            {!isAdmin ? (
              <div className="text-center py-8">
                <Sparkles size={32} className="text-tertiary mx-auto mb-2" />
                <p className="text-sm text-tertiary">Only admins can manage AI providers</p>
              </div>
            ) : (
              <AIProviderManager />
            )}
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-primary">Appearance</h2>
            <div className="flex items-center justify-between py-3 border-b border-primary">
              <div>
                <p className="text-sm font-medium text-primary">Dark Mode</p>
                <p className="text-xs text-tertiary">Switch between light and dark themes</p>
              </div>
              <button onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
                className={`p-3 rounded-xl transition-colors ${state.darkMode ? 'bg-violet-500 text-white' : 'bg-tertiary text-secondary'}`}>
                {state.darkMode ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'account' && currentUser && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-primary">Account</h2>
            <div className="flex items-center gap-4 p-4 bg-tertiary rounded-xl">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isAdmin ? 'bg-violet-500 text-white' : 'bg-primary-500 text-white'}`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-primary">{currentUser.name}</p>
                <p className="text-sm text-tertiary">{currentUser.email}</p>
                <span className={`inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${isAdmin ? 'bg-violet-500/15 text-violet-500' : 'bg-slate-500/15 text-slate-500'}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
