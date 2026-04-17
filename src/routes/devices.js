const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { runQuery, getOne, getAll } = require('../config/database');
const logger = require('../config/logger');
const { auth } = require('../middleware/auth');

// Validation schemas
const deviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('ESP32', 'ESP8266', 'Arduino', 'Raspberry Pi', 'Sensor', 'Gateway', 'Other').required(),
  zone: Joi.string().max(50).default('default'),
  location: Joi.string().max(200).optional(),
  metadata: Joi.object().optional(),
  config: Joi.object().optional()
});

const updateDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  zone: Joi.string().max(50).optional(),
  location: Joi.string().max(200).optional(),
  status: Joi.string().valid('online', 'offline', 'maintenance', 'error').optional(),
  metadata: Joi.object().optional()
});

// GET /api/devices - List all devices
router.get('/', auth, async (req, res) => {
  try {
    const devices = getAll(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM rules WHERE enabled = 1) as active_rules
      FROM devices d
      ORDER BY d.last_seen DESC
    `);
    
    res.json({
      success: true,
      count: devices.length,
      devices: devices.map(d => ({
        ...d,
        config: JSON.parse(d.config || '{}'),
        metadata: JSON.parse(d.metadata || '{}')
      }))
    });
  } catch (err) {
    logger.error('[Devices] List error:', err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/devices/:id - Get single device
router.get('/:id', auth, async (req, res) => {
  try {
    const device = getOne(`
      SELECT d.*,
        (SELECT COUNT(*) FROM sensors WHERE sensor_id = d.id) as sensor_count,
        (SELECT COUNT(*) FROM rules WHERE device_id = d.id AND enabled = 1) as active_rules
      FROM devices d
      WHERE d.id = ?
    `, [req.params.id]);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get device sensors
    const sensors = getAll('SELECT * FROM sensors WHERE sensor_id = ?', [req.params.id]);
    
    // Get device rules
    const rules = getAll('SELECT * FROM rules WHERE device_id = ?', [req.params.id]);

    res.json({
      success: true,
      device: {
        ...device,
        config: JSON.parse(device.config || '{}'),
        metadata: JSON.parse(device.metadata || '{}')
      },
      sensors,
      rules
    });
  } catch (err) {
    logger.error('[Devices] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// POST /api/devices - Register new device
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = deviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const deviceId = `DEV-${uuidv4().substring(0, 8).toUpperCase()}`;
    const { name, type, zone } = value;
    
    runQuery(
      `INSERT INTO devices (id, name, type, zone, status, config, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, name, type, zone, 'offline', '{}', new Date().toISOString()]
    );

    const device = getOne('SELECT * FROM devices WHERE id = ?', [deviceId]);

    logger.info(`[Devices] Created: ${deviceId} - ${name}`);

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      device: {
        ...device,
        config: JSON.parse(device.config || '{}'),
        metadata: JSON.parse(device.metadata || '{}')
      }
    });
  } catch (err) {
    logger.error('[Devices] Create error:', err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// PUT /api/devices/:id - Update device
router.put('/:id', auth, async (req, res) => {
  try {
    const device = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { error, value } = updateDeviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const params = [];

    if (value.name) {
      updates.push('name = ?');
      params.push(value.name);
    }
    if (value.zone) {
      updates.push('zone = ?');
      params.push(value.zone);
    }
    if (value.location !== undefined) {
      updates.push('location = ?');
      params.push(value.location);
    }
    if (value.status) {
      updates.push('status = ?');
      params.push(value.status);
    }
    if (value.metadata) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(value.metadata));
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    runQuery(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedDevice = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);

    logger.info(`[Devices] Updated: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Device updated successfully',
      device: {
        ...updatedDevice,
        config: JSON.parse(updatedDevice.config || '{}'),
        metadata: JSON.parse(updatedDevice.metadata || '{}')
      }
    });
  } catch (err) {
    logger.error('[Devices] Update error:', err);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// PUT /api/devices/:id/config - Update device config
router.put('/:id/config', auth, async (req, res) => {
  try {
    const device = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }

    runQuery('UPDATE devices SET config = ?, updated_at = ? WHERE id = ?', 
      [JSON.stringify(config), new Date().toISOString(), req.params.id]);

    const updatedDevice = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);

    logger.info(`[Devices] Config updated: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Device config updated successfully',
      device: {
        ...updatedDevice,
        config: JSON.parse(updatedDevice.config || '{}')
      }
    });
  } catch (err) {
    logger.error('[Devices] Config update error:', err);
    res.status(500).json({ error: 'Failed to update device config' });
  }
});

// DELETE /api/devices/:id - Delete device
router.delete('/:id', auth, async (req, res) => {
  try {
    const device = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    runQuery('DELETE FROM devices WHERE id = ?', [req.params.id]);

    logger.info(`[Devices] Deleted: ${req.params.id}`);

    res.status(204).send();
  } catch (err) {
    logger.error('[Devices] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// POST /api/devices/:id/command - Send command to device
router.post('/:id/command', auth, async (req, res) => {
  try {
    const { command, params } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const device = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const commandId = `cmd-${Date.now()}-${uuidv4().substring(0, 8)}`;
    
    runQuery(
      'INSERT INTO commands (id, device_id, command, params, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [commandId, req.params.id, command, JSON.stringify(params || {}), 'pending', new Date().toISOString()]
    );

    logger.info(`[Devices] Command queued: ${command} for ${req.params.id}`);

    res.json({
      success: true,
      command_id: commandId,
      message: 'Command queued successfully'
    });
  } catch (err) {
    logger.error('[Devices] Command error:', err);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// GET /api/devices/:id/sensors - Get device sensors
router.get('/:id/sensors', auth, async (req, res) => {
  try {
    const sensors = getAll('SELECT * FROM sensors WHERE sensor_id = ?', [req.params.id]);
    
    res.json({
      success: true,
      count: sensors.length,
      sensors
    });
  } catch (err) {
    logger.error('[Devices] Sensors error:', err);
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

// POST /api/devices/:id/heartbeat - Device heartbeat
router.post('/:id/heartbeat', async (req, res) => {
  try {
    const device = getOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    runQuery(
      'UPDATE devices SET status = ?, last_seen = ?, updated_at = ? WHERE id = ?',
      ['online', new Date().toISOString(), new Date().toISOString(), req.params.id]
    );

    // Get pending commands
    const commands = getAll(
      'SELECT * FROM commands WHERE device_id = ? AND status = \'pending\' ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json({
      success: true,
      status: 'online',
      pending_commands: commands.length,
      commands: commands.map(c => ({
        command_id: c.id,
        command: c.command,
        params: JSON.parse(c.params || '{}')
      }))
    });
  } catch (err) {
    logger.error('[Devices] Heartbeat error:', err);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

module.exports = router;
