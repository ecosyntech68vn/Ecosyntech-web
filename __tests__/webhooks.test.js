const request = require('supertest');
const crypto = require('crypto');

let app;
let dbModule;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { initDatabase, closeDatabase } = require('../src/config/database');
  dbModule = { initDatabase, closeDatabase };
  await dbModule.initDatabase();
  const { createApp } = require('../server');
  app = createApp();
});

afterAll(async () => {
  try {
    if (dbModule && dbModule.closeDatabase) {
      await dbModule.closeDatabase();
    }
  } catch (e) {
    // ignore
  }
});

function signatureFor(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

describe('Webhooks - Signed endpoints', () => {
  test('sensor-alert with valid signature', async () => {
    const payload = { sensor: 'temperature', value: 25.5, severity: 'warning', message: 'test webhook' };
    const sig = signatureFor(payload, 'webhook-secret');
    const res = await request(app)
      .post('/api/webhooks/sensor-alert')
      .set('Content-Type', 'application/json')
      .set('x-ecosyntech-signature', sig)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('sensor-alert with invalid signature', async () => {
    const payload = { sensor: 'temperature', value: 26 };
    const res = await request(app)
      .post('/api/webhooks/sensor-alert')
      .set('Content-Type', 'application/json')
      .set('x-ecosyntech-signature', 'invalid')
      .send(payload);
    expect(res.status).toBe(401);
  });

  test('device-status webhook', async () => {
    const payload = { deviceId: 'device-001', status: 'online' };
    const sig = signatureFor(payload, 'webhook-secret');
    const res = await request(app)
      .post('/api/webhooks/device-status')
      .set('Content-Type', 'application/json')
      .set('x-ecosyntech-signature', sig)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('rule-triggered webhook', async () => {
    const payload = { ruleId: 'rule-1', action: 'alert', result: 'success' };
    const sig = signatureFor(payload, 'webhook-secret');
    const res = await request(app)
      .post('/api/webhooks/rule-triggered')
      .set('Content-Type', 'application/json')
      .set('x-ecosyntech-signature', sig)
      .send(payload);
    expect(res.status).toBe(200);
  });

  test('schedule-run webhook', async () => {
    const payload = { scheduleId: 'sched-1', name: 'Test', zones: ['zone1'], result: 'success' };
    const sig = signatureFor(payload, 'webhook-secret');
    const res = await request(app)
      .post('/api/webhooks/schedule-run')
      .set('Content-Type', 'application/json')
      .set('x-ecosyntech-signature', sig)
      .send(payload);
    expect(res.status).toBe(200);
  });
});
