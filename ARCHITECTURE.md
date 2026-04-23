# EcoSynTech FarmOS PRO - Architecture Diagrams
# Version 6.0.0 | Dual-Path Platform for SMB & Enterprise

---

## 0. DESIGN PHILOSOPHY

### Dual-Path Architecture / Kiến trúc hai lớp

**EcoSynTech FarmOS** được thiết kế theo nguyên tắc **hybrid-lightweight-first**:

| Path | Target | Technology | Resources | Use Case |
|------|-------|------------|-----------|----------|----------|
| **Lite** (Default) | Nông dân, HTX nhỏ (RAM 1-2GB) | SQLite + In-memory | 512MB-1GB | 100 ESP32 |
| **Pro** | HTX lớn, Farm enterprise | PostgreSQL + Redis | >2GB | 500+ ESP32 |

**Nguyên tắc thiết kế:**
1. **Lightweight default** - Chạy tốt trên thiết bị cũ, RAM thấp
2. **Clear migration path** - Nâng cấp liền mạch khi cần
3. **No feature penalty** - Lite có đầy đủ core features
4. **Enterprise-ready** - Đường nâng cấp sẵn khi quy mô tăng

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ECOSYNTECH FARM OS PRO                         │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   CLIENTS   │
                         └──────┬───────┘
                                │
         ┌──────────────────────┬─┴──────────────────────┐
         │                     │                         │
    ┌────▼────┐       ┌───────▼───────┐        ┌────────▼────────┐
    │  Web   │       │    Mobile    │        │   IoT Devices   │
    │Browser│       │     App      │        │(MQTT/HTTP/CoAP) │
    └────┬────┘       └───────┬───────┘        └────────┬────────┘
         │                    │                         │
         └────────────────────┼─────────────────────────┘
                               │
                        ┌──────▼───────┐
                        │  API GATEWAY │
                        │  Express.js │
                        └──────┬───────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                          │
┌───▼────────┐  ┌────────────▼────────┐  ┌──────────────▼────────┐
│   Auth    │  │     Core Services    │  │    IoT Services      │
│ Service  │  │                      │  │                      │
│ (JWT)   │  │ • farms.js          │  │ • mqtt-bridge.js     │
│         │  │ • devices.js       │  │ • telemetry.js      │
│         │  │ • inventory.js    │  │ • rules-engine.js  │
└────┬────┘  │ • finance.js      │  │ • alerts.js        │
     │       │ • supply-chain.js │  └──────────────────────┘
     │       │ • crops.js        │
     │       └─────────────────┬──────────────────────────┘
     │                         │
┌────▼─────────────────────────▼──────────────────────────────┐
│                     AI ENGINE                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Irrigation│ │Fertilizer│ │  Yield   │ │ Disease  │     │
│  │Predictor │ │Predictor │ │ Forecast │ │ Detector│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Recommendations + Feedback            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                        ┌──────▼───────┐
                        │  DATA LAYER │
                        └─────────────┘
    ┌───────────────┬──────────────┬─────────────────┬───────────┐
    │              │              │                 │           │
┌───▼────┐  ┌────▼────┐  ┌────▼──────┐  ┌───▼────┐  ┌───▼─────┐
│SQLite  │  │  Redis │  │   MQTT   │  │  S3     │  │  Log   │
│ DB    │  │ Cache │  │ Broker  │  │Storage │  │Files  │
└───────┘  └────────┘  └──────────┘  └────────┘  └────────┘
```

---

## 2. Request Flow - User Login

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client │────▶│ Express │────▶│  Auth   │────▶│ SQLite  │
└─────────┘     │   JS    │     │Service  │     │   DB    │
                │Middleware│     │         │     │         │
       ◀────────│         │◀────│         │◀────│         │
                └─────────┘     └─────────┘     └─────────┘
                   │                             
           JWT Token ◀───────────────────────────
```

---

## 3. Request Flow - IoT Telemetry

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  IoT    │────▶│ MQTT    │────▶│ Telemetry│────▶│ SQLite  │
│ Device  │     │ Broker  │     │ Handler │     │   DB    │
└─────────┘     └─────────┘     │         │     └─────────┘
                               │
                        ┌──────▼───────┐
                        │    Redis    │
                        │  (cache)   │
                        └─────────────┘
                               │
                        ┌──────▼───────┐
                        │  AI Engine  │
                        │  (process) │
                        └─────────────┘
