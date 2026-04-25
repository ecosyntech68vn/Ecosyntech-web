# EcoSynTech FarmOS V2.0 - Technical Specifications
## Thông số Kỹ thuật / Technical Specifications

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Security:** ISO 27001

---

## 1. HARDWARE SPECIFICATIONS

### Controller Specifications

```
┌────────────────────────────────────────────────────────────┐
│              CONTROLLER SPECS (ESP32) - Firmware v9.2.0     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  PROCESSOR:                                                 │
│  ├── ESP32-WROOM-32E                                       │
│  ├── Firmware: v9.2.0 (OTA enabled)                       │
│  ├── Dual-core Xtensa LX6                                 │
│  ├── Clock: 240MHz                                        │
│  └── Flash: 4MB                                           │
│                                                              │
│  MEMORY:                                                    │
│  ├── SRAM: 520KB                                          │
│  ├── Flash: 4MB                                          │
│  └── MicroSD: Up to 32GB (optional)                       │
│                                                              │
│  CONNECTIVITY:                                             │
│  ├── WiFi: 802.11 b/g/n                                   │
│  ├── Bluetooth: 4.2 LE                                    │
│  ├── Ethernet: 10/100 (optional)                         │
│  └── LoRa: 868MHz/920MHz (optional)                      │
│                                                              │
│  I/O:                                                      │
│  ├── Digital I/O: 8                                       │
│  ├── Analog Input: 4 (ADS1115)                            │
│  ├── Relay Output: 8 (5A/250VAC)                       │
│  └── RS485: 1 (optional)                                │
│                                                              │
│  POWER:                                                    │
│  ├── Input: 12V DC                                        │
│  ├── Consumption: 2W (idle), 5W (active)               │
│  └── Battery backup: 6V (optional)                        │
│                                                              │
│  ENCLOSURE:                                                 │
│  ├── IP67 rated                                          │
│  ├── ABS plastic                                         │
│  ├── Dimensions: 200×150×80mm                            │
│  └── Temperature: -20°C to 70°C                           │
│                                                              │
│  SECURITY:                                                 │
│  ├── Secure Boot                                         │
│  ├── Flash Encryption                                    │
│  └── OTA Signing (v9.2.0)                                │
│                                                              │
└────────────────────────────────────────────────────────────┘
```
┌────────────────────────────────────────────────────────────┐
│              CONTROLLER SPECS (ESP32)                       │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  PROCESSOR:                                                 │
│  ├── ESP32-WROOM-32E                                       │
│  ├── Dual-core Xtensa LX6                                 │
│  ├── Clock: 240MHz                                        │
│  └── Flash: 4MB                                           │
│                                                              │
│  MEMORY:                                                    │
│  ├── SRAM: 520KB                                          │
│  ├── Flash: 4MB                                          │
│  └── MicroSD: Up to 32GB (optional)                       │
│                                                              │
│  CONNECTIVITY:                                             │
│  ├── WiFi: 802.11 b/g/n                                   │
│  ├── Bluetooth: 4.2 LE                                    │
│  ├── Ethernet: 10/100 (optional)                         │
│  └── LoRa: 868MHz/920MHz (optional)                      │
│                                                              │
│  I/O:                                                      │
│  ├── Digital I/O: 8                                       │
│  ├── Analog Input: 4 (ADS1115)                            │
│  ├── Relay Output: 8 (5A/250VAC)                       │
│  └── RS485: 1 (optional)                                │
│                                                              │
│  POWER:                                                    │
│  ├── Input: 12V DC                                        │
│  ├── Consumption: 2W (idle), 5W (active)               │
│  └── Battery backup: 6V (optional)                        │
│                                                              │
│  ENCLOSURE:                                                 │
│  ├── IP67 rated                                          │
│  ├── ABS plastic                                         │
│  ├── Dimensions: 200×150×80mm                            │
│  └── Temperature: -20°C to 70°C                           │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 2. SENSOR SPECIFICATIONS

### ST30 Temperature Sensor

| Parameter | Value |
|-----------|-------|
| Type | NTC thermistor |
| Range | -40°C to 125°C |
| Accuracy | ±0.5°C |
| Resolution | 0.1°C |
| Cable | 3m (extendable to 30m) |

### DHT22 Sensor

| Parameter | Value |
|-----------|-------|
| Temperature | -40°C to 80°C |
| Humidity | 0-100% RH |
| Accuracy | ±0.5°C, ±2% RH |
| Interface | Digital (DHT protocol) |

### BME280 Sensor

| Parameter | Value |
|-----------|-------|
| Temperature | -40°C to 85°C |
| Humidity | 0-100% RH |
| Pressure | 300-1100 hPa |
| Accuracy | ±1°C, ±3% RH, ±1 hPa |
| Interface | I2C |

### Soil Moisture Sensor

