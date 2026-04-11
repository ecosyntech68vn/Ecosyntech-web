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
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
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
