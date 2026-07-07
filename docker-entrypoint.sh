#!/bin/sh
set -e

log() {
  echo "[entrypoint] $(date '+%Y-%m-%d %H:%M:%S') $*"
}

# ── 1. 首次启动：复制默认配置文件 ──
if [ ! -f /app/.env ]; then
  cp /app/.env.example /app/.env
  log "Created default .env from example"
fi

# ── 2. 显示关键配置（脱敏） ──
log "Binary: cloudhub"
log "FRONTEND_DIST=${FRONTEND_DIST:-/app/frontend/dist}"

# ── 3. 启动后端 ──
log "Entrypoint PID=$$, about to exec /app/cloudhub $*"
log "Starting SmartBox backend (Rust Axum)..."

# exec: 替换当前 shell 进程为 Rust 二进制
# - tini (PID 1) → docker-entrypoint.sh → cloudhub (exec)
# - 信号直接传给 cloudhub，无 shell 中间层
# - cloudhub 内部已注册 SIGINT/SIGTERM handler（graceful shutdown）
exec /app/cloudhub "$@"