```

---

## 4. Traceability Flow

```
┌───────────────────────────────────────────────────────────────��─┐
│                    TRACEABILITY FLOW                           │
└─────────────────────────────────────────────────────────────────┘

    FARM ──▶ AREA ──▶ CROP ──▶ SEASON ──▶ HARVEST ──▶ BATCH
      │                             │              │
      │                             ▼              ▼
      │                      ┌──────────┐    ┌────────┐
      │                      │ Quality  │    │ Package│
      │                      │  Check   │    │ + QR  │
      │                      └──────────┘    └────────┘
      │                             │              │
      │                             ▼              ▼
      │                      ┌──────────────────────────────────┐
      │                      │      SHIPMENT + DELIVERY          │
      │                      └──────────────────────────────────┘
      │                             │
      ▼                             ▼
┌──────────────────────────────────────────────┐
│           PUBLIC VERIFICATION              │
│         (QR Code Scan / Batch Search)      │
└──────────────────────────────────────────────┘
```

---

## 5. AI Decision Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI DECISION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────┐
    │                  SENSOR DATA                           │
    │   Temperature, Humidity, Soil, Light, Weather       │
    └───────────────────────┬───────────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────────┐
    │                 AI ENGINE                            │
    │  ┌───────────────────────────────────────────────┐  │
    │  │  Input Processing + Feature Extraction        │  │
    │  │  - Current values vs optimal range             │  │
    │  │  - Historical patterns                       │  │
    │  │  - Weather forecast impact                     │  │
    │  └───────────────────────┬───────────────────────┘  │
    │                           │                          │
    │      ┌──────────────────┼──────────────────┐       │
    │      ▼                  ▼                  ▼       │
    │  ┌──────────┐    ┌��─────────────┐    ┌─────────┐  │
    │  │ Irrigation│    │   Yield     │    │ Disease │  │
    │  │Predictor │    │  Forecast   │    │ Detector│  │
    │  └────┬─────┘    └──────┬─────┘    └────┬────┘  │
    │       │                 │                 │       │
    │       └─────────────────┼─────────────────┘       │
    │                         │                          │
    │                         ▼                          │
    │              ┌─────────────────────┐              │
    │              │  Recommendation +    │              │
    │              │  Confidence Score   │              │
    │              └──────────┬──────────┘              │
    └─────────────────────────┼───────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ APPROVE  │  │ DEFER   │  │ IGNORE  │
        └──────────┘  └──────────┘  └──────────┘
              │             │             │
              └─────────────┴─────────────┘
                            │
                    ┌──────▼───────┐
                    │ Audit Log   │
                    │ (record)    │
                    └─────────────┘
```

---

## 6. Multi-Farm Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 MULTI-FARM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION (Multi-Tenant)                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Org Owner / Admin                                       │  │
│  │  • View all farms                                        │  │
│  │  • Cross-farm reports                                    │  │
│  │  • Billing & Users                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ FARM A │         │ FARM B │         │ FARM C  │
    │(10 ha) │         │(5 ha)  │         │(20 ha)  │
    └────┬────┘         └────┬────┘         └────┬────┘
      ││                    ││                    ││
   ┌──▼──┐              ┌──▼──┐              ┌──▼──┐
   │Area1│              │Area1│              │Area1│
   │Area2│              │Area2│              │Area2│
   └─────┘              └─────┘              └─────┘
      │                    │                    │
   ┌──▼───┐           ┌──▼───┐           ┌──▼───┐
   │Device│           │Device│           │Device│
   │Farm A│           │Farm B│           │Farm C│
   └──────┘           └──────┘           └──────┘
