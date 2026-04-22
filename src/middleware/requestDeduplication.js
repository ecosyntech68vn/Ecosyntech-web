const requestCache = new Map();
const DEDUP_WINDOW_MS = 500;

function requestDeduplication(req, res, next) {
  const key = `${req.method}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.body).substring(0, 200)}`;
  const now = Date.now();
  
  if (requestCache.has(key)) {
    const prev = requestCache.get(key);
    if (now - prev.timestamp < DEDUP_WINDOW_MS) {
      if (prev.response) {
        return res.set(prev.headers).status(prev.status).send(prev.response);
      }
    }
  }
  
  const originalSend = res.send.bind(res);
  res.send = function(body) {
    if (res.statusCode < 400) {
      requestCache.set(key, {
        timestamp: now,
        status: res.statusCode,
        headers: { 
          'X-Cache': 'HIT',
          'X-Cache-Key': key.substring(0, 32)
        },
        response: body
      });
    }
    return originalSend(body);
  };
  
  res.setHeader('X-Cache', 'MISS');
  next();
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache) {
    if (now - value.timestamp > 5000) {
      requestCache.delete(key);
    }
  }
  }, 10000);
}

module.exports = { requestDeduplication };
