# 🚀 ECOSYNTECH FARM OS
## Nền Tảng Nông Nghiệp Thông Minh 4.0

Hệ thống IoT nông nghiệp thông minh toàn diện với **64 skills tự động hóa**, **QR Code Traceability**, **AI RAG**, **ROI Calculator** và **SQLite IoT Optimizer**.

---

## 📋 TỔNG QUAN

### Tính năng cốt lõi

| Tính năng | Mô tả |
|-----------|-------|
| **64 Skills tự động** | Quản lý, vận hành, giám sát, tự sửa lỗi |
| **QR Traceability** | Truy xuất nguồn gốc từ gieo trồng đến xuất bán |
| **Aptos Blockchain** | Ghi hash (bật/tắt tùy chọn) |
| **i18n đa ngôn ngữ** | Tiếng Việt, English, 中文 |
| **Tối ưu RAM thấp** | Chạy được trên 512MB RAM, Windows 7+ |

### Kết nối

- REST API với tài liệu Swagger
- WebSocket cho cập nhật thời gian thực
- MQTT integration
- Webhook support

### Bảo mật & Quản trị

- JWT Authentication
- RBAC (Role-Based Access Control)
- Rate Limiting
- Audit Trail
- Secrets checking

---

## 🚀 CÀI ĐẶT

### Yêu cầu hệ thống

- Node.js 14+
- 512MB RAM tối thiểu

### Các bước cài đặt

```bash
# 1. Clone dự án
git clone https://github.com/ecosyntech68vn/Ecosyntech-web

# 2. Di chuyển vào thư mục
cd Ecosyntech-web

# 3. Cài đặt dependencies
npm install

# 4. Cấu hình (tùy chọn)
cp .env.example .env
# Chỉnh sửa .env nếu cần

# 5. Chạy server
npm start
```

---

## ⚙️ CẤU HÌNH MÔI TRƯỜNG

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/ecosyntech.db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# MQTT (tùy chọn)
MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_USERNAME=
MQTT_PASSWORD=

# Blockchain (bật/tắt)
BLOCKCHAIN_ENABLED=false
BLOCKCHAIN_TYPE=aptos
APTOS_NETWORK=testnet

# QR Code
QR_CODE_ENABLED=true
QR_CODE_BASE_URL=https://ecosyntech.com

# Scheduler
OPS_SCHEDULER_DISABLED=false
OPS_SCHEDULER_INTERVAL=600000
```

---

## 📜 SCRIPTS

```bash
npm start          # Chạy server production
npm run dev        # Chạy development với hot reload
npm run test      # Chạy tests
npm run lint      # ESLint
```

---

## 🔌 API ENDPOINTS

### Cảm biến (Sensors)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/sensors` | Danh sách cảm biến |
| GET | `/api/sensors/:type` | Chi tiết cảm biến |

### Thiết bị (Devices)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/devices` | Danh sách thiết bị |
| POST | `/api/devices` | Thêm thiết bị |
| PUT | `/api/devices/:id` | Cập nhật thiết bị |
| DELETE | `/api/devices/:id` | Xóa thiết bị |

### Quy tắc (Rules)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/rules` | Danh sách quy tắc |
| POST | `/api/rules` | Tạo quy tắc |
| PUT | `/api/rules/:id` | Cập nhật quy tắc |

### Truy xuất nguồn gốc (Traceability)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/traceability/batch` | Tạo lô + QR |
| GET | `/api/traceability/batch/:code` | Truy xuất lô |
| POST | `/api/traceability/batch/:code/stage` | Thêm giai đoạn |
| POST | `/api/traceability/batch/:code/harvest` | Thu hoạch |
| POST | `/api/traceability/batch/:code/export` | Xuất bán |
| POST | `/api/traceability/batch/:code/certify` | Chứng nhận |
| GET | `/api/traceability/batch/:code/full` | Timeline đầy đủ |
| GET | `/api/traceability/batch/:code/qr` | Lấy QR code |
| GET | `/api/traceability/batch/:code/label` | Nhãn in được |
| POST | `/api/traceability/scan` | Scan QR kiểm tra |
| GET | `/api/traceability/verify/:code` | Verify hash |
| GET | `/api/traceability/export/pdf` | Export PDF |
| GET | `/api/traceability/export/excel` | Export Excel |

### Hệ thống (System)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/stats` | Thống kê hệ thống |
| GET | `/api/alerts` | Cảnh báo |
| GET | `/api/docs` | Tài liệu Swagger |