```

---

## 7. Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE RELATIONS                          │
└─────────────────────────────────────────────────────────────────┘

  users ────────┬─────────────── organizations
  │              │
  └──────────────┼────────────── farms
                 │◄───────────── areas
                 │               │
                 │               └── devices ───── sensors
                 │
                 ├────────────── workers
                 │
                 ├────────────── tasks
                 │
                 ├────────────── inventory_items
                 │
                 ├────────────── finance_entries
                 │
                 ├────────────── supply_chain (batches)
                 │
                 ├────────────── crops ────────── crop_plantings
                 │
                 ├────────────── tb_batches ────── tb_batch_events
                 │                        │        tb_batch_quality_checks
                 │                        │        tb_packages
                 │                        │        tb_shipment_items
                 │                        └────── tb_shipments
                 │
                 ├────────────── rules ────────── schedules
                 │
                 ├────────────── alerts
                 │
                 ├────────────── history
                 │
                 └────────────── audit_logs
```

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              DEPLOYMENT ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   DEV        │       │  STAGING     │       │  PRODUCTION  │
│  (local)    │       │ (cloud)     │       │  (cloud)     │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │              ┌───────▼───────┐      ┌───────▼───────┐
       │              │  CI/CD       │      │  CI/CD       │
       │              │  Pipeline    │      │  Pipeline    │
       │              └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │        ┌────────────▼────────────┐     │
       │        │    GitHub Actions       │     │
       │        └────────────┬────────────┘     │
       │                     │                 │
       └─────────────────────┼─────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
      ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
      │ Docker  │      │ Docker  │      │ Docker  │
      │Build    │      │Build    │      │Build    │
      └────┬────┘      └────┬────┘      └────┬────┘
           │                 │                 │
      ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
      │App     ���      │App     │      │App     │
      │Container│      │Container│     │Container││
      └────┬────┘      └────┬────┘      └────┬────┘
           │                 │                 │
      ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
      │SQLite  │      │SQLite  │      │ PostgreSQL│
      │File   │      │File   │      │ Managed  │
      └───────┘      └───────┘      └──────────┘
```

---

## 9. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                SECURITY ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Request   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────────┐ ┌──────────┐ ┌──────────────┐
       │  Rate      │ │  Input   │ │   Auth     │
       │  Limiting │ │Validation│ │  (JWT)    │
       └──────┬─────┘ └────┬─────┘ └──────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌──────────────┐
                    │  RBAC/ABAC  │
                    │  (Authz)   │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌──────▼──────┐
    │ Farm   │      │   Data    │    │  Audit     │
    │ Scope  │      │ Encrypt   │    │  Logging   │
    └────────┘      └───────────┘    └────────────┘
```

---

## 10. Dual-Path Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│            DUAL-PATH DATABASE ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  APP LAYER  │
                    └──────┬───────┘
                           │
            ┌──────────────┼─────────────���┐
            ▼              ▼              ▼
    ┌───────────┐  ┌────────────┐  ┌──────────────┐
    │   Lite   │  │  Hybrid   │  │    Pro      │
    │  Mode    │  │   Mode    │  │   Mode      │
    └────┬─────┘  └─────┬─────┘  └──────┬──────┘
         │              │               │
    ┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
    │ SQLite │   │  SQLite   │  │PostgreSQL│
    │ (WAL)  │   │ + Redis   │  │+ Redis   │
    └────────┘   └───────────┘  └───────────┘

    LITE (<1GB)    HYBRID (1-2GB)  PRO (>2GB)
    ┌─────────────────────────────────────────────────────┐
    │  Migration Path: Lite → Pro (when scale requires)  │
    └─────────────────────────────────────────────────────┘
```

---

## 11. Technology Stack by Path

### Lite Path (Default for SMB)
| Component | Technology | Rationale |
|----------|-----------|-----------|
| Database | SQLite (WAL mode) | No server, low RAM |
| Cache | In-memory LRU | Lightweight |
| Auth | JWT | Stateless |
| Backup | Local + Export | Simple |

### Pro Path (For Enterprise Scale)
| Component | Technology | Rationale |
|----------|-----------|-----------|
| Database | PostgreSQL | ACID, scaling |
| Cache | Redis | Session sharing |
| Auth | JWT + Refresh rotation | Security |
| Backup | Automated + Off-site | Compliance |

---

*Diagrams for EcoSynTech FarmOS v6.0.0 - Dual-Path Platform*
