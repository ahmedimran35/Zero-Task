const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/users', require('./routes/users.cjs'));
app.use('/api/tasks', require('./routes/tasks.cjs'));
app.use('/api/categories', require('./routes/categories.cjs'));
app.use('/api/templates', require('./routes/templates.cjs'));
app.use('/api/notifications', require('./routes/notifications.cjs'));
app.use('/api/tickets', require('./routes/tickets.cjs'));
app.use('/api/goals', require('./routes/goals.cjs'));
app.use('/api/saved-views', require('./routes/saved-views.cjs'));
app.use('/api/sprints', require('./routes/sprints.cjs'));

// New routes
const automationsModule = require('./routes/automations.cjs');
app.use('/api/automations', automationsModule.router);
app.use('/api/custom-fields', require('./routes/custom-fields.cjs'));
app.use('/api/projects', require('./routes/projects.cjs'));
app.use('/api/attachments', require('./routes/attachments.cjs'));

const webhooksModule = require('./routes/webhooks.cjs');
app.use('/api/webhooks', webhooksModule.router);

// Export modules for use in other routes
app.set('executeAutomations', automationsModule.executeAutomations);
app.set('fireWebhooks', webhooksModule.fireWebhooks);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Due-date automation cron: check every 5 minutes for overdue tasks
const { getDb } = require('./db.cjs');
setInterval(() => {
  try {
    const db = getDb();
    const overdue = db.prepare(
      `SELECT * FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < datetime('now')`
    ).all();
    for (const task of overdue) {
      automationsModule.executeAutomations(db, task.user_id, 'due_date_passed', task, {});
    }
  } catch { /* ignore cron errors */ }
}, 5 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TaskFlow API server running on port ${PORT}`);
});
