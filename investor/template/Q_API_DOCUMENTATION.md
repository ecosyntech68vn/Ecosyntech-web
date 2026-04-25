# EcoSynTech FarmOS V2.0 - API Documentation
## Tài liệu API / API Documentation

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Security:** ISO 27001

---

## 1. API OVERVIEW

### Architecture

```
ESP32 (Firmware v9.2.0) → WebLocal Gateway → GAS V10 Backend → Google Cloud Storage
                                              ↓
                                    REST API / GraphQL
```

### Base URL

```
Development: http://139.59.101.136:3000/api
Production: http://139.59.101.136:3000/api
GAS V10 Web App: https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

### Authentication

```
Header: Authorization: Bearer <token>
Token: JWT (expires 24 hours)
```

---

## 2. ENDPOINTS

### Authentication

```
POST /auth/login
POST /auth/register
POST /auth/refresh
```

### Sensors

```
GET    /sensors           - List sensors
GET    /sensors/:id      - Get sensor data
POST   /sensors          - Add sensor
PUT    /sensors/:id      - Update sensor
DELETE /sensors/:id      - Remove sensor
```

### Data

```
GET  /data/:sensor_id    - Get readings
POST /data              - Submit reading
GET /data/history      - Historical data
```

### Control

```
POST /control/irrigation - Toggle irrigation
GET  /control/schedule  - Get schedule
PUT  /control/schedule  - Update schedule
```

### Alerts

```
GET  /alerts           - List alerts
PUT  /alerts/:id      - Update alert
```

---

## 3. RESPONSE FORMAT

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

---

## 4. ERROR CODES

| Code | Meaning |
|------|---------|
| AUTH_INVALID | Invalid credentials |
| AUTH_EXPIRED | Token expired |
| NOT_FOUND | Resource not found |
| VALIDATION | Invalid input |
| RATE_LIMIT | Too many requests |

---

**Document:** API Documentation V1.0
**Version:** 1.0 - REST API
**Date:** 2026-04-25
**Prepared for:** Developers

(End of file - total 79 lines)