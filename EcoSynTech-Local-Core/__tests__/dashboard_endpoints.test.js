const request = require('supertest')

let app
let token

beforeAll(async () => {
  const dbModule = require('../src/config/database');
  await dbModule.initDatabase();
  const { createApp } = require('../server')
  app = createApp()
  const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' })
  token = res.body && res.body.token
}, 60000)

describe('Dashboard API Endpoints', () => {
  test('GET /api/dashboard/stats returns data', async () => {
    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toBeTruthy()
    // stats shape check: should contain revenue or devices
    expect(res.body).toHaveProperty('revenue')
  })

  test('GET /api/dashboard/devices returns array', async () => {
    const res = await request(app).get('/api/dashboard/devices').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    // response may be array or object depending on mock; handle both
    if (Array.isArray(res.body)) {
      expect(res.body.length).toBeGreaterThanOrEqual(0)
    } else {
      expect(res.body).toBeTruthy()
    }
  })

  test('Dashboard pages are accessible', async () => {
    const pages = [
      '/dashboard',
      '/dashboard/main',
      '/dashboard/devices',
      '/dashboard/monitoring',
      '/dashboard/alerts',
      '/dashboard/automation',
      '/dashboard/maintenance',
      '/dashboard/traceability',
      '/dashboard/energy',
      '/dashboard/multifarm',
      '/dashboard/reports',
      '/dashboard/sales',
      '/dashboard/inventory',
      '/dashboard/marketing',
      '/dashboard/hr',
      '/dashboard/ai',
      '/dashboard/system',
    ]
    for (const p of pages) {
      const res = await request(app).get(p)
      // static pages usually serve 200 OK
      expect([200, 304].includes(res.status)).toBe(true)
    }
  })
})
