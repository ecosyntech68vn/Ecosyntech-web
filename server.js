/**
 * ============================================================================
 * server.js - EcoSynTech Local Core Entry Point
 * 
 * Design: Modular architecture với separation of concerns
 * Standards: ISO 27001, 5S, PDCA
 * 
 * MỤC ĐÍCH:
 *   - Điểm khởi đầu duy nhất cho ứng dụng
 *   - Đơn giản, dễ hiểu
 *   - 1-click deployment cho nông dân
 * 
 * USAGE:
 *   - Development: npm run dev
 *   - Production: node server.js
 *   - Docker: docker-compose up
 * 
 * ISO 27001 CONTROLS:
 *   - A.8.32: Change Management
 *   - A.12.4: Logging and Monitoring
 *   - A.16: Management of Information Security Incidents
 * ============================================================================
 */

// Load environment variables
require('dotenv').config();

// Import OpenTelemetry (non-blocking)
try {
  require('./src/config/otel_setup');
} catch (e) {
  // OpenTelemetry is optional
}

// Start modular server
const EcoSynTechServer = require('./src/server/index');

async function main() {
  const server = new EcoSynTechServer();
  
  await server.initialize();
  
  // Setup graceful shutdown
  process.on('SIGTERM', () => server.shutdown());
  process.on('SIGINT', () => server.shutdown());
  
  // Start listening
  server.start();
}

main().catch((error) => {
  console.error('Failed to start EcoSynTech:', error);
  process.exit(1);
});