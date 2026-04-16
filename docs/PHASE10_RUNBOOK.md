Phase 10 Runbook: Metrics, DB Admin & E2E Testing
Overview
- Phase 10 introduces enhanced observability, DB administration tooling, and end-to-end testing for the canonical ESP32 webhook contract.

What’s included
- Metrics:
  - /metrics exposes Prometheus metrics including envelope_verifications_total and envelope_verifications_by_route
  - Basic HTTP latency and requests metrics are collected
  - Dashboard sample at dashboards/prometheus_dashboard.json for quick import
- DB Admin tooling:
  - scripts/db-admin.js supports backup, restore, status, migrate, and rollback
  - backupCurrentDatabase() backs up the current DB before migration
  - Rollback script via CLI to restore the latest backup in backups/ directory
- End-to-End tests:
  - tests/integration/e2e.webhook.test.js (ESP32 canonical flow)
  - tests/integration/phase9.migration.test.js (Phase 9 migration) 
  - tests/integration/e2e.webhook.integration.js (existing, kept for backward compatibility)

CI/Automation
- GitHub Actions workflow .github/workflows/ci.yml added to run lint and tests on push/PR
- CI will run unit tests first, then end-to-end and migration tests via npm test

Rollout plan
- Phase 7-9 are already in place: canonical ESP32 path, health endpoints, and migration tooling
- Phase 10 runbook enables reproducible QA and safe production rollout
- In prod, use db-admin migrate to apply phase 9 migration, then verify with phase9 migration test
- For rollback, use db-admin rollback to restore latest backup in backups/

Best practices
- Always run DB backup before migration in prod
- Validate health endpoints after rollout: /api/health and /api/healthz
- Monitor envelope_verifications_total and envelope_verifications_by_route in /metrics
- Metrics endpoint exposure, and Grafana dashboard import
- CI integration and rollback strategy
- Phase 11+ runbook will add more checks for production rollout and incident response
