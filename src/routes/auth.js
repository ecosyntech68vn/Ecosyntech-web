const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAll, getOne, runQuery } = require('../config/database');
const { validateMiddleware } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const config = require('../config');
const logger = require('../config/logger');

router.post('/register', validateMiddleware('auth.register'), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  
  const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `user-${Date.now()}`;
  
  runQuery(
    'INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [id, email, hashedPassword, name, 'user']
  );
  
  const token = jwt.sign(
    { id, email, name, role: 'user' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  logger.info(`User registered: ${email}`);
  
  res.status(201).json({
    user: { id, email, name, role: 'user' },
    token
  });
}));

router.post('/login', validateMiddleware('auth.login'), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  logger.info(`User logged in: ${email}`);
  
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = getOne('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  
  if (name) {
    runQuery('UPDATE users SET name = ?, updated_at = datetime("now") WHERE id = ?', [name, req.user.id]);
  }
  
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    runQuery('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [hashedPassword, req.user.id]);
  }
  
  const user = getOne('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id]);
  
  res.json(user);
}));

module.exports = router;
