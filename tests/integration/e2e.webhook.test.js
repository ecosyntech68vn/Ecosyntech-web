// End-to-end tests for ESP32 canonical contract via webhook + sensors readout
const request = require('supertest');
const { initDatabase, closeDatabase } = require('../../src/config/database');
const appFactory = require('../../server');
let app;

describe('E2E Webhook Canonical', () => {
  beforeAll(async () => {
    // Reset DB to a clean state for E2E tests
    try { await closeDatabase(); } catch (e) { /* ignore */ }
    await initDatabase();
    const appModule = appFactory;
    app = appModule.createApp();
  });

  afterAll(async () => {
    // Do not close app here to keep test environment stable for other tests; close DB
    try { await closeDatabase(); } catch (e) { /* ignore */ }
  });

  test('ESP32 canonical envelope flow /esp32', async () => {
    const payload = {
      _did: 'ESP32-TEST-Flow',
      _ts: Math.floor(Date.now() / 1000),
      _nonce: 'integration-nonce-flow',
      device_id: 'ESP32-TEST-Flow',
      fw_version: '8.6.0',
      readings: [
        { sensor_type: 'temperature', value: 26.2, unit: 'C' },
        { sensor_type: 'humidity', value: 55, unit: '%' }
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
    expect(res.body).toHaveProperty('payload');
    expect(res.body).toHaveProperty('signature');
    expect(res.body.payload).toHaveProperty('ok');
    expect(res.body.payload.ok).toBe(true);
  }, 30000);
});
