#!/bin/bash

# ============================================
# EcoSynTech IoT Platform - Setup Script
# ============================================

set -e

echo "═══════════════════════════════════════════════════════"
echo "   EcoSynTech IoT Platform - Setup Wizard"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt!"
    echo "   Vui lòng cài Node.js 18+ trước:"
    echo "   https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm chưa được cài đặt!"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm: $NPM_VERSION"
echo ""

# Install dependencies
echo "📦 Đang cài đặt dependencies..."
npm install
echo ""

# Create data directory
echo "📁 Tạo thư mục data..."
mkdir -p data
echo ""

# Setup environment file
echo "⚙️  Cấu hình môi trường..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Đã tạo file .env từ .env.example"
        echo ""
        echo "⚠️  VUI LÒNG CHỈNH SỬA FILE .env!"
        echo "   Cấu hình quan trọng cần đặt:"
        echo "   - JWT_SECRET"
        echo "   - TELEGRAM_BOT_TOKEN (nếu dùng Telegram)"
        echo "   - TELEGRAM_ALLOWED_CHAT_IDS"
        echo ""
    else
        cat > .env << 'EOF'
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=change-this-to-a-random-secret-key
JWT_EXPIRES_IN=24h

# ============================================
# HMAC SECURITY (for ESP32)
# ============================================
HMAC_SECRET=CEOTAQUANGTHUAN_TADUYANH_CTYTNHHDUYANH_ECOSYNTECH_2026

# ============================================
# TELEGRAM BOT CONFIGURATION
# ============================================
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_ALLOWED_CHAT_IDS=

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
EOF
        echo "✅ Đã tạo file .env với cấu hình mặc định"
        echo ""
    fi
else
    echo "✅ File .env đã tồn tại"
    echo ""
fi

# Create scripts directory and make scripts executable
echo "🔧 Cấu quyền thực thi cho scripts..."
chmod +x scripts/*.js scripts/*.sh 2>/dev/null || true
echo ""

# Run tests
echo "🧪 Đang chạy tests..."
npm test 2>/dev/null || echo "⚠️  Tests failed, nhưng tiếp tục setup..."
echo ""

# Build
echo "🏗️  Đang build..."
npm run build 2>/dev/null || echo "⚠️  Build warnings (có thể bỏ qua)..."
echo ""

echo "═══════════════════════════════════════════════════════"
echo "   ✅ SETUP HOÀN TẤT!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🚀 Để khởi động server:"
echo "   npm start"
echo ""
echo "🔄 Để khởi động chế độ phát triển (hot-reload):"
echo "   npm run dev"
echo ""
echo "🤖 Để chạy Telegram IoT Controller:"
echo "   npm run telegram"
echo ""
echo "📖 Xem hướng dẫn chi tiết:"
echo "   cat SETUP_GUIDE.md"
echo ""
echo "⚠️  NHỚ CHỈNH SỬA FILE .env TRƯỚC KHI CHẠY!"
echo "═══════════════════════════════════════════════════════"
