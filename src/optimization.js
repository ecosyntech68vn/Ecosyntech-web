const os = require('os');
const {AIManager} = (() => {
  try { return require('./services/AIManager'); } catch (e) { return { AIManager: null }; }
})();

let __aiManager = null;
let __aiInit = false;
function ensureAI() {
  if (!__aiInit) {
    if (AIManager && AIManager.AIManager) {
      __aiManager = new AIManager.AIManager();
    }
    __aiInit = true;
  }
  return __aiManager;
}

const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const memUsagePercent = (usedMem / totalMem) * 100;

function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;
  
  return {
    totalMemory: totalMem,
    freeMemory: freeMem,
    usedMemory: usedMem,
    usagePercent: memUsagePercent,
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: process.uptime()
  };
}

function getMemoryStatus() {
  const mem = process.memoryUsage();
  return {
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    rss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
    external: (mem.external / 1024 / 1024).toFixed(2) + ' MB'
  };
}

function isLowMemory() {
  const percent = memUsagePercent;
  return percent > 80;
}

function isCriticalMemory() {
  return memUsagePercent > 90;
}

function getOptimizationLevel() {
  if (isCriticalMemory()) return 'critical';
  if (isLowMemory()) return 'low';
  return 'normal';
}

function getRecommendedSettings() {
  const level = getOptimizationLevel();
  
  const configs = {
    normal: {
      schedulerInterval: 600000,
      backupInterval: 10800000,
      wsHeartbeat: 60000,
      sensorInterval: 5000,
      maxHistory: 1000,
      enableMetrics: true
    },
    low: {
      schedulerInterval: 1800000,
      backupInterval: 21600000,
      wsHeartbeat: 120000,
      sensorInterval: 10000,
      maxHistory: 500,
      enableMetrics: true
    },
    critical: {
      schedulerInterval: 3600000,
      backupInterval: 43200000,
      wsHeartbeat: 300000,
      sensorInterval: 30000,
      maxHistory: 100,
      enableMetrics: false
    }
  };
  
  return configs[level];
}

function aiActiveStep(context = {}) {
  if ((process.env.AI_ACTIVE || 'false').toLowerCase() !== 'true') return null;
  const ai = ensureAI();
  if (!ai || typeof ai.thinkForField !== 'function') return null;
  const field = context.field || 'default';
  const decision = ai.thinkForField(field, context);
  return decision;
}

let lastPressureEvent = 0;
const PRESSURE_COOLDOWN = 60000;

function handleMemoryPressure() {
  const now = Date.now();
  if (now - lastPressureEvent < PRESSURE_COOLDOWN) return;
  lastPressureEvent = now;
  
  const mem = process.memoryUsage();
  const heapUsedMB = mem.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 400) {
    try {
      const cache = require('./services/cacheService');
      if (cache && cache.getCache) {
        cache.getCache().cleanup();
      }
    } catch (e) {}
    
    try {
      const perfCache = require('./services/performanceService');
      if (perfCache && perfCache.clearCache) {
        perfCache.clearCache();
      }
    } catch (e) {}
    
    global.gc && global.gc();
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    if (heapUsedMB > 400) {
      handleMemoryPressure();
    }
  }, 30000);
}

function optimizeForDevice(context = {}) {
  const level = getOptimizationLevel();
  const settings = getRecommendedSettings();

  if (level !== 'normal') {
    global.__OPTIMIZATION__ = {
      level: level,
      settings: settings,
      timestamp: Date.now()
    };
  }

  const aiDecision = aiActiveStep(context);
  return {
    level: level,
    settings: settings,
    systemInfo: getSystemInfo(),
    memoryStatus: getMemoryStatus(),
    aiDecision: aiDecision
  };
}

function getCacheSize() {
  return {
    requireCache: Object.keys(require.cache).length,
    moduleCache: process.moduleCacheVersions ? Object.keys(process.moduleCacheVersions).length : 0
  };
}

function clearCache() {
  const before = Object.keys(require.cache).length;
  for (const key in require.cache) {
    if (key.indexOf('node_modules') !== -1) {
      delete require.cache[key];
    }
  }
  const after = Object.keys(require.cache).length;
  return { before: before, after: after, cleared: before - after };
}

setInterval(function() {
  global.__SYSTEM_INFO__ = getSystemInfo();
}, 30000);

module.exports = {
  getSystemInfo: getSystemInfo,
  getMemoryStatus: getMemoryStatus,
  isLowMemory: isLowMemory,
  isCriticalMemory: isCriticalMemory,
  getOptimizationLevel: getOptimizationLevel,
  getRecommendedSettings: getRecommendedSettings,
  optimizeForDevice: optimizeForDevice,
  getCacheSize: getCacheSize,
  clearCache: clearCache
};
