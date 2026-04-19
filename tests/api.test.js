// EcoSynTech FarmOS PRO - API Tests

const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  
  describe('GET /api/stats', () => {
    test('should return system stats', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok');
    });
  });
  
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });
  });
  
  describe('POST /api/auth/login', () => {
    test('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });
  });
  
  describe('GET /api/farms', () => {
    test('should require auth', async () => {
      const res = await request(app).get('/api/farms');
      expect(res.status).toBe(401);
    });
  });
});

describe('Validation', () => {
  test('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect('test@ecosyntech.com').toMatch(emailRegex);
    expect('invalid-email').not.toMatch(emailRegex);
  });
  
  test('should validate UUID format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect('test-uuid').not.toMatch(uuidRegex);
  });
});

describe('Security', () => {
  test('should not expose server info', async () => {
    const res = await request(app).get('/api/stats');
    // Should not leak stack traces
    expect(res.body.error || '').not.toContain('stack');
  });
});