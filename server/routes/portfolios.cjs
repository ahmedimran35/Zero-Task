const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware);

// Get all portfolios
router.get('/', (req, res) => {
  const db = getDb();
  const portfolios = db.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM portfolio_projects pp WHERE pp.portfolio_id = p.id) as projectCount
    FROM portfolios p 
    WHERE p.user_id = ? 
    ORDER BY p.name
  `).all(req.userId);
  res.json(portfolios.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    projectCount: p.projectCount,
    createdAt: p.created_at,
  })));
});

// Get single portfolio with projects
router.get('/:id', (req, res) => {
  const db = getDb();
  const portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
  
  const portfolioProjects = db.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as taskCount,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as completedCount
    FROM projects p
    JOIN portfolio_projects pp ON pp.project_id = p.id
    WHERE pp.portfolio_id = ?
  `).all(portfolio.id);
  
  res.json({
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description,
    createdAt: portfolio.created_at,
    projects: portfolioProjects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      icon: p.icon,
      taskCount: p.taskCount,
      completedCount: p.completedCount,
      progress: p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0,
    })),
  });
});

// Create portfolio
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare('INSERT INTO portfolios (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, name.trim(), (description || '').trim(), now
  );
  
  res.json({
    id,
    name: name.trim(),
    description: (description || '').trim(),
    projectCount: 0,
    createdAt: now,
  });
});

// Update portfolio
router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  const db = getDb();
  
  const existing = db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Portfolio not found' });
  
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }
  
  if (updates.length) {
    params.push(req.params.id, req.userId);
    db.prepare(`UPDATE portfolios SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  }
  
  res.json({ success: true });
});

// Delete portfolio
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Portfolio not found' });
  
  db.prepare('DELETE FROM portfolio_projects WHERE portfolio_id = ?').run(req.params.id);
  db.prepare('DELETE FROM portfolios WHERE id = ?').run(req.params.id);
  
  res.json({ success: true });
});

// Add project to portfolio
router.post('/:id/projects', (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  
  const db = getDb();
  
  // Verify portfolio ownership
  const portfolio = db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
  
  // Verify project ownership
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  try {
    db.prepare('INSERT INTO portfolio_projects (portfolio_id, project_id) VALUES (?, ?)').run(req.params.id, projectId);
  } catch { /* already exists */ }
  
  res.json({ success: true });
});

// Remove project from portfolio
router.delete('/:id/projects/:projectId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM portfolio_projects WHERE portfolio_id = ? AND project_id = ?').run(req.params.id, req.params.projectId);
  res.json({ success: true });
});

module.exports = router;