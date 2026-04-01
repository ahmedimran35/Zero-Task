const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const cats = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name').all(req.userId);
  res.json(cats.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, taskCount: 0 })));
});

router.post('/', (req, res) => {
  const { name, color, icon } = req.body;
  if (!name || !color) return res.status(400).json({ error: 'Name and color required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, name.trim(), color, icon || 'folder');
  res.json({ id, name: name.trim(), color, icon: icon || 'folder', taskCount: 0 });
});

router.put('/:id', (req, res) => {
  const { name, color, icon } = req.body;
  const db = getDb();
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (color) { updates.push('color = ?'); params.push(color); }
  if (icon) { updates.push('icon = ?'); params.push(icon); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
