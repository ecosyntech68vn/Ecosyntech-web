# 🌾 HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH
## EcoSynTech IoT Platform - Hệ thống Nông nghiệp Thông minh

**Phiên bản:** 2.0.0  
**Cập nhật:** 12/04/2026  
**Tác giả:** EcoSynTech Team

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cài đặt nhanh (Quick Start)](#3-cài-đặt-nhanh-quick-start)
4. [Cài đặt chi tiết](#4-cài-đặt-chi-tiết)
5. [Cấu hình Telegram Bot](#5-cấu-hình-telegram-bot)
6. [Điều khiển thiết bị qua Telegram](#6-điều-khiển-thiết-bị-qua-telegram)
7. [Tích hợp ESP32](#7-tích-hợp-esp32)
8. [Triển khai Docker](#8-triển-khai-docker)
9. [Xử lý sự cố](#9-xử-lý-sự-cố)
10. [API Reference](#10-api-reference)

---

## 1. TỔNG QUAN HỆ THỐNG

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    EcoSynTech IoT Platform                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Telegram  │    │  Web Dashboard │   │  ESP32      │   │
│  │   Bot       │    │  (HTML/CSS/JS) │   │  Devices    │   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
│         │                  │                  │           │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
│                   ┌────────▼────────┐                    │
│                   │   REST API      │                    │
│                   │   /api/*        │                    │
│                   └────────┬────────┘                    │
│                            │                              │
│         ┌─────────────────┼─────────────────┐           │
│         │                 │                 │           │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐     │
│  │  Database   │  │   MQTT      │  │  WebSocket   │     │
│  │  sql.js     │  │   Broker    │  │  Server      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Các thành phần chính

| Component | Mô tả | Port |
|-----------|--------|------|
| **API Server** | REST API backend | 3000 |
| **Web Dashboard** | Giao diện IoT | 80/3000 |
| **MQTT Broker** | Mosquitto broker | 1883 |
| **WebSocket** | Real-time updates | 3000/ws |
| **Telegram Bot** | Điều khiển bằng chat | - |
| **Nginx** | Reverse proxy | 80, 443 |

---

## 2. YÊU CẦU HỆ THỐNG

### Phần cứng tối thiểu
- **CPU**: 2 cores
- **RAM**: 2GB (4GB khuyến nghị)
- **Ổ cứng**: 5GB trống

### Phần mềm cần thiết

#### Option A: Native Installation
- **Node.js**: v18 LTS hoặc cao hơn
- **Git**: Phiên bản mới nhất
- **npm**: v8 trở lên

#### Option B: Docker (Khuyến nghị)
- **Docker Engine**: 20.10+
- **Docker Compose**: 2.0+

### Hệ điều hành hỗ trợ
- ✅ Ubuntu 20.04/22.04
- ✅ Debian 11+
- ✅ macOS 12+
- ✅ Windows 10/11 (with WSL2)

---

## 3. CÀI ĐẶT NHANH (QUICK START)

### 3.1 Clone dự án

```bash
# Clone từ GitHub
git clone https://github.com/ecosyntech68vn/Ecosyntech-web.git
cd Ecosyntech-web

# Hoặc tải ZIP và giải nén
```

### 3.2 Cài đặt với 1 lệnh

```bash
# Chạy script cài đặt tự động
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3.3 Khởi động nhanh

```bash
# Cài dependencies
npm install

# Copy và cấu hình .env
cp .env.example .env

# Chạy server
npm start

# Mở trình duyệt: http://localhost:3000
```

**🎉 Hoàn tất! Hệ thống đã chạy.**

---

## 4. CÀI ĐẶT CHI TIẾT

### 4.1 Cài đặt Node.js

#### Ubuntu/Debian:
```bash
# Cài qua nvm (khuyến nghị)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node --version  # v18.x.x

# Hoặc cài trực tiếp
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### macOS:
```bash
# Dùng Homebrew
brew install node@18

# Hoặc tải từ nodejs.org
# https://nodejs.org/
```

#### Windows:
```powershell
# Dùng Chocolatey
choco install nodejs --version=18

# Hoặc tải MSI từ https://nodejs.org/
```

### 4.2 Clone và cài đặt

```bash
# Clone dự án
git clone https://github.com/ecosyntech68vn/Ecosyntech-web.git
cd Ecosyntech-web

# Cài dependencies
npm install

# Kiểm tra cài đặt
npm --version    # 8.x.x+
node --version   # v18.x.x
```

### 4.3 Cấu hình môi trường

Tạo file `.env` trong thư mục gốc:

```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa file .env
nano .env
```

**Nội dung file `.env`:**

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# ============================================
# HMAC SECURITY (for ESP32)
# ============================================
HMAC_SECRET=CEOTAQUANGTHUAN_TADUYANH_CTYTNHHDUYANH_ECOSYNTECH_2026

# ============================================
# TELEGRAM BOT CONFIGURATION
# ============================================
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALLOWED_CHAT_IDS=12345678,98765432
TELEGRAM_WEBHOOK_URL=

# ============================================
# MQTT BROKER
# ============================================
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_PORT=1883
MQTT_WS_PORT=8080

# ============================================
# DATABASE
# ============================================
DB_PATH=./data/ecosyntech.db

# ============================================
# API BASE URL (for Telegram bot)
# ============================================
API_BASE_URL=http://localhost:3000

# ============================================
# NOTIFICATIONS (Optional)
# ============================================
TELEGRAM_NOTIFY_TOKEN=
TELEGRAM_NOTIFY_CHAT_ID=
SLACK_WEBHOOK_URL=
```

### 4.4 Khởi động server

```bash
# Chế độ Development (với hot-reload)
npm run dev

# Chế độ Production
npm start

# Chạy tests
npm test
```

### 4.5 Kiểm tra hoạt động

```bash
# Test API health
curl http://localhost:3000/api/health

# Kết quả mong đợi:
# {"status":"healthy","timestamp":"2026-04-12T00:00:00.000Z","uptime":10.5,"environment":"development","version":"2.0.0"}

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 5. CẤU HÌNH TELEGRAM BOT

### 5.1 Tạo Telegram Bot

1. **Mở Telegram** và tìm **@BotFather**

2. **Gửi lệnh** để tạo bot mới:
   ```
   /newbot
   ```

3. **Nhập tên bot** (VD: EcoSynTech Controller)

4. **Nhập username bot** (phải kết thúc bằng `bot`, VD: `ecosyntech_iot_bot`)

5. **BotFather sẽ cấp cho bạn**:
   - `BOT_TOKEN` - Copy ngay!
   - Link để truy cập bot: `t.me/ecosyntech_iot_bot`

### 5.2 Lấy Chat ID

**Cách 1: Dùng @userinfobot**
1. Mở Telegram, tìm **@userinfobot**
2. Gửi tin nhắn bất kỳ
3. Bot sẽ reply **Your user ID:**

**Cách 2: Dùng @RawDataBot**
1. Thêm **@RawDataBot** vào nhóm
2. Gửi tin nhắn trong nhóm
3. Bot sẽ hiển thị **chat id** (là số âm cho nhóm)

### 5.3 Cấu hình trong .env

```env
# Token từ BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Chat ID của bạn (hoặc nhóm Telegram)
TELEGRAM_ALLOWED_CHAT_IDS=-1001234567890

# Nếu dùng webhook (tùy chọn)
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook
```

### 5.4 Khởi động Telegram Bot

```bash
# Chạy Telegram IoT Controller
npm run telegram

# Hoặc trực tiếp
node scripts/telegram-iot-controller.js
```

### 5.5 Thêm Bot vào nhóm

1. Mở nhóm Telegram của bạn
2. Click **Add Member**
3. Tìm và thêm bot (VD: `@ecosyntech_iot_bot`)
4. Bot sẽ hoạt động trong nhóm!

---

## 6. ĐIỀU KHIỂN THIẾT BỊ QUA TELEGRAM

### 6.1 Các lệnh có sẵn

| Lệnh | Mô tả | Ví dụ |
|------|--------|-------|
| `/start` | Xem hướng dẫn | /start |
| `/status` | Trạng thái hệ thống | /status |
| `/sensors` | Dữ liệu cảm biến | /sensors |
| `/devices` | Danh sách thiết bị | /devices |
| `/rules` | Automation rules | /rules |
| `/alerts` | Cảnh báo hiện tại | /alerts |
| `/pump_on` | Bật máy bơm | /pump_on |
| `/pump_off` | Tắt máy bơm | /pump_off |
| `/valve1_on` | Mở van 1 | /valve1_on |
| `/valve1_off` | Đóng van 1 | `/valve1_off` |
| `/fan_on` | Bật quạt | /fan_on |
| `/fan_off` | Tắt quạt | /fan_off |
| `/light_on` | Bật đèn | /light_on |
| `/light_off` | Tắt đèn | /light_off |
| `/restart` | Khởi động lại ESP32 | /restart |

### 6.2 Lệnh bằng tiếng Việt

Bạn cũng có thể gõ trực tiếp:
- `bật bơm` → Bật máy bơm
- `tắt bơm` → Tắt máy bơm
- `trạng thái` → Xem trạng thái
- `cảm biến` → Xem dữ liệu cảm biến

### 6.3 Nhận thông báo tự động

Bot sẽ tự động gửi thông báo khi:
- 🚨 Cảnh báo ngưỡng cảm biến
- ⚠️ Thiết bị offline
- ✅ Rule được kích hoạt
- 📊 Báo cáo định kỳ (có thể cấu hình)

### 6.4 Ví dụ sử dụng

```
👤: /status
🤖: 🏠 Trạng Thái Hệ Thống

📊 Cảm biến: 8 
🟢 Thiết bị online: 3/5
⚙️ Rules active: 2
🚨 Cảnh báo: 0
⏱️ Server: 2.5h

🌐 API: http://localhost:3000
🕐 Cập nhật: 14:30:00

👤: /sensors
🤖: 📊 Dữ Liệu Cảm Biến

🌡️ Nhiệt độ: 28.5°C ✅ Bình thường
💧 Độ ẩm KK: 65.2% ✅ Bình thường
🌱 Độ ẩm đất: 38.5% ⚠️ Thấp
☀️ Ánh sáng: 850 ✅ Bình thường

👤: /pump_on
🤖: 🔵 Máy bơm đã bật!
```

---

## 7. TÍCH HỢP ESP32

### 7.1 Kết nối ESP32 qua MQTT

Cấu hình ESP32 kết nối đến MQTT broker:

```cpp
// ESP32 Firmware V8.5.0 Configuration
const char* mqtt_server = "your-server.com";
const int mqtt_port = 1883;
const char* mqtt_topic_base = "ecosyntech";
const char* device_id = "ESP32-001";
```

### 7.2 MQTT Topics

| Topic | Direction | Mô tả |
|-------|-----------|--------|
| `ecosyntech/{device_id}/sensor` | ESP32 → Server | Gửi dữ liệu cảm biến |
| `ecosyntech/{device_id}/command` | Server → ESP32 | Nhận lệnh điều khiển |
| `ecosyntech/{device_id}/heartbeat` | ESP32 → Server | Heartbeat định kỳ |
| `ecosyntech/{device_id}/status` | ESP32 → Server | Trạng thái thiết bị |

### 7.3 Ví dụ Payload

**Sensor Data (ESP32 → Server):**
```json
{
  "device_id": "ESP32-001",
  "firmware": "8.5.0",
  "sensors": {
    "temperature": 28.5,
    "humidity": 65.2,
    "soil": 38.5,
    "light": 850,
    "ph": 6.8,
    "ec": 2.1,
    "co2": 450
  },
  "timestamp": "2026-04-12T14:30:00Z"
}
```

**Command (Server → ESP32):**
```json
{
  "command": "relay1_on",
  "params": {
    "duration": 30
  }
}
```

### 7.4 ESP32 Webhook Integration

ESP32 có thể gửi dữ liệu qua HTTP webhook:

```cpp
// ESP32 HTTP POST example
POST /api/webhook/esp32
Content-Type: application/json
X-Signature: {hmac_sha256_signature}

{
  "device_id": "ESP32-001",
  "firmware": "8.5.0",
  "sensors": {...}
}
```

---

## 8. TRIỂN KHAI DOCKER

### 8.1 Cài đặt Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# macOS/Windows
# Tải Docker Desktop từ https://docker.com
```

### 8.2 Cấu hình docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_ALLOWED_CHAT_IDS=${TELEGRAM_ALLOWED_CHAT_IDS}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  data:
```

### 8.3 Khởi động với Docker

```bash
# Build và chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Kiểm tra trạng thái
docker-compose ps

# Restart services
docker-compose restart

# Dừng và xóa
docker-compose down
```

### 8.4 Scripts hữu ích

```bash
# Tạo script tiện ích
cat > manage.sh << 'EOF'
#!/bin/bash

case "$1" in
  start)
    docker-compose up -d
    echo "🚀 Services started!"
    ;;
  stop)
    docker-compose down
    echo "🛑 Services stopped!"
    ;;
  restart)
    docker-compose restart
    echo "🔄 Services restarted!"
    ;;
  logs)
    docker-compose logs -f
    ;;
  status)
    docker-compose ps
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status}"
    ;;
esac
EOF

chmod +x manage.sh
./manage.sh start
```

---

## 9. XỬ LÝ SỰ CỐ

### 9.1 Lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|------|-------------|-----------|
| `EADDRINUSE` | Port đã sử dụng | `lsof -i :3000` và kill process |
| `npm install` fail | Permission issue | `sudo chown -R $(whoami) node_modules` |
| Telegram bot not responding | Token sai | Kiểm tra lại `TELEGRAM_BOT_TOKEN` |
| Cannot connect to MQTT | Broker chưa chạy | `docker-compose up -d mqtt` |
| Database error | File DB bị lỗi | Xóa `data/ecosyntech.db` và restart |

### 9.2 Kiểm tra logs

```bash
# Server logs
npm start 2>&1 | tee server.log

# Telegram bot logs
node scripts/telegram-iot-controller.js 2>&1 | tee telegram.log

# Docker logs
docker-compose logs -f api
```

### 9.3 Reset hệ thống

```bash
# Xóa database
rm -rf data/

# Xóa node_modules
rm -rf node_modules package-lock.json

# Cài lại
npm install

# Chạy lại
npm start
```

### 9.4 Firewall Configuration

```bash
# Ubuntu/Debian with ufw
sudo ufw allow 3000/tcp  # API
sudo ufw allow 1883/tcp   # MQTT
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable
```

---

## 10. API REFERENCE

### Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

# Response
{
  "success": true,
  "user": {...},
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Sensors

```bash
# Get all sensors
GET /api/sensors
Authorization: Bearer {token}

# Response
[
  {
    "id": "sensor-1",
    "type": "temperature",
    "value": 28.5,
    "unit": "°C",
    "min_value": 15,
    "max_value": 40,
    "timestamp": "2026-04-12T14:30:00Z"
  },
  ...
]
```

### Devices

```bash
# Get all devices
GET /api/devices
Authorization: Bearer {token}

# Send command
POST /api/devices/{device_id}/command
Authorization: Bearer {token}
Content-Type: application/json

{
  "command": "relay1_on",
  "params": {}
}

# Response
{
  "success": true,
  "message": "Command sent",
  "device_id": "device-1"
}
```

### Rules

```bash
# Get all rules
GET /api/rules
Authorization: Bearer {token}

# Create rule
POST /api/rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Tưới khi khô",
  "enabled": true,
  "condition": {
    "sensor": "soil",
    "operator": "<",
    "value": 40
  },
  "action": {
    "type": "relay1_on",
    "target": "pump"
  }
}
```

### Webhooks

```bash
# ESP32 Webhook
POST /api/webhook/esp32
Content-Type: application/json
X-Signature: sha256={hmac_signature}

{
  "device_id": "ESP32-001",
  "firmware": "8.5.0",
  "sensors": {...}
}

# Sensor Alert Webhook
POST /api/webhooks/sensor-alert
Content-Type: application/json
X-EcoSynTech-Signature: {signature}

{
  "sensor": "temperature",
  "value": 35,
  "severity": "danger"
}
```

### Health Checks

```bash
# Health endpoint
GET /health

# Readiness endpoint
GET /readiness

# API version
GET /api/version
```

---

## LIÊN HỆ HỖ TRỢ

- **Website**: https://ecosyntech.com
- **Email**: support@ecosyntech.com
- **GitHub Issues**: https://github.com/ecosyntech68vn/Ecosyntech-web/issues
- **Documentation**: https://ecosyntech.com/docs

---

## LICENSE

MIT License - EcoSynTech © 2026

---

**Made with ❤️ by EcoSynTech Team**
