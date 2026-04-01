const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

function taskToApi(row, db) {
  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(row.id);
  const tags = db.prepare('SELECT tag FROM task_tags WHERE task_id = ?').all(row.id).map(t => t.tag);
  const comments = db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at').all(row.id);
  const timeLogs = db.prepare('SELECT * FROM time_logs WHERE task_id = ?').all(row.id);
  const activityLog = db.prepare('SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp').all(row.id);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progress: row.progress,
    assignee: row.assignee,
    recurring: row.recurring_type ? { type: row.recurring_type, interval: row.recurring_interval || 1 } : null,
    dependsOn: JSON.parse(row.depends_on || '[]'),
    completedAt: row.completed_at,
    subtasks: subtasks.map(s => ({ id: s.id, title: s.title, completed: !!s.completed })),
    tags,
    comments: comments.map(c => ({ id: c.id, text: c.text, author: c.author, createdAt: c.created_at })),
    timeLogs: timeLogs.map(t => ({ id: t.id, startTime: t.start_time, endTime: t.end_time, duration: t.duration })),
    activityLog: activityLog.map(a => ({ id: a.id, type: a.type, message: a.message, timestamp: a.timestamp })),
    projectId: row.project_id,
    storyPoints: row.story_points || 0,
    timeEstimate: row.time_estimate || 0,
  };
}

// List tasks
router.get('/', (req, res) => {
  const db = getDb();
  let tasks;
  if (req.userRole === 'admin' && req.query.userId) {
    tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.query.userId);
  } else {
    tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  }
  res.json(tasks.map(t => taskToApi(t, db)));
});

