const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { runQuery, getOne, getAll } = require('../config/database');
const logger = require('../config/logger');
const { auth } = require('../middleware/auth');
const blockchainHelper = require('../modules/blockchain-helper');

const BASE_URL = process.env.BASE_URL || 'https://ecosyntech.com';

// Validation schemas
const batchSchema = Joi.object({
  batch_code: Joi.string().min(1).max(50).optional(),
  product_name: Joi.string().min(1).max(200).required(),
  product_type: Joi.string().valid('vegetable', 'fruit', 'herb', 'grain', 'other').required(),
  quantity: Joi.number().positive().optional(),
  unit: Joi.string().max(20).default('kg'),
  farm_name: Joi.string().max(200).optional(),
  zone: Joi.string().max(50).optional(),
  seed_variety: Joi.string().max(100).optional(),
  planting_date: Joi.date().iso().optional(),
  expected_harvest: Joi.date().iso().optional(),
  notes: Joi.string().max(500).optional()
});

const stageSchema = Joi.object({
  stage_name: Joi.string().min(1).max(100).required(),
  stage_type: Joi.string().valid('preparation', 'planting', 'growing', 'harvesting', 'processing', 'packaging', 'storage', 'transport').required(),
  description: Joi.string().max(500).optional(),
  performed_by: Joi.string().max(100).optional(),
  location: Joi.string().max(200).optional(),
  inputs_used: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.string().optional(),
    notes: Joi.string().optional()
  })).optional(),
  photos: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(500).optional()
});

