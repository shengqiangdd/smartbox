# ===== 构建阶段 =====
FROM node:18-alpine AS builder

WORKDIR /app

# 安装前端依赖
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# 构建前端
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ===== 运行阶段 =====
FROM node:18-alpine

WORKDIR /app

# 安装后端依赖
COPY bridge/package.json bridge/package-lock.json ./bridge/
RUN cd bridge && npm ci --production

# 复制后端源码
COPY bridge/ ./bridge/

# 复制前端构建产物
COPY --from=builder /app/frontend/dist/ ./frontend/dist/

# 复制插件
COPY plugins/ ./plugins/

# 暴露端口
EXPOSE 3001

# 启动
CMD ["node", "bridge/index.js"]
