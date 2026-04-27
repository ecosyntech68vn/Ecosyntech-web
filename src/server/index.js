/**
 * ============================================================================
 * src/server/index.js - EcoSynTech Server Entry Point
 * 
 * Design: Modular architecture với separation of concerns
 * Standards: ISO 27001, 5S, PDCA
 * 
 * MỤC ĐÍCH:
 *   - Entry point duy nhất cho ứng dụng
 *   - Khởi tạo và wire tất cả components
 *   - Đơn giản hóa deployment (1-click)
 * 
 * ISO 27001 CONTROLS:
 *   - A.8.32: Change Management
 *   - A.12.4: Logging and Monitoring
 *   - A.16: Management of Information Security Incidents
 * 
 * HISTORY:
 *   v1.0.0 - 2024 - Initial modular design
 * ============================================================================
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const config = require('../config');
const logger = require('../config/logger');
const envValidator = require('../config/envValidator');
const { initDatabase, closeDatabase } = require('../config/database');

const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { initWebSocket } = require('../websocket');
const optimization = require('../optimization');

const registerRoutes = require('./routes');
const registerMiddlewares = require('./middlewares');

class EcoSynTechServer {
  constructor(options = {}) {
    this.app = null;
    this.server = null;
    this.config = config;
    this.logger = logger;
    this.isInitialized = false;
  }

  /**
   * Khởi tạo ứng dụng - Step 1: Validate Environment
   */
  async _validateEnvironment() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (nodeEnv === 'production') {
      envValidator.checkRequiredStartup();
    }
    
    logger.info(`[BOOTSTRAP] Environment: ${nodeEnv}`);
  }

  /**
   * Khởi tạo ứng dụng - Step 2: Initialize Database
   */
  async _initializeDatabase() {
    await initDatabase();
    logger.info('[BOOTSTRAP] Database initialized');
  }

  /**
   * Khởi tạo ứng dụng - Step 3: Setup Express
   */
  _setupExpress() {
    this.app = express();
    
    this.app.set('webhookSecret', this.config.webhook?.secret);
    this.app.set('env', process.env.NODE_ENV || 'development');
    
    return this.app;
  }

  /**
   * Khởi tạo ứng dụng - Step 4: Register Middlewares
   */
  _registerMiddlewares() {
    registerMiddlewares(this.app);
    logger.info('[BOOTSTRAP] Middlewares registered');
  }

  /**
   * Khởi tạo ứng dụng - Step 5: Register Routes
   */
  _registerRoutes() {
    registerRoutes(this.app);
    logger.info('[BOOTSTRAP] Routes registered');
  }

  /**
   * Khởi tạo ứng dụng - Step 6: Setup WebSocket
   */
  _setupWebSocket() {
    const httpServer = require('http').createServer(this.app);
    initWebSocket(httpServer);
    this.server = httpServer;
    logger.info('[BOOTSTRAP] WebSocket initialized');
  }

  /**
   * Khởi tạo ứng dụng - Step 7: Error Handlers
   */
  _registerErrorHandlers() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
    logger.info('[BOOTSTRAP] Error handlers registered');
  }

  /**
   * Khởi tạo đầy đủ ứng dụng
   */
  async initialize() {
    try {
      logger.info('========================================');
      logger.info('EcoSynTech v' + (process.env.npm_package_version || 'dev'));
      logger.info('Initializing modular architecture...');
      logger.info('========================================');

      await this._validateEnvironment();
      await this._initializeDatabase();
      this._setupExpress();
      this._registerMiddlewares();
      this._registerRoutes();
      this._setupWebSocket();
      this._registerErrorHandlers();

      this.isInitialized = true;
      
      logger.info('========================================');
      logger.info('✓ System initialized successfully');
      logger.info('========================================');
      
      return this;
    } catch (error) {
      logger.error('[BOOTSTRAP] Failed to initialize:', error);
      process.exit(1);
    }
  }

  /**
   * Lấy HTTP server
   */
  getServer() {
    return this.server;
  }

  /**
   * Lấy Express app
   */
  getApp() {
    return this.app;
  }

  /**
   * Start server
   */
  start() {
    const port = process.env.PORT || 3000;
    
    this.server.listen(port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║  🌱 EcoSynTech Local Core đã khởi động thành công!        ║
║                                                            ║
║  📍 Local:   http://localhost:${port}                      ║
║  📍 API:     http://localhost:${port}/api                  ║
║  📍 Health:  http://localhost:${port}/api/health          ║
║                                                            ║
║  💡 Gõ 'npm run dev' để chạy development mode            ║
║  📖 Xem docs: /api/docs                                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    return this.server;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('[SHUTDOWN] Starting graceful shutdown...');
    
    try {
      closeDatabase();
      logger.info('[SHUTDOWN] Database closed');
      
      if (this.server) {
        this.server.close();
        logger.info('[SHUTDOWN] HTTP server closed');
      }
      
      process.exit(0);
    } catch (error) {
      logger.error('[SHUTDOWN] Error during shutdown:', error);
      process.exit(1);
    }
  }
}

module.exports = EcoSynTechServer;
module.exports.default = EcoSynTechServer;