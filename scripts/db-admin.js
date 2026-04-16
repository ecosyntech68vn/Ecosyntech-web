#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
// Use a temporary test DB path by default for admin operations in CI/QA
const TMP_DIR = path.resolve(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
const TMP_DB_PATH = path.resolve(TMP_DIR, `test-db-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB_PATH;

const db = require('../src/config/database');

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const arg2 = args[1];
  // initialize database in this admin context for all operations
  await db.initDatabase();
  switch (cmd) {
    case 'backup': {
      // Backup into same dir as DB file if possible
      const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'db.sqlite');
      const dbDir = path.dirname(dbPath);
      const base = path.basename(dbPath);
      const backupDir = path.resolve(dbDir, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.resolve(backupDir, `${base}.backup.${ts}.sqlite`);
      await db.exportDatabase(backupPath);
      console.log(`Backup saved to ${backupPath}`);
      break;
    }
    case 'restore': {
      if (!arg2) {
        console.error('Please provide backup file path to restore');
        process.exit(1);
      }
      const restorePath = path.resolve(arg2);
      await db.importFromFile(restorePath);
      console.log(`Database restored from ${restorePath}`);
      break;
    }
    case 'status': {
      const status = db.statusReport ? db.statusReport() : {};
      console.log('DB Status:', JSON.stringify(status, null, 2));
      break;
    }
    case 'migrate': {
      // Trigger a migrations pass if available
      if (typeof db.applyMigrations === 'function') {
        await db.applyMigrations();
        console.log('Migration applied (if any).');
      } else {
        console.log('Migration function not available in runtime.');
      }
      break;
    }
    case 'rollback': {
      // Rollback to latest backup in backups directory next to DB
      try {
        const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'db.sqlite');
        const dbDir = path.dirname(dbPath);
        const backupsDir = path.resolve(dbDir, 'backups');
        if (!fs.existsSync(backupsDir)) {
          console.log('No backups directory found for rollback');
          break;
        }
        const files = fs.readdirSync(backupsDir)
          .filter(n => n.endsWith('.sqlite'))
          .map(n => ({n, m: fs.statSync(path.join(backupsDir, n)).mtimeMs}))
          .sort((a,b) => b.m - a.m);
        if (files.length === 0) {
          console.log('No backup files found for rollback');
          break;
        }
        const latest = path.join(backupsDir, files[0].n);
        await db.importFromFile(latest);
        console.log('Rolled back to latest backup: ' + latest);
      } catch (e) {
        console.error('Rollback failed:', e.message);
      }
      break;
    }
    default:
      console.log('Usage: node scripts/db-admin.js backup [path] | restore <path> | status | migrate');
  }
}

main().catch(err => {
  console.error('DB Admin error:', err);
  process.exit(1);
});
