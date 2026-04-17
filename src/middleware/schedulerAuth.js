const logger = require('../config/logger');
const config = require('../config');

function schedulerApiKeyAuth(req, res, next) {
  if (!config.scheduler.enabled) {
    return res.status(503).json({ error: 'Scheduler service is disabled' });
  }
  
  const apiKey = req.headers['x-scheduler-api-key'] || req.query.scheduler_api_key;
  
  if (!apiKey) {
    logger.warn('[Scheduler Auth] Missing API key');
    return res.status(401).json({ error: 'SCHEDULER_API_KEY required' });
  }
  
  if (apiKey !== config.scheduler.apiKey) {
    logger.warn(`[Scheduler Auth] Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
    return res.status(403).json({ error: 'Invalid scheduler API key' });
  }
  
  next();
}

module.exports = { schedulerApiKeyAuth };
