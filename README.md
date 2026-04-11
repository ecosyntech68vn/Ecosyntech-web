# EcoSynTech IoT Platform

Hệ thống IoT toàn diện cho nông nghiệp thông minh - **Version 2.0.0**

## Tính năng chính

### Backend (Node.js + Express)
- **REST API** đầy đủ với validation và error handling
- **WebSocket** cho cập nhật thời gian thực
- **SQLite Database** với sql.js (pure JavaScript, không cần compile)
- **JWT Authentication** và User Management
- **Rate Limiting** và Security (Helmet, CORS)
- **Webhook Integration** với signature verification
- **Structured Architecture** (Routes, Middleware, Config)

### Frontend (Vanilla JS)
- **Dark/Light Mode** với system preference detection
- **Real-time Updates** qua WebSocket
- **Push Notifications** cho cảnh báo
- **Toast Notifications** cho UX tốt hơn
- **Responsive Design** cho mobile

### DevOps
- **Docker** + **Docker Compose**
- **CI/CD Pipeline** với GitHub Actions
- **Auto-installer Script** cho Linux/Mac/Windows

---

## Cài đặt nhanh

### 🐧 Linux / macOS

```bash
# Clone hoặc cd vào thư mục project
cd Ecosyntech-web

# Cấp quyền và chạy installer
chmod +x install.sh
./install.sh
```

Installer sẽ hỏi bạn:
- **Port server** (mặc định: 3000)
- **JWT Secret** (tự động tạo nếu để trống)
- **Môi trường** (development/production)
- **CORS Origin**
- **Tài khoản admin**

### 🪟 Windows

```batch
# Clone hoặc cd vào thư mục project
cd Ecosyntech-web

# Chạy installer (cần chạy với quyền Administrator)
install.bat
```

### 📦 Manual Installation

```bash
# 1. Clone repository
git clone https://github.com/ecosyntech68vn/Ecosyntech-web.git
cd Ecosyntech-web

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env
cp .env.example .env
# Chỉnh sửa .env theo nhu cầu

# 4. Khởi động server
npm start
```

---

## Cấu hình

### Environment Variables

Tạo file `.env` trong thư mục gốc:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/ecosyntech.db

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Webhooks
WEBHOOK_SECRET=your-webhook-secret
```

---

## Chạy hệ thống

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Với Docker
```bash
docker-compose up -d
```

---

## API Endpoints

### Authentication
```
POST /api/auth/register - Đăng ký user mới
POST /api/auth/login    - Đăng nhập
GET  /api/auth/me       - Lấy thông tin user hiện tại
```

### Sensors
```
GET  /api/sensors           - Lấy tất cả sensors
GET  /api/sensors/:type     - Lấy sensor theo type
POST /api/sensors/update    - Cập nhật giá trị sensor
```

### Devices
```
GET    /api/devices              - Lấy tất cả thiết bị
GET    /api/devices/:id          - Lấy thiết bị theo ID
POST   /api/devices              - Tạo thiết bị mới
PUT    /api/devices/:id/config   - Cập nhật cấu hình
POST   /api/devices/:id/command  - Gửi lệnh đến thiết bị
DELETE /api/devices/:id          - Xóa thiết bị
```

### Rules (Automation)
```
GET    /api/rules           - Lấy tất cả rules
POST   /api/rules            - Tạo rule mới
PUT    /api/rules/:id        - Cập nhật rule
DELETE /api/rules/:id        - Xóa rule
POST   /api/rules/:id/toggle - Bật/tắt rule
```

### Schedules
```
GET    /api/schedules           - Lấy tất cả lịch
POST   /api/schedules            - Tạo lịch mới
PUT    /api/schedules/:id        - Cập nhật lịch
DELETE /api/schedules/:id        - Xóa lịch
POST   /api/schedules/:id/toggle - Bật/tắt lịch
```

### Alerts
```
GET    /api/alerts                 - Lấy tất cả alerts
POST   /api/alerts                 - Tạo alert mới
POST   /api/alerts/:id/acknowledge - Xác nhận alert
POST   /api/alerts/acknowledge-all - Xác nhận tất cả alerts
DELETE /api/alerts/:id             - Xóa alert
```

### System
```
GET  /api/health    - Health check
GET  /api/stats      - System statistics
POST /api/export     - Export all data
POST /api/import     - Import data
```

### Webhooks
```
POST /api/webhooks/sensor-alert   - Sensor alert webhook
POST /api/webhooks/device-status  - Device status webhook
POST /api/webhooks/rule-triggered - Rule triggered webhook
POST /api/webhooks/schedule-run   - Schedule run webhook
```

### WebSocket
```
Endpoint: /ws

Client Messages:
- { type: "auth", token: "jwt-token" }
- { type: "subscribe", topics: ["sensors", "alerts"] }
- { type: "ping" }

Server Messages:
- { type: "sensor-update", data: {...} }
- { type: "alert", action: "created", data: {...} }
- { type: "device-update", data: {...} }
```

---

## Kiến trúc

```
ecosyntech-web/
├── server.js              # Main server entry
├── src/
│   ├── config/           # Configuration
│   │   ├── index.js      # Environment config
│   │   ├── logger.js    # Winston logger
│   │   └── database.js   # SQLite setup (sql.js)
│   ├── middleware/        # Express middleware
│   │   ├── auth.js       # JWT authentication
│   │   ├── errorHandler.js
│   │   └── validation.js  # Joi validation
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   ├── sensors.js
│   │   ├── devices.js
│   │   ├── rules.js
│   │   ├── schedules.js
│   │   ├── history.js
│   │   ├── alerts.js
│   │   ├── webhooks.js
│   │   └── stats.js
│   └── websocket/       # WebSocket handlers
│       └── index.js
├── data/                 # SQLite database (auto-created)
├── logs/                 # Application logs (auto-created)
├── install.sh           # Linux/Mac auto-installer
├── install.bat          # Windows auto-installer
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Scripts

```bash
npm start       # Chạy server production
npm run dev     # Chạy development mode (với nodemon)
npm run lint    # Kiểm tra code style
npm test        # Chạy tests
npm run build   # Kiểm tra syntax

All-In Release 2.0.0
- This release contains an all-in-one deployment package for customers (Dockerized, bootstrap automation, PR automation) and comprehensive test suites. See RELEASE_NOTES.md for full details.
```

---

## License

MIT License - EcoSynTech 2026
