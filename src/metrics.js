'use strict';
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status']
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

const envelopeVerificationsTotal = new client.Counter({
  name: 'envelope_verifications_total',
  help: 'Envelope verification results',
  labelNames: ['outcome']
});

const envelopeVerificationsByRoute = new client.Counter({
  name: 'envelope_verifications_by_route',
  help: 'Envelope verification results by route',
  labelNames: ['route', 'outcome']
});

const webhookLatencySeconds = new client.Histogram({
  name: 'webhook_latency_seconds',
  help: 'Webhook endpoint latency in seconds',
  labelNames: ['route'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const sensorReadingsTotal = new client.Counter({
  name: 'sensor_readings_total',
  help: 'Total sensor readings processed',
  labelNames: ['sensor_type']
});

const commandsTotal = new client.Counter({
  name: 'commands_total',
  help: 'Total commands processed',
  labelNames: ['command', 'status']
});

const databaseOperationsTotal = new client.Counter({
  name: 'database_operations_total',
  help: 'Total database operations',
  labelNames: ['operation', 'status']
});

const databaseOperationDurationSeconds = new client.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Database operation duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

function attachMetrics(app) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

module.exports = {
  attachMetrics,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  envelopeVerificationsTotal,
  envelopeVerificationsByRoute,
  webhookLatencySeconds,
  sensorReadingsTotal,
  commandsTotal,
  databaseOperationsTotal,
  databaseOperationDurationSeconds,
  activeConnections
};
