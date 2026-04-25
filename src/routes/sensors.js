const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const telemetryCache = require('../services/cacheRedisOrMemory');
const deviceAuth = require('../middleware/deviceAuth');
let cache = null;
const CACHE_TTL = parseInt(process.env.SENSORS_CACHE_TTL || '30000');

router.get('/', asyncHandler(async (req, res) => {
  if (!cache) cache = await telemetryCache.getCache();
  const cacheKey = 'sensors:all';
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  const sensors = getAll('SELECT * FROM sensors ORDER BY type');

  const result = {};
  sensors.forEach(sensor => {
    result[sensor.type] = {
      value: sensor.value,
      unit: sensor.unit,
      min: sensor.min_value,
      max: sensor.max_value,
      timestamp: sensor.timestamp
    };
  });

  await cache.set(cacheKey, result, CACHE_TTL);
  res.json(result);
}));

router.get('/:type', asyncHandler(async (req, res) => {
  const sensor = getOne('SELECT * FROM sensors WHERE type = ?', [req.params.type]);
  
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }
  
  res.json({
    value: sensor.value,
    unit: sensor.unit,
    min: sensor.min_value,
    max: sensor.max_value,
    timestamp: sensor.timestamp
  });
}));

router.post('/update', deviceAuth, asyncHandler(async (req, res) => {
  const { type, value } = req.body;
  
  if (!type || value === undefined) {
    return res.status(400).json({ error: 'type and value are required' });
  }
  
  const sensor = getOne('SELECT * FROM sensors WHERE type = ?', [type]);
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }
  
  runQuery('UPDATE sensors SET value = ?, timestamp = datetime("now") WHERE type = ?', [value, type]);
  
  const updatedSensor = getOne('SELECT * FROM sensors WHERE type = ?', [type]);
  
  logger.info(`Sensor ${type} updated to ${value}`);
  
  res.json({
    success: true,
    sensor: {
      type: updatedSensor.type,
      value: updatedSensor.value,
      unit: updatedSensor.unit,
      timestamp: updatedSensor.timestamp
    }
  });
}));

module.exports = router;
