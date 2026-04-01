const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// List goals with key results
router.get('/', (req, res) => {
  const db = getDb();
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const result = goals.map(g => {
    const krs = db.prepare('SELECT * FROM goal_key_results WHERE goal_id = ?').all(g.id);
    const progress = krs.length > 0 ? Math.round(krs.reduce((sum, kr) => sum + (kr.current_value / kr.target_value * 100), 0) / krs.length) : 0;
    return {
      id: g.id, title: g.title, description: g.description, category: g.category,
      status: g.status, targetDate: g.target_date, createdAt: g.created_at, updatedAt: g.updated_at,
      keyResults: krs.map(kr => ({ id: kr.id, goalId: kr.goal_id, title: kr.title, targetValue: kr.target_value, currentValue: kr.current_value, unit: kr.unit })),
      progress: Math.min(100, progress),
    };
  });
  res.json(result);
});

// Create goal
router.post('/', (req, res) => {
  const { title, description, category, targetDate, keyResults } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO goals (id, user_id, title, description, category, target_date) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.userId, title.trim(), (description || '').trim(), category || 'General', targetDate || null
  );
  const krs = [];
  if (keyResults?.length) {
    const ins = db.prepare('INSERT INTO goal_key_results (id, goal_id, title, target_value, current_value, unit) VALUES (?, ?, ?, ?, ?, ?)');
    for (const kr of keyResults) {
      const krId = uuidv4();
      ins.run(krId, id, kr.title, kr.targetValue || 100, 0, kr.unit || '%');
      krs.push({ id: krId, goalId: id, title: kr.title, targetValue: kr.targetValue || 100, currentValue: 0, unit: kr.unit || '%' });
    }
  }
  res.json({ id, title: title.trim(), description: (description || '').trim(), category: category || 'General', status: 'active', targetDate: targetDate || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), keyResults: krs, progress: 0 });
});

// Update goal
router.put('/:id', (req, res) => {
  const { title, description, category, status, targetDate } = req.body;
  const db = getDb();
  const updates = []; const params = [];
  if (title) { updates.push('title = ?'); params.push(title.trim()); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }
  if (category) { updates.push('category = ?'); params.push(category); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (targetDate !== undefined) { updates.push('target_date = ?'); params.push(targetDate || null); }
  if (updates.length) {
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id, req.userId);
    db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  }
  res.json({ success: true });
});

// Update key result value
router.put('/:goalId/key-results/:krId', (req, res) => {
  const { currentValue } = req.body;
  const db = getDb();
  db.prepare('UPDATE goal_key_results SET current_value = ? WHERE id = ? AND goal_id = ?').run(currentValue || 0, req.params.krId, req.params.goalId);
  db.prepare("UPDATE goals SET updated_at = datetime('now') WHERE id = ?").run(req.params.goalId);
  res.json({ success: true });
});

// Delete goal
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
