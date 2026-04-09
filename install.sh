#!/bin/bash

# =====================================================
#   EcoSynTech IoT Platform - Auto Installer
#   Version: 2.0.0
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ecosyntech"
INSTALL_DIR="${PWD}"
LOG_FILE="${INSTALL_DIR}/install.log"

# =====================================================
#   Helper Functions
# =====================================================

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

header() {
    echo ""
    echo -e "${BLUE}=====================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=====================================================${NC}"
}

# =====================================================
#   Prerequisites Check
# =====================================================

check_prerequisites() {
    header "Kiểm tra yêu cầu hệ thống"
    
    local missing=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node -v)
        log "Node.js: ${node_version}"
        
        # Check version >= 18
        local major=$(echo $node_version | cut -d'.' -f1 | tr -d 'v')
        if [ "$major" -lt 18 ]; then
            error "Node.js version phải >= 18.0.0"
            missing=1
        fi
    else
        error "Node.js chưa được cài đặt!"
        missing=1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm -v)
        log "npm: ${npm_version}"
    else
        error "npm chưa được cài đặt!"
        missing=1
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        local git_version=$(git --version)
        log "Git: ${git_version}"
    else
        warn "Git chưa được cài đặt (không bắt buộc)"
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version)
        log "Docker: ${docker_version}"
        DOCKER_AVAILABLE=1
    else
        warn "Docker chưa được cài đặt (tùy chọn)"
        DOCKER_AVAILABLE=0
    fi
    
    if [ "$missing" -eq 1 ]; then
        error "Thiếu yêu cầu bắt buộc. Vui lòng cài đặt trước."
        exit 1
    fi
    
    success "Tất cả yêu cầu đã được đáp ứng!"
}

# =====================================================
#   Configuration
# =====================================================

configure_system() {
    header "Cấu hình hệ thống"
    
    echo ""
    log "Nhấn Enter để sử dụng giá trị mặc định [trong ngoặc]"
    echo ""
    
    # Port
    read -p "Port cho server [3000]: " USER_PORT
    PORT="${USER_PORT:-3000}"
    
    # JWT Secret
    read -p "JWT Secret (để trống = tự động tạo): " USER_JWT_SECRET
    if [ -z "$USER_JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    else
        JWT_SECRET="$USER_JWT_SECRET"
    fi
    
    # Environment
    read -p "Môi trường (development/production) [development]: " USER_ENV
    NODE_ENV="${USER_ENV:-development}"
    
    # CORS Origin
    read -p "CORS Origin (URL frontend, * = mọi nơi) [*]: " USER_CORS
    CORS_ORIGIN="${USER_CORS:-*}"
    
    # Admin Email
    read -p "Email admin mặc định [admin@ecosyntech.vn]: " ADMIN_EMAIL
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ecosyntech.vn}"
    
    # Admin Password
    read -s -p "Password admin (để trống = tự động tạo): " ADMIN_PASSWORD
    echo ""
    if [ -z "$ADMIN_PASSWORD" ]; then
        ADMIN_PASSWORD=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%' | fold -w 20 | head -n 1)
    fi
    
    # Display configuration summary
    echo ""
    log "=== Tóm tắt cấu hình ==="
    echo "  Port:           ${PORT}"
    echo "  Environment:    ${NODE_ENV}"
    echo "  CORS Origin:    ${CORS_ORIGIN}"
    echo "  Admin Email:    ${ADMIN_EMAIL}"
    echo "  JWT Secret:     ${JWT_SECRET:0:20}..."
    echo "  Admin Password: ${ADMIN_PASSWORD:0:10}..."
    echo ""
    
    read -p "Xác nhận cấu hình? [Y/n]: " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        error "Hủy cài đặt."
        exit 0
    fi
}

# =====================================================
#   Create Environment File
# =====================================================

