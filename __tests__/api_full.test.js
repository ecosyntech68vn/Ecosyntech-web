const request = require('supertest');

let app;
let token;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const dbModule = require('../src/config/database');
  await dbModule.initDatabase();
  const { createApp } = require('../server');
  app = createApp();
});

afterAll(async () => {
  try {
    const dbModule = require('../src/config/database');
    await dbModule.closeDatabase();
  } catch (e) {
    // ignore
  }
});

describe('API - Full End-to-End', () => {
  test('Health and Version endpoints', async () => {
    let res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
  });

  test('Login via seeded user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  const authHeader = () => ({ Authorization: `Bearer ${token}` });

  test('Fetch sensors', async () => {
    const res = await request(app).get('/api/sensors').set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body) || res.body).toBeTruthy();
  });

  test('Fetch devices', async () => {
    const res = await request(app).get('/api/devices').set(authHeader());
    expect(res.status).toBe(200);
  });

  test('Fetch rules', async () => {
    const res = await request(app).get('/api/rules').set(authHeader());
    expect(res.status).toBe(200);
  });

  test('Create a rule', async () => {
    const payload = {
      name: 'Full Test Rule',
      description: 'create from API full test',
      enabled: true,
      condition: { sensor: 'soil', operator: '<', value: 40 },
      action: { type: 'alert', target: 'all' }
    };
    const res = await request(app).post('/api/rules').set(authHeader()).send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('Fetch history', async () => {
    const res = await request(app).get('/api/history').set(authHeader());
    expect(res.status).toBe(200);
  });

  test('Fetch alerts', async () => {
    const res = await request(app).get('/api/alerts').set(authHeader());
    expect(res.status).toBe(200);
  });

  test('Export all data', async () => {
    const res = await request(app).post('/api/export').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sensors');
  });

  test('Import data (empty payload)', async () => {
    const res = await request(app).post('/api/import').set(authHeader()).send({});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
