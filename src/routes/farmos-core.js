const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, getAll, getOne, run } = require('../../config/database');
const { auth } = require('../../middleware/auth');

// =====================================================
// ORGANIZATIONS
// =====================================================

router.get('/organizations', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM organizations WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const orgs = getAll(sql, params);
    res.json({ ok: true, data: orgs, count: orgs.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/organizations/:id', auth, async (req, res) => {
  try {
    const org = getOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!org) return res.status(404).json({ ok: false, error: 'Organization not found' });
    const farms = getAll('SELECT * FROM farms WHERE org_id = ?', [org.id]);
    res.json({ ok: true, data: { ...org, farms } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/organizations', auth, async (req, res) => {
  try {
    const { name, email, phone, address, settings } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'name is required' });
    const id = `org-${uuidv4().slice(0, 8)}`;
    const { db } = require('../../config/database');
    db.run(`INSERT INTO organizations (id, name, email, phone, address, settings_json, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, name, email, phone, address, settings ? JSON.stringify(settings) : null]
    );
    const org = getOne('SELECT * FROM organizations WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: org });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/organizations/:id', auth, async (req, res) => {
  try {
    const existing = getOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Organization not found' });
    const { name, email, phone, address, settings, status } = req.body;
    const { db } = require('../../config/database');
    db.run(`UPDATE organizations SET 
           name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone),
           address = COALESCE(?, address), settings_json = COALESCE(?, settings_json),
           status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, email, phone, address, settings ? JSON.stringify(settings) : null, status, req.params.id]
    );
    const org = getOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: org });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/organizations/:id', auth, async (req, res) => {
  try {
    const existing = getOne('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Organization not found' });
    const { db } = require('../../config/database');
    db.run('UPDATE organizations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['deleted', req.params.id]);
    res.json({ ok: true, message: 'Organization deactivated' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// =====================================================
// PLANS (Seasonal Plans)
// =====================================================

router.get('/plans', auth, async (req, res) => {
  try {
    const { farm_id, status, season } = req.query;
    let sql = 'SELECT * FROM plans WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (season) { sql += ' AND season = ?'; params.push(season); }
    sql += ' ORDER BY start_date DESC';
    const plans = getAll(sql, params);
    res.json({ ok: true, data: plans, count: plans.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/plans/:id', auth, async (req, res) => {
  try {
    const plan = getOne('SELECT * FROM plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ ok: false, error: 'Plan not found' });
    const tasks = getAll('SELECT * FROM tasks WHERE plan_id = ? ORDER BY due_date', [plan.id]);
    res.json({ ok: true, data: { ...plan, tasks } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/plans', auth, async (req, res) => {
  try {
    const { farm_id, name, description, season, year, start_date, end_date, crop_id, status } = req.body;
    if (!name || !farm_id) return res.status(400).json({ ok: false, error: 'name and farm_id are required' });
    const id = `plan-${uuidv4().slice(0, 8)}`;
    const { db } = require('../../config/database');
    db.run(`INSERT INTO plans (id, farm_id, name, description, season, year, start_date, end_date, crop_id, status, progress, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, farm_id, name, description, season, year || new Date().getFullYear(), start_date, end_date, crop_id]
    );
    const plan = getOne('SELECT * FROM plans WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: plan });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/plans/:id', auth, async (req, res) => {
  try {
    const existing = getOne('SELECT * FROM plans WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Plan not found' });
    const { name, description, season, year, start_date, end_date, crop_id, status, progress } = req.body;
    const { db } = require('../../config/database');
    db.run(`UPDATE plans SET 
           name = COALESCE(?, name), description = COALESCE(?, description), season = COALESCE(?, season),
           year = COALESCE(?, year), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date),
           crop_id = COALESCE(?, crop_id), status = COALESCE(?, status), progress = COALESCE(?, progress),
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, description, season, year, start_date, end_date, crop_id, status, progress, req.params.id]
    );
    const plan = getOne('SELECT * FROM plans WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: plan });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// =====================================================
// ASSETS
// =====================================================

router.get('/assets', auth, async (req, res) => {
  try {
    const { farm_id, area_id, type, status } = req.query;
    let sql = 'SELECT * FROM assets WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (area_id) { sql += ' AND area_id = ?'; params.push(area_id); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY name';
    const assets = getAll(sql, params);
    res.json({ ok: true, data: assets, count: assets.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/assets/:id', auth, async (req, res) => {
  try {
    const asset = getOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ ok: false, error: 'Asset not found' });
    const history = getAll('SELECT * FROM asset_history WHERE asset_id = ? ORDER BY created_at DESC LIMIT 50', [asset.id]);
    res.json({ ok: true, data: { ...asset, history } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/assets', auth, async (req, res) => {
  try {
    const { farm_id, area_id, parent_id, name, type, model, serial_number, purchase_date, purchase_price, status } = req.body;
    if (!name || !type) return res.status(400).json({ ok: false, error: 'name and type are required' });
    const id = `asset-${uuidv4().slice(0, 8)}`;
    const { db } = require('../../config/database');
    db.run(`INSERT INTO assets (id, farm_id, area_id, parent_id, name, type, model, serial_number, purchase_date, purchase_price, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, farm_id, area_id, parent_id, name, type, model, serial_number, purchase_date, purchase_price]
    );
    db.run(`INSERT INTO asset_history (id, asset_id, action, description, created_at) VALUES (?, ?, 'created', 'Asset created', CURRENT_TIMESTAMP)`,
      [`history-${uuidv4().slice(0, 8)}`, id]
    );
    const asset = getOne('SELECT * FROM assets WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: asset });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/assets/:id', auth, async (req, res) => {
  try {
    const existing = getOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Asset not found' });
    const { name, type, model, serial_number, status, location, notes } = req.body;
    const { db } = require('../../config/database');
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (model !== undefined) { updates.push('model = ?'); params.push(model); }
    if (serial_number !== undefined) { updates.push('serial_number = ?'); params.push(serial_number); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);
      db.run(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const asset = getOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: asset });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// =====================================================
// QUANTITIES (Yield/Production Records)
// =====================================================

router.get('/quantities', auth, async (req, res) => {
  try {
    const { farm_id, area_id, crop_id, type, from_date, to_date } = req.query;
    let sql = 'SELECT q.*, a.name as area_name, c.name as crop_name FROM quantities q LEFT JOIN areas a ON q.area_id = a.id LEFT JOIN crops c ON q.crop_id = c.id WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND q.farm_id = ?'; params.push(farm_id); }
    if (area_id) { sql += ' AND q.area_id = ?'; params.push(area_id); }
    if (crop_id) { sql += ' AND q.crop_id = ?'; params.push(crop_id); }
    if (type) { sql += ' AND q.type = ?'; params.push(type); }
    if (from_date) { sql += ' AND q.record_date >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND q.record_date <= ?'; params.push(to_date); }
    sql += ' ORDER BY q.record_date DESC';
    const quantities = getAll(sql, params);
    res.json({ ok: true, data: quantities, count: quantities.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/quantities', auth, async (req, res) => {
  try {
    const { farm_id, area_id, crop_id, type, quantity, unit, quality_grade, notes, record_date } = req.body;
    if (!quantity || !type) return res.status(400).json({ ok: false, error: 'quantity and type are required' });
    const id = `qty-${uuidv4().slice(0, 8)}`;
    const { db } = require('../../config/database');
    db.run(`INSERT INTO quantities (id, farm_id, area_id, crop_id, type, quantity, unit, quality_grade, notes, record_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, farm_id, area_id, crop_id, type, quantity, unit, quality_grade, notes, record_date]
    );
    const qty = getOne('SELECT * FROM quantities WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: qty });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// =====================================================
// LOGS (Activity Logs)
// =====================================================

router.get('/logs', auth, async (req, res) => {
  try {
    const { farm_id, area_id, asset_id, type, from_date, to_date, limit } = req.query;
    let sql = 'SELECT l.*, f.name as farm_name, a.name as area_name FROM logs l LEFT JOIN farms f ON l.farm_id = f.id LEFT JOIN areas a ON l.area_id = a.id WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND l.farm_id = ?'; params.push(farm_id); }
    if (area_id) { sql += ' AND l.area_id = ?'; params.push(area_id); }
    if (asset_id) { sql += ' AND l.asset_id = ?'; params.push(asset_id); }
    if (type) { sql += ' AND l.type = ?'; params.push(type); }
    if (from_date) { sql += ' AND l.timestamp >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND l.timestamp <= ?'; params.push(to_date); }
    sql += ' ORDER BY l.timestamp DESC';
    if (limit) sql += ` LIMIT ${parseInt(limit)}`;
    const logs = getAll(sql, params);
    res.json({ ok: true, data: logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/logs', auth, async (req, res) => {
  try {
    const { farm_id, area_id, asset_id, worker_id, type, description, value, attachments, timestamp } = req.body;
    if (!type || !description) return res.status(400).json({ ok: false, error: 'type and description are required' });
    const id = `log-${uuidv4().slice(0, 8)}`;
    const { db } = require('../../config/database');
    db.run(`INSERT INTO logs (id, farm_id, area_id, asset_id, worker_id, type, description, value, attachments_json, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, farm_id, area_id, asset_id, worker_id, type, description, value, attachments ? JSON.stringify(attachments) : null, timestamp]
    );
    const log = getOne('SELECT * FROM logs WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: log });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;