const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db.cjs');
const { JWT_SECRET } = require('../middleware/auth.cjs');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) return res.status(401).json({ error: 'No account found with this email' });
  if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated. Contact admin.' });

  let passwordMatch = false;

  if (user.password.startsWith('$2b$')) {
    passwordMatch = await bcrypt.compare(password, user.password);
  } else {
    passwordMatch = user.password === password;
    if (passwordMatch) {
      const hashed = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
    }
  }

  if (!passwordMatch) return res.status(401).json({ error: 'Incorrect password' });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
  });
});

router.get('/session', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.json(null);

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.json(null);
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, name, role, avatar FROM users WHERE id = ? AND is_active = 1').get(decoded.userId);
  res.json(user || null);
});

module.exports = router;
