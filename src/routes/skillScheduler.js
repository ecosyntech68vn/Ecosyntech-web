const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { schedulerApiKeyAuth } = require('../middleware/schedulerAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const CONFIG_PATH = path.resolve(__dirname, '../../../Skill-Management-for-EcoSynTech/scheduler/config/scheduler.json');

function loadSchedulerConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    logger.error('[SkillScheduler] Failed to load config:', e);
  }
  return { schedules: [], metadata: { version: '1.0', lastModified: null } };
}

function saveSchedulerConfig(cfg) {
  cfg.metadata = cfg.metadata || {};
  cfg.metadata.lastModified = new Date().toISOString();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

router.use(schedulerApiKeyAuth);

router.get('/', asyncHandler(async (req, res) => {
  const config = loadSchedulerConfig();
  res.json({
    success: true,
    data: config.schedules || [],
    metadata: config.metadata
  });
}));

router.get('/metadata', asyncHandler(async (req, res) => {
  const config = loadSchedulerConfig();
  res.json({
    success: true,
    metadata: config.metadata
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, interval, skills, enabled, description } = req.body;
  
  if (!name || !interval || !skills) {
    return res.status(400).json({ error: 'name, interval, and skills are required' });
  }
  
  const cfg = loadSchedulerConfig();
  const newSchedule = {
    id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    interval,
    skills: Array.isArray(skills) ? skills : [skills],
    enabled: enabled !== false,
    description: description || '',
    createdAt: new Date().toISOString(),
    lastRun: null,
    runCount: 0
  };
  
  cfg.schedules = cfg.schedules || [];
  cfg.schedules.push(newSchedule);
  saveSchedulerConfig(cfg);
  
  logger.info(`[SkillScheduler] Created schedule: ${name} (${newSchedule.id})`);
  res.status(201).json({ success: true, data: newSchedule });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, interval, skills, enabled, description } = req.body;
  
  const cfg = loadSchedulerConfig();
  const idx = cfg.schedules.findIndex(s => s.id === id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Schedule not found' });
  }
  
  cfg.schedules[idx] = {
    ...cfg.schedules[idx],
    name: name !== undefined ? name : cfg.schedules[idx].name,
    interval: interval !== undefined ? interval : cfg.schedules[idx].interval,
    skills: skills !== undefined ? (Array.isArray(skills) ? skills : [skills]) : cfg.schedules[idx].skills,
    enabled: enabled !== undefined ? enabled : cfg.schedules[idx].enabled,
    description: description !== undefined ? description : cfg.schedules[idx].description,
    updatedAt: new Date().toISOString()
  };
  
  saveSchedulerConfig(cfg);
  logger.info(`[SkillScheduler] Updated schedule: ${id}`);
  res.json({ success: true, data: cfg.schedules[idx] });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cfg = loadSchedulerConfig();
  const idx = cfg.schedules.findIndex(s => s.id === id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Schedule not found' });
  }
  
  const deleted = cfg.schedules.splice(idx, 1)[0];
  saveSchedulerConfig(cfg);
  
  logger.info(`[SkillScheduler] Deleted schedule: ${id}`);
  res.json({ success: true, message: `Schedule "${deleted.name}" deleted` });
}));

router.post('/:id/toggle', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cfg = loadSchedulerConfig();
  const schedule = cfg.schedules.find(s => s.id === id);
  
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }
  
  schedule.enabled = !schedule.enabled;
  schedule.updatedAt = new Date().toISOString();
  saveSchedulerConfig(cfg);
  
  logger.info(`[SkillScheduler] Schedule ${id} ${schedule.enabled ? 'enabled' : 'disabled'}`);
  res.json({ success: true, enabled: schedule.enabled });
}));

router.post('/execute', asyncHandler(async (req, res) => {
  const { skill } = req.body;
  
  if (!skill) {
    return res.status(400).json({ error: 'skill name is required' });
  }
  
  logger.info(`[SkillScheduler] Executing skill: ${skill}`);
  
  const payload = JSON.stringify({ skill });
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/api/v1/skills/execute',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'X-Scheduler-API-Key': process.env.SCHEDULER_API_KEY
    }
  };
  
  const http = require('http');
  const reqInternal = http.request(options, (resInternal) => {
    let data = '';
    resInternal.on('data', chunk => data += chunk);
    resInternal.on('end', () => {
      try {
        const result = JSON.parse(data);
        res.json({ success: true, skill, result });
      } catch (e) {
        res.json({ success: true, skill, rawResponse: data });
      }
    });
  });
  
  reqInternal.on('error', (err) => {
    logger.error(`[SkillScheduler] Execution error:`, err);
    res.status(500).json({ error: 'Failed to execute skill', message: err.message });
  });
  
  reqInternal.write(payload);
  reqInternal.end();
}));

router.post('/import', asyncHandler(async (req, res) => {
  const { schedules } = req.body;
  
  if (!schedules || !Array.isArray(schedules)) {
    return res.status(400).json({ error: 'schedules array is required' });
  }
  
  const cfg = {
    schedules: schedules.map(s => ({
      id: s.id || `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: s.name,
      interval: s.interval,
      skills: Array.isArray(s.skills) ? s.skills : [s.skills],
      enabled: s.enabled !== false,
      description: s.description || '',
      createdAt: new Date().toISOString(),
      lastRun: s.lastRun || null,
      runCount: s.runCount || 0
    })),
    metadata: {
      version: '1.0',
      lastModified: new Date().toISOString(),
      imported: true
    }
  };
  
  saveSchedulerConfig(cfg);
  logger.info(`[SkillScheduler] Imported ${schedules.length} schedules`);
  res.json({ success: true, count: schedules.length });
}));

router.get('/export', asyncHandler(async (req, res) => {
  const cfg = loadSchedulerConfig();
  res.setHeader('Content-Disposition', `attachment; filename="scheduler-config-${Date.now()}.json"`);
  res.json(cfg);
}));

module.exports = router;
