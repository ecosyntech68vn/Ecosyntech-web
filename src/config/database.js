const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const config = require('./index');
const logger = require('./logger');

let db = null;
let SQL = null;

async function initDatabase() {
  const dbDir = path.dirname(config.database.path);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(config.database.path)) {
    const fileBuffer = fs.readFileSync(config.database.path);
    db = new SQL.Database(fileBuffer);
    logger.info('Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('Created new database');
  }

  createTables();
  seedInitialData();
  saveDatabase();
  
  logger.info('Database initialized successfully');
  return db;
}

function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
  } catch (err) {
    logger.error('Failed to save database:', err);
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      zone TEXT,
      status TEXT DEFAULT 'offline',
      config TEXT DEFAULT '{}',
      last_seen TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      type TEXT UNIQUE NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      min_value REAL,
      max_value REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      condition TEXT NOT NULL,
      action TEXT NOT NULL,
      cooldown_minutes INTEGER DEFAULT 30,
      hysteresis REAL DEFAULT 0,
      time_window TEXT,
      priority TEXT DEFAULT 'normal',
      target_device TEXT,
      trigger_count INTEGER DEFAULT 0,
      last_triggered TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled)');

  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      zones TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      days TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      trigger TEXT,
      status TEXT DEFAULT 'success',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      sensor TEXT,
      value REAL,
      message TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      device_id TEXT,
      user_id TEXT,
      name TEXT,
      permissions TEXT DEFAULT '[]',
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      command TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      delivered_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_batches (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      product_type TEXT,
      quantity REAL,
      unit TEXT,
      farm_name TEXT,
      zone TEXT,
      seed_variety TEXT,
      planting_date TEXT,
      expected_harvest TEXT,
      harvest_date TEXT,
      harvest_quantity REAL,
      harvest_notes TEXT,
      status TEXT DEFAULT 'active',
      metadata TEXT DEFAULT '{}',
      farm_address TEXT,
      farm_certifications TEXT DEFAULT '[]',
      buyer_name TEXT,
      buyer_contact TEXT,
      export_date TEXT,
      export_price REAL,
      export_unit TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_stages (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_type TEXT NOT NULL,
      stage_order INTEGER DEFAULT 0,
      description TEXT,
      performed_by TEXT,
      location TEXT,
      inputs_used TEXT DEFAULT '[]',
      photos TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES traceability_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_readings (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      device_id TEXT,
      sensor_type TEXT,
      value REAL,
      unit TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES traceability_batches(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batches (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      farm_id TEXT,
      area_id TEXT,
      season_id TEXT,
      asset_id TEXT,
      product_name TEXT NOT NULL,
      product_type TEXT,
      batch_code TEXT UNIQUE,
      harvest_date TEXT,
      produced_quantity REAL,
      unit TEXT DEFAULT 'kg',
      quality_grade TEXT,
      status TEXT DEFAULT 'created',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batch_events (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT DEFAULT 'user',
      actor_id TEXT,
      related_log_id TEXT,
      related_quantity_id TEXT,
      related_inventory_id TEXT,
      location_json TEXT,
      note TEXT,
      event_time TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batch_inputs (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      input_type TEXT NOT NULL,
      input_name TEXT,
      supplier_name TEXT,
      quantity REAL,
      unit TEXT,
      used_at TEXT,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batch_quality_checks (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      check_type TEXT NOT NULL,
      result TEXT,
      score REAL,
      details_json TEXT,
      checked_by TEXT,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_packages (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      package_code TEXT UNIQUE,
      barcode TEXT UNIQUE,
      qr_code TEXT UNIQUE,
      net_weight REAL,
      unit TEXT DEFAULT 'kg',
      packaging_type TEXT,
      packed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'created',
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_shipments (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      shipment_code TEXT UNIQUE,
      customer_name TEXT,
      destination TEXT,
      transport_type TEXT,
      status TEXT DEFAULT 'preparing',
      shipped_at TEXT,
      delivered_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_shipment_items (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      quantity REAL,
      unit TEXT DEFAULT 'kg',
      FOREIGN KEY (shipment_id) REFERENCES tb_shipments(id),
      FOREIGN KEY (package_id) REFERENCES tb_packages(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_recall_incidents (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      incident_type TEXT,
      severity TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_qr_codes (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      code_type TEXT DEFAULT 'qr',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rule_history (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      sensor_value REAL,
      triggered INTEGER DEFAULT 0,
      action_taken TEXT,
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rule_id) REFERENCES rules(id)
    )
  `);

  try {
    db.run('CREATE INDEX idx_rule_history_rule_id ON rule_history(rule_id)');
    db.run('CREATE INDEX idx_rule_history_executed_at ON rule_history(executed_at)');
  } catch (e) {
    logger.warn('[Database] Index creation skipped:', e.message);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY,
      sensor_type TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_firmwares (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      description TEXT,
      device_type TEXT NOT NULL,
      file_url TEXT,
      checksum TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ota_updates (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      firmware_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_config_history (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      old_config TEXT,
      new_config TEXT,
      changed_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variety TEXT,
      planting_date TEXT,
      expected_harvest TEXT,
      harvest_date TEXT,
      harvest_quantity REAL,
      kc_stage TEXT DEFAULT '{}',
      area REAL,
      unit TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_stages (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_order INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crop_id) REFERENCES crops(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_yields (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      harvest_date TEXT,
      quantity REAL,
      quality TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crop_id) REFERENCES crops(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ip_whitelist (
      id TEXT PRIMARY KEY,
      ip TEXT UNIQUE NOT NULL,
      description TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      user_id TEXT,
      details TEXT DEFAULT '{}',
      ip TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      token TEXT,
      ip TEXT,
      user_agent TEXT,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      settings TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      area REAL,
      area_unit TEXT DEFAULT 'hectare',
      owner_id TEXT,
      settings TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ota_history (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      current_version TEXT,
      target_version TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      phone TEXT,
      farm_id TEXT,
      daily_rate REAL,
      status TEXT DEFAULT 'active',
      hire_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS worker_attendance (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      hours_worked REAL,
      task TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS supply_chain (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      source_farm_id TEXT,
      destination TEXT,
      status TEXT DEFAULT 'pending',
      harvest_date TEXT,
      shipped_date TEXT,
      delivered_date TEXT,
      temperature REAL,
      humidity REAL,
      quality_check TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      quantity REAL DEFAULT 0,
      min_quantity REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      supplier TEXT,
      farm_id TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_log (
      id TEXT PRIMARY KEY,
      inventory_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS finance (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      farm_id TEXT,
      date TEXT NOT NULL,
      payment_method TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS finance_summary (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      income REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      workers_cost REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(farm_id, year, month)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'active',
      framework TEXT DEFAULT 'rules',
      input_schema TEXT DEFAULT '{}',
      output_schema TEXT DEFAULT '{}',
      metrics TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      model_id TEXT,
      farm_id TEXT,
      asset_id TEXT,
      job_type TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      input_data TEXT DEFAULT '{}',
      output_data TEXT DEFAULT '{}',
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      model_id TEXT,
      asset_id TEXT,
      target_type TEXT NOT NULL,
      target_time TEXT,
      predicted_value TEXT,
      confidence REAL,
      explanation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      prediction_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      suggested_action TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      device_id TEXT,
      asset_id TEXT,
      metric TEXT NOT NULL,
      expected_range TEXT,
      actual_value REAL,
      severity TEXT DEFAULT 'low',
      status TEXT DEFAULT 'open',
      detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
      acknowledged_by TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_feedback (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT,
      prediction_id TEXT,
      user_id TEXT,
      feedback_type TEXT NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_vi TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      kc_initial REAL DEFAULT 0.4,
      kc_mid REAL DEFAULT 1.0,
      kc_end REAL DEFAULT 0.7,
      min_temp REAL,
      max_temp REAL,
      optimal_temp_min REAL,
      optimal_temp_max REAL,
      min_humidity REAL,
      max_humidity REAL,
      min_soil_moisture REAL,
      max_soil_moisture REAL,
      min_light_lux INTEGER,
      max_light_lux INTEGER,
      optimal_light_lux INTEGER,
      growth_days INTEGER,
      seed_depth REAL,
      row_spacing REAL,
      plant_spacing REAL,
      water_requirement REAL,
      fertilizer_type TEXT,
      fertilizer_n REAL,
      fertilizer_p REAL,
      fertilizer_k REAL,
      ph_optimal_min REAL,
      ph_optimal_max REAL,
      stages TEXT,
      disease_risk TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_plantings (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      crop_id TEXT NOT NULL,
      area REAL,
      area_unit TEXT DEFAULT 'hectare',
      planting_date TEXT,
      expected_harvest_date TEXT,
      actual_harvest_date TEXT,
      status TEXT DEFAULT 'growing',
      current_stage TEXT DEFAULT 'gieo_hat',
      yield_expected REAL,
      yield_actual REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS aquaculture (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_vi TEXT,
      category TEXT NOT NULL,
      optimal_temp_min REAL,
      optimal_temp_max REAL,
      optimal_ph_min REAL,
      optimal_ph_max REAL,
      optimal_do REAL,
      optimal_salinity REAL,
      growth_days INTEGER,
      density_max REAL,
      feed_conversion_ratio REAL,
      water_change_rate REAL,
      disease_risk TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info('Database tables created');
}

function seedCropData() {
  // Skip ALL seeding for now - to be fixed later
  return;
  
  let canSeed = false;
  try {
    const info = db.exec("PRAGMA table_info(crops)");
    const cols = (info[0]?.values || []).map(r => r[1]);
    canSeed = cols.includes('name') && cols.includes('name_vi');
  } catch(e) { canSeed = false; }
  
  const cropCount = db.exec('SELECT COUNT(*) as count FROM crops')[0]?.values[0][0] || 0;
  
  if (cropCount === 0 && canSeed) {
    const crops = [
      ['crop-rau-muong', 'Water Spinach', 'Rau muống', 'rau_an_la', 'thuy sinh', 0.45, 1.1, 0.8, 20, 35, 25, 32, 75, 95, 20, 85, 25000, 55000, 35000, 35, 2, '15x20', '10x15', '2500', 'NPK 46:0:0', 46, 0, 0, 5.5, 7.0, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'caterpillars,snails'],
      ['crop-xa-lach', 'Lettuce', 'Xà lách', 'rau_an_la', 'thu', 0.4, 0.95, 0.75, 15, 25, 18, 22, 75, 95, 20, 75, 20000, 45000, 30000, 30, 1, '25x30', '20x25', '2500', 'NPK 20:20:20', 20, 20, 20, 6.0, 7.0, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'downy_mildew,aphids'],
      ['crop-bap-cai', 'Cabbage', 'Bắp cải', 'rau_an_la', 'thu', 0.4, 0.95, 0.8, 12, 25, 18, 22, 70, 90, 20, 75, 25000, 50000, 35000, 70, 2, '60x60', '45x50', '3500', 'NPK 46:0:0', 46, 0, 0, 6.0, 7.5, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'loopers,black_rot'],
      ['crop-cai-ngot', 'Chinese Broccoli', 'Cải ngọt', 'rau_an_la', 'thu', 0.4, 1.0, 0.8, 15, 28, 20, 25, 75, 95, 20, 80, 22000, 48000, 32000, 35, 1.5, '30x40', '20x25', '3000', 'NPK 46:0:0', 46, 0, 0, 6.0, 7.0, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'aphids,flea_beetle'],
      ['crop-cai-rot', 'Pak Choi', 'Cải củ', 'rau_an_cu', 'thu', 0.35, 0.9, 0.7, 15, 28, 20, 24, 65, 90, 18, 75, 25000, 50000, 35000, 60, 2, '30x40', '15x20', '3500', 'NPK 16:16:8', 16, 16, 8, 6.0, 7.0, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'clubroot,flea_beetle'],
      ['crop-cu-cai', 'Turnip', 'Củ cải', 'rau_an_cu', 'thu', 0.35, 0.9, 0.7, 12, 26, 18, 22, 65, 90, 18, 75, 20000, 45000, 30000, 70, 2, '30x40', '12x15', '4000', 'NPK 0:0:60', 0, 0, 60, 6.0, 7.0, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'aphids'],
      ['crop-dua-leo', 'Cucumber', 'Dưa leo', 'rau_an_qua', 'leo', 0.45, 0.95, 0.7, 18, 32, 22, 28, 70, 95, 18, 75, 35000, 55000, 40000, 60, 2, '150x200', '40x50', '3500', 'NPK 30:10:10', 30, 10, 10, 5.5, 7.0, 'gieo_hat,cay_con,ra_hoa,thu_hoach', 'powdery_mildew,cucumber_beetle'],
      ['crop-khoai-lang', 'Sweet Potato', 'Khoai lang', 'rau_an_cu', 'leo', 0.4, 1.0, 0.7, 20, 35, 24, 32, 60, 85, 15, 70, 35000, 65000, 45000, 120, 10, '80x100', '30x40', '15000', 'NPK 0:0:60', 0, 0, 60, 5.5, 6.5, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'wireworm,weevils'],
      ['crop-khoai-tay', 'Potato', 'Khoai tây', 'rau_an_cu', 'thu', 0.4, 1.05, 0.75, 12, 25, 18, 22, 70, 95, 15, 80, 30000, 55000, 40000, 90, 8, '70x80', '25x30', '4500', 'NPK 20:20:20', 20, 20, 20, 5.0, 6.5, 'gieo_hat,cay_con,sinh_truong,thu_hoach', 'late_blight,colorado_beetle'],
      ['crop-bap-non', 'Baby Corn', 'Bắp non', 'rau_an_qua', 'thu', 0.4, 1.1, 0.65, 20, 35, 24, 30, 60, 85, 18, 75, 35000, 60000, 40000, 65, 3, '75x90', '25x30', '5000', 'NPK 46:0:0', 46, 0, 0, 5.5, 7.0, 'gieo_hat,cay_con,ra_hoa,thu_hoach', 'corn_borer,armyworm'],
      ['crop-ca-chua', 'Tomato', 'Cà chua', 'rau_an_qua', 'leo', 0.4, 1.05, 0.7, 18, 32, 22, 28, 65, 90, 15, 75, 40000, 60000, 45000, 85, 1.5, '120x150', '45x55', '4000', 'NPK 20:20:20', 20, 20, 20, 6.0, 6.8, 'gieo_hat,cay_con,ra_hoa,thu_hoach', 'late_blight,wilt,nematodes'],
      ['crop-ot-chuong', 'Chili Pepper', 'Ớt chuông', 'rau_an_qua', 'leo', 0.35, 1.0, 0.7, 22, 35, 25, 30, 65, 85, 15, 70, 30000, 55000, 40000, 90, 1, '60x90', '40x50', '2500', 'NPK 10:10:20', 10, 10, 20, 6.0, 7.0, 'gieo_hat,cay_con,ra_hoa,thu_hoach', 'mosaic,anthracnose'],
      ['crop-den-luoc', 'Black Pepper', 'Tiêu đen', 'cay_chen', 'leo', 0.45, 0.95, 0.8, 22, 32, 25, 30, 70, 90, 20, 75, 40000, 65000, 50000, 365, 5, '200x250', '100x150', '8000', 'NPK 30:10:10', 30, 10, 10, 5.5, 6.5, 'gieo_hat,sinh_can,bong,thu_hoach', ' Phytophthora'],
      ['crop-ca-phe', 'Coffee', 'Cà phê', 'cay_chen', 'thu', 0.4, 0.9, 0.7, 18, 28, 22, 26, 70, 90, 20, 75, 45000, 65000, 50000, 180, 4, '200x250', '100x150', '2500', 'NPK 20:10:10', 20, 10, 10, 5.0, 6.0, 'gieo_hat,sinh_can,bong,thu_hoach', 'coffee_rust,nematodes'],
      ['crop-cau-ky', 'Grape', 'Nho', 'cay_an_qua', 'leo', 0.45, 0.95, 0.75, 18, 35, 24, 30, 60, 80, 18, 70, 40000, 60000, 45000, 150, 3, '250x300', '120x180', '4000', 'NPK 20:20:20', 20, 20, 20, 6.5, 7.5, 'giai_coi,sinh_can,ra_hoa,thu_hoach', 'powdery_mildew,downy_mildew'],
      ['crop-xoai', 'Mango', 'Xoài', 'cay_an_qua', 'thu', 0.4, 0.85, 0.65, 22, 36, 26, 32, 60, 85, 20, 70, 45000, 65000, 50000, 180, 5, '800x1000', '400x500', '5000', 'NPK 0:0:60', 0, 0, 60, 6.0, 7.0, 'sinh_can,bong,phan_qua,thu_hoach', 'anthracnose,mango_midge'],
      ['crop-quyt', 'Mandarin', 'Quýt', 'cay_an_qua', 'thu', 0.4, 0.85, 0.65, 18, 34, 24, 30, 65, 85, 20, 70, 35000, 55000, 40000, 180, 4, '400x500', '200x300', '4000', 'NPK 15:15:15', 15, 15, 15, 6.0, 7.0, 'sinh_can,bong,phan_qua,thu_hoach', 'citrus_greening,psyllids'],
      ['crop-chuoi', 'Banana', 'Chuối', 'cay_an_qua', 'thu', 0.5, 1.1, 0.9, 22, 32, 26, 30, 70, 90, 25, 80, 40000, 60000, 45000, 270, 4, '200x250', '100x150', '6000', 'NPK 15:10:20', 15, 10, 20, 5.5, 7.0, 'sinh_can,tao_bung,thu_hoach', 'panama_fusarium'],
      ['crop-du-ha', 'Passion Fruit', 'Chanh leo', 'cay_an_qua', 'leo', 0.45, 1.0, 0.75, 20, 32, 24, 30, 65, 85, 18, 75, 35000, 55000, 40000, 120, 3, '200x250', '80x100', '3500', 'NPK 20:20:20', 20, 20, 20, 6.0, 7.0, 'sinh_can,ra_hoa,thu_hoach', 'brown_spot'],
      ['crop-dau-tay', 'Strawberry', 'Dâu tây', 'rau_an_qua', 'thap', 0.35, 0.9, 0.7, 15, 26, 18, 22, 70, 90, 20, 75, 30000, 55000, 40000, 90, 1, '60x80', '25x35', '3500', 'NPK 20:20:20', 20, 20, 20, 5.5, 6.5, 'gieo_hat,cay_con,sinh_truong,ra_hoa,thu_hoach', 'gray_mold,spider_mites'],
      ['crop-nam-huong', 'Shiitake Mushroom', 'Nấm hương', 'nam', 'thap', 0.3, 0.7, 0.5, 18, 28, 22, 26, 75, 95, 25, 85, 500, 1500, 1000, 45, 5, '20x25', '15x20', '1200', 'NPK 0:0:0', 0, 0, 0, 5.5, 6.5, 'u_t_bang,ra_nam,thu_hoach', 'trichoderma'],
      ['crop-nam-bao', 'Oyster Mushroom', 'Nấm bào ngư', 'nam', 'thap', 0.3, 0.7, 0.5, 20, 30, 24, 28, 75, 95, 25, 85, 500, 1500, 1000, 35, 5, '20x25', '15x20', '1000', 'NPK 0:0:0', 0, 0, 0, 5.5, 6.5, 'u_t_bang,ra_nam,thu_hoach', 'green_trichoderma'],
      ['crop-mia', 'Sugarcane', 'Mía', 'cay_tinh_bot', 'thu', 0.4, 1.2, 0.75, 22, 38, 28, 36, 60, 85, 20, 75, 45000, 70000, 55000, 365, 5, '120x150', '40x50', '18000', 'NPK 46:0:0', 46, 0, 0, 6.0, 7.0, 'gieo_hat,cay_con,sinh_can,thu_hoach', 'smut,borer'],
      ['crop-mit', 'Jackfruit', 'Mít', 'cay_an_qua', 'thu', 0.4, 0.85, 0.7, 22, 36, 26, 32, 60, 85, 20, 70, 35000, 55000, 40000, 180, 5, '800x1000', '500x600', '4500', 'NPK 15:15:15', 15, 15, 15, 6.0, 7.0, 'sinh_can,bong,phan_qua,thu_hoach', 'fruit_fly'],
      ['crop-buoi', 'Pomelo', 'Bưởi', 'cay_an_qua', 'thu', 0.4, 0.85, 0.65, 18, 34, 24, 30, 65, 85, 20, 70, 40000, 60000, 45000, 240, 5, '600x700', '300x400', '3500', 'NPK 15:15:15', 15, 15, 15, 6.0, 7.0, 'sinh_can,bong,phan_qua,thu_hoach', 'citrus_greening'],
      ['crop-mo-khue', 'Dragon Fruit', 'Than long', 'cay_an_qua', 'leo', 0.4, 0.95, 0.75, 20, 35, 25, 32, 65, 90, 20, 75, 35000, 55500, 40000, 120, 2, '250x300', '80x100', '4500', 'NPK 20:20:20', 20, 20, 20, 5.5, 7.0, 'sinh_can,ra_hoa,thu_hoach', 'anthracnose,rot'],
      ['crop-hat-giong', 'Peanut', 'Lạc', 'cay_dau_legume', 'thu', 0.4, 1.05, 0.65, 22, 32, 24, 30, 60, 85, 15, 70, 35000, 55000, 40000, 110, 4, '45x55', '15x20', '3000', 'NPK 0:46:0', 0, 46, 0, 5.5, 7.0, 'gieo_hat,cay_con,sinh_can,thu_hoach', 'leaf_spot'],
      ['crop-dau-den', 'Soybean', 'Đậu tương', 'cay_dau_legume', 'thu', 0.4, 1.1, 0.6, 20, 32, 22, 28, 60, 85, 15, 75, 30000, 50000, 35000, 90, 4, '45x55', '12x18', '2800', 'NPK 0:46:0', 0, 46, 0, 6.0, 7.0, 'gieo_hat,cay_con,sinh_can,ra_hoa,thu_hoach', 'rust'],
      ['crop-dau-xanh', 'Mung Bean', 'Đậu xanh', 'cay_dau_legume', 'thu', 0.4, 1.1, 0.7, 22, 32, 24, 30, 60, 85, 15, 75, 28000, 50000, 35000, 60, 3, '40x50', '10x15', '2200', 'NPK 20:60:20', 20, 60, 20, 6.0, 7.0, 'gieo_hat,cay_con,ra_hoa,thu_hoach', 'mung_bean_yellow_mosaic'],
      ['crop-dau-trang', 'Black Eyed Pea', 'Đậu trắng', 'cay_dau_legume', 'thu', 0.4, 1.1, 0.7, 22, 32, 24, 30, 60, 85, 15, 75, 28000, 50000, 35000, 65, 3, '40x50', '10x15', '2400', 'NPK 20:60:20', 20, 60, 20, 6.0, 7.0, 'gieo_hat,cay_con,ra_hoa,thu_hoach', 'bean_common Mosaic']
    ];

    const stmt = db.prepare(`
      INSERT INTO crops (id, name, name_vi, category, subcategory, kc_initial, kc_mid, kc_end, min_temp, max_temp, optimal_temp_min, optimal_temp_max, min_humidity, max_humidity, min_soil_moisture, max_soil_moisture, min_light_lux, max_light_lux, optimal_light_lux, growth_days, seed_depth, row_spacing, plant_spacing, water_requirement, fertilizer_type, fertilizer_n, fertilizer_p, fertilizer_k, ph_optimal_min, ph_optimal_max, stages, disease_risk)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    crops.forEach(crop => stmt.run(crop));
    stmt.free();
    
logger.info('Vietnamese crop data seeded with growth stages');
  } else {
    logger.info('Skipping crop seed: schema mismatch');
  }
   
  let canSeedAqua = false;
  try {
    const info = db.exec("PRAGMA table_info(aquaculture)");
    const cols = (info[0]?.values || []).map(r => r[1]);
    canSeedAqua = cols.includes('name') && cols.includes('name_vi');
  } catch(e) { canSeedAqua = false; }
  
  const aquaCount = db.exec('SELECT COUNT(*) as count FROM aquaculture')[0]?.values[0][0] || 0;
  
  if (aquaCount === 0 && canSeedAqua) {
    const aquaculture = [
      ['fish-carp', 'Common Carp', 'Cá chép', 'fish', 20, 30, 6.5, 8.5, 5, 15, 180, 50, 1.5, 20, 'dropsy, parasites'],
      ['fish-tilapia', 'Tilapia', 'Cá rô phi', 'fish', 22, 32, 6.5, 8.5, 4, 10, 180, 100, 1.2, 15, 'streptococcus'],
      ['fish-catfish', 'Catfish', 'Cá lóc', 'fish', 22, 32, 6.0, 8.0, 3, 5, 150, 30, 1.3, 20, 'bacterial disease'],
      ['fish-grouper', 'Grouper', 'Cá mú', 'fish', 25, 32, 7.0, 8.5, 5, 35, 240, 25, 1.5, 25, 'viral'],
      ['fish-salmon', 'Salmon', 'Cá hồi', 'fish', 10, 18, 6.5, 8.0, 6, 30, 400, 20, 1.0, 30, 'sea lice'],
      ['fish-catfish-vn', 'Cá basa', 'Cá basa', 'fish', 22, 30, 6.0, 8.0, 3, 8, 180, 60, 1.2, 20, 'fungus'],
      ['shrimp-fresh', 'Freshwater Shrimp', 'Tôm càng xanh', 'shrimp', 22, 30, 7.0, 8.5, 5, 10, 120, 30, 1.2, 20, 'white spot'],
      ['shrimp-salt', 'Black Tiger Shrimp', 'Tôm sú', 'shrimp', 25, 32, 7.5, 8.5, 5, 25, 150, 40, 1.3, 25, 'white spot, Taura'],
      ['shrimp-vannamei', 'Pacific White Shrimp', 'Tôm thẻ chân trắng', 'shrimp', 25, 32, 7.5, 8.5, 5, 20, 120, 50, 1.1, 20, 'EMS, white spot'],
      ['fish-eel', 'Eel', 'Lươn', 'fish', 22, 30, 6.5, 7.5, 4, 5, 180, 20, 1.3, 30, 'fungus'],
      ['fish-clarias', 'Clarias Catfish', 'Cá trê', 'fish', 22, 32, 6.0, 8.0, 3, 5, 180, 40, 1.2, 15, 'bacterial infection'],
      ['fish-mrigal', 'Mrigal', 'Cá rô đầu phụng', 'fish', 22, 30, 6.5, 8.0, 4, 10, 180, 30, 1.4, 15, 'epizootic'],
      ['fish-rohu', 'Rohu', 'Cá mè', 'fish', 22, 32, 6.5, 8.5, 4, 10, 365, 25, 1.5, 20, 'koi herpes'],
      ['frog-tiger', 'Tiger Frog', 'Ếch', 'amphibian', 22, 30, 6.5, 7.5, 4, 2, 90, 30, 1.2, 10, 'red leg syndrome']
    ];

    const stmt = db.prepare(`INSERT INTO aquaculture (id, name, name_vi, category, optimal_temp_min, optimal_temp_max, optimal_ph_min, optimal_ph_max, optimal_do, optimal_salinity, growth_days, density_max, feed_conversion_ratio, water_change_rate, disease_risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    aquaculture.forEach(a => {
      stmt.run(a);
    });
    stmt.free();
    
    logger.info('Aquaculture data seeded');
  } else {
    logger.info('Skipping aquaculture seed: schema mismatch');
  }
}

function seedInitialData() {
  seedCropData();
  const deviceCount = db.exec('SELECT COUNT(*) as count FROM devices')[0]?.values[0][0] || 0;
  
  if (deviceCount === 0) {
    const devices = [
      ['device-001', 'SoilSense-001', 'sensor', 'zone1', 'online', JSON.stringify({ thresholdLow: 30, thresholdCritical: 20 }), new Date().toISOString()],
      ['device-002', 'AirPulse-002', 'sensor', 'zone2', 'online', JSON.stringify({ thresholdLow: 60, thresholdCritical: 90 }), new Date().toISOString()],
      ['device-003', 'Pump-Control-01', 'pump', 'all', 'online', JSON.stringify({ autoMode: true }), new Date().toISOString()],
      ['device-004', 'Valve-Zone-03', 'valve', 'zone3', 'online', JSON.stringify({ flowRate: 50 }), new Date().toISOString()],
      ['device-005', 'AirSense-002', 'sensor', 'zone2', 'offline', '{}', new Date(Date.now() - 3600000).toISOString()],
      ['device-006', 'GrowLight-01', 'light', 'zone1', 'online', JSON.stringify({ brightness: 80 }), new Date().toISOString()]
    ];

    const stmt = db.prepare('INSERT INTO devices (id, name, type, zone, status, config, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)');
    devices.forEach(device => {
      stmt.run(device);
    });
    stmt.free();
  }

  const sensorCount = db.exec('SELECT COUNT(*) as count FROM sensors')[0]?.values[0][0] || 0;
  
  if (sensorCount === 0) {
    const sensors = [
      ['sensor-temp', 'temperature', 28.5, '°C', 18, 32],
      ['sensor-humid', 'humidity', 72, '%', 60, 85],
      ['sensor-soil', 'soil', 45, '%', 30, 70],
      ['sensor-light', 'light', 42.5, 'klux', 20, 60],
      ['sensor-ph', 'ph', 6.8, 'pH', 6.0, 7.5],
      ['sensor-co2', 'co2', 418, 'ppm', 350, 800],
      ['sensor-ec', 'ec', 2.1, 'mS/cm', 1.5, 3.0],
      ['sensor-water', 'water', 78, '%', 20, 100]
    ];

    const stmt = db.prepare('INSERT INTO sensors (id, type, value, unit, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?)');
    sensors.forEach(sensor => {
      stmt.run(sensor);
    });
    stmt.free();
  }

  const ruleCount = db.exec('SELECT COUNT(*) as count FROM rules')[0]?.values[0][0] || 0;
  
  if (ruleCount === 0) {
    const rules = [
      ['rule-1', 'Tưới khi đất khô', 'Tự động tưới khi độ ẩm đất xuống dưới 35%', 1, JSON.stringify({ sensor: 'soil', operator: '<', value: 35 }), JSON.stringify({ type: 'valve_open', target: 'zone1' })],
      ['rule-2', 'Bật quạt khi nóng', 'Kích hoạt quạt thông gió khi nhiệt độ trên 30°C', 1, JSON.stringify({ sensor: 'temperature', operator: '>', value: 30 }), JSON.stringify({ type: 'fan_on', target: 'all' })],
      ['rule-3', 'Cảnh báo nước thấp', 'Thông báo khi mực nước bồn dưới 25%', 1, JSON.stringify({ sensor: 'water', operator: '<', value: 25 }), JSON.stringify({ type: 'alert', target: 'all' })]
    ];

    const stmt = db.prepare('INSERT INTO rules (id, name, description, enabled, condition, action) VALUES (?, ?, ?, ?, ?, ?)');
    rules.forEach(rule => {
      stmt.run(rule);
    });
    stmt.free();
  }

  const scheduleCount = db.exec('SELECT COUNT(*) as count FROM schedules')[0]?.values[0][0] || 0;
  
  if (scheduleCount === 0) {
    const schedules = [
      ['sched-1', 'Lịch tưới sáng', '06:00', 60, JSON.stringify(['zone1', 'zone2', 'zone3']), 1, JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])],
      ['sched-2', 'Lịch tưới chiều', '17:00', 60, JSON.stringify(['zone4', 'zone5']), 1, JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])],
      ['sched-3', 'Bón phân định kỳ', '08:00', 45, JSON.stringify(['all']), 0, JSON.stringify(['Tue', 'Fri'])]
    ];

    const stmt = db.prepare('INSERT INTO schedules (id, name, time, duration, zones, enabled, days) VALUES (?, ?, ?, ?, ?, ?, ?)');
    schedules.forEach(schedule => {
      stmt.run(schedule);
    });
    stmt.free();
  }

  // Seed a test user when running in test environment to enable auth tests without manual registration
  try {
    if (process.env.NODE_ENV === 'test') {
      const existingTestUser = getOne('SELECT id FROM users WHERE email = ?', ['test@example.com']);
      if (!existingTestUser) {
        const testId = 'user-test';
        const testEmail = 'test@example.com';
        const testPassword = 'password123';
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        runQuery(
          'INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
          [testId, testEmail, hashedPassword, 'Test User', 'user']
        );
      }
    }
  } catch (e) {
    // Ignore seed errors in test mode to avoid blocking DB init
  }

  saveDatabase();
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function runQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.run(sql, params);
    saveDatabase();
    return { changes: db.getRowsModified() };
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function getOne(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function getAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getOne,
  getAll,
  saveDatabase
};
