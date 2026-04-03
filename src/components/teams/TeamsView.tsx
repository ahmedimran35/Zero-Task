import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import {
  Users, Plus, Trash2, Shield, X, Zap,
  User
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  aiQuota: number;
  aiUsed: number;
}

interface TeamQuota {
  provider: string;
  dailyLimit: number;
  usedToday: number;
}

export default function TeamsView() {
  const { currentUser, users } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamDetails, setTeamDetails] = useState<{ members: TeamMember[]; quotas: TeamQuota[] } | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      api.getTeams().then(setTeams).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isSuperAdmin]);

  const handleCreateTeam = async (name: string, description: string, adminUserId: string) => {
    try {
      const team = await api.createTeam({ name, description, adminUserId });
      setTeams(prev => [team, ...prev]);
      setShowCreate(false);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    try {
      const details = await api.getTeam(team.id);
      setTeamDetails(details);
    } catch (err) {
      console.error('Failed to load team details:', err);
    }
  };

  const handleAddMember = async (userId: string, role: string) => {
    if (!selectedTeam) return;
    try {
      await api.addTeamMember(selectedTeam.id, { userId, role });
      const details = await api.getTeam(selectedTeam.id);
      setTeamDetails(details);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      await api.removeTeamMember(selectedTeam.id, userId);
      const details = await api.getTeam(selectedTeam.id);
      setTeamDetails(details);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleSetUserQuota = async (userId: string, dailyLimit: number) => {
    if (!selectedTeam) return;
    try {
      await api.setUserQuota(selectedTeam.id, { userId, dailyLimit });
      const details = await api.getTeam(selectedTeam.id);
      setTeamDetails(details);
    } catch (err) {
      console.error('Failed to set quota:', err);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      await api.deleteTeam(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
      setSelectedTeam(null);
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-tertiary">Access denied. Super Admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            Teams
          </h1>
          <p className="text-sm text-tertiary mt-1">Manage teams and AI quotas</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-sm shadow-theme-md hover:shadow-theme-lg transition-all"
        >
          <Plus size={16} />
          New Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-card rounded-2xl border border-primary p-12 text-center">
          <Users size={48} className="text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No teams yet</h3>
          <p className="text-sm text-tertiary mb-4">Create teams to manage users and AI quotas</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium">
            Create First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className="bg-card rounded-2xl p-5 border border-primary hover:border-violet-500 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <Users size={20} className="text-violet-500" />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10"
                >
                  <Trash2 size={14} className="text-rose-500" />
                </button>
              </div>
              <h3 className="font-semibold text-primary mb-1">{team.name}</h3>
              <p className="text-xs text-tertiary mb-3">{team.description || 'No description'}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-secondary">
                  <User size={12} /> {team.memberCount} members
                </span>
                {team.adminName && (
                  <span className="flex items-center gap-1 text-violet-500">
                    <Shield size={12} /> {team.adminName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <CreateTeamModal
          users={users}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateTeam}
        />
      )}

      {/* Team Details Modal */}
      {selectedTeam && teamDetails && (
        <TeamDetailsModal
          team={selectedTeam}
          details={teamDetails}
          users={users}
          onClose={() => { setSelectedTeam(null); setTeamDetails(null); }}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onSetQuota={handleSetUserQuota}
        />
      )}
    </div>
  );
}

function CreateTeamModal({ users, onClose, onCreate }: { users: any[]; onClose: () => void; onCreate: (name: string, desc: string, adminId: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminId, setAdminId] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-modal rounded-2xl w-full max-w-md overflow-hidden shadow-theme-xl border border-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary">
          <h2 className="text-lg font-bold text-primary">Create Team</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-tertiary"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Team Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Engineering Team"
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Team Admin</label>
            <select
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              className="w-full px-4 py-2.5 bg-input rounded-xl text-sm text-primary border border-primary focus:outline-none"
            >
              <option value="">Select admin...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-tertiary text-secondary">Cancel</button>
            <button onClick={() => onCreate(name, description, adminId)} disabled={!name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamDetailsModal({ team, details, users, onClose, onAddMember, onRemoveMember, onSetQuota }: {
  team: Team;
  details: { members: TeamMember[]; quotas: TeamQuota[] };
  users: any[];
  onClose: () => void;
  onAddMember: (userId: string, role: string) => void;
  onRemoveMember: (userId: string) => void;
  onSetQuota: (userId: string, limit: number) => void;
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [quotaEdit, setQuotaEdit] = useState<{ userId: string; limit: number } | null>(null);

  const teamUserIds = details.members.map(m => m.id);
  const availableUsers = users.filter(u => !teamUserIds.includes(u.id));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-modal rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-theme-xl border border-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary">
          <div>
            <h2 className="text-lg font-bold text-primary">{team.name}</h2>
            <p className="text-xs text-tertiary">{team.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-tertiary"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* AI Quotas */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap size={16} className="text-violet-500" /> Team AI Quotas
            </h3>
            {details.quotas.length === 0 ? (
              <p className="text-xs text-tertiary">No quotas set</p>
            ) : (
              <div className="space-y-2">
                {details.quotas.map(q => (
                  <div key={q.provider} className="flex items-center justify-between p-3 bg-tertiary rounded-xl">
                    <span className="text-sm font-medium text-primary uppercase">{q.provider}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-tertiary">{q.usedToday}/{q.dailyLimit} used</span>
                      <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(q.usedToday/q.dailyLimit)*100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <User size={16} /> Members ({details.members.length})
              </h3>
              <button onClick={() => setShowAddMember(true)} className="text-xs text-violet-500 hover:text-violet-600">+ Add</button>
            </div>
            
            {showAddMember && (
              <div className="flex gap-2 mb-3 p-3 bg-tertiary rounded-xl">
                <select value={newUserId} onChange={e => setNewUserId(e.target.value)} className="flex-1 px-3 py-2 bg-input rounded-lg text-sm">
                  <option value="">Select user...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button onClick={() => { onAddMember(newUserId, 'member'); setShowAddMember(false); setNewUserId(''); }} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm">Add</button>
              </div>
            )}

            <div className="space-y-2">
              {details.members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-tertiary rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">{m.name}</p>
                      <p className="text-xs text-tertiary">{m.email}</p>
                    </div>
                    {m.role === 'admin' && <span className="px-2 py-0.5 bg-violet-500/15 text-violet-500 text-[10px] rounded-full">Admin</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Zap size={12} className="text-tertiary" />
                      <span className="text-xs text-secondary">{m.aiQuota}/day</span>
                      {quotaEdit?.userId === m.id ? (
                        <input
                          type="number"
                          value={quotaEdit.limit}
                          onChange={e => setQuotaEdit({ userId: m.id, limit: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 bg-input rounded text-xs"
                          autoFocus
                        />
                      ) : (
                        <button onClick={() => setQuotaEdit({ userId: m.id, limit: m.aiQuota })} className="text-xs text-violet-500 hover:text-violet-600">Edit</button>
                      )}
                      {quotaEdit?.userId === m.id && (
                        <button onClick={() => { onSetQuota(m.id, quotaEdit.limit); setQuotaEdit(null); }} className="text-xs text-emerald-500">Save</button>
                      )}
                    </div>
                    {m.role !== 'admin' && (
                      <button onClick={() => onRemoveMember(m.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10">
                        <Trash2 size={14} className="text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}