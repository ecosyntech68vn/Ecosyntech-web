/**
 * ============================================================================
 * src/middleware/requestId.js - Request ID Middleware
 * 
 * Purpose: Add unique request ID for traceability
 * ISO 27001: A.12.4 Logging and Monitoring
 * ============================================================================
 */

const crypto = require('crypto');

function requestId(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex');
  
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

module.exports = { requestId };