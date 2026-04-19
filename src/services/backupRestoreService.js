const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../config/logger');
const { getAll, runQuery, getOne } = require('../config/database');

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getBackupFilename(prefix = 'ecosyntech') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.db`;
}

async function createBackup(options = {}) {
  const { includeMedia = false, compression = true } = options;
  ensureBackupDir();

  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const timestamp = new Date();
  const filename = getBackupFilename();
  const backupPath = path.join(BACKUP_DIR, filename);

  try {
    fs.copyFileSync(dbPath, backupPath);
    logger.info(`[Backup] Database copied to ${backupPath}`);

    if (compression) {
      const compressedPath = backupPath + '.gz';
      execSync(`gzip -c "${backupPath}" > "${compressedPath}"`);
      fs.unlinkSync(backupPath);
      logger.info(`[Backup] Compressed to ${compressedPath}`);
      return { success: true, backupPath: compressedPath, originalPath: backupPath };
    }

    return { success: true, backupPath, originalPath: backupPath };
  } catch (error) {
    logger.error(`[Backup] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function restoreBackup(backupPath) {
  if (!fs.existsSync(backupPath)) {
    return { success: false, error: 'Backup file not found' };
  }

  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const tempPath = dbPath + '.restore.temp';

  try {
    if (backupPath.endsWith('.gz')) {
      execSync(`gunzip -c "${backupPath}" > "${tempPath}"`);
    } else {
      fs.copyFileSync(backupPath, tempPath);
    }

    fs.copyFileSync(tempPath, dbPath);
    fs.unlinkSync(tempPath);

    logger.info(`[Restore] Restored from ${backupPath}`);
    return { success: true, restoredPath: dbPath };
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    logger.error(`[Restore] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function listBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db') || f.endsWith('.db.gz'))
    .map(f => {
      const filePath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    })
    .sort((a, b) => new Date(b.modified) - new Date(a.modified));

  return files;
}

async function cleanupOldBackups() {
  const files = await listBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  let deletedCount = 0;
  for (const file of files) {
    if (new Date(file.modified) < cutoffDate) {
      fs.unlinkSync(file.path);
      deletedCount++;
      logger.info(`[Backup] Deleted old backup: ${file.filename}`);
    }
  }

  return { deletedCount, remaining: files.length - deletedCount };
}

async function verifyBackup(backupPath) {
  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';

  try {
    const SQL = require('sql.js');
    const SQL_MODIFIED_PATH = dbPath + '.verify.temp';
    let data;

    if (backupPath.endsWith('.gz')) {
      execSync(`gunzip -c "${backupPath}" > "${SQL_MODIFIED_PATH}"`);
      data = fs.readFileSync(SQL_MODIFIED_PATH);
      fs.unlinkSync(SQL_MODIFIED_PATH);
    } else {
      data = fs.readFileSync(backupPath);
    }

    const db = new SQL.Database(data);
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");

    db.close();

    return {
      valid: true,
      tables: tables[0]?.values?.map(t => t[0]) || [],
      size: fs.statSync(backupPath).size
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function autoBackupSchedule() {
  const lastBackup = await getOne(
    'SELECT value FROM settings WHERE key = ?',
    ['last_auto_backup']
  );

  const now = new Date();
  let shouldBackup = true;

  if (lastBackup) {
    const lastBackupDate = new Date(lastBackup.value);
    const hoursDiff = (now - lastBackupDate) / (1000 * 60 * 60);
    shouldBackup = hoursDiff >= 24;
  }

  if (shouldBackup) {
    const result = await createBackup();
    if (result.success) {
      runQuery(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['last_auto_backup', now.toISOString(), now.toISOString()]
      );
      logger.info('[Backup] Auto backup completed');
    }
  }

  return { triggered: shouldBackup };
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackup,
  autoBackupSchedule,
  BACKUP_DIR,
  RETENTION_DAYS
};