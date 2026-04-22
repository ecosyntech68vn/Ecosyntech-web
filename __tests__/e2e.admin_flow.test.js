const request = require('supertest')
let app
let createApp
let adminToken = null
let nonAdminToken = null

beforeAll(async () => {
  const dbModule = require('../src/config/database')
  await dbModule.initDatabase()
  const mod = require('../server')
  createApp = mod.createApp
  app = createApp()

  const bcrypt = require('bcryptjs')
  const hashed = await bcrypt.hash('admin123', 10)
  const adminId = 'user-admin-test'
  try {
    await dbModule.runQuery(
      'INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [adminId, 'admin@example.com', hashed, 'Admin Test', 'admin']
    )
  } catch (e) { /* ignore */ }

  const nonAdminHash = await bcrypt.hash('nonadmin123', 10)
  try {
    await dbModule.runQuery(
      'INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      ['user-nonadmin', 'nonadmin@example.com', nonAdminHash, 'Non Admin', 'user']
    )
  } catch (e) { /* ignore */ }
})

test('Admin ping requires admin role', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin123' })
  expect(login.status).toBe(200)
  expect(login.body).toHaveProperty('token')
  adminToken = login.body.token
  const res = await request(app).get('/api/admin/ping').set('Authorization', `Bearer ${adminToken}`).expect(200)
  expect(res.body).toHaveProperty('admin', true)
})

test('Admin RBAC denies non-admin user', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'nonadmin@example.com', password: 'nonadmin123' })
  expect(login.status).toBe(200)
  expect(login.body).toHaveProperty('token')
  nonAdminToken = login.body.token
  const res = await request(app).get('/api/admin/ping').set('Authorization', `Bearer ${nonAdminToken}`).expect(403)
  expect(res.body).toHaveProperty('error')
})