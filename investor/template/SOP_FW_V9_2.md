# EcoSynTech FarmOS V2.0 - SOP: Firmware v9.2.0 OTA
## Standard Operating Procedure

---

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Platform:** ESP32 IP67 | **Security:** ISO 27001

---

## 1. PURPOSE

Define the standard process for building, packaging, distributing, and applying Firmware v9.2.0 to ESP32 edge devices via OTA.

---

## 2. SCOPE

- ESP32 devices running Firmware v9.2.0
- OTA server distribution
- Secure update workflow

---

## 3. OTA WORKFLOW

```
┌────────────────────────────────────────────────────────────┐
│              OTA UPDATE WORKFLOW                           │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  1. BUILD: Compile v9.2.0 firmware                        │
│  2. SIGN: RSA-2048 signature                               │
│  3. PACKAGE: Create update bundle                          │
│  4. DEPLOY: Upload to OTA server                          │
│  5. MANIFEST: Publish to devices                          │
│  6. DOWNLOAD: Device fetches firmware                     │
│  7. VERIFY: Signature check                               │
│  8. FLASH: Write to OTA partition                         │
│  9. REBOOT: Switch to new firmware                        │
│  10. VERIFY: Health check                                 │
│  11. ROLLBACK: If fail, revert                           │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 4. BUILD & SIGN

### Prerequisites
- ESP-IDF v5.0+
- Signing keys (RSA-2048)
- Version bump to v9.2.0

### Process
1. Clone firmware repo
2. Build: `idf.py build`
3. Sign: `espsecure.py sign_data`
4. Package: Create .bin bundle
5. Upload to OTA server

---

## 5. DEPLOYMENT

### Server Requirements
- HTTPS endpoint
- Signature public key distributed
- Version manifest

### Manifest Format
```json
{
  "version": "9.2.0",
  "url": "https://ota.ecosyntech.vn/fw/v9.2.0.bin",
  "signature": "base64_signature",
  "size": 1234567,
  "release_date": "2026-04-25"
}
```

---

## 6. DEVICE UPDATE

### Check
```
GET /ota/check
Response: Manifest (if new version)
```

### Download & Install
1. Download firmware.bin
2. Verify signature
3. Flash to OTA partition
4. Reboot
5. Health check

---

## 7. ROLLBACK

### Triggers
- Boot failure
- Sensor not responding
- AI model load fail

### Process
1. Boot to previous partition
2. Report to GAS V10
3. Alert operations

---

## 8. SECURITY

- Secure boot enabled
- Flash encryption
- OTA signing required
- Certificate pinning

---

## 9. TESTING

- Unit tests: All drivers
- Integration: OTA flow
- Regression: Sensor data integrity
- Field: 100 devices pilot

---

**Document:** SOP_FW_V9_2.md
**Version:** 1.0
**Date:** 2026-04-25

(End of file - total 122 lines)