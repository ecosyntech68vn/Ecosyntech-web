// Jest-based integration test for ESP32 webhook canonical contract using SuperTest
// This test boots a light in-process app, initializes DB, and exercises
// POST /api/webhook/esp32 with a canonical envelope payload.

const http = require('http');
const request = require('supertest');
const { initDatabase, closeDatabase } = require('../../src/config/database');
const { signEnvelope } = require('../../src/utils/envelope');
const { createApp } = require('../../server');

describe('Webhook Canonical (ESP32) Integration', () => {
  let app;
  let server;
  let port;

  beforeAll(async () => {
    // Init DB and start app in test mode
    await initDatabase();
    const appFactory = require('../../server');
    app = appFactory.createApp();
    server = http.createServer(app);
    await new Promise(resolve => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) server.close();
    await closeDatabase();
  });

  test('POST /api/webhook/esp32 accepts canonical envelope', async () => {
    const payload = {
      _did: 'ESP32-TEST',
      _ts: Math.floor(Date.now() / 1000),
      _nonce: 'nonce-integration-001',
      device_id: 'ESP32-TEST',
      fw_version: '8.5.0',
      readings: [
        { sensor_type: 'temperature', value: 25.5, unit: 'C' },
        { sensor_type: 'humidity', value: 60, unit: '%' }
      ],
      get_commands: true,
      get_config: true
    };

    const envelope = require('../../src/utils/envelope').signEnvelope(payload);

    const res = await request(app)
      .post('/api/webhook/esp32')
      .send({ payload, signature: envelope.signature })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body).toHaveProperty('payload');
    expect(res.body).toHaveProperty('signature');
    expect(res.body.payload).toHaveProperty('ok');
    expect(res.body.payload.ok).toBe(true);
  }, 30000);
});
