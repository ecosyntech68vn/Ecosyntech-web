const logger = require('../config/logger');

const DEFAULT_TTL = 60 * 1000;
const DEFAULT_MAX_SIZE = 100;

class MemoryCache {
  constructor(options = {}) {
    this.ttl = options.ttl || DEFAULT_TTL;
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  set(key, value, ttl = this.ttl) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      let lruKey = null;
      let oldestTime = Date.now();
      for (const [k, v] of this.cache) {
        if (v.accessed < oldestTime) {
          oldestTime = v.accessed;
          lruKey = k;
        }
      }
      if (lruKey) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      accessed: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    item.accessed = Date.now();
    this.hits++;
    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const size = this.cache.size;
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : 0;
    
    return {
      size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`
    };
  }
}

let globalCache = null;
let cacheInterval = null;

function getCache() {
  if (!globalCache) {
    const ttlVal = parseInt(process.env.CACHE_TTL || '60000', 10);
    const sizeVal = parseInt(process.env.CACHE_MAX_SIZE || '100', 10);
    globalCache = new MemoryCache({
      ttl: isNaN(ttlVal) ? 60000 : ttlVal,
      maxSize: isNaN(sizeVal) ? 100 : sizeVal
    });

    cacheInterval = setInterval(() => {
      globalCache.cleanup();
    }, 30000);
  }
  return globalCache;
}

function cached(key, fn, ttl) {
  const cache = getCache();
  const cachedValue = cache.get(key);
  
  if (cachedValue !== null) {
    return Promise.resolve(cachedValue);
  }
  
  return fn().then(value => {
    cache.set(key, value, ttl);
    return value;
  });
}

function invalidate(key) {
  return getCache().delete(key);
}

function invalidatePattern(pattern) {
  const cache = getCache();
  const regex = new RegExp(pattern);
  
  for (const key of cache.cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

function invalidateByPrefix(prefix) {
  const cache = getCache();
  
  for (const key of cache.cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

function stopCache() {
  if (cacheInterval) {
    clearInterval(cacheInterval);
    cacheInterval = null;
  }
  if (globalCache) {
    globalCache.clear();
    globalCache = null;
  }
}

module.exports = {
  getCache,
  cached,
  invalidate,
  invalidatePattern,
  invalidateByPrefix,
  stopCache,
  MemoryCache
};