create_env_file() {
    header "Tạo file cấu hình"
    
    cat > .env << EOF
# =====================================================
#   EcoSynTech IoT Platform - Environment Configuration
# =====================================================

# Server Configuration
PORT=${PORT}
NODE_ENV=${NODE_ENV}
LOG_LEVEL=info

# Database
DB_PATH=./data/ecosyntech.db

# JWT Authentication
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=${CORS_ORIGIN}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Webhooks
WEBHOOK_SECRET=${JWT_SECRET}

# =====================================================
#   IMPORTANT: Lưu lại thông tin này!
# =====================================================
# Admin Email: ${ADMIN_EMAIL}
# Admin Password: ${ADMIN_PASSWORD}
# =====================================================
EOF
    
    success "Đã tạo file .env"
    log "File cấu hình: ${INSTALL_DIR}/.env"
}

# =====================================================
#   Install Dependencies
# =====================================================

install_dependencies() {
    header "Cài đặt dependencies"
    
    if [ -d "node_modules" ]; then
        warn "node_modules đã tồn tại. Xóa và cài lại? [y/N]: "
        read -t 5 -n 1 -r && echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf node_modules package-lock.json
        fi
    fi
    
    log "Đang cài đặt npm packages..."
    npm install 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        success "Cài đặt dependencies thành công!"
    else
        error "Cài đặt dependencies thất bại!"
        exit 1
    fi
}

# =====================================================
#   Initialize Database
# =====================================================

init_database() {
    header "Khởi tạo Database"
    
    mkdir -p data
    mkdir -p logs
    
    log "Tạo thư mục data/ và logs/"
    
    # Create admin user
    log "Tạo tài khoản admin..."
    
    # Start server briefly to initialize
    timeout 10 node server.js > /dev/null 2>&1 || true
    
    # Give time for DB to initialize
    sleep 2
    
    success "Database đã được khởi tạo!"
}

# =====================================================
#   Create systemd service (Linux)
# =====================================================

create_systemd_service() {
    if [ ! -f /etc/systemd/system/ecosyntech.service ]; then
        header "Tạo systemd service (Linux)"
        
        sudo tee /etc/systemd/system/ecosyntech.service > /dev/null << EOF
[Unit]
Description=EcoSynTech IoT Platform
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:${INSTALL_DIR}/logs/ecosyntech.log
StandardError=append:${INSTALL_DIR}/logs/ecosyntech-error.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable ecosyntech
        
        success "Systemd service đã được tạo!"
        log "Sử dụng: sudo systemctl start ecosyntech"
    else
        warn "Systemd service đã tồn tại"
    fi
}

# =====================================================
#   Setup Firewall
# =====================================================

setup_firewall() {
    if command -v ufw &> /dev/null; then
        header "Cấu hình Firewall"
        
        echo "Mở port ${PORT} trên firewall? [Y/n]: "
        read -t 10 -n 1 -r && echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            sudo ufw allow ${PORT}/tcp
            sudo ufw reload
            success "Firewall đã được cấu hình!"
        fi
    fi
}

# =====================================================
#   Test Installation
# =====================================================

test_installation() {
    header "Kiểm tra cài đặt"
    
    log "Khởi động server để kiểm tra..."
    
    # Start server in background
    node server.js &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test health endpoint
    if curl -s http://localhost:${PORT}/api/health > /dev/null 2>&1; then
        success "Server hoạt động tốt!"
        
        # Get server response
        echo ""
        log "=== Health Check ==="
        curl -s http://localhost:${PORT}/api/health | head -5
        echo ""
        
        echo ""
        log "=== Stats ==="
        curl -s http://localhost:${PORT}/api/stats | head -3
        echo ""
    else
        warn "Server chưa phản hồi, có thể cần thêm thời gian..."
        sleep 3
        curl -s http://localhost:${PORT}/api/health || true
    fi
    
    # Stop test server
    kill $SERVER_PID 2>/dev/null || true
}

# =====================================================
#   Generate Credentials File
# =====================================================