// GET /api/traceability/batch/:code - Trace batch by QR code
router.get('/batch/:code', async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get all stages
    const stages = getAll(
      'SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC',
      [batch.id]
    );

    // Get device readings for this batch
    const readings = getAll(
      'SELECT * FROM traceability_readings WHERE batch_id = ? ORDER BY timestamp DESC LIMIT 100',
      [batch.id]
    );

    // Get associated sensors
    const sensors = getAll(
      'SELECT * FROM sensors WHERE sensor_id IN (SELECT device_id FROM devices WHERE zone = ?)',
      [batch.zone || 'default']
    );

    res.json({
      success: true,
      batch: {
        ...batch,
        metadata: JSON.parse(batch.metadata || '{}'),
        planting_date: batch.planting_date,
        expected_harvest: batch.expected_harvest,
        harvest_date: batch.harvest_date
      },
      stages,
      recent_readings: readings.slice(0, 20),
      current_sensors: sensors,
      trace_url: `${BASE_URL}/trace/${batch.batch_code}`
    });
  } catch (err) {
    logger.error('[Traceability] Get batch error:', err);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// GET /api/traceability/batches - List all batches
router.get('/batches', auth, async (req, res) => {
  try {
    const { status, product_type, zone } = req.query;
    
    let query = 'SELECT * FROM traceability_batches WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (product_type) {
      query += ' AND product_type = ?';
      params.push(product_type);
    }
    if (zone) {
      query += ' AND zone = ?';
      params.push(zone);
    }

    query += ' ORDER BY created_at DESC';

    const batches = getAll(query, params);

    res.json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (err) {
    logger.error('[Traceability] List batches error:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// POST /api/traceability/batch - Create new batch
router.post('/batch', auth, async (req, res) => {
  try {
    const { error, value } = batchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Generate batch code in GAS V10 format: BATCH-XXXX-XXXX (8 hex chars)
    const timestampHex = Date.now().toString(16).toUpperCase().slice(-4);
    const randomHex = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase();
    const batchCode = value.batch_code || `BATCH-${timestampHex}-${randomHex}`;
    const batchId = uuidv4();

    runQuery(
      `INSERT INTO traceability_batches 
       (id, batch_code, product_name, product_type, quantity, unit, farm_name, zone, 
        seed_variety, planting_date, expected_harvest, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batchId,
        batchCode,
        value.product_name,
        value.product_type,
        value.quantity || null,
        value.unit,
        value.farm_name || '',
        value.zone || 'default',
        value.seed_variety || '',
        value.planting_date || null,
        value.expected_harvest || null,
        'active',
        new Date().toISOString()
      ]
    );

    // Generate QR code
    const traceUrl = `${BASE_URL}/trace/${batchCode}`;
    const qrDataUrl = await QRCode.toDataURL(traceUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#0f2b1f', light: '#ffffff' }
    });

    logger.info(`[Traceability] Batch created: ${batchCode}`);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      batch: {
        id: batchId,
        batch_code: batchCode,
        product_name: value.product_name,
        status: 'active'
      },
      qr_code: qrDataUrl,
      trace_url: traceUrl
    });
  } catch (err) {
    logger.error('[Traceability] Create batch error:', err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// POST /api/traceability/batch/:code/stage - Add stage to batch
router.post('/batch/:code/stage', auth, async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const { error, value } = stageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get current max stage order
    const maxOrder = getOne(
      'SELECT MAX(stage_order) as max_order FROM traceability_stages WHERE batch_id = ?',
      [batch.id]
    );
    const stageOrder = (maxOrder?.max_order || 0) + 1;

    const stageId = uuidv4();

    runQuery(
      `INSERT INTO traceability_stages 
       (id, batch_id, stage_name, stage_type, stage_order, description, performed_by, 
        location, inputs_used, photos, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stageId,
        batch.id,
        value.stage_name,
        value.stage_type,
        stageOrder,
        value.description || '',
        value.performed_by || '',
        value.location || '',
        JSON.stringify(value.inputs_used || []),
        JSON.stringify(value.photos || []),
        value.notes || '',
        new Date().toISOString()
      ]
    );

    logger.info(`[Traceability] Stage added: ${value.stage_name} to ${req.params.code}`);

    res.status(201).json({
      success: true,
      message: 'Stage added successfully',
      stage: {
        id: stageId,
        stage_name: value.stage_name,
        stage_type: value.stage_type,
        stage_order: stageOrder
      }
    });
  } catch (err) {
    logger.error('[Traceability] Add stage error:', err);
    res.status(500).json({ error: 'Failed to add stage' });
  }
});

// GET /api/traceability/batch/:code/qr - Get QR code for batch
router.get('/batch/:code/qr', async (req, res) => {
  try {
    const { format } = req.query;
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const traceUrl = `${BASE_URL}/trace/${batch.batch_code}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(traceUrl, { type: 'svg', width: 300 });
      res.type('image/svg+xml').send(svg);
    } else {
      const dataUrl = await QRCode.toDataURL(traceUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0f2b1f', light: '#ffffff' }
      });
      res.json({
        success: true,
        batch_code: batch.batch_code,
        product_name: batch.product_name,
        qr_code: dataUrl,
        trace_url: traceUrl
      });
    }
  } catch (err) {
    logger.error('[Traceability] QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// POST /api/traceability/batch/:code/harvest - Mark batch as harvested
router.post('/batch/:code/harvest', auth, async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const { harvest_quantity, harvest_notes } = req.body;

    runQuery(
      'UPDATE traceability_batches SET status = ?, harvest_date = ?, harvest_quantity = ?, harvest_notes = ?, updated_at = ? WHERE id = ?',
      ['harvested', new Date().toISOString(), harvest_quantity || null, harvest_notes || '', new Date().toISOString(), batch.id]
    );

    logger.info(`[Traceability] Batch harvested: ${req.params.code}`);

    const response = {
      success: true,
      message: 'Batch marked as harvested',
      batch_code: req.params.code,
      harvest_date: new Date().toISOString()
    };

    if (blockchainHelper.shouldRecordToBlockchain()) {
      const ops = req.app.get('ops');
      if (ops) {
        const metadata = blockchainHelper.createHarvestMetadata(harvest_quantity, harvest_notes);
        const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC', [batch.id]);
        const batchData = { ...batch, stages: stages };
        
        await ops.trigger('traceability.harvest', {
          batch: batchData,
          metadata: metadata
        });
        response.blockchain_recorded = true;
        logger.info(`[Blockchain] Harvest recorded for batch: ${req.params.code}`);
      }
    }

    res.json(response);
  } catch (err) {
    logger.error('[Traceability] Harvest error:', err);
    res.status(500).json({ error: 'Failed to mark batch as harvested' });
  }
});

// GET /api/traceability/stats - Get traceability statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalBatches = getOne('SELECT COUNT(*) as count FROM traceability_batches');
    const activeBatches = getOne('SELECT COUNT(*) as count FROM traceability_batches WHERE status = \'active\'');
    const harvestedBatches = getOne('SELECT COUNT(*) as count FROM traceability_batches WHERE status = \'harvested\'');
    const exportedBatches = getOne('SELECT COUNT(*) as count FROM traceability_batches WHERE status = \'exported\'');
    const totalStages = getOne('SELECT COUNT(*) as count FROM traceability_stages');

    const byProductType = getAll(
      'SELECT product_type, COUNT(*) as count FROM traceability_batches GROUP BY product_type'
    );

    const recentActivity = getAll(
      `SELECT bs.*, bb.batch_code, bb.product_name 
       FROM traceability_stages bs 
       JOIN traceability_batches bb ON bs.batch_id = bb.id 
       ORDER BY bs.created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      stats: {
        total_batches: totalBatches?.count || 0,
        active_batches: activeBatches?.count || 0,
        harvested_batches: harvestedBatches?.count || 0,
        exported_batches: exportedBatches?.count || 0,
        total_stages: totalStages?.count || 0,
        by_product_type: byProductType
      },
      recent_activity: recentActivity
    });
  } catch (err) {
    logger.error('[Traceability] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/traceability/batch/:code/export - Mark batch as exported/sold
router.post('/batch/:code/export', auth, async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (batch.status !== 'harvested') {
      return res.status(400).json({ error: 'Batch must be harvested before export' });
    }

    const { buyer_name, buyer_contact, export_price, export_unit, notes } = req.body;

    runQuery(
      `UPDATE traceability_batches SET 
        status = ?, buyer_name = ?, buyer_contact = ?, 
        export_price = ?, export_unit = ?, export_date = ?, 
        metadata = ?, updated_at = ? WHERE id = ?`,
      [
        'exported',
        buyer_name || '',
        buyer_contact || '',
        export_price || null,
        export_unit || 'kg',
        new Date().toISOString(),
        JSON.stringify({ ...JSON.parse(batch.metadata || '{}'), export_notes: notes }),
        new Date().toISOString(),
        batch.id
      ]
    );

    logger.info(`[Traceability] Batch exported: ${req.params.code} to ${buyer_name}`);

    const response = {
      success: true,
      message: 'Batch exported successfully',
      batch_code: req.params.code,
      export_date: new Date().toISOString(),
      buyer: buyer_name
    };

    if (blockchainHelper.shouldRecordToBlockchain()) {
      const ops = req.app.get('ops');
      if (ops) {
        const metadata = blockchainHelper.createExportMetadata(buyer_name, buyer_contact, export_price, export_unit, notes);
        const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC', [batch.id]);
        const batchData = { ...batch, stages: stages };
        
        await ops.trigger('traceability.export', {
          batch: batchData,
          metadata: metadata
        });
        response.blockchain_recorded = true;
        logger.info(`[Blockchain] Export recorded for batch: ${req.params.code}`);
      }
    }

    res.json(response);
  } catch (err) {
    logger.error('[Traceability] Export error:', err);
    res.status(500).json({ error: 'Failed to export batch' });
  }
});

// POST /api/traceability/batch/:code/certify - Add certification
router.post('/batch/:code/certify', auth, async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const { certification_name, certification_body, certification_date, certification_expire, certificate_number } = req.body;

    const existingCerts = JSON.parse(batch.farm_certifications || '[]');
    const newCert = {
      name: certification_name,
      body: certification_body,
      date: certification_date || new Date().toISOString(),
      expire: certification_expire,
      number: certificate_number,
      added_at: new Date().toISOString()
    };

    runQuery(
      'UPDATE traceability_batches SET farm_certifications = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify([...existingCerts, newCert]), new Date().toISOString(), batch.id]
    );

    logger.info(`[Traceability] Certification added: ${certification_name} for ${req.params.code}`);

    const response = {
      success: true,
      message: 'Certification added successfully',
      certification: newCert
    };

    if (blockchainHelper.shouldRecordToBlockchain()) {
      const ops = req.app.get('ops');
      if (ops) {
        const metadata = blockchainHelper.createCertMetadata(certification_name, certification_body, certification_date, certification_expire, certificate_number);
        const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC', [batch.id]);
        const batchData = { ...batch, stages: stages };
        
        await ops.trigger('traceability.certify', {
          batch: batchData,
          metadata: metadata
        });
        response.blockchain_recorded = true;
        logger.info(`[Blockchain] Certification recorded for batch: ${req.params.code}`);
      }
    }

    res.json(response);
  } catch (err) {
    logger.error('[Traceability] Certification error:', err);
    res.status(500).json({ error: 'Failed to add certification' });
  }
});

// GET /api/traceability/batch/:code/full - Get full traceability timeline
router.get('/batch/:code/full', async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const stages = getAll(
      'SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC',
      [batch.id]
    );

    const readings = getAll(
      'SELECT * FROM traceability_readings WHERE batch_id = ? ORDER BY timestamp DESC',
      [batch.id]
    );

    const device = getOne('SELECT * FROM devices WHERE zone = ?', [batch.batch_code]);

    res.json({
      success: true,
      batch: {
        ...batch,
        metadata: JSON.parse(batch.metadata || '{}'),
        farm_certifications: JSON.parse(batch.farm_certifications || '[]')
      },
      timeline: [
        { stage: 'Gieo trồng', date: batch.planting_date, status: 'completed' },
        ...stages.map(s => ({ stage: s.stage_name, date: s.created_at, description: s.description, performed_by: s.performed_by })),
        { stage: 'Thu hoạch', date: batch.harvest_date, quantity: batch.harvest_quantity, status: batch.harvest_date ? 'completed' : 'pending' },
        ...(batch.export_date ? [{ stage: 'Xuất bán', date: batch.export_date, buyer: batch.buyer_name, price: batch.export_price, status: 'completed' }] : [])
      ],
      sensor_readings: readings,
      device_info: device ? { id: device.id, name: device.name, status: device.status } : null,
      certifications: JSON.parse(batch.farm_certifications || '[]'),
      trace_url: `${BASE_URL}/trace/${batch.batch_code}`,
      qr_code_url: `${BASE_URL}/api/traceability/batch/${batch.batch_code}/qr`,
      blockchain: blockchainHelper.isEnabled() ? { enabled: true, network: 'aptos' } : { enabled: false }
    });
  } catch (err) {
    logger.error('[Traceability] Full timeline error:', err);
    res.status(500).json({ error: 'Failed to fetch full timeline' });
  }
});

// GET /api/traceability/verify/:batchCode - Verify blockchain record for batch
router.get('/verify/:batchCode', async (req, res) => {
  try {
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.batchCode]);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC', [batch.id]);
    const readings = getAll('SELECT * FROM traceability_readings WHERE batch_id = ? ORDER BY timestamp DESC LIMIT 10', [batch.id]);
    
    const bcSkill = require('../skills/traceability/aptos-blockchain.skill');
    const computedHash = bcSkill.computeBatchHash(batch, stages, readings);

    res.json({
      success: true,
      batch_code: batch.batch_code,
      current_hash: computedHash,
      blockchain_enabled: blockchainHelper.isEnabled(),
      network: 'aptos',
      status: batch.status,
      harvest_date: batch.harvest_date,
      export_date: batch.export_date,
      certifications: JSON.parse(batch.farm_certifications || '[]').length
    });
  } catch (err) {
    logger.error('[Traceability] Verify error:', err);
    res.status(500).json({ error: 'Failed to verify batch' });
  }
});

