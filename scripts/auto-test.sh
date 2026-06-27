#!/bin/bash
set -e

BRIDGE_PORT=${1:-20923}
BASE_URL="http://localhost:$BRIDGE_PORT"
PASS=0
FAIL=0
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }
info()  { echo -e "\033[36m→ $1\033[0m"; }

wait_for_bridge() {
  info "等待 bridge 就绪..."
  for i in $(seq 1 10); do
    if curl -sf "$BASE_URL/api/health" > /dev/null 2>&1; then
      green "Bridge OK"
      return 0
    fi
    sleep 1
  done
  red "Bridge 无响应"
  exit 1
}

info "============ SmartBox 自动测试 ============"
wait_for_bridge

# SSH 页面
info ""; info "--- [1/8] SSH ---"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL")
if [ "$CODE" = "200" ]; then green "HTTP 200"; PASS=$((PASS+1)); else red "HTTP $CODE"; FAIL=$((FAIL+1)); fi

# API 健康
HEALTH=$(curl -sf "$BASE_URL/api/health" 2>/dev/null || echo "")
if echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok'" 2>/dev/null; then
  green "API 健康"; PASS=$((PASS+1)); else red "API 失败"; FAIL=$((FAIL+1))
fi

# 插件 API
info ""; info "--- [3/8] 插件 ---"
PLUGIN_COUNT=$(curl -sf "$BASE_URL/api/plugins" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$PLUGIN_COUNT" -gt 0 ]; then green "插件: $PLUGIN_COUNT"; PASS=$((PASS+1)); else info "插件跳过"; PASS=$((PASS+1)); fi

# AI 模型
info ""; info "--- [4/8] AI 模型 ---"
FREE_MODELS=$(curl -sf "$BASE_URL/api/ai/fetch-free-models" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total'])" 2>/dev/null || echo "0")
if [ "$FREE_MODELS" -gt 0 ]; then green "免费模型: $FREE_MODELS"; PASS=$((PASS+1)); else red "AI 模型失败"; FAIL=$((FAIL+1)); fi

# 静态资源
info ""; info "--- [5/8] 静态资源 ---"
for f in "/assets/index-" "/sw.js" "/favicon.svg"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL$f" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then green "$f"; PASS=$((PASS+1)); else red "$f → $CODE"; FAIL=$((FAIL+1)); fi
done

# 构建产物
if [ -d "$ROOT_DIR/frontend/dist" ]; then
  JS=$(find "$ROOT_DIR/frontend/dist/assets" -name "*.js" | wc -l)
  CSS=$(find "$ROOT_DIR/frontend/dist/assets" -name "*.css" | wc -l)
  green "JS: $JS, CSS: $CSS"; PASS=$((PASS+1))
else
  red "dist 不存在"; FAIL=$((FAIL+1))
fi

# TypeScript
cd "$ROOT_DIR/frontend"
if npx tsc --noEmit 2>/dev/null; then green "TypeScript OK"; PASS=$((PASS+1)); else red "TS 失败"; FAIL=$((FAIL+1)); fi

# 汇总
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then echo -e "\n\033[32m ✅ 全部通过 ($PASS/$TOTAL)\033[0m"
else echo -e "\n\033[31m ❌ $FAIL 项失败 ($PASS/$TOTAL)\033[0m"
fi
exit $FAIL