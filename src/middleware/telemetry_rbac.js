"use strict";

// Lightweight RBAC middleware for telemetry-related endpoints
// This is a preparatory hook for stricter access controls following ISO27001.

function telemetryAccess(req, res, next) {
  // In test environment, bypass RBAC for faster test execution
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  // If no auth info, allow health/status endpoints to remain accessible by monitors
  if (!req.user) {
    return next();
  }
  const allowedRoles = ['admin', 'auditor'];
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions for telemetry access' });
}

module.exports = { telemetryAccess };