// POST /api/traceability/scan - Scan QR code to check origin
router.post('/scan', async (req, res) => {
  try {
    const { qr_data, batch_code } = req.body;
    
    let targetCode = batch_code;
    
    if (qr_data) {
      const urlMatch = qr_data.match(/trace\/([A-Z0-9-]+)/i);
      if (urlMatch) {
        targetCode = urlMatch[1];
      } else if (qr_data.startsWith('BATCH-') || qr_data.startsWith('ECO-')) {
        targetCode = qr_data;
      }
    }
    
    if (!targetCode) {
      return res.status(400).json({ error: 'Invalid QR data or batch code' });
    }
    
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [targetCode]);
    
    if (!batch) {
      return res.json({
        success: false,
        valid: false,
        message: 'Batch not found in system',
        scanned_data: qr_data || batch_code
      });
    }
    
    const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC', [batch.id]);
    const certifications = JSON.parse(batch.farm_certifications || '[]');
    
    const bcSkill = require('../skills/traceability/aptos-blockchain.skill');
    const computedHash = bcSkill.computeBatchHash(batch, stages, []);
    
    const origin = {
      farm_name: batch.farm_name,
      zone: batch.zone,
      product_name: batch.product_name,
      product_type: batch.product_type,
      seed_variety: batch.seed_variety,
      planting_date: batch.planting_date,
      expected_harvest: batch.expected_harvest,
      farm_certifications: certifications.map(c => c.name)
    };
    
    const timeline = [
      { step: 'Gieo trồng', date: batch.planting_date, completed: !!batch.planting_date }
    ];
    
    stages.forEach(s => {
      timeline.push({
        step: s.stage_name,
        date: s.created_at,
        type: s.stage_type,
        completed: true
      });
    });
    
    if (batch.harvest_date) {
      timeline.push({
        step: 'Thu hoạch',
        date: batch.harvest_date,
        quantity: batch.harvest_quantity,
        completed: true
      });
    }
    
    if (batch.export_date) {
      timeline.push({
        step: 'Xuất bán',
        date: batch.export_date,
        buyer: batch.buyer_name,
        completed: true
      });
    }
    
    res.json({
      success: true,
      valid: true,
      origin: origin,
      status: batch.status,
      timeline: timeline,
      blockchain: {
        enabled: blockchainHelper.isEnabled(),
        hash: computedHash,
        verified: true
      },
      trace_url: `${BASE_URL}/trace/${batch.batch_code}`,
      qr_code_url: `${BASE_URL}/api/traceability/batch/${batch.batch_code}/qr`,
      scanned_at: new Date().toISOString()
    });
  } catch (err) {
    logger.error('[Traceability] Scan error:', err);
    res.status(500).json({ error: 'Failed to scan QR code' });
  }
});