save_credentials() {
    header "Lưu thông tin đăng nhập"
    
    cat > .credentials << EOF
# =====================================================
#   EcoSynTech IoT Platform - Thông tin đăng nhập
#   Generated: $(date)
# =====================================================

## Admin Account
Email: ${ADMIN_EMAIL}
Password: ${ADMIN_PASSWORD}

## Server
URL: http://localhost:${PORT}
API: http://localhost:${PORT}/api

## Configuration
Port: ${PORT}
Environment: ${NODE_ENV}
Database: ${INSTALL_DIR}/data/ecosyntech.db

## WebSocket
Endpoint: ws://localhost:${PORT}/ws

## Log Files
Application: ${INSTALL_DIR}/logs/
System Log: ${INSTALL_DIR}/logs/ecosyntech.log
Error Log: ${INSTALL_DIR}/logs/ecosyntech-error.log

## Quick Commands
- Start: npm start
- Restart: sudo systemctl restart ecosyntech
- Logs: tail -f logs/ecosyntech.log

## API Endpoints
- GET  /api/health      - Health check
- GET  /api/sensors     - List sensors
- GET  /api/devices     - List devices
- GET  /api/rules       - List rules
- GET  /api/schedules   - List schedules
- GET  /api/stats       - System stats
- POST /api/auth/login  - Login

# =====================================================
EOF
    
    chmod 600 .credentials
    success "Đã lưu thông tin vào .credentials"
}

# =====================================================
#   Print Summary
# =====================================================

print_summary() {
    header "Hoàn tất cài đặt!"
    
    echo ""
    echo -e "${GREEN}=====================================================${NC}"
    echo -e "${GREEN}  EcoSynTech IoT Platform đã được cài đặt!${NC}"
    echo -e "${GREEN}=====================================================${NC}"
    echo ""
    echo "  📁 Thư mục: ${INSTALL_DIR}"
    echo "  🔌 Port: ${PORT}"
    echo "  🌐 URL: http://localhost:${PORT}"
    echo ""
    echo "  👤 Tài khoản Admin:"
    echo "     Email: ${ADMIN_EMAIL}"
    echo "     Password: ${ADMIN_PASSWORD}"
    echo ""
    echo "  📄 File cấu hình: .env"
    echo "  🔑 File credentials: .credentials"
    echo ""
    echo "  === Quick Start ==="
    echo "  npm start           # Chạy server"
    echo "  npm run dev         # Chạy development mode"
    echo "  npm run lint        # Kiểm tra code"
    echo ""
    echo "  === Linux Service ==="
    echo "  sudo systemctl start ecosyntech"
    echo "  sudo systemctl status ecosyntech"
    echo "  sudo journalctl -u ecosyntech -f"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Lưu thông tin đăng nhập từ file .credentials!${NC}"
    echo ""
}

# =====================================================
#   Main Installation
# =====================================================

main() {
    clear
    
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}                                                      ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}     ${GREEN}EcoSynTech IoT Platform - Auto Installer${NC}     ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}                     ${YELLOW}Version 2.0.0${NC}                    ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}                                                      ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Check if running as root for certain operations
    if [ "$EUID" -eq 0 ]; then
        warn "Đang chạy với quyền root. Một số thao tác có thể yêu cầu xác nhận."
    fi
    
    # Start installation
    check_prerequisites
    configure_system
    create_env_file
    install_dependencies
    init_database
    
    # Optional: systemd service (Linux only)
    if [ "$(uname)" = "Linux" ] && [ "$EUID" -ne 0 ]; then
        echo ""
        read -p "Tạo systemd service để chạy tự động? [y/N]: " CREATE_SERVICE
        if [[ "$CREATE_SERVICE" =~ ^[Yy]$ ]]; then
            create_systemd_service
            setup_firewall
        fi
    elif [ "$(uname)" = "Linux" ] && [ "$EUID" -eq 0 ]; then
        create_systemd_service
        setup_firewall
    fi
    
    test_installation
    save_credentials
    print_summary
}

# Run main function
main "$@"
