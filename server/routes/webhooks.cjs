const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// List webhooks
router.get('/', (req, res) => {
  const db = getDb();
  const hooks = db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(hooks.map(h => ({
    id: h.id, name: h.name, url: h.url, events: JSON.parse(h.events), enabled: !!h.enabled, createdAt: h.created_at,
  })));
});

// Create webhook
router.post('/', (req, res) => {
  const { name, url, events, secret } = req.body;
  if (!name || !url || !events?.length) return res.status(400).json({ error: 'Name, URL, and events required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO webhooks (id, user_id, name, url, events, secret) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.userId, name.trim(), url.trim(), JSON.stringify(events), secret || ''
  );
  res.json({ id, name: name.trim(), url: url.trim(), events, enabled: true, createdAt: new Date().toISOString() });
});

// Update webhook
router.put('/:id', (req, res) => {
  const { name, url, events, enabled } = req.body;
  const db = getDb();
  const updates = []; const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (url) { updates.push('url = ?'); params.push(url.trim()); }
  if (events) { updates.push('events = ?'); params.push(JSON.stringify(events)); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (updates.length) { params.push(req.params.id, req.userId); db.prepare(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params); }
  res.json({ success: true });
});

// Delete webhook
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Test webhook
router.post('/test/:id', (req, res) => {
  const db = getDb();
  const hook = db.prepare('SELECT * FROM webhooks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!hook) return res.status(404).json({ error: 'Webhook not found' });
  const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test webhook from TaskFlow' } };
  fetch(hook.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TaskFlow-Secret': hook.secret }, body: JSON.stringify(payload) })
    .then(r => res.json({ success: true, status: r.status }))
    .catch(err => res.json({ success: false, error: err.message }));
});

// Fire webhooks (internal use)
function fireWebhooks(db, userId, event, data) {
  try {
    const hooks = db.prepare('SELECT * FROM webhooks WHERE user_id = ? AND enabled = 1').all(userId);
    for (const hook of hooks) {
      const events = JSON.parse(hook.events);
      if (!events.includes(event)) continue;
      const payload = { event, timestamp: new Date().toISOString(), data };
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TaskFlow-Secret': hook.secret },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  } catch {}
}

module.exports = { router, fireWebhooks };
