# Phase 10 Runbook: Production Deployment Checklist

## Pre-Deployment Checklist

### Security
- [ ] All required environment variables are set:
  - [ ] `HMAC_SECRET` (required for ESP32 webhooks)
  - [ ] `JWT_SECRET` (required for authentication)
  - [ ] `WEBHOOK_SECRET` (for webhook authentication)
- [ ] Secrets are NOT in version control
- [ ] CORS_ORIGIN is restricted (not `*` in production)
- [ ] Rate limiting is configured appropriately

### Database
- [ ] Run database backup: `npm run db-admin -- backup`
- [ ] Verify backup exists in `data/backups/`
- [ ] Test migration: `npm run db-admin -- migrate --dry-run`
- [ ] Apply migration: `npm run db-admin -- migrate`

### Configuration
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info or warn
- [ ] Database path is correct
- [ ] All external service URLs are configured

### Monitoring
- [ ] Prometheus metrics endpoint accessible: `GET /metrics`
- [ ] Health endpoints verified:
  - [ ] `GET /api/health`
  - [ ] `GET /api/healthz`
  - [ ] `GET /health`
  - [ ] `GET /readiness`
- [ ] Grafana dashboard imported from `dashboards/prometheus_dashboard.json`

## Post-Deployment

### Verification
- [ ] Run smoke tests: `npm test`
- [ ] Verify lint passes: `npm run lint`
- [ ] Check logs for any errors
- [ ] Verify webhooks are processing:
  - Check `envelope_verifications_total{outcome="success"}` increasing
  - Check `webhook_latency_seconds` is within acceptable range

### Rollback Plan
```bash
# Restore from backup
npm run db-admin -- restore

# Or manually:
cp data/backups/latest-backup.sqlite data/ecosyntech.db
```

## Key Metrics to Monitor

### Success Indicators
- `envelope_verifications_total{outcome="success"}` > 0
- `http_requests_total{status="200"}` increasing
- `webhook_latency_seconds` p95 < 1s

### Alert Thresholds
- `envelope_verifications_total{outcome="failure"}` > 10/min
- `http_request_duration_seconds` p95 > 5s
- `commands_total{status="failed"}` > 5/min

## Emergency Contacts

- DevOps: [contact info]
- Backend Lead: [contact info]
- On-call: [contact info]
