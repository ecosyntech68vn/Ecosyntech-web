const express = require('express');
const router = express.Router();
const { getAll, getOne } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  const devices = getOne('SELECT COUNT(*) as count, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online FROM devices');
  const rules = getOne('SELECT COUNT(*) as count, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active FROM rules');
  const schedules = getOne('SELECT COUNT(*) as count, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active FROM schedules');
  const alerts = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged FROM alerts');
  const history = getOne('SELECT COUNT(*) as total FROM history');
  
  const sensors = getAll('SELECT type, value FROM sensors');
  const sensorStats = {};
  sensors.forEach(s => {
    sensorStats[s.type] = s.value;
  });
  
  res.json({
    devices: {
      total: devices?.count || 0,
      online: devices?.online || 0,
      offline: (devices?.count || 0) - (devices?.online || 0)
    },
    rules: {
      total: rules?.count || 0,
      active: rules?.active || 0
    },
    schedules: {
      total: schedules?.count || 0,
      active: schedules?.active || 0
    },
    alerts: {
      total: alerts?.total || 0,
      unacknowledged: alerts?.unacknowledged || 0
    },
    history: {
      total: history?.total || 0
    },
    sensors: sensorStats,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
