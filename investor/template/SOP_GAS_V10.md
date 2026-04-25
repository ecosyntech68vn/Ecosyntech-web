# EcoSynTech FarmOS V2.0 - SOP: GAS V10 Ingestion
## Standard Operating Procedure

---

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Platform:** ESP32 IP67 | **Security:** ISO 27001

---

## 1. PURPOSE

Define the standard process for ingesting data from gateway devices to GAS V10 backend, including validation, storage, and monitoring.

---

## 2. SCOPE

- Ingest data from ESP32 devices via WebLocal gateway into GAS V10
- Storage in Google Sheets/BigQuery/Firestore
- Authentication and security compliance

---

## 3. ROLES

| Role | Responsibility |
|------|----------------|
| Data Engineer | Pipeline & schema |
| DevOps | GAS deployment & monitoring |
| Security | Auth & compliance |
| Support | Issue handling |

---

## 4. INGESTION FLOW

```
1. Device (Firmware v9.2.0) reads sensors
2. Data formatted: {deviceId, timestamp, readings[]}
3. Gateway receives and validates
4. Gateway POSTs to GAS V10 /ingest/data
5. GAS validates payload (schema, auth)
6. GAS stores to Sheets/BigQuery/Firestore
7. GAS returns success + dataId
8. Gateway logs confirmation
```

---

## 5. PAYLOAD SCHEMA

```json
{
  "deviceId": "ESP_001",
  "timestamp": 1700000000000,
  "readings": [
    {"sensorType": "ST30", "value": 28.5, "unit": "°C"},
    {"sensorType": "SoilMoisture", "value": 45, "unit": "%"}
  ],
  "battery": 95,
  "status": "online"
}
```

### Validation Rules
- deviceId: Required, string
- timestamp: Required, UNIX epoch ms
- readings[]: Required, array
- readings[].sensorType: Required, enum
- readings[].value: Required, number
- readings[].unit: Optional, string

---

## 6. ERROR HANDLING

| Error | Action | Retry |
|-------|--------|-------|
| Invalid payload | Return 400 | No |
| Auth failure | Return 401 | No |
| Server error | Return 500 | Yes (3x) |
| Rate limit | Return 429 | Yes (exponential) |

---

## 7. SECURITY

- API key per device
- HMAC signature for integrity
- HTTPS/TLS required
- RBAC on endpoints

---

## 8. MONITORING

- Success rate (>99%)
- Latency (<500ms P95)
- Error codes
- Storage usage

---

**Document:** SOP_GAS_V10.md
**Version:** 1.0
**Date:** 2026-04-25

(End of file - total 100 lines)