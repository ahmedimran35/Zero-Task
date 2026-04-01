const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// List tickets - user sees own, admin sees all
router.get('/', (req, res) => {
  const db = getDb();
  const isAdmin = req.userRole === 'admin';

  let tickets;
  if (isAdmin) {
    tickets = db.prepare(`
      SELECT t.*, u.name as user_name, u.email as user_email, a.name as assigned_name,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      ORDER BY
        CASE t.status WHEN 'open' THEN 0 WHEN 'in-progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
        t.updated_at DESC
    `).all();
  } else {
    tickets = db.prepare(`
      SELECT t.*, u.name as user_name, u.email as user_email, a.name as assigned_name,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.user_id = ?
      ORDER BY
        CASE t.status WHEN 'open' THEN 0 WHEN 'in-progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
        t.updated_at DESC
    `).all(req.userId);
  }

  res.json(tickets.map(t => ({
    id: t.id, userId: t.user_id, userName: t.user_name, userEmail: t.user_email,
    subject: t.subject, description: t.description, status: t.status, priority: t.priority,
    assignedTo: t.assigned_to, assignedName: t.assigned_name,
    createdAt: t.created_at, updatedAt: t.updated_at, messageCount: t.message_count,
  })));
});

// Get unread ticket message notification count
router.get('/unread-count', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND type = 'ticket_message' AND read = 0"
  ).get(req.userId);
  res.json({ count: row.count });
});

// Get single ticket with messages
router.get('/:id', (req, res) => {
  const db = getDb();
  const ticket = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email, a.name as assigned_name
    FROM support_tickets t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN users a ON t.assigned_to = a.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.user_id !== req.userId && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const messages = db.prepare(`
    SELECT tm.*, u.name as user_name, u.role as user_role
    FROM ticket_messages tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE tm.ticket_id = ?
    ORDER BY tm.created_at ASC
  `).all(req.params.id);

  res.json({
    ticket: {
      id: ticket.id, userId: ticket.user_id, userName: ticket.user_name, userEmail: ticket.user_email,
      subject: ticket.subject, description: ticket.description, status: ticket.status, priority: ticket.priority,
      assignedTo: ticket.assigned_to, assignedName: ticket.assigned_name,
      createdAt: ticket.created_at, updatedAt: ticket.updated_at,
    },
    messages: messages.map(m => ({
      id: m.id, ticketId: m.ticket_id, userId: m.user_id,
      userName: m.user_name, userRole: m.user_role,
      message: m.message, createdAt: m.created_at,
    })),
  });
});

// Create ticket
router.post('/', (req, res) => {
  const { subject, description, priority } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'Subject and description required' });

  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO support_tickets (id, user_id, subject, description, priority) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, subject.trim(), description.trim(), priority || 'medium'
  );

  // Add initial message from the description
  const msgId = uuidv4();
  db.prepare('INSERT INTO ticket_messages (id, ticket_id, user_id, message) VALUES (?, ?, ?, ?)').run(
    msgId, id, req.userId, description.trim()
  );

  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
  res.json({
    id: ticket.id, userId: ticket.user_id, userName: req.user.name, userEmail: req.user.email,
    subject: ticket.subject, description: ticket.description, status: ticket.status, priority: ticket.priority,
    assignedTo: null, assignedName: null,
    createdAt: ticket.created_at, updatedAt: ticket.updated_at, messageCount: 1,
  });
});

// Update ticket (admin only)
router.put('/:id', adminMiddleware, (req, res) => {
  const { status, priority, assignedTo } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (priority) { updates.push('priority = ?'); params.push(priority); }
  if (assignedTo !== undefined) { updates.push('assigned_to = ?'); params.push(assignedTo || null); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const ticket = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email, a.name as assigned_name
    FROM support_tickets t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN users a ON t.assigned_to = a.id
    WHERE t.id = ?
  `).get(req.params.id);

  const msgCount = db.prepare('SELECT COUNT(*) as count FROM ticket_messages WHERE ticket_id = ?').get(req.params.id);

  res.json({
    id: ticket.id, userId: ticket.user_id, userName: ticket.user_name, userEmail: ticket.user_email,
    subject: ticket.subject, description: ticket.description, status: ticket.status, priority: ticket.priority,
    assignedTo: ticket.assigned_to, assignedName: ticket.assigned_name,
    createdAt: ticket.created_at, updatedAt: ticket.updated_at, messageCount: msgCount.count,
  });
});

// Add message to ticket
router.post('/:id/messages', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });

  const db = getDb();
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.user_id !== req.userId && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Don't allow messages on closed tickets
  if (ticket.status === 'closed') return res.status(400).json({ error: 'Cannot add messages to closed tickets' });

  const id = uuidv4();
  db.prepare('INSERT INTO ticket_messages (id, ticket_id, user_id, message) VALUES (?, ?, ?, ?)').run(
    id, req.params.id, req.userId, message.trim()
  );

  // Update ticket updated_at
  db.prepare("UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  // Create notification for the other party
  if (req.userRole === 'admin') {
    // Admin replied → notify ticket owner
    if (ticket.user_id !== req.userId) {
      db.prepare('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), ticket.user_id, 'ticket_message', 'Support Reply',
        `${req.user.name} replied to "${ticket.subject}"`
      );
    }
  } else {
    // User replied → notify all admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND id != ?").all(req.userId);
    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), admin.id, 'ticket_message', 'Support Ticket',
        `${req.user.name} replied to "${ticket.subject}"`
      );
    }
  }

  const msg = db.prepare(`
    SELECT tm.*, u.name as user_name, u.role as user_role
    FROM ticket_messages tm LEFT JOIN users u ON tm.user_id = u.id
    WHERE tm.id = ?
  `).get(id);

  res.json({
    id: msg.id, ticketId: msg.ticket_id, userId: msg.user_id,
    userName: msg.user_name, userRole: msg.user_role,
    message: msg.message, createdAt: msg.created_at,
  });
});

// Delete ticket (admin only)
router.delete('/:id', adminMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM support_tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });
  db.prepare('DELETE FROM support_tickets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
