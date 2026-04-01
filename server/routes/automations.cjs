const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM automations WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(r => ({
    id: r.id, name: r.name, triggerType: r.trigger_type, triggerCondition: JSON.parse(r.trigger_condition),
    actionType: r.action_type, actionConfig: JSON.parse(r.action_config), enabled: !!r.enabled, createdAt: r.created_at,
  })));
});

router.post('/', (req, res) => {
  const { name, triggerType, triggerCondition, actionType, actionConfig } = req.body;
  if (!name || !triggerType || !actionType) return res.status(400).json({ error: 'Name, triggerType, and actionType required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.userId, name.trim(), triggerType, JSON.stringify(triggerCondition || {}), actionType, JSON.stringify(actionConfig || {})
  );
  res.json({ id, name: name.trim(), triggerType, triggerCondition: triggerCondition || {}, actionType, actionConfig: actionConfig || {}, enabled: true, createdAt: new Date().toISOString() });
});

router.put('/:id', (req, res) => {
  const { name, triggerType, triggerCondition, actionType, actionConfig, enabled } = req.body;
  const db = getDb();
  const updates = []; const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (triggerType) { updates.push('trigger_type = ?'); params.push(triggerType); }
  if (triggerCondition) { updates.push('trigger_condition = ?'); params.push(JSON.stringify(triggerCondition)); }
  if (actionType) { updates.push('action_type = ?'); params.push(actionType); }
  if (actionConfig) { updates.push('action_config = ?'); params.push(JSON.stringify(actionConfig)); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (updates.length) { params.push(req.params.id, req.userId); db.prepare(`UPDATE automations SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM automations WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Execute automations for a task event
function executeAutomations(db, userId, triggerType, task, condition = {}) {
  const automations = db.prepare('SELECT * FROM automations WHERE user_id = ? AND trigger_type = ? AND enabled = 1').all(userId, triggerType);
  for (const auto of automations) {
    const cond = JSON.parse(auto.trigger_condition);
    // Check conditions
    if (cond.from && condition.from && cond.from !== condition.from) continue;
    if (cond.to && condition.to && cond.to !== condition.to) continue;
    // Execute action
    const config = JSON.parse(auto.action_config);
    switch (auto.action_type) {
      case 'set_status': db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(config.status, task.id); break;
      case 'set_priority': db.prepare('UPDATE tasks SET priority = ? WHERE id = ?').run(config.priority, task.id); break;
      case 'set_assignee': db.prepare('UPDATE tasks SET assignee = ? WHERE id = ?').run(config.assignee, task.id); break;
      case 'add_tag':
        db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)').run(task.id, config.tag);
        break;
      case 'notify':
        db.prepare('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)').run(
          uuidv4(), userId, 'info', auto.name, config.message || `Automation "${auto.name}" triggered`
        );
        break;
    }
  }
}

module.exports = { router, executeAutomations };
