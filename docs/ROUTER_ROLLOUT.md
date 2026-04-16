Rollout Plan: ESP32 Canonical Contract (Phase 7-8)
- Summary: Deploy canonical envelope-based webhook, disable legacy firmware path, and provide observability.
- Steps:
  1. Ensure /api/webhook/esp32 is the only ESP32 endpoint for data, config, commands, batches.
  2. Disable /api/firmware in server config (patch applied).
  3. Validate health endpoints: /api/health and /api/healthz report envelope_ready, webhook_ready, db_ready, ws_ready as true.
  4. Run envelope and integration tests (unit + integration) to ensure canonical contract works end-to-end.
  5. Document ESP32 payload structure and testing steps (docs/ESP32_CANONICAL.md).
  6. Roll out to staging first, then production with monitoring for errors.
