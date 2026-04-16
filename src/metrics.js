'use strict';
const client = require('prom-client');

// Prometheus registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP metrics
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

// Envelope verifications
const envelopeVerificationsTotal = new client.Counter({
  name: 'envelope_verifications_total',
  help: 'Envelope verification results',
  labelNames: ['outcome']
});

// Envelope verifications by route (more granular observability)
const envelopeVerificationsByRoute = new client.Counter({
  name: 'envelope_verifications_by_route',
  help: 'Envelope verification results by route',
  labelNames: ['route','outcome']
});

// Attach metrics endpoint
function attachMetrics(app) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

// Expose counters for app usage
module.exports = {
  attachMetrics,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  envelopeVerificationsTotal,
  envelopeVerificationsByRoute
};
