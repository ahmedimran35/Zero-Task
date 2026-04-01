const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? AND archived = 0 ORDER BY name').all(req.userId);
  res.json(projects.map(p => ({
    id: p.id, name: p.name, description: p.description, color: p.color, icon: p.icon,
    taskCount: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE project_id = ?').get(p.id).c,
    createdAt: p.created_at,
  })));
});

router.post('/', (req, res) => {
  const { name, description, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, user_id, name, description, color, icon) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.userId, name.trim(), (description || '').trim(), color || '#3b82f6', icon || 'folder'
  );
  res.json({ id, name: name.trim(), description: (description || '').trim(), color: color || '#3b82f6', icon: icon || 'folder', taskCount: 0, createdAt: new Date().toISOString() });
});

router.put('/:id', (req, res) => {
  const { name, description, color, icon, archived } = req.body;
  const db = getDb();
  const updates = []; const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }
  if (color) { updates.push('color = ?'); params.push(color); }
  if (icon) { updates.push('icon = ?'); params.push(icon); }
  if (archived !== undefined) { updates.push('archived = ?'); params.push(archived ? 1 : 0); }
  if (updates.length) { params.push(req.params.id, req.userId); db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  // Move tasks to no project
  db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Get tasks for a project
router.get('/:id/tasks', (req, res) => {
  const db = getDb();
  const taskToApi = require('./tasks.cjs').taskToApi || null;
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.id, req.userId);
  res.json(tasks.map(t => ({
    id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
    category: t.category, dueDate: t.due_date, createdAt: t.created_at, updatedAt: t.updated_at,
    progress: t.progress, assignee: t.assignee, completedAt: t.completed_at,
  })));
});

module.exports = router;
