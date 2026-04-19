const express = require('express');
const router = express.Router();
const { auth: authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackup,
  BACKUP_DIR
} = require('../services/backupRestoreService');

router.post('/create', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { includeMedia, compression } = req.body;
  const result = await createBackup({ includeMedia, compression });

  res.json(result);
}));

router.post('/restore', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { backupPath } = req.body;
  if (!backupPath) {
    return res.status(400).json({ error: 'backupPath required' });
  }

  const result = await restoreBackup(backupPath);
  res.json(result);
}));

router.get('/list', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const files = await listBackups();
  res.json({ success: true, backups: files, backupDir: BACKUP_DIR });
}));

router.post('/cleanup', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const result = await cleanupOldBackups();
  res.json({ success: true, ...result });
}));

router.post('/verify', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { backupPath } = req.body;
  if (!backupPath) {
    return res.status(400).json({ error: 'backupPath required' });
  }

  const result = await verifyBackup(backupPath);
  res.json(result);
}));

module.exports = router;