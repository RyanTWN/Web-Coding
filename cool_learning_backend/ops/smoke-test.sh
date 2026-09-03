#!/usr/bin/env bash
# 部署完成後的冒煙測試。
# 用法：bash ops/smoke-test.sh https://learning.ifit.myds.me:4061
#
# 設計原則：只測試「不需要真實學生/家長資料」就能驗證的行為——
# 服務有沒有活著、資料庫連線正常與否、保護機制有沒有正確擋下未授權存取、
# 錯誤的登入嘗試有沒有回傳合理的錯誤格式。不會創建、修改任何正式資料。

set -uo pipefail

BASE_URL="${1:-}"
if [ -z "$BASE_URL" ]; then
  echo "用法：bash ops/smoke-test.sh <API_BASE_URL，例如 https://learning.ifit.myds.me:4061>"
  exit 1
fi
BASE_URL="${BASE_URL%/}"

PASS=0
FAIL=0

check() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "✅ $description"
    PASS=$((PASS + 1))
  else
    echo "❌ $description（預期 $expected，實際 $actual）"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== 對 $BASE_URL 執行冒煙測試 ==="
echo ""

echo "--- 基本存活與資料庫連線 ---"
HEALTH_CODE=$(curl -s -o /tmp/smoke_health.json -w "%{http_code}" "$BASE_URL/api/health" --max-time 10)
check "健康檢查端點回應 200" "200" "$HEALTH_CODE"
if [ "$HEALTH_CODE" = "200" ]; then
  DB_STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/smoke_health.json','utf8')).database)" 2>/dev/null)
  check "資料庫顯示為 connected" "connected" "$DB_STATUS"
fi

echo ""
echo "--- 未授權存取應該被正確擋下（不需要真實帳號）---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/analytics" --max-time 10)
check "沒帶 token 存取管理後台 API 應回 401" "401" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/student-progress?seatNo=99999" --max-time 10)
check "沒帶 token 存取學生進度 API 應回 401" "401" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/guardian/children" -H "Content-Type: application/json" -d '{"nickname":"x"}' --max-time 10)
check "沒帶 token 存取家長子女檔案 API 應回 401" "401" "$CODE"

echo ""
echo "--- 錯誤登入應該回傳合理的錯誤格式，而不是 500 或當機 ---"
CODE=$(curl -s -o /tmp/smoke_login.json -w "%{http_code}" -X POST "$BASE_URL/api/login" -H "Content-Type: application/json" -d '{"name":"不存在的測試帳號","seatNo":"00000"}' --max-time 10)
check "用不存在的姓名/座號登入應回 401（不是 500）" "401" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/admin/login" -H "Content-Type: application/json" -d '{"username":"not-a-real-admin","password":"wrong"}' --max-time 10)
check "管理員錯誤帳密應回 401（不是 500）" "401" "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/guardian/login" -H "Content-Type: application/json" -d '{"email":"not-a-real-guardian@example.com","password":"wrongpass1"}' --max-time 10)
check "家長帳號錯誤帳密應回 401（不是 500）" "401" "$CODE"

echo ""
echo "--- Webhook 端點應該存在（就算沒有真實 Google 憑證，也不該是 404）---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/webhooks/google-subscription" -H "Content-Type: application/json" -d '{}' --max-time 10)
check "Google 訂閱 webhook 端點存在（未授權應回 401，不是 404）" "401" "$CODE"

echo ""
echo "=== 結果：$PASS 項通過、$FAIL 項失敗 ==="
if [ "$FAIL" -gt 0 ]; then
  echo "🛑 有測試沒過，部署可能有問題，建議先不要對外開放，檢查 server log。"
  exit 1
else
  echo "✅ 全部通過，部署基本健康。"
  exit 0
fi
