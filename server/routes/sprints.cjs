const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// List sprints
router.get('/', (req, res) => {
  const db = getDb();
  const sprints = db.prepare('SELECT * FROM sprints WHERE user_id = ? ORDER BY start_date DESC').all(req.userId);
  res.json(sprints.map(s => {
    const tasks = db.prepare('SELECT task_id FROM sprint_tasks WHERE sprint_id = ?').all(s.id).map(t => t.task_id);
    return { id: s.id, name: s.name, startDate: s.start_date, endDate: s.end_date, status: s.status, goal: s.goal, createdAt: s.created_at, taskIds: tasks, totalTasks: tasks.length };
  }));
});

// Get sprint with task details
router.get('/:id', (req, res) => {
  const db = getDb();
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  const taskIds = db.prepare('SELECT task_id FROM sprint_tasks WHERE sprint_id = ?').all(sprint.id).map(t => t.task_id);
  const tasks = taskIds.length ? db.prepare(`SELECT * FROM tasks WHERE id IN (${taskIds.map(() => '?').join(',')})`).all(...taskIds) : [];
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  res.json({
    id: sprint.id, name: sprint.name, startDate: sprint.start_date, endDate: sprint.end_date,
    status: sprint.status, goal: sprint.goal, createdAt: sprint.created_at,
    taskIds, totalTasks: tasks.length, completedTasks,
    tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
  });
});

// Create sprint
router.post('/', (req, res) => {
  const { name, startDate, endDate, goal, taskIds } = req.body;
  if (!name || !startDate || !endDate) return res.status(400).json({ error: 'Name, startDate, and endDate required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO sprints (id, user_id, name, start_date, end_date, goal) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.userId, name.trim(), startDate, endDate, goal || '');
  if (taskIds?.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO sprint_tasks (sprint_id, task_id) VALUES (?, ?)');
    for (const tid of taskIds) ins.run(id, tid);
  }
  res.json({ id, name: name.trim(), startDate, endDate, status: 'planning', goal: goal || '', createdAt: new Date().toISOString(), taskIds: taskIds || [], totalTasks: (taskIds || []).length });
});

// Update sprint
router.put('/:id', (req, res) => {
  const { name, status, goal, startDate, endDate } = req.body;
  const db = getDb();
  const updates = []; const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (goal !== undefined) { updates.push('goal = ?'); params.push(goal); }
  if (startDate) { updates.push('start_date = ?'); params.push(startDate); }
  if (endDate) { updates.push('end_date = ?'); params.push(endDate); }
  if (updates.length) { params.push(req.params.id, req.userId); db.prepare(`UPDATE sprints SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params); }
  res.json({ success: true });
});

// Add task to sprint
router.post('/:id/tasks', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO sprint_tasks (sprint_id, task_id) VALUES (?, ?)').run(req.params.id, taskId);
  res.json({ success: true });
});

// Remove task from sprint
router.delete('/:id/tasks/:taskId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sprint_tasks WHERE sprint_id = ? AND task_id = ?').run(req.params.id, req.params.taskId);
  res.json({ success: true });
});

// Delete sprint
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sprints WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