// GET /api/traceability/batch/:code/label - Generate printable QR label
router.get('/batch/:code/label', async (req, res) => {
  try {
    const { size, format } = req.query;
    const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [req.params.code]);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    const traceUrl = `${BASE_URL}/trace/${batch.batch_code}`;
    const labelSize = size || 'medium';
    
    const qrOptions = {
      width: labelSize === 'small' ? 150 : (labelSize === 'large' ? 400 : 250),
      margin: 2,
      color: { dark: '#0f2b1f', light: '#ffffff' }
    };
    
    const qrDataUrl = await QRCode.toDataURL(traceUrl, qrOptions);
    const qrSvg = await QRCode.toString(traceUrl, { type: 'svg', width: qrOptions.width });
    
    const labelData = {
      batch_code: batch.batch_code,
      product_name: batch.product_name,
      product_type: batch.product_type,
      farm_name: batch.farm_name,
      status: batch.status,
      harvest_date: batch.harvest_date,
      qr_code: qrDataUrl,
      qr_svg: qrSvg,
      trace_url: traceUrl,
      certifications: JSON.parse(batch.farm_certifications || '[]'),
      generated_at: new Date().toISOString()
    };
    
    if (format === 'html') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QR Label - ${batch.batch_code}</title>
  <style>
    @media print {
      .label { page-break-after: always; }
      .no-print { display: none; }
    }
    body { font-family: Arial, sans-serif; margin: 20px; }
    .label { 
      border: 2px solid #0f2b1f; 
      padding: 15px; 
      max-width: 350px; 
      border-radius: 8px;
      background: #fff;
    }
    .label-header { 
      text-align: center; 
      border-bottom: 1px solid #ddd; 
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .label-header h2 { margin: 0; color: #0f2b1f; font-size: 16px; }
    .qr-section { text-align: center; margin: 10px 0; }
    .qr-section img { max-width: 100%; }
    .info-section { font-size: 12px; }
    .info-row { display: flex; justify-content: space-between; margin: 4px 0; }
    .info-label { font-weight: bold; color: #666; }
    .info-value { color: #333; }
    .status { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 12px; 
      font-size: 11px;
      font-weight: bold;
    }
    .status.active { background: #e3f2fd; color: #1565c0; }
    .status.harvested { background: #e8f5e9; color: #2e7d32; }
    .status.exported { background: #fff3e0; color: #ef6c00; }
    .print-btn {
      background: #0f2b1f;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin: 20px 0;
    }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">
      <h2>🌱 ECO SYNTECH</h2>
      <p style="margin: 5px 0; font-size: 11px;">Traceability Label</p>
    </div>
    <div class="qr-section">
      <img src="${qrDataUrl}" alt="QR Code" />
    </div>
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Mã:</span>
        <span class="info-value">${batch.batch_code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sản phẩm:</span>
        <span class="info-value">${batch.product_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Loại:</span>
        <span class="info-value">${batch.product_type}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Trang trại:</span>
        <span class="info-value">${batch.farm_name || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Trạng thái:</span>
        <span class="status ${batch.status}">${batch.status}</span>
      </div>
      ${batch.harvest_date ? `
      <div class="info-row">
        <span class="info-label">Thu hoạch:</span>
        <span class="info-value">${new Date(batch.harvest_date).toLocaleDateString('vi-VN')}</span>
      </div>` : ''}
    </div>
    <div class="footer">
      Scan QR để xem chi tiết nguồn gốc
    </div>
  </div>
  <button class="print-btn no-print" onclick="window.print()">🖨️ In nhãn</button>
</body>
</html>`;
      res.type('text/html').send(html);
    } else {
      res.json({
        success: true,
        label: labelData,
        print_url: `${BASE_URL}/api/traceability/batch/${batch.batch_code}/label?format=html`
      });
    }
  } catch (err) {
    logger.error('[Traceability] Label error:', err);
    res.status(500).json({ error: 'Failed to generate label' });
  }
});

// GET /api/traceability/export/pdf - Export traceability report as PDF
router.get('/export/pdf', auth, async (req, res) => {
  try {
    const { batch_code, status, from_date, to_date } = req.query;
    
    let query = 'SELECT * FROM traceability_batches WHERE 1=1';
    const params = [];
    
    if (batch_code) {
      query += ' AND batch_code = ?';
      params.push(batch_code);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (from_date) {
      query += ' AND created_at >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND created_at <= ?';
      params.push(to_date);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const batches = getAll(query, params);
    
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=traceability-report.pdf');
    doc.pipe(res);
    
    doc.fontSize(20).text('EcoSynTech - Báo Cáo Truy Xuất Nguồn Gốc', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`, { align: 'right' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Tổng số lô: ${batches.length}`, { align: 'left' });
    doc.moveDown();
    
    for (const batch of batches) {
      const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC', [batch.id]);
      const certifications = JSON.parse(batch.farm_certifications || '[]');
      
      doc.rect(doc.x, doc.y, 500, 2).fill('#0f2b1f').moveDown();
      doc.moveDown();
      doc.fontSize(14).fillColor('#0f2b1f').text(`Lô: ${batch.batch_code}`, { continued: false });
      doc.fontSize(10).fillColor('#333');
      doc.text(`Sản phẩm: ${batch.product_name} | Loại: ${batch.product_type}`);
      doc.text(`Trang trại: ${batch.farm_name || 'N/A'} | Zone: ${batch.zone || 'N/A'}`);
      doc.text(`Trạng thái: ${batch.status} | Ngày tạo: ${new Date(batch.created_at).toLocaleDateString('vi-VN')}`);
      
      if (batch.planting_date) {
        doc.text(`Ngày gieo trồng: ${new Date(batch.planting_date).toLocaleDateString('vi-VN')}`);
      }
      if (batch.harvest_date) {
        doc.text(`Ngày thu hoạch: ${new Date(batch.harvest_date).toLocaleDateString('vi-VN')} | Số lượng: ${batch.harvest_quantity} ${batch.unit || 'kg'}`);
      }
      if (batch.export_date) {
        doc.text(`Ngày xuất bán: ${new Date(batch.export_date).toLocaleDateString('vi-VN')} | Người mua: ${batch.buyer_name || 'N/A'}`);
      }
      
      if (stages.length > 0) {
        doc.moveDown();
        doc.fontSize(10).text('Các giai đoạn:', { underline: true });
        stages.forEach((s, i) => {
          doc.text(`${i + 1}. ${s.stage_name} (${s.stage_type}) - ${new Date(s.created_at).toLocaleDateString('vi-VN')}`);
        });
      }
      
      if (certifications.length > 0) {
        doc.moveDown();
        doc.text('Chứng nhận: ' + certifications.map(c => c.name).join(', '));
      }
      
      doc.moveDown(2);
    }
    
    doc.fontSize(8).fillColor('#999').text('Generated by EcoSynTech IoT System', { align: 'center' });
    doc.end();
  } catch (err) {
    logger.error('[Traceability] PDF export error:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// GET /api/traceability/export/excel - Export traceability report as Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    const { batch_code, status, from_date, to_date } = req.query;
    
    let query = 'SELECT * FROM traceability_batches WHERE 1=1';
    const params = [];
    
    if (batch_code) {
      query += ' AND batch_code = ?';
      params.push(batch_code);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (from_date) {
      query += ' AND created_at >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND created_at <= ?';
      params.push(to_date);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const batches = getAll(query, params);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EcoSynTech';
    workbook.created = new Date();
    
    const batchSheet = workbook.addWorksheet('Batches');
    batchSheet.columns = [
      { header: 'Mã lô', key: 'batch_code', width: 25 },
      { header: 'Sản phẩm', key: 'product_name', width: 25 },
      { header: 'Loại', key: 'product_type', width: 15 },
      { header: 'Trang trại', key: 'farm_name', width: 20 },
      { header: 'Zone', key: 'zone', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 12 },
      { header: 'Ngày tạo', key: 'created_at', width: 15 },
      { header: 'Ngày gieo trồng', key: 'planting_date', width: 15 },
      { header: 'Ngày thu hoạch', key: 'harvest_date', width: 15 },
      { header: 'Số lượng thu hoạch', key: 'harvest_quantity', width: 18 },
      { header: 'Ngày xuất bán', key: 'export_date', width: 15 },
      { header: 'Người mua', key: 'buyer_name', width: 20 },
      { header: 'Giá xuất', key: 'export_price', width: 12 },
      { header: 'Giống', key: 'seed_variety', width: 15 }
    ];
    
    batches.forEach(batch => {
      batchSheet.addRow({
        batch_code: batch.batch_code,
        product_name: batch.product_name,
        product_type: batch.product_type,
        farm_name: batch.farm_name,
        zone: batch.zone,
        status: batch.status,
        created_at: batch.created_at ? new Date(batch.created_at).toLocaleDateString('vi-VN') : '',
        planting_date: batch.planting_date ? new Date(batch.planting_date).toLocaleDateString('vi-VN') : '',
        harvest_date: batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString('vi-VN') : '',
        harvest_quantity: batch.harvest_quantity,
        export_date: batch.export_date ? new Date(batch.export_date).toLocaleDateString('vi-VN') : '',
        buyer_name: batch.buyer_name,
        export_price: batch.export_price,
        seed_variety: batch.seed_variety
      });
    });
    
    batchSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    batchSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f2b1f' } };
    batchSheet.getRow(1).alignment = { horizontal: 'center' };
    
    const stagesSheet = workbook.addWorksheet('Stages');
    stagesSheet.columns = [
      { header: 'Mã lô', key: 'batch_code', width: 25 },
      { header: 'Tên giai đoạn', key: 'stage_name', width: 20 },
      { header: 'Loại giai đoạn', key: 'stage_type', width: 15 },
      { header: 'Thứ tự', key: 'stage_order', width: 10 },
      { header: 'Mô tả', key: 'description', width: 30 },
      { header: 'Người thực hiện', key: 'performed_by', width: 18 },
      { header: 'Vị trí', key: 'location', width: 18 },
      { header: 'Ngày tạo', key: 'created_at', width: 15 }
    ];
    
    batches.forEach(batch => {
      const stages = getAll('SELECT * FROM traceability_stages WHERE batch_id = ?', [batch.id]);
      stages.forEach(stage => {
        stagesSheet.addRow({
          batch_code: batch.batch_code,
          stage_name: stage.stage_name,
          stage_type: stage.stage_type,
          stage_order: stage.stage_order,
          description: stage.description,
          performed_by: stage.performed_by,
          location: stage.location,
          created_at: stage.created_at ? new Date(stage.created_at).toLocaleDateString('vi-VN') : ''
        });
      });
    });
    
    if (stagesSheet.getRow(1).values.length > 0) {
      stagesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      stagesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f2b1f' } };
    }
    
    const certSheet = workbook.addWorksheet('Certifications');
    certSheet.columns = [
      { header: 'Mã lô', key: 'batch_code', width: 25 },
      { header: 'Tên chứng nhận', key: 'name', width: 25 },
      { header: 'Tổ chức', key: 'body', width: 20 },
      { header: 'Ngày cấp', key: 'date', width: 15 },
      { header: 'Ngày hết hạn', key: 'expire', width: 15 },
      { header: 'Số chứng nhận', key: 'number', width: 20 }
    ];
    
    batches.forEach(batch => {
      const certs = JSON.parse(batch.farm_certifications || '[]');
      certs.forEach(cert => {
        certSheet.addRow({
          batch_code: batch.batch_code,
          name: cert.name,
          body: cert.body,
          date: cert.date ? new Date(cert.date).toLocaleDateString('vi-VN') : '',
          expire: cert.expire ? new Date(cert.expire).toLocaleDateString('vi-VN') : '',
          number: cert.number
        });
      });
    });
    
    if (certSheet.getRow(1).values.length > 0) {
      certSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      certSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f2b1f' } };
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=traceability-report.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('[Traceability] Excel export error:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// ==================== NEW TRACEABILITY ENGINE (TB) ROUTES ====================

// TB: List batches
router.get('/tb/batches', auth, async (req, res) => {
  try {
    const { farm_id, status, product_type } = req.query;
    let sql = 'SELECT tb.*, f.name as farm_name FROM tb_batches tb LEFT JOIN farms f ON tb.farm_id = f.id WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND tb.farm_id = ?'; params.push(farm_id); }
    if (status) { sql += ' AND tb.status = ?'; params.push(status); }
    if (product_type) { sql += ' AND tb.product_type = ?'; params.push(product_type); }
    sql += ' ORDER BY tb.created_at DESC';
    const batches = getAll(sql, params);
    res.json({ ok: true, data: batches, count: batches.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Get batch detail
router.get('/tb/batches/:id', auth, async (req, res) => {
  try {
    const batch = getOne('SELECT tb.*, f.name as farm_name, a.name as area_name FROM tb_batches tb LEFT JOIN farms f ON tb.farm_id = f.id LEFT JOIN areas a ON tb.area_id = a.id WHERE tb.id = ?', [req.params.id]);
    if (!batch) return res.status(404).json({ ok: false, error: 'Batch not found' });
    const events = getAll('SELECT * FROM tb_batch_events WHERE batch_id = ? ORDER BY event_time DESC', [batch.id]);
    const inputs = getAll('SELECT * FROM tb_batch_inputs WHERE batch_id = ?', [batch.id]);
    const qualityChecks = getAll('SELECT * FROM tb_batch_quality_checks WHERE batch_id = ? ORDER BY checked_at DESC', [batch.id]);
    const packages = getAll('SELECT * FROM tb_packages WHERE batch_id = ?', [batch.id]);
    res.json({ ok: true, data: { ...batch, events, inputs, quality_checks: qualityChecks, packages } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Create batch
router.post('/tb/batches', auth, async (req, res) => {
  try {
    const { farm_id, area_id, season_id, asset_id, product_name, product_type, batch_code, harvest_date, produced_quantity, unit, quality_grade } = req.body;
    if (!product_name) return res.status(400).json({ ok: false, error: 'product_name is required' });
    const id = `tb-${uuidv4().slice(0, 8)}`;
    const code = batch_code || `TB-${Date.now().toString(36).toUpperCase()}`;
    const { db } = require('../config/database');
    db.run(`INSERT INTO tb_batches (id, org_id, farm_id, area_id, season_id, asset_id, product_name, product_type, batch_code, harvest_date, produced_quantity, unit, quality_grade, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
    [id, null, farm_id, area_id, season_id, asset_id, product_name, product_type, code, harvest_date, produced_quantity, unit || 'kg', quality_grade]
    );
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [id]);
    db.run('INSERT INTO tb_batch_events (id, batch_id, event_type, actor_type, note) VALUES (?, ?, ?, ?, ?)', [`tbe-${uuidv4().slice(0, 8)}`, id, 'created', 'user', 'Batch created']);
    res.status(201).json({ ok: true, data: batch });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Update batch
router.patch('/tb/batches/:id', auth, async (req, res) => {
  try {
    const { product_name, product_type, batch_code, harvest_date, produced_quantity, unit, quality_grade, status } = req.body;
    const existing = getOne('SELECT * FROM tb_batches WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Batch not found' });
    const { db } = require('../config/database');
    db.run(`UPDATE tb_batches SET product_name = COALESCE(?, product_name), product_type = COALESCE(?, product_type), batch_code = COALESCE(?, batch_code),
           harvest_date = COALESCE(?, harvest_date), produced_quantity = COALESCE(?, produced_quantity), unit = COALESCE(?, unit),
           quality_grade = COALESCE(?, quality_grade), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [product_name, product_type, batch_code, harvest_date, produced_quantity, unit, quality_grade, status, req.params.id]
    );
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: batch });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Add batch event
router.post('/tb/batches/:id/events', auth, async (req, res) => {
  try {
    const { event_type, actor_type, actor_id, related_log_id, related_quantity_id, related_inventory_id, location, note, status } = req.body;
    if (!event_type) return res.status(400).json({ ok: false, error: 'event_type is required' });
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [req.params.id]);
    if (!batch) return res.status(404).json({ ok: false, error: 'Batch not found' });
    const id = `tbe-${uuidv4().slice(0, 8)}`;
    const locationJson = location ? JSON.stringify(location) : null;
    const { db } = require('../config/database');
    db.run(`INSERT INTO tb_batch_events (id, batch_id, event_type, actor_type, actor_id, related_log_id, related_quantity_id, related_inventory_id, location_json, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.id, event_type, actor_type || 'user', actor_id, related_log_id, related_quantity_id, related_inventory_id, locationJson, note]
    );
    if (status && status !== 'created') {
      db.run('UPDATE tb_batches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    }
    const event = getOne('SELECT * FROM tb_batch_events WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: event });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Get batch events
router.get('/tb/batches/:id/events', auth, async (req, res) => {
  try {
    const events = getAll('SELECT * FROM tb_batch_events WHERE batch_id = ? ORDER BY event_time DESC', [req.params.id]);
    res.json({ ok: true, data: events });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Add batch input
router.post('/tb/batches/:id/inputs', auth, async (req, res) => {
  try {
    const { input_type, input_name, supplier_name, quantity, unit } = req.body;
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [req.params.id]);
    if (!batch) return res.status(404).json({ ok: false, error: 'Batch not found' });
    const id = `tbi-${uuidv4().slice(0, 8)}`;
    const { db } = require('../config/database');
    db.run('INSERT INTO tb_batch_inputs (id, batch_id, input_type, input_name, supplier_name, quantity, unit, used_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [id, req.params.id, input_type, input_name, supplier_name, quantity, unit]
    );
    const input = getOne('SELECT * FROM tb_batch_inputs WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: input });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Add quality check
router.post('/tb/batches/:id/quality-checks', auth, async (req, res) => {
  try {
    const { check_type, result, score, details, checked_by } = req.body;
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [req.params.id]);
    if (!batch) return res.status(404).json({ ok: false, error: 'Batch not found' });
    const id = `tbqc-${uuidv4().slice(0, 8)}`;
    const detailsJson = details ? JSON.stringify(details) : null;
    const { db } = require('../config/database');
    db.run('INSERT INTO tb_batch_quality_checks (id, batch_id, check_type, result, score, details_json, checked_by, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [id, req.params.id, check_type, result, score, detailsJson, checked_by]
    );
    res.status(201).json({ ok: true, data: { id, check_type, result, score } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Packages
router.get('/tb/packages', auth, async (req, res) => {
  try {
    const { batch_id, status } = req.query;
    let sql = 'SELECT * FROM tb_packages WHERE 1=1';
    const params = [];
    if (batch_id) { sql += ' AND batch_id = ?'; params.push(batch_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY packed_at DESC';
    const packages = getAll(sql, params);
    res.json({ ok: true, data: packages, count: packages.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/tb/packages', auth, async (req, res) => {
  try {
    const { batch_id, package_code, barcode, qr_code, net_weight, unit, packaging_type } = req.body;
    if (!batch_id) return res.status(400).json({ ok: false, error: 'batch_id is required' });
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [batch_id]);
    if (!batch) return res.status(404).json({ ok: false, error: 'Batch not found' });
    const id = `pkg-${uuidv4().slice(0, 8)}`;
    const code = package_code || `PKG-${Date.now().toString(36).toUpperCase()}`;
    const { db } = require('../config/database');
    db.run(`INSERT INTO tb_packages (id, batch_id, package_code, barcode, qr_code, net_weight, unit, packaging_type, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
    [id, batch_id, code, barcode || code, qr_code || code, net_weight, unit || 'kg', packaging_type || 'carton']
    );
    const pkg = getOne('SELECT * FROM tb_packages WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: pkg });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/tb/packages/:id', auth, async (req, res) => {
  try {
    const pkg = getOne('SELECT * FROM tb_packages WHERE id = ?', [req.params.id]);
    if (!pkg) return res.status(404).json({ ok: false, error: 'Package not found' });
    const batch = getOne('SELECT * FROM tb_batches WHERE id = ?', [pkg.batch_id]);
    res.json({ ok: true, data: { ...pkg, batch } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/tb/packages/:id/qr', auth, async (req, res) => {
  try {
    const pkg = getOne('SELECT * FROM tb_packages WHERE id = ?', [req.params.id]);
    if (!pkg) return res.status(404).json({ ok: false, error: 'Package not found' });
    const qrUrl = `${BASE_URL}/public/trace/${pkg.qr_code || pkg.package_code}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 });
    res.json({ ok: true, data: { qr_code: pkg.qr_code, url: qrUrl, qr_image: qrDataUrl } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Shipments
router.get('/tb/shipments', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM tb_shipments WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const shipments = getAll(sql, params);
    res.json({ ok: true, data: shipments, count: shipments.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/tb/shipments', auth, async (req, res) => {
  try {
    const { customer_name, destination, transport_type, items } = req.body;
    if (!items || !items.length) return res.status(400).json({ ok: false, error: 'items array is required' });
    const id = `ship-${uuidv4().slice(0, 8)}`;
    const code = `SHP-${Date.now().toString(36).toUpperCase()}`;
    const { db } = require('../config/database');
    db.run('INSERT INTO tb_shipments (id, shipment_code, customer_name, destination, transport_type, status) VALUES (?, ?, ?, ?, ?, \'preparing\')',
      [id, code, customer_name, destination, transport_type]
    );
    for (const item of items) {
      db.run('INSERT INTO tb_shipment_items (id, shipment_id, package_id, quantity, unit) VALUES (?, ?, ?, ?, ?)',
        [`shi-${uuidv4().slice(0, 8)}`, id, item.package_id, item.quantity, item.unit || 'kg']
      );
    }
    const shipment = getOne('SELECT * FROM tb_shipments WHERE id = ?', [id]);
    const shipmentItems = getAll('SELECT * FROM tb_shipment_items WHERE shipment_id = ?', [id]);
    res.status(201).json({ ok: true, data: { ...shipment, items: shipmentItems } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch('/tb/shipments/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const shipment = getOne('SELECT * FROM tb_shipments WHERE id = ?', [req.params.id]);
    if (!shipment) return res.status(404).json({ ok: false, error: 'Shipment not found' });
    const { db } = require('../config/database');
    const now = status === 'delivered' ? 'CURRENT_TIMESTAMP' : 'NULL';
    db.run(`UPDATE tb_shipments SET status = ?, delivered_at = ${status === 'delivered' ? 'CURRENT_TIMESTAMP' : 'NULL'}, shipped_at = ${status === 'shipped' ? 'CURRENT_TIMESTAMP' : 'shipped_at'} WHERE id = ?`,
      [status, req.params.id]
    );
    if (status === 'shipped') {
      db.run('UPDATE tb_packages SET status = ? WHERE batch_id IN (SELECT batch_id FROM tb_shipment_items WHERE shipment_id = ?)', ['shipped', req.params.id]);
    }
    const updated = getOne('SELECT * FROM tb_shipments WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: updated });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Incidents / Recall
router.get('/tb/incidents', auth, async (req, res) => {
  try {
    const { status, severity } = req.query;
    let sql = 'SELECT * FROM tb_recall_incidents WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (severity) { sql += ' AND severity = ?'; params.push(severity); }
    sql += ' ORDER BY created_at DESC';
    const incidents = getAll(sql, params);
    res.json({ ok: true, data: incidents, count: incidents.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/tb/incidents', auth, async (req, res) => {
  try {
    const { batch_id, incident_type, severity, description } = req.body;
    if (!batch_id) return res.status(400).json({ ok: false, error: 'batch_id is required' });
    const id = `inc-${uuidv4().slice(0, 8)}`;
    const { db } = require('../config/database');
    db.run('INSERT INTO tb_recall_incidents (id, batch_id, incident_type, severity, description, status, created_by) VALUES (?, ?, ?, ?, ?, \'open\', ?)',
      [id, batch_id, incident_type, severity, description, req.user?.id]
    );
    db.run('UPDATE tb_batches SET status = ? WHERE id = ?', ['recalled', batch_id]);
    const incident = getOne('SELECT * FROM tb_recall_incidents WHERE id = ?', [id]);
    res.status(201).json({ ok: true, data: incident });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.patch('/tb/incidents/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const incident = getOne('SELECT * FROM tb_recall_incidents WHERE id = ?', [req.params.id]);
    if (!incident) return res.status(404).json({ ok: false, error: 'Incident not found' });
    const { db } = require('../config/database');
    const resolvedAt = status === 'resolved' ? 'CURRENT_TIMESTAMP' : 'NULL';
    db.run(`UPDATE tb_recall_incidents SET status = ?, resolved_at = ${status === 'resolved' ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = ?`,
      [status, req.params.id]
    );
    if (status === 'resolved') {
      db.run('UPDATE tb_batches SET status = ? WHERE id = ?', ['closed', incident.batch_id]);
    }
    const updated = getOne('SELECT * FROM tb_recall_incidents WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: updated });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Public verification
router.get('/public/trace/:code', async (req, res) => {
  try {
    const { code } = req.params;
    let item = getOne('SELECT * FROM tb_batches WHERE batch_code = ?', [code]);
    let type = 'batch';
    if (!item) {
      item = getOne('SELECT * FROM tb_packages WHERE package_code = ? OR barcode = ? OR qr_code = ?', [code, code, code]);
      type = 'package';
    }
    if (!item) {
      item = getOne('SELECT * FROM tb_shipments WHERE shipment_code = ?', [code]);
      type = 'shipment';
    }
    if (!item) return res.status(404).json({ ok: false, error: 'Not found' });
    const publicData = {
      type,
      code: item.batch_code || item.package_code || item.shipment_code,
      product_name: item.product_name,
      status: item.status,
      created_at: item.created_at,
      harvest_date: item.harvest_date,
      farm_name: item.farm_id ? getOne('SELECT name FROM farms WHERE id = ?', [item.farm_id])?.name : null
    };
    if (type === 'package') {
      const batch = getOne('SELECT product_name, harvest_date, batch_code FROM tb_batches WHERE id = ?', [item.batch_id]);
      publicData.product_name = batch?.product_name;
      publicData.batch_code = batch?.batch_code;
      publicData.harvest_date = batch?.harvest_date;
    }
    res.json({ ok: true, data: publicData });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// TB: Dashboard stats
router.get('/tb/stats', auth, async (req, res) => {
  try {
    const totalBatches = getOne('SELECT COUNT(*) as count FROM tb_batches')?.count || 0;
    const activeBatches = getOne('SELECT COUNT(*) as count FROM tb_batches WHERE status IN (?, ?)', ['created', 'processing'])?.count || 0;
    const shippedPackages = getOne('SELECT COUNT(*) as count FROM tb_packages WHERE status = ?', ['shipped'])?.count || 0;
    const qualityPass = getOne('SELECT COUNT(*) as count FROM tb_batch_quality_checks WHERE result = ?', ['pass'])?.count || 0;
    const qualityTotal = getOne('SELECT COUNT(*) as count FROM tb_batch_quality_checks')?.count || 0;
    const openIncidents = getOne('SELECT COUNT(*) as count FROM tb_recall_incidents WHERE status = ?', ['open'])?.count || 0;
    res.json({ ok: true, data: { total_batches: totalBatches, active_batches: activeBatches, shipped_packages: shippedPackages, quality_pass_rate: qualityTotal ? Math.round(qualityPass / qualityTotal * 100) : 0, open_incidents: openIncidents } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
