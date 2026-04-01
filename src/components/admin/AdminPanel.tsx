import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types/auth';
import { format } from 'date-fns';
import {
  Users, Plus, Trash2, Edit3, Key, Shield, UserCheck, UserX,
  Mail, User as UserIcon, X, Eye, EyeOff, Search, Lock,
} from 'lucide-react';
import CreateUserModal from './CreateUserModal';
import ConfirmDialog from '../modals/ConfirmDialog';

export default function AdminPanel() {
  const { users, deleteUser, toggleUserActive, resetPassword, getUserTaskCount, viewAsUser, setViewAsUser, currentUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(users.map(async (u) => {
        counts[u.id] = await getUserTaskCount(u.id);
      }));
      setTaskCounts(counts);
    };
    if (users.length > 0) loadCounts();
  }, [users, getUserTaskCount]);

  const handleResetPassword = () => {
    if (!resetPasswordUser || !newPassword.trim()) return;
    resetPassword(resetPasswordUser.id, newPassword.trim());
    setResetPasswordUser(null);
    setNewPassword('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            Admin Panel
          </h1>
          <p className="text-sm text-tertiary mt-1">Manage users and access controls</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl font-medium text-sm shadow-theme-md hover:shadow-theme-lg transition-all"
        >
          <Plus size={16} />
          Create User
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'from-primary-500 to-primary-600', icon: Users },
          { label: 'Active Users', value: users.filter(u => u.isActive).length, color: 'from-emerald-500 to-emerald-600', icon: UserCheck },
          { label: 'Inactive Users', value: users.filter(u => !u.isActive).length, color: 'from-rose-500 to-rose-600', icon: UserX },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'from-violet-500 to-violet-600', icon: Shield },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl p-5 border border-primary shadow-theme-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-tertiary uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-primary mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-9 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-2xl border border-primary overflow-hidden shadow-theme-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">Tasks</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-tertiary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const taskCount = taskCounts[user.id] ?? 0;
                const isViewing = viewAsUser?.id === user.id;
                return (
                  <tr key={user.id} className={`border-b border-primary hover:bg-tertiary/50 transition-colors ${isViewing ? 'bg-primary-500/5' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          user.role === 'admin' ? 'bg-violet-500 text-white' : 'bg-primary-500 text-white'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">{user.name}</p>
                          {user.id === currentUser?.id && <span className="text-[10px] text-primary-500">(you)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-tertiary" />
                        <span className="text-sm text-secondary">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-violet-500/15 text-violet-500'
                          : 'bg-slate-500/15 text-slate-500'
                      }`}>
                        {user.role === 'admin' && <Shield size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.isActive
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-primary">{taskCount}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-tertiary">{format(new Date(user.createdAt), 'MMM d, yyyy')}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setViewAsUser(isViewing ? null : { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar })}
                            className={`p-2 rounded-lg transition-colors ${
                              isViewing ? 'bg-primary-500 text-white' : 'hover:bg-tertiary text-tertiary'
                            }`}
                            title="View user's tasks"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {user.id !== 'admin-default' && (
                          <button
                            onClick={() => toggleUserActive(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive ? 'hover:bg-amber-500/10 text-amber-500' : 'hover:bg-emerald-500/10 text-emerald-500'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => { setResetPasswordUser(user); setNewPassword(''); }}
                          className="p-2 rounded-lg hover:bg-tertiary text-tertiary transition-colors"
                          title="Reset password"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 rounded-lg hover:bg-tertiary text-tertiary transition-colors"
                          title="Edit user"
                        >
                          <Edit3 size={14} />
                        </button>
                        {user.id !== 'admin-default' && (
                          <button
                            onClick={() => setConfirmDelete(user)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View As Banner */}
      <AnimatePresence>
        {viewAsUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-6 py-3 rounded-xl shadow-theme-xl flex items-center gap-4 z-50"
          >
            <Eye size={18} />
            <span className="text-sm font-medium">Viewing as {viewAsUser.name}</span>
            <button
              onClick={() => setViewAsUser(null)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} />}
        {editingUser && (
          <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
        )}
        {resetPasswordUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setResetPasswordUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-modal rounded-2xl w-full max-w-sm p-6 shadow-theme-xl border border-primary"
            >
              <h3 className="text-lg font-bold text-primary mb-1">Reset Password</h3>
              <p className="text-sm text-tertiary mb-4">Set a new password for {resetPasswordUser.name}</p>
              <div className="relative mb-4">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                  placeholder="New password"
                  className="w-full pl-10 pr-12 py-2.5 bg-input rounded-xl text-sm text-primary placeholder:text-tertiary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setResetPasswordUser(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!newPassword.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {confirmDelete && (
          <ConfirmDialog
            title="Delete User"
            message={`Are you sure you want to delete ${confirmDelete.name}? Their tasks will also be deleted. This cannot be undone.`}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={() => { deleteUser(confirmDelete.id); setConfirmDelete(null); }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    const result = await updateUser(user.id, { name: name.trim(), email: email.trim() });
    if (!result.success) {
      setError(result.error || 'Update failed');
      return;
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-modal rounded-2xl w-full max-w-sm p-6 shadow-theme-xl border border-primary"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary">Edit User</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-tertiary transition-colors"><X size={18} className="text-secondary" /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm text-rose-500">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Name</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-secondary bg-tertiary hover:bg-tertiary/80 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
