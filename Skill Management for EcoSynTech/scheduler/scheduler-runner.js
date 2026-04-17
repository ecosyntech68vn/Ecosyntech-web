// Simple Node.js-based scheduler to trigger skills via HTTP endpoints.
// NOTE: This is a prototype to illustrate automation orchestration.
// It reads config/scheduler.json and calls an execute endpoint for each skill.
const fs = require('fs')
const path = require('path')
const http = require('http')

function msFromInterval(interval) {
  if (typeof interval !== 'string') return 0
  const m = interval.match(/^(\d+)m$/)
  if (m) return parseInt(m[1], 10) * 60 * 1000
  const h = interval.match(/^(\d+)h$/)
  if (h) return parseInt(h[1], 10) * 60 * 60 * 1000
  return 0
}

function executeSkill(skill) {
  const payload = JSON.stringify({ skill })
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/skills/execute',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }
  const req = http.request(options, (res) => {
    res.on('data', () => {})
  })
  req.on('error', (err) => {
    console.error('Scheduler error executing', skill, err.message)
  })
  req.write(payload)
  req.end()
}

function loadConfig() {
  const cfgPath = path.resolve(__dirname, '../config/scheduler.json')
  if (!fs.existsSync(cfgPath)) return null
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Invalid scheduler.json', e)
    return null
  }
}

function startScheduler() {
  const cfg = loadConfig()
  if (!cfg || !cfg.schedules) return
  cfg.schedules.forEach((s) => {
    if (!s.enabled) return
    const intervalMs = msFromInterval(s.interval)
    if (!intervalMs) return
    setInterval(() => {
      if (!s.enabled) return
      (s.skills || []).forEach(executeSkill)
    }, intervalMs)
  })
  console.log('Scheduler started')
}

startScheduler()
