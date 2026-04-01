const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

// Public: get form definition (no auth required)
router.get('/:id', (req, res) => {
  const db = getDb();
  const form = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json({
    id: form.id, name: form.name, fields: JSON.parse(form.fields),
    settings: JSON.parse(form.settings || '{}'),
  });
});

// Public: submit form (no auth required)
router.post('/:id/submit', (req, res) => {
  const db = getDb();
  const form = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const fields = JSON.parse(form.fields);
  const settings = JSON.parse(form.settings || '{}');
  const { responses } = req.body;
  if (!responses) return res.status(400).json({ error: 'Responses required' });

  // Build task from form responses
  const title = responses[fields[0]?.id] || 'New form submission';
  const description = fields.map((f) => `**${f.label}**: ${responses[f.id] || 'N/A'}`).join('\n');
  const taskId = uuidv4();

  db.prepare(`INSERT INTO tasks (id, user_id, title, description, status, priority, category, due_date, progress, assignee, depends_on, story_points, time_estimate)
    VALUES (?, ?, ?, ?, 'todo', ?, ?, NULL, 0, ?, '[]', 0, 0)`).run(
    taskId, form.user_id, title, description,
    settings.defaultPriority || 'medium', settings.defaultCategory || 'Work',
    settings.defaultAssignee || null
  );

  db.prepare('INSERT INTO activity_log (id, task_id, type, message, timestamp) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), taskId, 'created', `Created from form: ${form.name}`, new Date().toISOString()
  );

  res.json({ success: true, message: settings.successMessage || 'Submission received!' });
});

// Authenticated routes for managing forms
router.use(authMiddleware);

// List forms
router.get('/', (req, res) => {
  const db = getDb();
  const forms = db.prepare('SELECT * FROM forms WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(forms.map((f) => ({
    id: f.id, name: f.name, fields: JSON.parse(f.fields),
    settings: JSON.parse(f.settings || '{}'), createdAt: f.created_at,
  })));
});

// Create form
router.post('/', (req, res) => {
  const { name, fields, settings } = req.body;
  if (!name || !fields) return res.status(400).json({ error: 'Name and fields required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO forms (id, user_id, name, fields, settings) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, name.trim(), JSON.stringify(fields), JSON.stringify(settings || {})
  );
  res.json({ id, name: name.trim(), fields, settings: settings || {}, createdAt: new Date().toISOString() });
});

// Delete form
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM forms WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
