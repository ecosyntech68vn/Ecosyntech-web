/**
 * ============================================================================
 * src/server/middlewares.js - Middleware Registry
 * 
 * Design: Centralized middleware configuration
 * Standards: ISO 27001, Security Best Practices
 * 
 * MỤC ĐÍCH:
 *   - Tập trung tất cả middleware registrations
 *   - Dễ dàng thêm/sửa middleware
 *   - Security layers rõ ràng
 * ============================================================================
 */

'use strict';

const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const express = require('express');

const config = require('../config');
const logger = require('../config/logger');

const { requestId } = require('../middleware/requestId');
const { responseSignatureMiddleware } = require('../middleware/response-sign');
const { getAuditHashMiddleware } = require('../middleware/audit-tamper-proof');
const { requestDeduplication } = require('../middleware/requestDeduplication');
const { responseOptimizer } = require('../middleware/responseOptimizer');
const { rateLimitPerDevice } = require('../middleware/deviceRateLimit');

function registerMiddlewares(app) {
  // ============================================================
  // SECURITY LAYER 1: Basic Protection (A.8.24, A.8.25)
  // ============================================================
  
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  app.use(cors({
    origin: config.cors?.origin || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-EcoSynTech-Signature', 'X-Request-ID'],
    credentials: true
  }));

  // ============================================================
  // PERFORMANCE LAYER: Compression
  // ============================================================
  
  app.use(compression());

  // ============================================================
  // TRACEABILITY LAYER: Request tracking (A.12.4)
  // ============================================================
  
  app.use(requestId);
  app.use(getAuditHashMiddleware());
  app.use(requestDeduplication);

  // ============================================================
  // RATE LIMITING LAYER (A.8.16 - Network controls)
  // ============================================================
  
  // Global rate limit
  const globalLimiter = rateLimit({
    windowMs: (config.rateLimit?.windowMs || 900000),
    max: config.rateLimit?.maxRequests || 100,
    message: { ok: false, code: 'RATE_LIMIT_EXCEEDED' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', globalLimiter);

  // Device-specific rate limit
  app.use('/api/sensors', rateLimitPerDevice);
  app.use('/api/devices', rateLimitPerDevice);

  // ============================================================
  // BODY PARSING
  // ============================================================
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ============================================================
  // RESPONSE OPTIMIZATION LAYER
  // ============================================================
  
  app.use(responseOptimizer);
  app.use(responseSignatureMiddleware);

  // ============================================================
  // STATIC FILES (non-API)
  // ============================================================
  
  app.use('/public', express.static(config.server?.publicPath || './public'));
  app.use('/dashboard', express.static(config.server?.publicPath || './public/dashboard.html'));

  logger.info('[MIDDLEWARE] All middlewares registered successfully');
}

module.exports = registerMiddlewares;