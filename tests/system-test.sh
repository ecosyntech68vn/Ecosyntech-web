#!/bin/bash
# ==============================================
#  EcoSynTech System Test Suite
#  Kiểm tra toàn bộ hệ thống vận hành
# ==============================================

echo "========================================="
echo "  🧪 ECO SYNTECH - SYSTEM TEST"
echo "========================================="

BASE_URL="http://localhost:3000/api"
PASS=0
FAIL=0

# Test helper
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo "✅ PASS (HTTP $response)"
        PASS=$((PASS+1))
    else
        echo "❌ FAIL (HTTP $response)"
        FAIL=$((FAIL+1))
    fi
}

echo ""
echo "=== 1. CORE API TESTS ==="

test_endpoint "Health check" "$BASE_URL/health"
test_endpoint "Version" "$BASE_URL/version"
test_endpoint "i18n languages" "$BASE_URL/i18n/languages"

echo ""
echo "=== 2. DEVICE TESTS ==="

test_endpoint "Device list" "$BASE_URL/devices"
test_endpoint "Sensor list" "$BASE_URL/sensors"

echo ""
echo "=== 3. FARM OPERATIONS ==="

test_endpoint "Farm list" "$BASE_URL/farms"
test_endpoint "Dashboard overview" "$BASE_URL/dashboard/overview"

echo ""
echo "=== 4. RULES & AUTOMATION ==="

test_endpoint "Rule list" "$BASE_URL/rules"

echo ""
echo "=== 5. ALERTS & MONITORING ==="

test_endpoint "Alert list" "$BASE_URL/alerts"
test_endpoint "Stats" "$BASE_URL/stats"

echo ""
echo "=== 6. SECURITY ==="

test_endpoint "Security status" "$BASE_URL/security-status/status"

echo ""
echo "=== 7. TRACEBILITY ==="

test_endpoint "Batch list" "$BASE_URL/traceability/batches"

echo ""
echo "=== 8. BACKUP ==="

test_endpoint "Backup list" "$BASE_URL/backup/list"

echo ""
echo "========================================="
echo "  📊 TEST RESULTS"
echo "========================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 All tests PASSED!"
    exit 0
else
    echo "⚠️  Some tests FAILED!"
    exit 1
fi