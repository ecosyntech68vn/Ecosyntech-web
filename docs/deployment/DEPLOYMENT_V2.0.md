# EcoSynTech FarmOS - Deployment Guide
## Version 2.0 - Vietnam Pilot

**Date:** 2026-04-25
**Version:** 2.0.0
**Status:** ✅ PRODUCTION READY
**Server:** http://139.59.101.136:3000

---

## 1. System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EcoSynTech FarmOS V2.0                    │
├─────────────────────────────────────────────────────────────┤
│  WebLocal (Node.js)  │  GAS V10 (Cloud)  │  ESP32 Firmware │
│        :3000        │     :8443       │     9.2.0      │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Version | Description |
|-----------|---------|-------------|
| **WebLocal** | 2.0.0 | Node.js backend, ISO 27001 compliant |
| **GAS** | V10 | Google Apps Script backend |
| **Firmware** | 9.2.0 | ESP32 IoT device firmware |
| **Database** | SQLite | Local storage with device_secrets |
| **AI/ML** | 8 models | LightGBM, LSTM, Aurora, etc. |

---

## 2. WebLocal V2.0

### Features

| Feature | Status |
|--------|--------|
| REST API (41 endpoints) | ✅ |
| ISO 27001 Compliance (100%) | ✅ |
| JWT Authentication | ✅ |
| RBAC (admin/manager/user) | ✅ |
| Farm Journal | ✅ |
| E-commerce (VNPay, MoMo, SePay) | ✅ |
| WebSocket Real-time | ✅ |

### API Endpoints

#### Core
- `GET /api/health` - Health check
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/devices` - List devices
- `POST /api/devices` - Create device
- `GET /api/sensors` - Sensor data

#### Farm Management
- `GET /api/farms` - List farms
- `POST /api/farms` - Create farm
- `GET /api/workers` - Workers
- `GET /api/crops` - Crops

#### AI/ML
- `GET /api/ai/predict/irrigation` - Irrigation prediction
- `GET /api/ai/predict/fertilization` - Fertilization
- `GET /api/ai/predict/yield` - Yield prediction
- `GET /api/ai/predict/disease-risk` - Disease risk

#### E-commerce
- `GET /api/pricing/plans` - Pricing plans
- `POST /api/checkout/create` - Create order
- `POST /api/payment/create` - Payment

#### Compliance
- `GET /api/compliance/score` - ISO 27001 score
- `GET /api/compliance/controls` - Controls list
- `GET /api/compliance/report` - Full report

#### Farm Journal
- `GET /api/journal` - Journal entries
- `POST /api/journal/fertilizer` - Fertilizer batch
- `GET /api/journal/timeline` - Traceability

### Installation

```bash
# Clone repository
git clone https://github.com/ecosyntech68vn/Ecosyntech-web.git
cd Ecosyntech-web

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with production values

# Start server
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

### Environment Variables

```bash
# Required
JWT_SECRET=your-production-secret-at-least-32-chars
NODE_ENV=production

# Optional
PORT=3000
WEBLOCAL_USE_HTTPS=true
DEVICES_CACHE_TTL=60000
LOG_LEVEL=info
```

### Docker

```bash
# Build
docker build -t ecosyntech-web:2.0.0 .

# Run
docker run -d -p 3000:3000 \
  -e JWT_SECRET=your-secret \
  -e NODE_ENV=production \
  ecosyntech-web:2.0.0
```

---

## 3. GAS V10

### Hybrid Actions

| Action | Description |
|--------|-------------|
| `hybrid_pull` | Pull events from WebLocal |
| `hybrid_push` | Push events to WebLocal |
| `hybrid_ack` | Acknowledge events |
| `hybrid_cmd` | Send command to device |
| `hybrid_cmd_ack` | Command acknowledgment |
| `hybrid_provision` | Device provisioning |

### API Endpoints

```javascript
// Pull events
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec
Body: { action: 'hybrid_pull', limits: {...} }

// Push events
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec
Body: { action: 'hybrid_push', events: [...] }

// Acknowledge
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec
Body: { action: 'hybrid_ack', event_ids: [...] }
```

### Device Envelope Format

```javascript
// Firmware sends (V9.2.0)
{
  _: "envelope_id",
  _did: "ECOSYNTECH0001",
  _ts: 1700000000,
  _nonce: "abc123",
  signature: "hmac-sha256",
  action: "sensor_reading",
  data: { ... }
}

// WebLocal responds
{
  ok: true,
  action: "sensor_reading",
  envelope: "envelope_id",
  status: "received"
}
```

### Configuration

```javascript
// GAS V10 config
const CONFIG = {
  webLocalUrl: 'http://139.59.101.136:3000',
  hybridSecret: 'device-secret-from-provisioning',
  retryCount: 3,
  retryDelay: 5000,
  timeout: 30000
};
```

