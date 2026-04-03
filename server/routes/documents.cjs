const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// Get all documents
router.get('/', (req, res) => {
  const db = getDb();
  const docs = db.prepare(`
    SELECT d.*, 
      (SELECT COUNT(*) FROM documents d2 WHERE d2.parent_id = d.id) as childCount
    FROM documents d 
    WHERE d.user_id = ? 
    ORDER BY d.updated_at DESC
  `).all(req.userId);
  res.json(docs.map(d => ({
    id: d.id,
    title: d.title,
    content: d.content,
    parentId: d.parent_id,
    projectId: d.project_id,
    isPublic: !!d.is_public,
    childCount: d.childCount,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  })));
});

// Get single document
router.get('/:id', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    parentId: doc.parent_id,
    projectId: doc.project_id,
    isPublic: !!doc.is_public,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  });
});

// Create document
router.post('/', (req, res) => {
  const { title, content, parentId, projectId, isPublic } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO documents (id, user_id, title, content, parent_id, project_id, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, title.trim(), content || '', parentId || null, projectId || null, isPublic ? 1 : 0, now, now);
  
  res.json({
    id,
    title: title.trim(),
    content: content || '',
    parentId: parentId || null,
    projectId: projectId || null,
    isPublic: !!isPublic,
    createdAt: now,
    updatedAt: now,
  });
});

// Update document
router.put('/:id', (req, res) => {
  const { title, content, parentId, projectId, isPublic } = req.body;
  const db = getDb();
  
  // Verify ownership
  const existing = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Document not found' });
  
  const updates = ['updated_at = ?'];
  const params = [new Date().toISOString()];
  
  if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
  if (content !== undefined) { updates.push('content = ?'); params.push(content); }
  if (parentId !== undefined) { updates.push('parent_id = ?'); params.push(parentId); }
  if (projectId !== undefined) { updates.push('project_id = ?'); params.push(projectId); }
  if (isPublic !== undefined) { updates.push('is_public = ?'); params.push(isPublic ? 1 : 0); }
  
  params.push(req.params.id, req.userId);
  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  
  res.json({ success: true });
});

// Delete document
router.delete('/:id', (req, res) => {
  const db = getDb();
  
  // Verify ownership
  const existing = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Document not found' });
  
  // Update children to have no parent
  db.prepare('UPDATE documents SET parent_id = NULL WHERE parent_id = ?').run(req.params.id);
  // Delete the document
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  
  res.json({ success: true });
});

// Get documents for a project
router.get('/project/:projectId', (req, res) => {
  const db = getDb();
  const docs = db.prepare(`
    SELECT * FROM documents 
    WHERE project_id = ? AND user_id = ?
    ORDER BY title
  `).all(req.params.projectId, req.userId);
  res.json(docs.map(d => ({
    id: d.id,
    title: d.title,
    content: d.content,
    parentId: d.parent_id,
    projectId: d.project_id,
    isPublic: !!d.is_public,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  })));
});

module.exports = router;