const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware, superAdminMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// Get all teams (super_admin only)
router.get('/', superAdminMiddleware, (req, res) => {
  const db = getDb();
  const teams = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount,
      (SELECT user_id FROM team_members WHERE team_id = t.id AND role = 'admin' LIMIT 1) as adminId,
      (SELECT name FROM users WHERE id = (SELECT user_id FROM team_members WHERE team_id = t.id AND role = 'admin' LIMIT 1)) as adminName
    FROM teams t 
    ORDER BY t.created_at DESC
  `).all();
  res.json(teams.map(t => ({
    id: t.id, name: t.name, description: t.description, createdBy: t.created_by,
    memberCount: t.memberCount, adminId: t.adminId, adminName: t.adminName,
    createdAt: t.created_at,
  })));
});

// Create team (super_admin only)
router.post('/', superAdminMiddleware, (req, res) => {
  const { name, description, adminUserId } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });
  
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare('INSERT INTO teams (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id, name.trim(), description || '', req.userId, now
  );
  
  // If admin user specified, add them as team admin
  if (adminUserId) {
    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(id, adminUserId, 'admin');
  }
  
  res.json({
    id, name: name.trim(), description: description || '', createdBy: req.userId,
    memberCount: adminUserId ? 1 : 0, adminId: adminUserId || null,
    createdAt: now,
  });
});

// Get team details with members (super_admin or team admin)
router.get('/:id', (req, res) => {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  
  // Check if user is super_admin or team admin
  const isSuperAdmin = req.userRole === 'super_admin';
  const membership = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(req.params.id, req.userId);
  const isTeamAdmin = membership?.role === 'admin';
  
  if (!isSuperAdmin && !isTeamAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Get team members
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, tm.role,
      (SELECT daily_limit FROM user_ai_quotas WHERE user_id = u.id LIMIT 1) as aiQuota,
      (SELECT used_today FROM user_ai_quotas WHERE user_id = u.id LIMIT 1) as aiUsed
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ?
  `).all(req.params.id);
  
  // Get team AI quotas
  const quotas = db.prepare('SELECT * FROM team_ai_quotas WHERE team_id = ?').all(req.params.id);
  
  res.json({
    id: team.id, name: team.name, description: team.description,
    createdBy: team.created_by, createdAt: team.created_at,
    members: members.map(m => ({
      id: m.id, name: m.name, email: m.email, role: m.role,
      aiQuota: m.aiQuota || 0, aiUsed: m.aiUsed || 0,
    })),
    quotas: quotas.map(q => ({
      provider: q.provider, dailyLimit: q.daily_limit, usedToday: q.used_today, resetAt: q.reset_at,
    })),
  });
});

// Add member to team (team admin or super_admin)
router.post('/:id/members', (req, res) => {
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  
  // Check permissions
  const isSuperAdmin = req.userRole === 'super_admin';
  const membership = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.userId, 'admin');
  
  if (!isSuperAdmin && !membership) {
    return res.status(403).json({ error: 'Only team admin can add members' });
  }
  
  // Verify user exists
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Add member
  const memberRole = (role === 'admin') ? 'admin' : 'member';
  try {
    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, userId, memberRole);
  } catch { /* already exists */ }
  
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: memberRole } });
});

// Remove member from team
router.delete('/:id/members/:userId', (req, res) => {
  const db = getDb();
  
  // Check permissions
  const isSuperAdmin = req.userRole === 'super_admin';
  const membership = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.userId, 'admin');
  
  if (!isSuperAdmin && !membership) {
    return res.status(403).json({ error: 'Only team admin can remove members' });
  }
  
  db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ success: true });
});

