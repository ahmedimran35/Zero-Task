const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const views = db.prepare('SELECT * FROM saved_views WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(views.map(v => ({ id: v.id, name: v.name, viewType: v.view_type, filters: JSON.parse(v.filters), createdAt: v.created_at })));
});

router.post('/', (req, res) => {
  const { name, viewType, filters } = req.body;
  if (!name || !viewType || !filters) return res.status(400).json({ error: 'Name, viewType, and filters required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO saved_views (id, user_id, name, view_type, filters) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, name.trim(), viewType, JSON.stringify(filters));
  res.json({ id, name: name.trim(), viewType, filters, createdAt: new Date().toISOString() });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM saved_views WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
