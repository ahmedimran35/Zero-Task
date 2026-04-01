import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

function setupTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password TEXT, name TEXT, role TEXT, created_at TEXT, is_active INTEGER, avatar TEXT);
    CREATE TABLE automations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, trigger_type TEXT NOT NULL, trigger_condition TEXT DEFAULT '{}', action_type TEXT NOT NULL, action_config TEXT DEFAULT '{}', enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, description TEXT, status TEXT, priority TEXT, category TEXT, due_date TEXT, progress INTEGER, assignee TEXT, recurring_type TEXT, recurring_interval INTEGER, depends_on TEXT, project_id TEXT, story_points INTEGER, time_estimate INTEGER, completed_at TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE task_tags (task_id TEXT, tag TEXT);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT, title TEXT, message TEXT, task_id TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
  `);

  db.prepare('INSERT INTO users (id, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(
    'user-1', 'test@test.com', 'hash', 'Test User', 'user', 1
  );

  return db;
}

function executeAutomations(db: Database.Database, userId: string, triggerType: string, task: { id: string }, condition: Record<string, string> = {}) {
  const automations = db.prepare('SELECT * FROM automations WHERE user_id = ? AND trigger_type = ? AND enabled = 1').all(userId, triggerType) as any[];
  for (const auto of automations) {
    const cond = JSON.parse(auto.trigger_condition);
    if (cond.from && condition.from && cond.from !== condition.from) continue;
    if (cond.to && condition.to && cond.to !== condition.to) continue;
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

describe('executeAutomations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupTestDb();
    db.prepare(`INSERT INTO tasks (id, user_id, title, status, priority) VALUES (?, ?, ?, ?, ?)`).run(
      'task-1', 'user-1', 'Test Task', 'todo', 'medium'
    );
  });

  it('executes set_status automation on task_created', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-1', 'user-1', 'Auto-start', 'task_created', '{}', 'set_status', '{"status":"in-progress"}', 1
    );

    executeAutomations(db, 'user-1', 'task_created', { id: 'task-1' });
    const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get('task-1') as any;
    expect(task.status).toBe('in-progress');
  });

  it('executes set_priority automation on status_changed with matching condition', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-2', 'user-1', 'Urgent on review', 'status_changed', '{"to":"review"}', 'set_priority', '{"priority":"urgent"}', 1
    );

    executeAutomations(db, 'user-1', 'status_changed', { id: 'task-1' }, { from: 'in-progress', to: 'review' });
    const task = db.prepare('SELECT priority FROM tasks WHERE id = ?').get('task-1') as any;
    expect(task.priority).toBe('urgent');
  });

  it('does not execute when condition does not match', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-3', 'user-1', 'Only on review', 'status_changed', '{"to":"review"}', 'set_priority', '{"priority":"urgent"}', 1
    );

    executeAutomations(db, 'user-1', 'status_changed', { id: 'task-1' }, { from: 'todo', to: 'in-progress' });
    const task = db.prepare('SELECT priority FROM tasks WHERE id = ?').get('task-1') as any;
    expect(task.priority).toBe('medium');
  });

  it('executes add_tag automation', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-4', 'user-1', 'Tag on create', 'task_created', '{}', 'add_tag', '{"tag":"auto-created"}', 1
    );

    executeAutomations(db, 'user-1', 'task_created', { id: 'task-1' });
    const tag = db.prepare('SELECT tag FROM task_tags WHERE task_id = ?').get('task-1') as any;
    expect(tag.tag).toBe('auto-created');
  });

  it('executes notify automation', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-5', 'user-1', 'Due date alert', 'due_date_passed', '{}', 'notify', '{"message":"Task is overdue!"}', 1
    );

    executeAutomations(db, 'user-1', 'due_date_passed', { id: 'task-1' });
    const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ?').get('user-1') as any;
    expect(notif).toBeTruthy();
    expect(notif.message).toBe('Task is overdue!');
  });

  it('skips disabled automations', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-6', 'user-1', 'Disabled', 'task_created', '{}', 'set_status', '{"status":"done"}', 0
    );

    executeAutomations(db, 'user-1', 'task_created', { id: 'task-1' });
    const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get('task-1') as any;
    expect(task.status).toBe('todo');
  });

  it('executes multiple automations for same trigger', () => {
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-7', 'user-1', 'Set status', 'task_created', '{}', 'set_status', '{"status":"in-progress"}', 1
    );
    db.prepare(`INSERT INTO automations (id, user_id, name, trigger_type, trigger_condition, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'auto-8', 'user-1', 'Add tag', 'task_created', '{}', 'add_tag', '{"tag":"auto"}', 1
    );

    executeAutomations(db, 'user-1', 'task_created', { id: 'task-1' });
    const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get('task-1') as any;
    const tag = db.prepare('SELECT tag FROM task_tags WHERE task_id = ?').get('task-1') as any;
    expect(task.status).toBe('in-progress');
    expect(tag.tag).toBe('auto');
  });
});
