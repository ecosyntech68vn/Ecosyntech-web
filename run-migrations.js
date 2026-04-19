#!/usr/bin/env node
/**
 * EcoSynTech FarmOS PRO - Migration Runner
 * Run migrations in order: schema → seeders
 * Usage: node run-migrations.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './data/ecosyntech.db';

const MIGRATIONS_DIR = './migrations';
const SEEDERS_DIR = './seeders';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runSQLFile(db, filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  
  console.log(`  Running ${path.basename(filePath)}...`);
  
  let count = 0;
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        db.exec(stmt);
        count++;
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`    (skipped - already exists)`);
        } else {
          throw err;
        }
      }
    }
  }
  console.log(`    ✓ ${count} statements executed`);
}

function main() {
  ensureDir('./data');
  
  console.log('\n🗄️  EcoSynTech FarmOS PRO - Migration Runner\n');
  console.log(`Database: ${DB_PATH}\n`);
  
  let db;
  try {
    db = new Database(DB_PATH);
    console.log('✓ Database connected\n');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
  
  try {
    // Run migrations
    console.log('📦 Running Migrations:');
    if (fs.existsSync(MIGRATIONS_DIR)) {
      const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      for (const file of migrationFiles) {
        runSQLFile(db, path.join(MIGRATIONS_DIR, file));
      }
    } else {
      console.log('  No migrations found');
    }
    
    // Run seeders
    console.log('\n🌱 Running Seeders:');
    if (fs.existsSync(SEEDERS_DIR)) {
      const seederFiles = fs.readdirSync(SEEDERS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      for (const file of seederFiles) {
        runSQLFile(db, path.join(SEEDERS_DIR, file));
      }
    } else {
      console.log('  No seeders found');
    }
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Show stats
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get(),
      farms: db.prepare('SELECT COUNT(*) as count FROM farms').get(),
      crops: db.prepare('SELECT COUNT(*) as count FROM crops').get(),
      aquaculture: db.prepare('SELECT COUNT(*) as count FROM aquaculture').get(),
    };
    
    console.log('📊 Database Stats:');
    console.log(`  Users: ${stats.users.count}`);
    console.log(`  Farms: ${stats.farms.count}`);
    console.log(`  Crops: ${stats.crops.count}`);
    console.log(`  Aquaculture: ${stats.aquaculture.count}`);
    console.log('');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();