const request = require('supertest');

let app;
let token;

// Initialize database and bootstrapped app in test environment
beforeAll(async () => {
  // Ensure test env is set for server.js to avoid auto-start
  process.env.NODE_ENV = 'test';

  // Initialize the database (creates tables and seeds data)
  const dbModule = require('../src/config/database');
  await dbModule.initDatabase();

  // Create Express app from server module without starting a real server
  const { createApp } = require('../server');
  app = createApp();
});

afterAll(async () => {
  try {
  // Close and persist database state
  const dbModule = require('../src/config/database');
  await dbModule.closeDatabase();
  } catch (e) {
    // ignore
  }
});

describe('API Endpoints - Auth and Health', () => {
  test('Health endpoint is healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  test('Version endpoint returns api and server info', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('api');
    expect(res.body).toHaveProperty('server');
  });

  test('Register a new user', async () => {
    const payload = {
      email: 'newuser2@example.com',
      password: 'newpass123',
      name: 'New User 2'
    };
    const res = await request(app).post('/api/auth/register').send(payload);
    if (res.status === 201) {
      expect(res.body).toHaveProperty('token');
    } else if (res.status === 409) {
      // If user already exists, verify login is possible
      const loginRes = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    } else {
      throw new Error(`Register returned unexpected status: ${res.status}`);
    }
  });

  test('Login with seeded test user', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'password123'
    };
    const res = await request(app).post('/api/auth/login').send(payload);
    if (res.status !== 200) {
      console.error('Login response error:', res.status, res.text || res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
    token = res.body.token;
  });

  test('Expired token should be rejected with Token expired', async () => {
    const cfg = require('../src/config');
    const jwt = require('jsonwebtoken');
    // Create an expired token (expired 60 seconds ago)
    const expiredToken = jwt.sign({ id: 'expired-user', email: 'expired@example.com' }, cfg.jwt.secret, { expiresIn: -60 });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Token expired');
  });

  test('Me endpoint returns current user when authenticated', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
  });

  test('Export endpoint returns data payload', async () => {
    const res = await request(app).post('/api/export');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Object);
    expect(res.body).toHaveProperty('sensors');
  });
});
