const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { getDb } = require('../db.cjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// List users (admin only)
router.get('/', adminMiddleware, (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, email, name, role, created_at, is_active, avatar FROM users ORDER BY created_at DESC').all();
  res.json(users.map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    createdAt: u.created_at, isActive: !!u.is_active, avatar: u.avatar,
  })));
});

// Create user (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(id, email.trim(), hashedPassword, name.trim());

  // Initialize default categories for new user
  const defaultCats = [
    { id: uuidv4(), name: 'Work', color: '#3b82f6', icon: 'briefcase' },
    { id: uuidv4(), name: 'Personal', color: '#10b981', icon: 'user' },
    { id: uuidv4(), name: 'Health', color: '#f43f5e', icon: 'heart' },
    { id: uuidv4(), name: 'Learning', color: '#8b5cf6', icon: 'book-open' },
    { id: uuidv4(), name: 'Finance', color: '#f59e0b', icon: 'dollar-sign' },
  ];
  const insertCat = db.prepare('INSERT INTO categories (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)');
  for (const cat of defaultCats) {
    insertCat.run(cat.id, id, cat.name, cat.color, cat.icon);
  }

  // Initialize default templates
  const defaultTmpls = [
    { name: 'Bug Report', icon: 'bug', desc: 'Steps to reproduce:\n1.\n2.\n\nExpected:\n\nActual:', priority: 'high', subs: ['Reproduce issue', 'Identify root cause', 'Implement fix', 'Write tests'], tags: ['bugfix'] },
    { name: 'Feature Request', icon: 'sparkles', desc: 'User story:\n\nAs a [user], I want [feature] so that [benefit].', priority: 'medium', subs: ['Design solution', 'Implement', 'Test', 'Deploy'], tags: ['feature'] },
    { name: 'Weekly Review', icon: 'clipboard', desc: 'What went well:\n\nWhat to improve:', priority: 'medium', subs: ['Review completed tasks', 'Assess goals', 'Plan next week'], tags: ['review', 'weekly'] },
  ];
  const insertTmpl = db.prepare('INSERT INTO templates (id, user_id, name, icon, default_title, default_description, default_priority, default_category, default_subtasks, default_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const t of defaultTmpls) {
    insertTmpl.run(uuidv4(), id, t.name, t.icon, '', t.desc, t.priority, 'Work', JSON.stringify(t.subs), JSON.stringify(t.tags));
  }

  res.json({ id, email: email.trim(), name: name.trim(), role: 'user', isActive: true });
});

// Update user (admin only)
router.put('/:id', adminMiddleware, (req, res) => {
  const { name, email, isActive } = req.body;
  const db = getDb();

  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(email, req.params.id);
    if (existing) return res.status(409).json({ error: 'Email already in use' });
  }

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email.trim()); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// Delete user (admin only, can't delete admin-default)
router.delete('/:id', adminMiddleware, (req, res) => {
  if (req.params.id === 'admin-default') return res.status(403).json({ error: 'Cannot delete default admin' });
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Reset password (admin only)
router.put('/:id/password', adminMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const db = getDb();
  const hashedPassword = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
  res.json({ success: true });
});

// Toggle active (admin only)
router.put('/:id/toggle', adminMiddleware, (req, res) => {
  if (req.params.id === 'admin-default') return res.status(403).json({ error: 'Cannot deactivate default admin' });
  const db = getDb();
  db.prepare('UPDATE users SET is_active = NOT is_active WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