| Parameter | Value |
|-----------|-------|
| Type | Capacitive |
| Range | 0-100% |
| Accuracy | ±3% |
| Interface | Analog |

### pH Sensor

| Parameter | Value |
|-----------|-------|
| Range | 0-14 pH |
| Accuracy | ±0.1 pH |
| Calibration | Manual (2-point) |
| Interface | BNC connector |

### EC Sensor

| Parameter | Value |
|-----------|-------|
| Range | 0-10 mS/cm |
| Accuracy | ±5% |
| Calibration | Manual |
| Interface | BNC connector |

---

## 3. FIRMWARE SPECIFICATIONS

### FarmOS Firmware

| Component | Version |
|------------|---------|
| Firmware | 9.2.0 |
| Bootloader | 1.0 |
| WiFi | Stable |
| Bluetooth | BLE Mesh |

### Firmware Features

```
┌────────────────────────────────────────────────────────────┐
│              FIRMWARE FEATURES                             │
├────────────────────────────────────────────────────────────┤
│  CORE:                                                    │
│  ├── Offline-first architecture                           │
│  ├── Local data storage (24 hours)                         │
│  ├── Sync to cloud when connected                         │
│  └── Automatic reconnection                            │
│                                                              │
│  SENSORS:                                                 │
│  ├── Multi-sensor support                                │
│  ├── Calibration management                            │
│  └── Data validation                                   │
│                                                              │
│  CONTROL:                                                │
│  ├── Multi-zone irrigation                             │
│  ├── Schedule management                               │
│  ├── Manual override                                   │
│  └── Safety limits                                    │
│                                                              │
│  AI/ML:                                                   │
│  ├── LightGBM inference (local)                         │
│  ├── Model updates (OTA)                              │
│  └── Edge computing                                   │
│                                                              │
│  SECURITY:                                              │
│  ├── Encrypted storage                                  │
│  ├── Secure boot                                     │
│  └── OTA verification                                │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 4. SOFTWARE SPECIFICATIONS

### Web Dashboard

| Component | Version |
|------------|---------|
| Framework | Vanilla JS |
| UI Library | Bootstrap 5 |
| Charts | Chart.js |
| Maps | Leaflet |

### Mobile App

| Component | Platform |
|-----------|----------|
| Framework | PWA |
| iOS | 14+ |
| Android | 8+ |

### Cloud Services

| Service | Provider |
|---------|----------|
| Hosting | VPS (Self-hosted) |
| Database | SQLite |
| API | REST |
| Auth | JWT |

---

## 5. COMMUNICATION

### Protocols

| Protocol | Use |
|----------|-----|
| HTTP/HTTPS | Dashboard, API |
| MQTT | Sensor data |
| WebSocket | Real-time updates |
| NTP | Time sync |

### Data Format

```
{
  "device_id": "ESP_XXXXX",
  "timestamp": 1700000000,
  "sensors": {
    "temp_1": 28.5,
    "humidity_1": 75.2,
    "soil_moisture_1": 45,
    "light_1": 800
  },
  "status": "online"
}
```

---

## 6. SECURITY

### ISO 27001 Compliance

| Control | Implementation |
|---------|----------------|
| Access control | Role-based, MFA |
| Encryption | AES-256 |
| Audit | Full logging |
| Backup | Daily, encrypted |

### Network Security

```
┌────────────────────────────────────────────────────────────┐
│              NETWORK SECURITY                             │
├────────────────────────────────────────────────────────────┤
│  LOCAL (LAN):                                              │
│  ├── No internet required                                 │
│  ├── Local DNS                                            │
│  └── mDNS discovery                                       │
│                                                              │
│  CLOUD:                                                    │
│  ├── HTTPS only                                           │
│  ├── JWT tokens                                          │
│  ├── Rate limiting                                       │
│  └── DDoS protection                                     │
│                                                              │
│  FIRMWARE:                                                 │
│  ├── Secure boot                                          │
│  ├── Encrypted storage                                    │
│  └── Secure OTA                                           │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 7. PERFORMANCE

### Capacity

| Metric | Value |
|--------|-------|
| Sensors per controller | 19 max |
| Data points/day | 1,440 |
| Local storage | 7 days |
| Concurrent users | 10 |

### Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Latency | <200ms |
| Data loss | <0.1% |
| MTBF | 50,000 hours |

---

## 8. COMPLIANCE

### Certifications

| Certification | Status |
|---------------|--------|
| IP67 | ✅ Certified |
| CE | ✅ Pending |
| FCC | ✅ Pending |
| ISO 27001 | ✅ In progress |

---

**Document:** Technical Specifications V1.0
**Version:** 1.0 - Firmware 9.2.0
**Date:** 2026-04-25
**Prepared for:** Engineering & Sales

(End of file - total 228 lines)