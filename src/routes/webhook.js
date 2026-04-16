const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { signEnvelope } = require('../utils/envelope');
const metrics = require('../metrics');
const { runQuery, getOne, getAll } = require('../config/database');
const logger = require('../config/logger');

// Legacy HMAC-based verification is now delegated to shared envelope utilities.

// POST /api/webhook/esp32 - Nhận data từ ESP32 V8.5.0
router.post('/esp32', async (req, res) => {
  try {
    const { payload, signature } = req.body;
    if (!payload || !signature) {
      return res.status(400).json({ error: 'Missing payload or signature' });
    }
    // Envelope-based verification
    const verification = require('../utils/envelope').verifyEnvelope(payload, signature);
    const route = '/api/webhook/esp32';
    if (!verification.valid) {
      metrics.envelopeVerificationsTotal.inc({ outcome: 'failure' });
      metrics.envelopeVerificationsByRoute.inc({ route, outcome: 'failure' });
      return res.status(401).json({ error: verification.error });
    }
    metrics.envelopeVerificationsTotal.inc({ outcome: 'success' });
    metrics.envelopeVerificationsByRoute.inc({ route, outcome: 'success' });

    // Resolve device id and firmware version with backward-compatible fields
    const deviceId = String(payload._did || payload.device_id || '');
    const fwVersion = String(payload.fw_version || payload.fw || '8.5.0');
    const readings = Array.isArray(payload.readings) ? payload.readings : [];
    if (!deviceId && !payload.device_id) {
      return res.status(400).json({ error: 'Missing device_id' });
    }

    logger.info(`[Webhook] Data from ${deviceId || payload.device_id} (FW: ${fwVersion})`);

    // Update or create device
    const existingDevice = getOne('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!existingDevice) {
      runQuery(
        'INSERT INTO devices (id, name, type, zone, status, config, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [deviceId, `EcoSynTech-${deviceId}`, 'ESP32', 'default', 'online', '{}', new Date().toISOString()]
      );
    } else {
      runQuery(
        'UPDATE devices SET status = ?, last_seen = ? WHERE id = ?',
        ['online', new Date().toISOString(), deviceId]
      );
    }

    // Process sensor readings
    if (readings && Array.isArray(readings)) {
      for (const reading of readings) {
        const sensor = String(reading.sensor_type || reading.sensor || reading.type || '').trim();
        const value = Number(reading.value);
        if (!sensor || Number.isNaN(value)) continue;
        const unit = String(reading.unit || '');
        const sensorId = `${deviceId}-${sensor}`;

        const existingSensor = getOne('SELECT * FROM sensors WHERE id = ?', [sensorId]);
        if (existingSensor) {
          runQuery('UPDATE sensors SET value = ?, unit = ?, timestamp = ? WHERE id = ?', [value, unit, new Date().toISOString(), sensorId]);
        } else {
          runQuery('INSERT INTO sensors (id, type, value, unit) VALUES (?, ?, ?, ?)', [sensorId, sensor, value, unit]);
        }
        logger.info(`[Webhook] ${sensor}=${value}${unit || ''} from ${deviceId}`);
      }
    }

    const responsePayload = {
      ok: true,
      device_id: deviceId,
      fw_version: fwVersion,
      server_ts: new Date().toISOString(),
      processed: { readings: readings.length }
    };
    if (payload.get_commands) responsePayload.commands = getPendingCommandsPayload(deviceId);
    if (payload.get_config) {
      responsePayload.config = {
        post_interval_sec: 600,
        sensor_interval_sec: 600,
        deep_sleep_enabled: true,
        config_version: 6,
        server_url: process.env.API_BASE_URL || 'http://localhost:3000'
      };
    }
    if (payload.get_batch) {
      responsePayload.batches = getBatchesForDevice(deviceId);
      responsePayload.rules = getRulesForDevice(deviceId);
    }
    const envelope = signEnvelope(responsePayload);
    // Optional: instrument envelope sign latency could be added here
    return res.json(envelope);

  } catch (err) {
    logger.error('[Webhook] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/webhook/batch - Nhận batch info từ ESP32
router.post('/batch', async (req, res) => {
  try {
    const { payload, signature } = req.body;
    if (!payload || !signature) {
      return res.status(400).json({ error: 'Missing payload or signature' });
    }
    const verification = require('../utils/envelope').verifyEnvelope(payload, signature);
    const route = '/api/webhook/batch';
    if (!verification.valid) {
      metrics.envelopeVerificationsTotal.inc({ outcome: 'failure' });
      metrics.envelopeVerificationsByRoute.inc({ route, outcome: 'failure' });
      return res.status(401).json({ error: verification.error });
    }
    metrics.envelopeVerificationsTotal.inc({ outcome: 'success' });
    metrics.envelopeVerificationsByRoute.inc({ route, outcome: 'success' });

    const { device_id, batches, config, rules } = payload;

    logger.info(`[Webhook] Batch config from ${device_id}`);

    // Return server-side configuration (canonical envelope)
    const responsePayload = {
      batches: getBatchesForDevice(device_id),
      config: {
        rules: getRulesForDevice(device_id),
        settings: {
          post_interval_sec: 3600,
          sensor_interval_sec: 60,
          deep_sleep_enabled: false
        }
      },
      _nonce: crypto.randomBytes(16).toString('hex'),
      _ts: Math.floor(Date.now() / 1000),
      _did: device_id
    };

    const envelopeResp = signEnvelope(responsePayload);
    res.json(envelopeResp);

  } catch (err) {
    logger.error('[Webhook] Batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/webhook/command - Gửi command tới ESP32
router.post('/command', async (req, res) => {
  try {
    const { device_id, command, params, command_id } = req.body;
    
    if (!device_id || !command) {
      return res.status(400).json({ error: 'Missing device_id or command' });
    }

    const commandId = command_id || `cmd-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Store command for ESP32 to fetch
    runQuery(
      'INSERT INTO commands (id, device_id, command, params, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [commandId, device_id, command, JSON.stringify(params || {}), 'pending', new Date().toISOString()]
    );

    logger.info(`[Webhook] Command ${command} queued for ${device_id}`);

    const payloadOut = { status: 'ok', command_id: commandId, timestamp: new Date().toISOString() };
    res.json(signEnvelope(payloadOut));

  } catch (err) {
    logger.error('[Webhook] Command error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/webhook/command/:deviceId - ESP32 fetch pending commands
router.get('/command/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { api_key } = req.query;

    if (!api_key || api_key !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const pendingCommands = getAll(
      'SELECT * FROM commands WHERE device_id = ? AND status = \'pending\' ORDER BY created_at ASC LIMIT 10',
      [deviceId]
    );

    // Mark as delivered
    for (const cmd of pendingCommands) {
      runQuery('UPDATE commands SET status = \'delivered\' WHERE id = ?', [cmd.id]);
    }

    const responsePayload = {
      commands: pendingCommands.map(c => ({
        command: c.command,
        command_id: c.id,
        params: JSON.parse(c.params || '{}')
      })),
      _did: deviceId,
      _ts: Math.floor(Date.now() / 1000),
      _nonce: crypto.randomBytes(16).toString('hex')
    };

    const envelopeResp = signEnvelope(responsePayload);
    res.json(envelopeResp);

  } catch (err) {
    logger.error('[Webhook] Fetch commands error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/webhook/command-result - ESP32 report command result
router.post('/command-result', async (req, res) => {
  try {
    const { payload, signature } = req.body;
    const verification = require('../utils/envelope').verifyEnvelope(payload, signature);
    const route = '/api/webhook/command-result';
    if (!verification.valid) {
      metrics.envelopeVerificationsTotal.inc({ outcome: 'failure' });
      metrics.envelopeVerificationsByRoute.inc({ route, outcome: 'failure' });
      return res.status(401).json({ error: verification.error });
    }
    metrics.envelopeVerificationsTotal.inc({ outcome: 'success' });
    metrics.envelopeVerificationsByRoute.inc({ route, outcome: 'success' });

    const { device_id, command_id, status, note } = payload;

    if (command_id) {
      runQuery(
        'UPDATE commands SET status = ?, note = ?, completed_at = ? WHERE id = ?',
        [status || 'completed', note || '', new Date().toISOString(), command_id]
      );
    }

    res.json(signEnvelope({ status: 'ok' }));

  } catch (err) {
    logger.error('[Webhook] Command result error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getBatchesForDevice(deviceId) {
  return getAll(
    'SELECT * FROM batches WHERE device_id = ? AND (status = \'active\' OR force_send = 1)',
    [deviceId]
  );
}

function getRulesForDevice(deviceId) {
  return getAll(
    'SELECT * FROM rules WHERE device_id = ? AND enabled = 1',
    [deviceId]
  );
}

function getPendingCommandsPayload(deviceId) {
  const pending = getAll(
    'SELECT * FROM commands WHERE device_id = ? AND status = "pending" ORDER BY created_at ASC LIMIT 10',
    [deviceId]
  );

  const commands = pending.map(cmd => ({
    command_id: cmd.id,
    command: cmd.command,
    params: JSON.parse(cmd.params || '{}')
  }));

  pending.forEach(cmd => {
    runQuery('UPDATE commands SET status = "sent", delivered_at = ? WHERE id = ?', [new Date().toISOString(), cmd.id]);
  });

  return commands;
}

module.exports = router;
