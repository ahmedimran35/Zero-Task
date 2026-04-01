const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const fields = db.prepare('SELECT * FROM custom_fields WHERE user_id = ? ORDER BY created_at').all(req.userId);
  res.json(fields.map(f => ({ id: f.id, name: f.name, fieldType: f.field_type, options: JSON.parse(f.options), createdAt: f.created_at })));
});

router.post('/', (req, res) => {
  const { name, fieldType, options } = req.body;
  if (!name || !fieldType) return res.status(400).json({ error: 'Name and fieldType required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO custom_fields (id, user_id, name, field_type, options) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, name.trim(), fieldType, JSON.stringify(options || []));
  res.json({ id, name: name.trim(), fieldType, options: options || [], createdAt: new Date().toISOString() });
});

router.put('/:id', (req, res) => {
  const { name, options } = req.body;
  const db = getDb();
  const updates = []; const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (options) { updates.push('options = ?'); params.push(JSON.stringify(options)); }
  if (updates.length) { params.push(req.params.id, req.userId); db.prepare(`UPDATE custom_fields SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM custom_fields WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Get custom field values for a task
router.get('/values/:taskId', (req, res) => {
  const db = getDb();
  const values = db.prepare(`
    SELECT cfv.*, cf.name, cf.field_type, cf.options
    FROM custom_field_values cfv
    JOIN custom_fields cf ON cfv.field_id = cf.id
    WHERE cfv.task_id = ?
  `).all(req.params.taskId);
  res.json(values.map(v => ({ fieldId: v.field_id, name: v.name, fieldType: v.field_type, options: JSON.parse(v.options), value: v.value })));
});

// Set custom field value for a task
router.put('/values/:taskId/:fieldId', (req, res) => {
  const { value } = req.body;
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO custom_field_values (task_id, field_id, value) VALUES (?, ?, ?)').run(req.params.taskId, req.params.fieldId, value || '');
  res.json({ success: true });
});

module.exports = router;
