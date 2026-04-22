const { getAll, getOne, runQuery } = require('../config/database');

const CACHE_TTL = 30000;
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function cacheSet(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function cacheInvalidate(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern) || pattern === '*') {
      cache.delete(key);
    }
  }
}

async function getDashboardOverview(farmId = null) {
  const cacheKey = `dashboard:overview:${farmId || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const deviceQuery = farmId 
    ? 'SELECT COUNT(*) as total, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM devices WHERE farm_id = ?'
    : 'SELECT COUNT(*) as total, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM devices';
  
  const devices = getOne(deviceQuery, farmId ? [farmId] : []);
  
  const sensorQuery = farmId
    ? 'SELECT s.type, AVG(s.value) as value, s.unit, s.timestamp FROM sensors s JOIN devices d ON s.device_id = d.id WHERE d.farm_id = ? GROUP BY s.type'
    : 'SELECT type, AVG(value) as value, unit, MAX(timestamp) as timestamp FROM sensors GROUP BY type';
  
  const sensors = getAll(sensorQuery, farmId ? [farmId] : []);
  
  const alertQuery = farmId
    ? 'SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts WHERE farm_id = ?'
    : 'SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts';
  
  const alerts = getOne(alertQuery, farmId ? [farmId] : []);

  const sensorData = {};
  sensors.forEach(s => {
    sensorData[s.type] = { value: parseFloat(s.value || 0).toFixed(1), unit: s.unit, timestamp: s.timestamp };
  });

  const result = {
    devices: {
      total: devices?.total || 0,
      online: devices?.online || 0,
      offline: (devices?.total || 0) - (devices?.online || 0)
    },
    sensors: sensorData,
    alerts: {
      total: alerts?.total || 0,
      pending: alerts?.pending || 0
    },
    lastUpdate: new Date().toISOString()
  };

  cacheSet(cacheKey, result);
  return result;
}

async function getSensorDataByZone(zoneId = null) {
  const cacheKey = `sensors:zone:${zoneId || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const query = zoneId
    ? 'SELECT s.*, d.name as device_name FROM sensors s JOIN devices d ON s.device_id = d.id WHERE d.zone_id = ? ORDER BY s.timestamp DESC LIMIT 50'
    : 'SELECT s.*, d.name as device_name FROM sensors s JOIN devices d ON s.device_id = d.id ORDER BY s.timestamp DESC LIMIT 50';

  const sensors = getAll(query, zoneId ? [zoneId] : []);

  const sensorByType = {};
  sensors.forEach(s => {
    if (!sensorByType[s.type]) sensorByType[s.type] = [];
    sensorByType[s.type].push({
      deviceId: s.device_id,
      deviceName: s.device_name,
      value: s.value,
      unit: s.unit,
      timestamp: s.timestamp
    });
  });

  const result = sensorByType;
  cacheSet(cacheKey, result);
  return result;
}

async function getAlertsQuick(limit = 10) {
  const cacheKey = `alerts:quick:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const alerts = getAll(
    'SELECT a.*, d.name as device_name FROM alerts a LEFT JOIN devices d ON a.device_id = d.id ORDER BY a.created_at DESC LIMIT ?',
    [limit]
  );

  cacheSet(cacheKey, alerts);
  return alerts;
}

async function getDevicesStatus() {
  const cacheKey = 'devices:status';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const devices = getAll(
    `SELECT d.id, d.name, d.type, d.status, d.last_seen, f.name as farm_name 
     FROM devices d LEFT JOIN farms f ON d.farm_id = f.id 
     ORDER BY d.last_seen DESC LIMIT 50`
  );

  cacheSet(cacheKey, devices);
  return devices;
}

function invalidateCache(farmId = null) {
  cacheInvalidate('dashboard:');
  cacheInvalidate('sensors:');
  cacheInvalidate('alerts:');
  cacheInvalidate('devices:');
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL * 2) {
      cache.delete(key);
    }
  }
  }, 60000);
}

module.exports = {
  getDashboardOverview,
  getSensorDataByZone,
  getAlertsQuick,
  getDevicesStatus,
  invalidateCache,
  cacheInvalidate
};
