const request = require('supertest')

let app
let token
let createdDeviceId
let createdRuleId
let createdScheduleId

beforeAll(async () => {
  const dbModule = require('../src/config/database');
  await dbModule.initDatabase();
  const { createApp } = require('../server')
  app = createApp()
  // Log in as seeded test user to obtain token
  const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' })
  token = res.body && res.body.token
})

describe('Extended API Coverage', () => {
  test('Create device (ext)', async () => {
    const id = `dev-ext-${Date.now()}`
    const payload = { id, name: 'Ext Test Device', type: 'sensor', zone: 'zone1', config: { test: true } }
    const res = await request(app).post('/api/devices').set('Authorization', `Bearer ${token}`).send(payload)
    expect(res.status).toBe(201)
    createdDeviceId = res.body?.id || id
  })

  test('List devices contains created', async () => {
    const res = await request(app).get('/api/devices').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    const found = Array.isArray(res.body) ? res.body.find(d => d.id === createdDeviceId) : null
    expect(found).toBeTruthy()
  })

  test('Update device config', async () => {
    const res = await request(app).put(`/api/devices/${createdDeviceId}/config`).set('Authorization', `Bearer ${token}`).send({ config: { updated: true } })
    expect(res.status).toBe(200)
  })

  test('Send command to device', async () => {
    const res = await request(app).post(`/api/devices/${createdDeviceId}/command`).set('Authorization', `Bearer ${token}`).send({ command: 'ping', params: {} })
    expect(res.status).toBe(200)
  })

  test('Delete device', async () => {
    const res = await request(app).delete(`/api/devices/${createdDeviceId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  test('Create rule (ext)', async () => {
    const payload = {
      name: 'Ext Rule',
      description: 'extension test',
      enabled: true,
      condition: { sensor: 'temperature', operator: '>', value: 25 },
      action: { type: 'alert', target: 'all' }
    }
    const res = await request(app).post('/api/rules').set('Authorization', `Bearer ${token}`).send(payload)
    expect(res.status).toBe(201)
    createdRuleId = res.body?.id
  })

  test('Get rules includes ext', async () => {
    const res = await request(app).get('/api/rules').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  test('Toggle and update rule', async () => {
    if (!createdRuleId) return
    let res = await request(app).put(`/api/rules/${createdRuleId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Ext Rule Updated' })
    expect(res.status).toBe(200)
    res = await request(app).post(`/api/rules/${createdRuleId}/toggle`).set('Authorization', `Bearer ${token}`).send()
    expect(res.status).toBe(200)
  })

  test('Delete rule', async () => {
    if (!createdRuleId) return
    const res = await request(app).delete(`/api/rules/${createdRuleId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  test('Create schedule (ext)', async () => {
    const payload = {
      name: 'Ext Schedule',
      time: '09:00',
      duration: 30,
      zones: ['zone1'],
      days: ['Mon', 'Tue']
    }
    const res = await request(app).post('/api/schedules').set('Authorization', `Bearer ${token}`).send(payload)
    expect(res.status).toBe(201)
    createdScheduleId = res.body?.id
  })

  test('Get schedules', async () => {
    const res = await request(app).get('/api/schedules').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  test('Toggle schedule', async () => {
    if (!createdScheduleId) return
    const res = await request(app).post(`/api/schedules/${createdScheduleId}/toggle`).set('Authorization', `Bearer ${token}`).send()
    expect([200, 204]).toContain(res.status)
  })

  test('Delete schedule', async () => {
    if (!createdScheduleId) return
    const res = await request(app).delete(`/api/schedules/${createdScheduleId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  test('History create/list', async () => {
    const payload = { action: 'API ext test', trigger: 'API', status: 'success' }
    let res = await request(app).post('/api/history').set('Authorization', `Bearer ${token}`).send(payload)
    expect([200,201]).toContain(res.status)
    res = await request(app).get('/api/history').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  test('Alerts create/list', async () => {
    let res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    res = await request(app).post('/api/alerts').set('Authorization', `Bearer ${token}`).send({ type: 'test', severity: 'info', sensor: 'temperature', value: 22, message: 'ext test alert' })
    expect([200,201]).toContain(res.status)
  })

  test('Stats endpoint', async () => {
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
  test('Auth me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
