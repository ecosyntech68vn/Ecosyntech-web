#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
echo "=== API Test Suite ==="

# Health
echo "[STEP] Health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
echo "Health HTTP status: $HTTP_CODE"
curl -sS "$BASE_URL/api/health"

# Public sensors
echo "[STEP] Sensors"
cURL_SENSORS=$(curl -sS "$BASE_URL/api/sensors" || true)
echo "$cURL_SENSORS" || true

# Public devices
echo "[STEP] Devices"
cURL_DEVICES=$(curl -sS "$BASE_URL/api/devices" || true)
echo "$cURL_DEVICES" || true

# Auth: register (basic)
echo "[STEP] Register test user"
curl -sS -X POST -H "Content-Type: application/json" -d '{"email":"test.user@example.com","password":"test123","name":"Test User","role":"user"}' "$BASE_URL/api/auth/register" || true

# Auth: login
echo "[STEP] Login test user"
RESPONSE=$(curl -sS -X POST -H "Content-Type: application/json" -d '{"email":"test.user@example.com","password":"test123"}' "$BASE_URL/api/auth/login" || true)
echo "Login response: $RESPONSE"

echo "=== End of API Test ==="
