const express = require('express');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// Get preferences
router.get('/', (req, res) => {
  const db = getDb();
  let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.userId);
  if (!prefs) {
    // Return defaults
    return res.json({
      taskAssigned: { inApp: true, email: true },
      taskDue: { inApp: true, email: true },
      mentionedInComment: { inApp: true, email: true },
      taskCompleted: { inApp: true, email: false },
      dailyDigest: { enabled: true },
    });
  }
  res.json(JSON.parse(prefs.preferences));
});

// Update preferences
router.put('/', (req, res) => {
  const db = getDb();
  const prefs = req.body;
  const existing = db.prepare('SELECT id FROM notification_preferences WHERE user_id = ?').get(req.userId);
  if (existing) {
    db.prepare('UPDATE notification_preferences SET preferences = ? WHERE user_id = ?').run(JSON.stringify(prefs), req.userId);
  } else {
    db.prepare('INSERT INTO notification_preferences (user_id, preferences) VALUES (?, ?)').run(req.userId, JSON.stringify(prefs));
  }
  res.json({ success: true });
});

module.exports = router;
