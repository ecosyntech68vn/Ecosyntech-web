# EcoSynTech FarmOS V2.0 - GAS V10 Architecture
## GAS V10 Backend Architecture & Integration

---

## 1. OVERVIEW

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Platform:** ESP32 IP67 | **Security:** ISO 27001

GAS V10 is the Google Apps Script web app acting as backend orchestrator for FarmOS. It receives data from WebLocal gateway or devices via REST endpoints, processes and stores in Google Sheets/BigQuery/Firestore, and provides APIs for frontend and external systems.

---

## 2. SYSTEM ARCHITECTURE

```
┌────────────────────────────────────────────────────────────┐
│              GAS V10 ARCHITECTURE                          │
├─────────────────────────────────────��──────────────────────┤
│                                                              │
│  DEVICES (Firmware v9.2.0)                                 │
│  └── ESP32 → LAN/WiFi → WebLocal Gateway                   │
│                                                              │
│  GATEWAY LAYER (WebLocal)                                   │
│  └── Data aggregation, TLS/Token auth                      │
│                                                              │
│  GAS V10 BACKEND                                           │
│  ├── REST API Endpoints                                   │
│  ├── OAuth 2.0 + API Keys                                 │
│  ├── Processing & Validation                              │
│  └── Audit Logging                                        │
│                                                              │
│  STORAGE LAYER                                             │
│  ├── Google Sheets (demo/quick)                           │
│  ├── BigQuery (analytics/scale)                          │
│  └── Firestore (realtime lookups)                        │
│                                                              │
│  CLIENTS                                                   │
│  ├── Web Dashboard                                        │
│  ├── Mobile App (PWA)                                    │
│  └── External Systems (API)                              │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### DeviceReading

| Field | Type | Description |
|-------|------|-------------|
| deviceId | string | Unique device identifier |
| timestamp | number | UNIX epoch (ms) |
| readings | array | Array of sensor readings |
| readings[].sensorType | string | ST30, DHT22, BME280, etc. |
| readings[].value | number | Sensor value |
| readings[].unit | string | °C, %, pH, etc. |
| battery | number | Battery level (%) |
| status | string | online/offline/error |

### DeviceState

| Field | Type | Description |
|-------|------|-------------|
| deviceId | string | Unique identifier |
| lastSeen | number | Last communication timestamp |
| firmwareVersion | string | v9.2.0 |
| location | string | Farm/garden location |
| tier | string | BASE/PRO/PRO MAX/PREMIUM |

---

## 4. AUTHENTICATION

### User Authentication (Web)
- Google OAuth 2.0 via GAS Web App
- Role-based access: Admin, Operator, Viewer
- Session management with PropertiesService

### Device Authentication
- API Key per device (issued during provisioning)
- HMAC signature for payload integrity
- Token-based auth for gateway → GAS

### Security Measures
- HTTPS/TLS 1.2+ enforced
- Data encrypted at rest (Sheets/BigQuery)
- Audit logs for all critical operations
- RBAC enforcement

---

## 5. REST API ENDPOINTS

### Data Ingestion

```
POST /ingest/data
Authorization: Bearer <device_token>
Content-Type: application/json

{
  "deviceId": "ESP_001",
  "timestamp": 1700000000000,
  "readings": [
    {"sensorType": "ST30", "value": 28.5, "unit": "°C"},
    {"sensorType": "DHT22", "value": 75.2, "unit": "%"},
    {"sensorType": "SoilMoisture", "value": 45, "unit": "%"}
  ],
  "battery": 95,
  "status": "online"
}

Response: 200 OK
{"success": true, "dataId": "uuid", "timestamp": 1700000000000}
```

### Device Management

```
GET /devices - List all devices
GET /devices/:id - Device details
POST /devices/register - Register new device
PUT /devices/:id/config - Update device config
```

### Data Query

```
GET /data/history?deviceId=&sensorType=&from=&to=
GET /data/realtime?deviceId=
GET /data/aggregate?deviceId=&period=daily
```

### Control

```
POST /control/irrigation - Toggle irrigation
GET /control/schedule - Get schedule
PUT /control/schedule - Update schedule
```

---

## 6. STORAGE STRATEGY

### Google Sheets (Demo/Quick)
- Raw ingestion data
- Simple dashboards
- Low-cost, immediate access

### BigQuery (Analytics/Scale)
- Large-scale analytics
- Historical data (7+ years)
- ML/BI integration

### Firestore (Realtime)
- Device state
- Near real-time lookups
- Mobile app sync

---

## 7. MONITORING & LOGGING

### Monitoring
- Ingestion success rate
- API latency (P95, P99)
- Error rates by endpoint
- Storage usage

### Logging
- All API calls logged
- Data integrity checks
- Security events (failed auth, etc.)
- Export to Cloud Logging

### Alerts
- Ingestion failures
- High latency (>2s)
- Storage threshold (>80%)
- Security events

---

## 8. DEPLOYMENT

### GAS V10 Setup
1. Create Google Apps Script project
2. Enable Google Cloud APIs (Sheets, BigQuery, Firestore)
3. Configure OAuth consent screen
4. Deploy as Web App (execute as: me, access: anyone)
5. Configure API keys storage (PropertiesService)

### Security Hardening
1. Enable 2FA for all admin accounts
2. Configure firewall rules
3. Set up Cloud Armor/IAP if needed
4. Regular security audits
5. Penetration testing (quarterly)

### Backup & Recovery
- Daily automated backups to Cloud Storage
- Point-in-time recovery for BigQuery
- Disaster recovery plan documented

---

## 9. COMPLIANCE (ISO 27001)

### Security Controls
| Control | Implementation |
|---------|----------------|
| A.9.1 | RBAC for all users |
| A.10.1 | Data encryption at rest/transit |
| A.12.4 | Logging and monitoring |
| A.16.1 | Incident management |
| A.18.1 | Compliance audit |

---

**Document:** GAS_V10.md
**Version:** 1.0
**Date:** 2026-04-25
**Prepared for:** Engineering & Architecture

(End of file - total 217 lines)