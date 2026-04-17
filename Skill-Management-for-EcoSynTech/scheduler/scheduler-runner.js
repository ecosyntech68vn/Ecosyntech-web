// Robust scheduler runner for EcoSynTech skills
// Reads config/scheduler.json (or SCHEDULER_CONFIG env) and triggers HTTP endpoints
// Requires SCHEDULER_API_KEY environment variable for authentication
const fs = require('fs')
const path = require('path')
const http = require('http')

const API_KEY = process.env.SCHEDULER_API_KEY || ''
const SERVER_PORT = process.env.PORT || 3000

function msFromInterval(interval) {
  if (!interval) return 0
  let m = /^([0-9]+)m$/.exec(interval)
  if (m) return parseInt(m[1], 10) * 60_000
  let h = /^([0-9]+)h$/.exec(interval)
  if (h) return parseInt(h[1], 10) * 3_600_000
  let d = /^([0-9]+)d$/.exec(interval)
  if (d) return parseInt(d[1], 10) * 86_400_000
  return 0
}

function executeSkill(skill, scheduleId) {
  const payload = JSON.stringify({ skill, scheduleId })
  const options = {
    hostname: 'localhost',
    port: SERVER_PORT,
    path: '/api/v1/skills/execute',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'X-Scheduler-API-Key': API_KEY
    }
  }
  
  if (!API_KEY) {
    console.error('Scheduler error: SCHEDULER_API_KEY not set')
    return
  }
  
  const req = http.request(options, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      const ts = new Date().toISOString()
      console.log(`[${ts}] Scheduler executed: ${skill} (schedule: ${scheduleId}) - status: ${res.statusCode}`)
      updateLastRun(scheduleId)
    })
  })
  req.on('error', (err) => {
    console.error(`Scheduler error executing ${skill}:`, err.message)
  })
  req.write(payload)
  req.end()
}

function updateLastRun(scheduleId) {
  const cfgPath = process.env.SCHEDULER_CONFIG || path.resolve(__dirname, '../config/scheduler.json')
  if (!fs.existsSync(cfgPath)) return
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    const sched = cfg.schedules?.find(s => s.id === scheduleId)
    if (sched) {
      sched.lastRun = new Date().toISOString()
      sched.runCount = (sched.runCount || 0) + 1
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
    }
  } catch (e) {
    console.error('Failed to update lastRun:', e.message)
  }
}

function loadConfig() {
  const cfgPath = process.env.SCHEDULER_CONFIG || path.resolve(__dirname, '../config/scheduler.json')
  if (!fs.existsSync(cfgPath)) return null
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Invalid scheduler.json', e)
    return null
  }
}

let timers = []
function clearTimers() {
  timers.forEach((t) => clearInterval(t))
  timers = []
}

function scheduleFromCfg(cfg) {
  if (!cfg || !cfg.schedules) return
  cfg.schedules.forEach((s) => {
    if (!s.enabled) {
      console.log(`Scheduler: skipping disabled schedule "${s.name}"`)
      return
    }
    const intervalMs = msFromInterval(s.interval)
    if (!intervalMs) {
      console.error(`Scheduler: invalid interval for "${s.name}": ${s.interval}`)
      return
    }
    console.log(`Scheduler: scheduling "${s.name}" every ${s.interval} (${intervalMs}ms), skills: ${s.skills.join(', ')}`)
    const t = setInterval(() => {
      if (!s.enabled) return
      ;(s.skills || []).forEach(skill => executeSkill(skill, s.id))
    }, intervalMs)
    timers.push(t)
  })
}

let initialized = false
function startScheduler() {
  if (!API_KEY) {
    console.error('ERROR: SCHEDULER_API_KEY environment variable is not set')
    console.error('Please set SCHEDULER_API_KEY before starting the scheduler')
    return
  }
  
  const cfg = loadConfig()
  if (!cfg) {
    console.error('Scheduler config not found at:', process.env.SCHEDULER_CONFIG || path.resolve(__dirname, '../config/scheduler.json'))
    return
  }
  
  console.log('='.repeat(60))
  console.log('EcoSynTech Skill Scheduler v1.0')
  console.log('='.repeat(60))
  console.log(`Server: localhost:${SERVER_PORT}`)
  console.log(`Config: ${cfg.metadata?.lastModified ? 'modified: ' + cfg.metadata.lastModified : 'loaded'}`)
  console.log(`Schedules: ${cfg.schedules?.length || 0} total, ${cfg.schedules?.filter(s => s.enabled).length || 0} enabled`)
  console.log('-'.repeat(60))
  
  scheduleFromCfg(cfg)
  
  // Simple file watcher to reload config on change
  const cfgPath = process.env.SCHEDULER_CONFIG || path.resolve(__dirname, '../config/scheduler.json')
  fs.watch(cfgPath, (event) => {
    if (event === 'change') {
      try {
        console.log('Scheduler: config changed, reloading...')
        clearTimers()
        const newCfg = loadConfig()
        scheduleFromCfg(newCfg)
        console.log('Scheduler: config reloaded successfully')
      } catch (e) {
        console.error('Failed to reload scheduler config', e)
      }
    }
  })
  initialized = true
  console.log('Scheduler started - watching for config changes')
  console.log('='.repeat(60))
}

if (!initialized) startScheduler()
