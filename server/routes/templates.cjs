const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const tmpls = db.prepare('SELECT * FROM templates WHERE user_id = ?').all(req.userId);
  res.json(tmpls.map(t => ({
    id: t.id, name: t.name, icon: t.icon,
    defaultTitle: t.default_title, defaultDescription: t.default_description,
    defaultPriority: t.default_priority, defaultCategory: t.default_category,
    defaultSubtasks: JSON.parse(t.default_subtasks || '[]'),
    defaultTags: JSON.parse(t.default_tags || '[]'),
  })));
});

router.post('/', (req, res) => {
  const t = req.body;
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO templates (id, user_id, name, icon, default_title, default_description, default_priority, default_category, default_subtasks, default_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.userId, t.name, t.icon || 'sparkles', t.defaultTitle || '', t.defaultDescription || '', t.defaultPriority || 'medium', t.defaultCategory || 'Work', JSON.stringify(t.defaultSubtasks || []), JSON.stringify(t.defaultTags || [])
  );
  res.json({ id, ...t });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