// Set team AI quota (super_admin only)
router.post('/:id/quotas', superAdminMiddleware, (req, res) => {
  const { provider, dailyLimit } = req.body;
  if (!provider || !dailyLimit) return res.status(400).json({ error: 'provider and dailyLimit required' });
  
  const db = getDb();
  const id = uuidv4();
  const resetAt = new Date();
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  resetAt.setUTCHours(0, 0, 0, 0);
  
  // Upsert quota
  const existing = db.prepare('SELECT id FROM team_ai_quotas WHERE team_id = ? AND provider = ?').get(req.params.id, provider);
  if (existing) {
    db.prepare('UPDATE team_ai_quotas SET daily_limit = ?, reset_at = ? WHERE id = ?').run(dailyLimit, resetAt.toISOString(), existing.id);
  } else {
    db.prepare('INSERT INTO team_ai_quotas (id, team_id, provider, daily_limit, reset_at) VALUES (?, ?, ?, ?, ?)').run(id, req.params.id, provider, dailyLimit, resetAt.toISOString());
  }
  
  res.json({ success: true, provider, dailyLimit, resetAt: resetAt.toISOString() });
});

// Set user AI quota (team admin only)
router.post('/:id/quotas/user', (req, res) => {
  const { userId, dailyLimit } = req.body;
  if (!userId || !dailyLimit) return res.status(400).json({ error: 'userId and dailyLimit required' });
  
  const db = getDb();
  
  // Check team admin
  const isSuperAdmin = req.userRole === 'super_admin';
  const membership = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?').get(req.params.id, req.userId, 'admin');
  
  if (!isSuperAdmin && !membership) {
    return res.status(403).json({ error: 'Only team admin can set user quotas' });
  }
  
  // Verify user is in team
  const userMember = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(req.params.id, userId);
  if (!userMember) return res.status(400).json({ error: 'User not in team' });
  
  const id = uuidv4();
  const resetAt = new Date();
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  resetAt.setUTCHours(0, 0, 0, 0);
  
  // Upsert user quota
  const existing = db.prepare('SELECT id FROM user_ai_quotas WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare('UPDATE user_ai_quotas SET daily_limit = ?, reset_at = ? WHERE id = ?').run(dailyLimit, resetAt.toISOString(), existing.id);
  } else {
    db.prepare('INSERT INTO user_ai_quotas (id, user_id, provider, daily_limit, reset_at) VALUES (?, ?, ?, ?, ?)').run(id, userId, 'default', dailyLimit, resetAt.toISOString());
  }
  
  res.json({ success: true, userId, dailyLimit, resetAt: resetAt.toISOString() });
});

// Get user's quota
router.get('/user/quota', (req, res) => {
  const db = getDb();
  const quota = db.prepare('SELECT * FROM user_ai_quotas WHERE user_id = ?').get(req.userId);
  
  if (!quota) {
    return res.json({ dailyLimit: 0, usedToday: 0, remaining: 0 });
  }
  
  // Check if reset needed
  const now = new Date();
  if (quota.reset_at && new Date(quota.reset_at) < now) {
    db.prepare('UPDATE user_ai_quotas SET used_today = 0, reset_at = ? WHERE id = ?').run(
      new Date(now.getTime() + 24*60*60*1000).toISOString(), quota.id
    );
    quota.used_today = 0;
  }
  
  res.json({
    dailyLimit: quota.daily_limit,
    usedToday: quota.used_today,
    remaining: Math.max(0, quota.daily_limit - quota.used_today),
    resetAt: quota.reset_at,
  });
});

// Check and increment usage
router.post('/user/use', (req, res) => {
  const db = getDb();
  const quota = db.prepare('SELECT * FROM user_ai_quotas WHERE user_id = ?').get(req.userId);
  
  if (!quota || quota.daily_limit === 0) {
    return res.status(403).json({ error: 'No AI quota available' });
  }
  
  // Check reset
  const now = new Date();
  if (quota.reset_at && new Date(quota.reset_at) < now) {
    db.prepare('UPDATE user_ai_quotas SET used_today = 0, reset_at = ? WHERE id = ?').run(
      new Date(now.getTime() + 24*60*60*1000).toISOString(), quota.id
    );
    quota.used_today = 0;
  }
  
  if (quota.used_today >= quota.daily_limit) {
    return res.status(403).json({ error: 'Daily AI quota exceeded' });
  }
  
  db.prepare('UPDATE user_ai_quotas SET used_today = used_today + 1 WHERE id = ?').run(quota.id);
  
  res.json({ success: true, remaining: quota.daily_limit - quota.used_today - 1 });
});

// Delete team (super_admin only)
router.delete('/:id', superAdminMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;