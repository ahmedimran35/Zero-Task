const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const taskDir = path.join(UPLOAD_DIR, req.params.taskId);
    if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });
    cb(null, taskDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// List attachments for a task
router.get('/:taskId', (req, res) => {
  const db = getDb();
  const attachments = db.prepare('SELECT * FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC').all(req.params.taskId);
  res.json(attachments.map(a => ({
    id: a.id, taskId: a.task_id, filename: a.filename, originalName: a.original_name,
    fileSize: a.file_size, mimeType: a.mime_type, createdAt: a.created_at,
    url: `/uploads/${a.task_id}/${a.filename}`,
  })));
});

// Upload file to a task
router.post('/:taskId', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO task_attachments (id, task_id, filename, original_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, req.params.taskId, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.userId
  );
  res.json({
    id, taskId: req.params.taskId, filename: req.file.filename, originalName: req.file.originalname,
    fileSize: req.file.size, mimeType: req.file.mimetype, createdAt: new Date().toISOString(),
    url: `/uploads/${req.params.taskId}/${req.file.filename}`,
  });
});

// Delete attachment
router.delete('/:id', (req, res) => {
  const db = getDb();
  const attachment = db.prepare('SELECT * FROM task_attachments WHERE id = ?').get(req.params.id);
  if (attachment) {
    const filePath = path.join(UPLOAD_DIR, attachment.task_id, attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM task_attachments WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

module.exports = router;
