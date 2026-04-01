const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data', 'taskflow.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedDefaultData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT DEFAULT 'folder',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'Work',
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      progress INTEGER DEFAULT 0,
      assignee TEXT,
      recurring_type TEXT,
      recurring_interval INTEGER,
      depends_on TEXT DEFAULT '[]',
      project_id TEXT,
      story_points INTEGER DEFAULT 0,
      time_estimate INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (task_id, tag),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'sparkles',
      default_title TEXT DEFAULT '',
      default_description TEXT DEFAULT '',
      default_priority TEXT DEFAULT 'medium',
      default_category TEXT DEFAULT 'Work',
      default_subtasks TEXT DEFAULT '[]',
      default_tags TEXT DEFAULT '[]',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      task_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      status TEXT DEFAULT 'active',
      target_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goal_key_results (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      target_value REAL DEFAULT 100,
      current_value REAL DEFAULT 0,
      unit TEXT DEFAULT '%',
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_views (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      view_type TEXT NOT NULL,
      filters TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'planning',
      goal TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sprint_tasks (
      sprint_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      PRIMARY KEY (sprint_id, task_id),
      FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#3b82f6',
      icon TEXT DEFAULT 'folder',
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      field_type TEXT NOT NULL,
      options TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      task_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      value TEXT DEFAULT '',
      PRIMARY KEY (task_id, field_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT '',
      uploaded_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_condition TEXT DEFAULT '{}',
      action_type TEXT NOT NULL,
      action_config TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      secret TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      fields TEXT NOT NULL,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      preferences TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      structure TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration: add columns if they don't exist
  try { db.exec(`ALTER TABLE tasks ADD COLUMN project_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE tasks ADD COLUMN story_points INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE tasks ADD COLUMN time_estimate INTEGER DEFAULT 0`); } catch {}
}

function seedDefaultData() {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE id = ?').get('admin-default');
  if (!existingAdmin) {
    db.prepare(`INSERT INTO users (id, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'admin-default', 'admin@taskflow.com', 'admin123', 'Administrator', 'admin', 1
    );

    const defaultCategories = [
      { id: '1', name: 'Work', color: '#3b82f6', icon: 'briefcase' },
      { id: '2', name: 'Personal', color: '#10b981', icon: 'user' },
      { id: '3', name: 'Health', color: '#f43f5e', icon: 'heart' },
      { id: '4', name: 'Learning', color: '#8b5cf6', icon: 'book-open' },
      { id: '5', name: 'Finance', color: '#f59e0b', icon: 'dollar-sign' },
    ];

    const insertCat = db.prepare('INSERT INTO categories (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)');
    for (const cat of defaultCategories) {
      insertCat.run(cat.id, 'admin-default', cat.name, cat.color, cat.icon);
    }

    const defaultTemplates = [
      { id: 't1', name: 'Bug Report', icon: 'bug', default_title: '', default_description: 'Steps to reproduce:\n1.\n2.\n\nExpected:\n\nActual:', default_priority: 'high', default_category: 'Work', default_subtasks: JSON.stringify(['Reproduce issue', 'Identify root cause', 'Implement fix', 'Write tests']), default_tags: JSON.stringify(['bugfix']) },
      { id: 't2', name: 'Feature Request', icon: 'sparkles', default_title: '', default_description: 'User story:\n\nAs a [user], I want [feature] so that [benefit].\n\nAcceptance criteria:', default_priority: 'medium', default_category: 'Work', default_subtasks: JSON.stringify(['Design solution', 'Implement', 'Test', 'Deploy']), default_tags: JSON.stringify(['feature']) },
      { id: 't3', name: 'Meeting Notes', icon: 'calendar', default_title: '', default_description: 'Attendees:\n\nAgenda:\n\nNotes:\n\nAction items:', default_priority: 'low', default_category: 'Work', default_subtasks: JSON.stringify([]), default_tags: JSON.stringify(['meeting']) },
      { id: 't4', name: 'Weekly Review', icon: 'clipboard', default_title: 'Weekly Review', default_description: 'What went well:\n\nWhat to improve:\n\nGoals for next week:', default_priority: 'medium', default_category: 'Personal', default_subtasks: JSON.stringify(['Review completed tasks', 'Assess goals', 'Plan next week']), default_tags: JSON.stringify(['review', 'weekly']) },
      { id: 't5', name: 'Learning Goal', icon: 'book-open', default_title: '', default_description: 'Topic:\nResources:\nTime commitment:', default_priority: 'medium', default_category: 'Learning', default_subtasks: JSON.stringify(['Find resources', 'Create study plan', 'Practice', 'Review']), default_tags: JSON.stringify(['learning']) },
    ];

    const insertTmpl = db.prepare('INSERT INTO templates (id, user_id, name, icon, default_title, default_description, default_priority, default_category, default_subtasks, default_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const t of defaultTemplates) {
      insertTmpl.run(t.id, 'admin-default', t.name, t.icon, t.default_title, t.default_description, t.default_priority, t.default_category, t.default_subtasks, t.default_tags);
    }
  }
}

module.exports = { getDb };
