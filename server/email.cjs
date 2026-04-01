const nodemailer = require('nodemailer');

function getTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ host, port, auth: { user, pass } });
}

async function sendEmail(to, subject, html) {
  const transport = getTransport();
  if (!transport) return false;
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, html,
    });
    return true;
  } catch {
    return false;
  }
}

function buildTaskAssignedEmail(taskTitle, assigneeName, taskUrl) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Task Assigned</h2>
      <p>Hi ${assigneeName}, you've been assigned a new task:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>${taskTitle}</strong>
      </div>
      <a href="${taskUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">View Task</a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">ZeroTask Notification</p>
    </div>
  `;
}

function buildDailyDigestEmail(userName, tasks, baseUrl) {
  const taskRows = tasks.map(t =>
    `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><a href="${baseUrl}">${t.title}</a></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.status}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.priority}</td></tr>`
  ).join('');

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Daily Digest</h2>
      <p>Hi ${userName}, here's your task summary:</p>
      ${tasks.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead><tr style="background: #f3f4f6;"><th style="padding: 8px; text-align: left;">Task</th><th style="padding: 8px; text-align: left;">Status</th><th style="padding: 8px; text-align: left;">Priority</th></tr></thead>
          <tbody>${taskRows}</tbody>
        </table>
      ` : '<p style="color: #6b7280;">No active tasks. Nice work!</p>'}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">ZeroTask Daily Digest</p>
    </div>
  `;
}

async function sendDailyDigest() {
  const { getDb } = require('./db.cjs');
  const db = getDb();
  const users = db.prepare('SELECT * FROM users WHERE is_active = 1').all();

  for (const user of users) {
    try {
      let prefs = {};
      const prefRow = db.prepare('SELECT preferences FROM notification_preferences WHERE user_id = ?').get(user.id);
      if (prefRow) prefs = JSON.parse(prefRow.preferences);
      if (prefs.dailyDigest && prefs.dailyDigest.enabled === false) continue;

      const tasks = db.prepare(
        `SELECT * FROM tasks WHERE user_id = ? AND status != 'done' ORDER BY priority DESC, due_date ASC LIMIT 20`
      ).all(user.id);

      if (tasks.length > 0) {
        const baseUrl = process.env.APP_URL || 'http://localhost:5173';
        const html = buildDailyDigestEmail(user.name, tasks, baseUrl);
        await sendEmail(user.email, 'ZeroTask Daily Digest', html);
      }
    } catch { /* skip user on error */ }
  }
}

module.exports = { sendEmail, sendDailyDigest, buildTaskAssignedEmail };
