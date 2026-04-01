const { getDb } = require('../db.cjs');

function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found or inactive' });
  }

  req.userId = userId;
  req.userRole = userRole || user.role;
  req.user = user;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
