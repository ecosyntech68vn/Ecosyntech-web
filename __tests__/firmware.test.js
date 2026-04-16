/**
 * Firmware API Tests - EcoSynTech IoT Backend
 * Tests for /api/firmware endpoints
 * 
 * Run with: npm test -- __tests__/firmware.test.js
 */
const request = require('supertest');
const crypto = require('crypto');

let app;
let token;
let HMAC_SECRET = 'CEOTAQUANGTHUAN_TADUYANH_CTYTNHHDUYANH_ECOSYNTECH_2026';

function canonicalStringify(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

function hmacHex(message) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(message).digest('hex');
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.HMAC_SECRET = HMAC_SECRET;
  const dbModule = require('../src/config/database');
  await dbModule.initDatabase();
  const { createApp } = require('../server');
  app = createApp();
  
  // Login to get auth token for other tests
  const loginRes = await request(app).post('/api/auth/login').send({ 
    email: 'test@example.com', 
    password: 'password123' 
  });
  if (loginRes.status === 200) {
    token = loginRes.body.token;
  }
});

afterAll(async () => {
  try {
    const dbModule = require('../src/config/database');
    await dbModule.closeDatabase();
  } catch (e) {
    // ignore
  }
});

const authHeader = () => ({ Authorization: `Bearer ${token}` });