---

## ⚙️ HỆ THỐNG SKILLS

### Danh mục skills

| Danh mục | Skills | Mô tả |
|----------|--------|-------|
| **drift** | version-drift, config-drift | Giám sát thay đổi version/config |
| **network** | ws-heartbeat, mqtt-watch | Kết nối mạng |
| **data** | alert-deduper, incident-correlator | Xử lý dữ liệu |
| **diagnosis** | route-mapper, webhook-correlator, anomaly-classifier, device-state-diff, kpi-drift, root-cause-hint | Chẩn đoán lỗi |
| **selfheal** | retry-job, reconnect-bridge, reset-device, clear-cache, rollback-ota, auto-acknowledge | Tự sửa lỗi |
| **orchestration** | rules-engine, schedules-engine, webhook-dispatch, command-router, ota-orchestrator, report-export | Điều phối |
| **governance** | rbac-guard, audit-trail, secrets-check, tenant-isolation, rate-limit-guard, approval-gate-advanced | Quản trị |
| **analysis** | root-cause-analyzer, auto-backup, anomaly-predictor, system-health-scorer | Phân tích |
| **recovery** | auto-restore | Khôi phục |
| **security** | vuln-scanner | Bảo mật |
| **defense** | intrusion-detector | Phòng thủ |
| **communication** | telegram-notifier, report-generator, voice-notifier, language-switcher, voice-assistant | Giao tiếp |
| **agriculture** | weather-decision, water-optimization, crop-growth-tracker, pest-alert, fertilizer-scheduler | Nông nghiệp |
| **iot** | energy-saver, predictive-maintenance, multi-farm-manager | Thiết bị IoT |
| **maintenance** | cleanup-agent, log-rotator, db-optimizer | Bảo trì |
| **ai** | ai-predict-weather, ai-inference | AI dự đoán & inference |
| **traceability** | qr-traceability, aptos-blockchain, aptos-integration | QR + Blockchain |

---

## 🔄 LUỒNG TRUY XUẤT NGUỒN GỐC

```
1. Tạo batch → QR Code tự động
       ↓
2. Gieo trồng → Stage 1 (planting)
       ↓
3. Chăm sóc → Stage 2-N (growing)
       ↓
4. Thu hoạch → harvest event → Blockchain hash
       ↓
5. Đóng gói → Stage (processing, packaging)
       ↓
6. Vận chuyển → Stage (transport, storage)
       ↓
7. Xuất bán → export event → Blockchain hash
       ↓
8. Chứng nhận → certify event → Blockchain hash
```

---

## ⛓️ BLOCKCHAIN

### Cấu hình

```bash
# Bật blockchain (Aptos)
BLOCKCHAIN_ENABLED=true

# Tắt (mặc định)
BLOCKCHAIN_ENABLED=false
```

Khi bật, các sự kiện sau sẽ được ghi hash lên blockchain:
- `traceability.harvest` - Khi thu hoạch
- `traceability.export` - Khi xuất bán
- `traceability.certify` - Khi thêm chứng nhận

---

## 🌐 i18n - ĐA NGÔN NGỮ

Hỗ trợ: Tiếng Việt (vi), English (en), 中文 (zh)

Đổi ngôn ngữ qua:
- Header `Accept-Language`
- Event trigger `language-change`

---

## ⚡ TỐI ƯU HIỆU NĂNG

Tự động điều chỉnh theo RAM:

| RAM | Scheduler Interval | Backup Interval | Heartbeat |
|-----|-------------------|-----------------|-----------|
| >= 2GB | 10 phút | 3 giờ | 60s |
| 1-2GB | 30 phút | 6 giờ | 120s |
| < 1GB | 60 phút | 12 giờ | 300s |

---

## 🐳 DOCKER (TÙY CHỌN)

```bash
# Build
docker build -t ecosyntech .

# Run
docker run -p 3000:3000 -v ./data:/app/data ecosyntech
```

---

## 🧪 TESTING

```bash
# Test tất cả skills
node scripts/test-skills.js

# Test tính năng cụ thể
node manage.js status
```

---

## 📄 LICENSE

MIT License - EcoSynTech 2026

---

**ECOSYNTECH FARM OS**  
*"Nông nghiệp thông minh - Cho nông dân, cho mọi người"*

🌱🚀 **"Cắm là chạy!"** 🚀🌱