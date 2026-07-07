#!/bin/sh
set -e

log() {
  echo "[entrypoint] $(date '+%Y-%m-%d %H:%M:%S') $*"
}

# ── 1. 首次启动：复制默认配置文件 ──
if [ ! -f /app/.env ]; then
  if [ -f /app/.env.example ]; then
    cp /app/.env.example /app/.env
    log "Created default .env from example"
  else
    touch /app/.env
    log "Created empty .env (no example file found)"
  fi
fi

# ── 2. 确保 JWT_SECRET 存在 ──
if ! grep -q "^JWT_SECRET=." /app/.env 2>/dev/null; then
  JWT_SECRET=$(openssl rand -hex 32)
  # Remove any existing JWT_SECRET line (commented or empty)
  sed -i '/^#*JWT_SECRET=/d' /app/.env
  echo "JWT_SECRET=${JWT_SECRET}" >> /app/.env
  log "Generated random JWT_SECRET"
fi

# ── 3. 诊断输出 ──
log "Binary: /app/wrench"
log "FRONTEND_DIST=${FRONTEND_DIST:-/app/frontend/dist}"
log ".env contents (redacted):"
sed 's/\(SECRET=\).*/\1***/' /app/.env | while read -r line; do
  log "  $line"
done

# ── 4. 检查关键文件 ──
log "Checking files..."
ls -la /app/wrench 2>&1 || log "⚠️  /app/wrench not found!"
ls -d /app/frontend/dist 2>&1 || log "⚠️  /app/frontend/dist not found!"
ls /app/frontend/dist/index.html 2>&1 || log "⚠️  /app/frontend/dist/index.html not found!"

# ── 5. 启动后端 ──
log "Starting Wrench backend..."

exec /app/wrench "$@"