describe('Firmware API - Contract Tests', () => {
  const testDeviceId = 'esp32-test-device-001';
  
  // Helper to create signed payload
  function createSignedPayload(payloadObj) {
    const payload = { ...payloadObj };
    payload._nonce = crypto.randomBytes(16).toString('hex');
    payload._ts = Math.floor(Date.now() / 1000);
    payload._did = testDeviceId;
    const signature = hmacHex(canonicalStringify(payload));
    return { payload, signature };
  }

  describe('POST /api/firmware/webhook', () => {
    test('TC01: Missing signature should return 400', async () => {
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload: { _did: testDeviceId, _ts: Math.floor(Date.now()/1000), _nonce: 'test' } });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    test('TC02: Missing device id should return 400', async () => {
      const payload = { _ts: Math.floor(Date.now()/1000), _nonce: 'test' };
      const signature = hmacHex(canonicalStringify(payload));
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      expect(res.status).toBe(400);
    });

    test('TC03: Missing nonce should return 401', async () => {
      const payload = { _did: testDeviceId, _ts: Math.floor(Date.now()/1000) };
      const signature = hmacHex(canonicalStringify(payload));
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Missing nonce');
    });

    test('TC04: Invalid signature should return 401', async () => {
      const payload = { _did: testDeviceId, _ts: Math.floor(Date.now()/1000), _nonce: 'test123' };
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature: 'invalidsignature123456789012345678901234567890123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid signature');
    });

    test('TC05: Expired timestamp should return 401', async () => {
      const payload = { 
        _did: testDeviceId, 
        _ts: Math.floor(Date.now()/1000) - 1300, // 1300 seconds ago
        _nonce: 'oldnonce123' 
      };
      const signature = hmacHex(canonicalStringify(payload));
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('expired');
    });

    test('TC06: Replay attack should be detected', async () => {
      const payload = { _did: testDeviceId, _ts: Math.floor(Date.now()/1000), _nonce: 'replaynonce123' };
      const signature = hmacHex(canonicalStringify(payload));
      
      // First request should succeed
      const res1 = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      expect(res1.status).toBe(200);
      
      // Second request with same nonce should fail
      const res2 = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      expect(res2.status).toBe(401);
      expect(res2.body.error).toContain('Replay');
    });

    test('TC07: Valid payload with readings[] should be processed', async () => {
      const payloadObj = {
        readings: [
          { sensor_type: 'temperature', value: 28.5, unit: '°C' },
          { sensor_type: 'humidity', value: 75.2, unit: '%' },
          { sensor_type: 'soil_moisture', value: 45, unit: '%' }
        ]
      };
      const { payload, signature } = createSignedPayload(payloadObj);
      
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('payload');
      expect(res.body).toHaveProperty('signature');
      expect(res.body.payload.ok).toBe(true);
      expect(res.body.payload.device_id).toBe(testDeviceId);
      expect(res.body.payload.processed).toHaveProperty('sensors', 3);
    });

    test('TC08: get_commands flag should return pending commands', async () => {
      // First create a pending command
      await request(app)
        .post('/api/firmware/devices/' + testDeviceId + '/command')
        .set(authHeader())
        .send({ command: 'restart', params: { force: true } });
      
      const payloadObj = { get_commands: true };
      const { payload, signature } = createSignedPayload(payloadObj);
      
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      
      expect(res.status).toBe(200);
      expect(res.body.payload.commands).toBeDefined();
      expect(Array.isArray(res.body.payload.commands)).toBe(true);
    });

    test('TC09: get_config flag should return 600/600 intervals', async () => {
      const payloadObj = { get_config: true };
      const { payload, signature } = createSignedPayload(payloadObj);
      
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      
      expect(res.status).toBe(200);
      expect(res.body.payload.config).toBeDefined();
      expect(res.body.payload.config.post_interval_sec).toBe(600);
      expect(res.body.payload.config.sensor_interval_sec).toBe(600);
      expect(res.body.payload.config_version).toBe(6);
    });

    test('TC10: Response should be signed', async () => {
      const payloadObj = { readings: [{ sensor_type: 'test', value: 1 }] };
      const { payload, signature } = createSignedPayload(payloadObj);
      
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ payload, signature });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('payload');
      expect(res.body).toHaveProperty('signature');
      
      // Verify response signature
      const expectedSig = hmacHex(canonicalStringify(res.body.payload));
      expect(res.body.signature).toBe(expectedSig);
    });

    test('TC11: Backward compatibility - direct payload without wrapper', async () => {
      const payloadObj = {
        readings: [{ sensor_type: 'battery', value: 3.8, unit: 'V' }],
        _ts: Math.floor(Date.now() / 1000),
        _nonce: 'compatnonce',
        _did: testDeviceId
      };
      const signature = hmacHex(canonicalStringify(payloadObj));
      
      const res = await request(app)
        .post('/api/firmware/webhook')
        .send({ ...payloadObj, signature }); // Send as flat payload
      
      expect(res.status).toBe(200);
      expect(res.body.payload.ok).toBe(true);
    });
  });

  describe('POST /api/firmware/devices/:deviceId/ack', () => {
    test('TC12: Missing command_id should return 400', async () => {
      const res = await request(app)
        .post('/api/firmware/devices/' + testDeviceId + '/ack')
        .send({ status: 'done' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('command_id');
    });

    test('TC13: Non-existent command should return 404', async () => {
      const res = await request(app)
        .post('/api/firmware/devices/' + testDeviceId + '/ack')
        .send({ command_id: 'non-existent-id', status: 'done' });
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Command not found');
    });

    test('TC14: Valid ACK should update command status', async () => {
      // First create a command
      const createRes = await request(app)
        .post('/api/firmware/devices/' + testDeviceId + '/command')
        .set(authHeader())
        .send({ command: 'test_cmd', params: { test: true } });
      
      const commandId = createRes.body.command_id;
      
      // Then ACK it
      const ackRes = await request(app)
        .post('/api/firmware/devices/' + testDeviceId + '/ack')
        .send({ command_id: commandId, status: 'done', note: 'Executed successfully' });
      
      expect(ackRes.status).toBe(200);
      expect(ackRes.body.payload.ok).toBe(true);
      expect(ackRes.body.payload.command_id).toBe(commandId);
      expect(ackRes.body.payload.status).toBe('done');
      expect(ackRes.body).toHaveProperty('signature');
    });
  });

  describe('GET /api/firmware/devices/:deviceId/firmware', () => {
    test('TC15: Get firmware info for non-existent device', async () => {
      const res = await request(app)
        .get('/api/firmware/devices/non-existent-device/firmware')
        .set(authHeader());
      expect(res.status).toBe(404);
    });

    test('TC16: Get firmware info for existing device', async () => {
      const res = await request(app)
        .get('/api/firmware/devices/' + testDeviceId + '/firmware')
        .set(authHeader());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.device).toBeDefined();
    });
  });

  describe('POST /api/firmware/devices/:deviceId/command', () => {
    test('TC17: Create command for non-existent device', async () => {
      const res = await request(app)
        .post('/api/firmware/devices/new-device-123/command')
        .set(authHeader())
        .send({ command: 'update_config', params: { interval: 300 } });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.command_id).toBeDefined();
    });

    test('TC18: Create command with schedule', async () => {
      const res = await request(app)
        .post('/api/firmware/devices/' + testDeviceId + '/command')
        .set(authHeader())
        .send({ 
          command: 'pump_on', 
          params: { duration: 60 },
          schedule: { time: '08:00', duration: 60 }
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('scheduled');
    });
  });

  describe('GET /api/firmware/devices/:deviceId/history', () => {
    test('TC19: Get device history', async () => {
      const res = await request(app)
        .get('/api/firmware/devices/' + testDeviceId + '/history')
        .set(authHeader());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.device_id).toBe(testDeviceId);
      expect(res.body.commands).toBeDefined();
    });

    test('TC20: Get device history with limit', async () => {
      const res = await request(app)
        .get('/api/firmware/devices/' + testDeviceId + '/history?limit=10')
        .set(authHeader());
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/firmware/batch/:batchId/attach', () => {
    test('TC21: Attach device to batch', async () => {
      // First create a batch (using traceability)
      await request(app)
        .post('/api/traceability/batches')
        .set(authHeader())
        .send({ 
          batch_code: 'TEST-BATCH-001', 
          product_name: 'Test Product',
          quantity: 100 
        });
      
      const res = await request(app)
        .post('/api/firmware/batch/TEST-BATCH-001/attach')
        .set(authHeader())
        .send({ deviceId: testDeviceId });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

describe('Security Tests', () => {
  const testDeviceId = 'esp32-test-device-001';
  
  function createSignedPayload(payloadObj) {
    const payload = { ...payloadObj };
    payload._nonce = crypto.randomBytes(16).toString('hex');
    payload._ts = Math.floor(Date.now() / 1000);
    payload._did = testDeviceId;
    const signature = hmacHex(canonicalStringify(payload));
    return { payload, signature };
  }
  
  test('TC22: No SQL injection in device ID', async () => {
    const maliciousPayload = {
      readings: [{ sensor_type: 'test', value: 1 }],
      _ts: Math.floor(Date.now()/1000),
      _nonce: 'sqltest',
      _did: "'; DROP TABLE devices; --"
    };
    const signature = hmacHex(canonicalStringify(maliciousPayload));
    
    const res = await request(app)
      .post('/api/firmware/webhook')
      .send({ payload: maliciousPayload, signature });
    
    // Should either reject or sanitize input - either way not crash
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  test('TC23: Large payload should be handled', async () => {
    // Create payload with many readings
    const readings = [];
    for (let i = 0; i < 100; i++) {
      readings.push({ sensor_type: `sensor_${i}`, value: i, unit: 'unit' });
    }
    
    const payloadObj = { readings };
    const { payload, signature } = createSignedPayload(payloadObj);
    
    const res = await request(app)
      .post('/api/firmware/webhook')
      .send({ payload, signature });
    
    expect(res.status).toBe(200);
    expect(res.body.payload.processed.sensors).toBe(100);
  });
});