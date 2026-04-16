ESP32 Canonical Contract (Webhook)
===============================

- Endpoint: POST /api/webhook/esp32
- Payload: envelope payload + signature using canonical stringify
- Payload structure:
-  payload: {
-    _did: string, // device id
-    _ts: number, // unix seconds timestamp
-    _nonce: string, // one-time nonce
-    device_id: string,
-    fw_version: string,
-    readings: [{ sensor_type, value, unit, sensor_id?, ... }],
-    get_commands?: boolean,
-    get_config?: boolean,
-    get_batch?: boolean
-  }
-  signature: string
- Response: envelope with payload and signature
-  {
-    payload: { ok, device_id, fw_version, server_ts, commands?, config?, batches?, rules?, processed? },
-    signature: string
-  }

- Example payload (JSON):
```
{
  "payload": {
    "_did": "ESP32-001",
    "_ts": 1710000000,
    "_nonce": "abc123def456",
    "device_id": "ESP32-001",
    "fw_version": "8.5.0",
    "readings": [
      {"sensor_type":"temperature","value":28.5,"unit":"C"},
      {"sensor_type":"humidity","value":70,"unit":"%"}
    ],
    "get_commands": true,
    "get_config": true
  },
  "signature": "<signature>"
}
```

- ESP32 example (pseudo Arduino/C++):
  - Build a JSON payload using your preferred JSON library (e.g. ArduinoJson)
  - Compute HMAC-SHA256 of the canonical payload string using the shared HMAC secret
  - Send POST to /api/webhook/esp32 with body { payload: <payload>, signature: <signature> }
  - The canonical stringification orders keys and nests objects deterministically to ensure consistent signature computation

Notes
- Canonical contract ensures ESP32, backend, and any gateways share a single trusted envelope pattern
- Keep _nonce one-time; payload _ts must be within NONCE_WINDOW_SEC (e.g., 1200s)
- The server returns an envelope response containing optional commands/config/batches as appropriate
- All subsequent endpoints (/batch, /command, /command-result) should also respond with envelope payload + signature

Phase 10+ Dashboard & Rollback
- Metrics endpoint /metrics now exposes: http_requests_total, http_request_duration_seconds, envelope_verifications_total, envelope_verifications_by_route
- A Prometheus dashboard sample is provided at dashboards/prometheus_dashboard.json
- Rollback mechanism for Phase 9 migrations is provided via scripts/db-admin.js (rollback) and a database backup approach within migrations