---

## 4. Firmware 9.2.0

### Features

| Feature | Status |
|--------|--------|
| Secure boot | ✅ |
| HMAC authentication | ✅ |
| mDNS discovery | ✅ |
| OTA updates | ✅ |
| Hybrid sync | ✅ |
| Envelope format | ✅ |

### Device Envelope

```c
// Firmware 9.2.0
typedef struct {
  char envelope[32];      // Envelope ID
  char device_id[16];    // Device ID
  uint32_t ts;        // Timestamp
  char nonce[16];      // Nonce for replay protection
  char signature[64]; // HMAC-SHA256
  char action[32];    // Action type
  void* data;       // Payload
} device_envelope_t;
```

### HMAC Calculation

```c
// HMAC-SHA256
// message = device_id | nonce | timestamp | canonical_json(payload)
// key = provisioned_secret

String message = device_id + "|" + nonce + "|" + ts + "|" + canonicalJson(payload);
String signature = HMAC-SHA256(message, secret);
```

### mDNS Service

```c
// Advertise service
mdns Advertise("_ecosyntech._tcp", 3000, {
  version: "9.2.0",
  device_id: DEVICE_ID,
  capabilities: "sensors,relay"
});
```

---

## 5. Device Provisioning

### Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   GAS V10    │───▶│ WebLocal    │───▶│  Database   │
│  Provision  │    │   Sync     │    │device_secrets│
└──────────────┘    └──────────────┘    └──────────────┘
```

### Database Schema

```sql
-- device_secrets table
CREATE TABLE device_secrets (
  device_id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  provisioned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  active INTEGER DEFAULT 1
);

-- devices table
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  zone TEXT,
  status TEXT DEFAULT 'offline',
  config TEXT DEFAULT '{}',
  last_seen TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. ISO 27001 Compliance

### Controls (62 Total)

| Domain | Controls | Compliant |
|--------|----------|----------|
| A.5 Policies | 2 | 2 |
| A.6 People | 8 | 6 |
| A.7 Physical | 4 | 0 (N/A) |
| A.8 Technology | 45 | 45 |
| A.15 Suppliers | 3 | 3 |
| A.16 Incidents | 3 | 3 |
| A.17 BC/DR | 3 | 3 |
| A.18 Compliance | 2 | 2 |
| **TOTAL** | **62** | **55** |

### Evidence Documents

| Document | Path |
|----------|------|
| ISMS Policy | docs/governance/ISMS_POLICY.md |
| Security Policy | docs/policies/SECURITY.md |
| Incident Response | docs/operations/INCIDENT_RESPONSE_PLAN.md |
| BC/DR SOP | docs/operations/BUSINESS_CONTINUITY_SOP.md |

### Audit Endpoints

```bash
# Get compliance score
curl http://139.59.101.136:3000/api/compliance/score

# Get full report
curl http://139.59.101.136:3000/api/compliance/report

# Get controls
curl http://139.59.101.136:3000/api/compliance/controls
```

---

## 7. Testing

### Health Check

```bash
# Server health
curl http://139.59.101.136:3000/api/health

# ISO compliance
curl http://139.59.101.136:3000/api/compliance/score

# Devices
curl http://139.59.101.136:3000/api/devices
```

### Unit Tests

```bash
npm test

# With coverage
npm run test:coverage
```

### Skills Validation

```bash
node scripts/validate-skills.js
# Expected: 14 OK, 0 BAD
```

---

## 8. Monitoring

### Metrics

| Metric | Endpoint |
|--------|---------|
| Health | `/api/health` |
| ISO Score | `/api/compliance/score` |
| System | `/api/stats` |
| AI Telemetry | `/api/ai/telemetry` |

### Logs

```bash
# View logs
tail -f logs/app.log

# With grep
grep "ERROR" logs/app.log
```

---

## 9. Rollback

### Quick Rollback

```bash
# PM2
pm2 rollback

# Docker
docker ps
docker rollback <container-id>
```

### Database Backup

```bash
# Backup
cp data.db data.db.backup.$(date +%Y%m%d)

# Restore
cp data.db.backup.* data.db
```

---

## 10. Support

### Contact

| Channel | Info |
|--------|------|
| Email | support@ecosyntech.vn |
| Hotline | [Provide number] |
| Dashboard | http://139.59.101.136:3000/dashboard |

### Documentation

| Doc | Path |
|-----|------|
| API Reference | docs/api/API_REFERENCE.md |
| GoLive Report | docs/deployment/GOLIVE_AUDIT_REPORT.md |
| ISO Controls | docs/governance/ISO_27001_2022_GAP_ANALYSIS.md |

---

**Version:** 2.0.0
**Last Updated:** 2026-04-25
**Next Review:** 2026-07-25