// Create task
router.post('/', (req, res) => {
  const db = getDb();
  const t = req.body;
  const id = t.id || uuidv4();

  db.prepare(`INSERT INTO tasks (id, user_id, title, description, status, priority, category, due_date, progress, assignee, recurring_type, recurring_interval, depends_on, project_id, story_points, time_estimate, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.userId, t.title, t.description || '', t.status || 'todo', t.priority || 'medium',
    t.category || 'Work', t.dueDate || null, t.progress || 0, t.assignee || null,
    t.recurring?.type || null, t.recurring?.interval || null,
    JSON.stringify(t.dependsOn || []), t.projectId || null, t.storyPoints || 0, t.timeEstimate || 0, t.completedAt || null
  );

  // Insert subtasks
  if (t.subtasks?.length) {
    const ins = db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)');
    for (const s of t.subtasks) ins.run(s.id || uuidv4(), id, s.title, s.completed ? 1 : 0);
  }

  // Insert tags
  if (t.tags?.length) {
    const ins = db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)');
    for (const tag of t.tags) ins.run(id, tag);
  }

  // Insert comments
  if (t.comments?.length) {
    const ins = db.prepare('INSERT INTO comments (id, task_id, text, author, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const c of t.comments) ins.run(c.id || uuidv4(), id, c.text, c.author, c.createdAt);
  }

  // Insert time logs
  if (t.timeLogs?.length) {
    const ins = db.prepare('INSERT INTO time_logs (id, task_id, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?)');
    for (const l of t.timeLogs) ins.run(l.id || uuidv4(), id, l.startTime, l.endTime, l.duration);
  }

  // Insert activity log
  if (t.activityLog?.length) {
    const ins = db.prepare('INSERT INTO activity_log (id, task_id, type, message, timestamp) VALUES (?, ?, ?, ?, ?)');
    for (const a of t.activityLog) ins.run(a.id || uuidv4(), id, a.type, a.message, a.timestamp);
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  // Fire webhooks
  try { const fireWebhooks = req.app.get('fireWebhooks'); if (fireWebhooks) fireWebhooks(db, req.userId, 'task.created', { id, title: t.title }); } catch {}
  res.json(taskToApi(row, db));
});

// Update task
router.put('/:id', (req, res) => {
  const db = getDb();
  const t = req.body;
  const taskId = req.params.id;

  // Verify ownership
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (existing.user_id !== req.userId && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Track changes for automations
  const statusChanged = existing.status !== t.status;
  const priorityChanged = existing.priority !== t.priority;

  db.prepare(`UPDATE tasks SET title=?, description=?, status=?, priority=?, category=?, due_date=?, progress=?, assignee=?,
    recurring_type=?, recurring_interval=?, depends_on=?, project_id=?, story_points=?, time_estimate=?, completed_at=?, updated_at=datetime('now') WHERE id=?`).run(
    t.title, t.description || '', t.status, t.priority, t.category, t.dueDate || null,
    t.progress || 0, t.assignee || null,
    t.recurring?.type || null, t.recurring?.interval || null,
    JSON.stringify(t.dependsOn || []), t.projectId || null, t.storyPoints || 0, t.timeEstimate || 0, t.completedAt || null, taskId
  );

  // Execute automations
  if (statusChanged || priorityChanged) {
    try {
      const { executeAutomations } = require('./automations.cjs');
      if (statusChanged) executeAutomations(db, req.userId, 'status_changed', { id: taskId }, { from: existing.status, to: t.status });
      if (priorityChanged) executeAutomations(db, req.userId, 'priority_changed', { id: taskId }, { from: existing.priority, to: t.priority });
    } catch { /* automations optional */ }
  }

  // Replace subtasks
  db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(taskId);
  if (t.subtasks?.length) {
    const ins = db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)');
    for (const s of t.subtasks) ins.run(s.id || uuidv4(), taskId, s.title, s.completed ? 1 : 0);
  }

  // Replace tags
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
  if (t.tags?.length) {
    const ins = db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)');
    for (const tag of t.tags) ins.run(taskId, tag);
  }

  // Add new comments (don't delete existing)
  if (t.comments?.length) {
    const existingComments = db.prepare('SELECT id FROM comments WHERE task_id = ?').all(taskId).map(c => c.id);
    const ins = db.prepare('INSERT OR IGNORE INTO comments (id, task_id, text, author, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const c of t.comments) {
      if (!existingComments.includes(c.id)) ins.run(c.id || uuidv4(), taskId, c.text, c.author, c.createdAt);
    }
  }

  // Add new time logs
  if (t.timeLogs?.length) {
    const existingLogs = db.prepare('SELECT id FROM time_logs WHERE task_id = ?').all(taskId).map(l => l.id);
    const ins = db.prepare('INSERT OR IGNORE INTO time_logs (id, task_id, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?)');
    for (const l of t.timeLogs) {
      if (!existingLogs.includes(l.id)) ins.run(l.id || uuidv4(), taskId, l.startTime, l.endTime, l.duration);
    }
  }

  // Add new activity entries
  if (t.activityLog?.length) {
    const existingActivity = db.prepare('SELECT id FROM activity_log WHERE task_id = ?').all(taskId).map(a => a.id);
    const ins = db.prepare('INSERT OR IGNORE INTO activity_log (id, task_id, type, message, timestamp) VALUES (?, ?, ?, ?, ?)');
    for (const a of t.activityLog) {
      if (!existingActivity.includes(a.id)) ins.run(a.id || uuidv4(), taskId, a.type, a.message, a.timestamp);
    }
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  // Fire webhooks
  try {
    const fireWebhooks = req.app.get('fireWebhooks');
    if (fireWebhooks) {
      const event = t.status === 'done' ? 'task.completed' : 'task.updated';
      fireWebhooks(db, req.userId, event, { id: taskId, title: t.title, status: t.status });
    }
  } catch {}
  res.json(taskToApi(row, db));
});

// Duplicate task
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (existing.user_id !== req.userId && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const newId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO tasks (id, user_id, title, description, status, priority, category, due_date, progress, assignee, recurring_type, recurring_interval, depends_on, completed_at)
    VALUES (?, ?, ?, ?, 'todo', ?, ?, NULL, 0, ?, ?, ?, '[]', NULL)`).run(
    newId, req.userId, existing.title + ' (Copy)', existing.description,
    existing.priority, existing.category, existing.assignee,
    existing.recurring_type, existing.recurring_interval
  );

  // Duplicate subtasks (reset completed)
  const origSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(req.params.id);
  if (origSubtasks.length) {
    const ins = db.prepare('INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, 0)');
    for (const s of origSubtasks) ins.run(uuidv4(), newId, s.title);
  }

  // Duplicate tags
  const origTags = db.prepare('SELECT tag FROM task_tags WHERE task_id = ?').all(req.params.id);
  if (origTags.length) {
    const ins = db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)');
    for (const t of origTags) ins.run(newId, t.tag);
  }

  // Add creation activity
  db.prepare('INSERT INTO activity_log (id, task_id, type, message, timestamp) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), newId, 'created', 'Task created from duplicate', now
  );

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(newId);
  res.json(taskToApi(row, db));
});

// Delete task
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (existing.user_id !== req.userId && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
