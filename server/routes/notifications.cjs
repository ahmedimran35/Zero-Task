const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(notifs.map(n => ({
    id: n.id, type: n.type, title: n.title, message: n.message,
    taskId: n.task_id, read: !!n.read, createdAt: n.created_at,
  })));
});

router.put('/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

router.delete('/', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

module.exports = router;
