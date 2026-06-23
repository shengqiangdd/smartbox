# 🚀 智盒 SmartBox 部署指南

## 📋 部署方案对比

| 方案 | 复杂度 | 适用场景 |
|------|--------|---------|
| **Docker Compose** | ⭐ 低 | 推荐，一键部署 |
| **手动部署** | ⭐⭐ 中 | 调试或自定义配置 |
| **Nginx + Systemd** | ⭐⭐⭐ 中高 | 生产环境高可用 |

---

## 🐳 方案一：Docker Compose（推荐）

### 快速启动

```bash
docker-compose up -d
# 访问 http://localhost:3001
```

### 构建并运行

```bash
# 仅构建
docker build -t smartbox .

# 运行
docker run -d -p 3001:3001 --name smartbox --restart unless-stopped smartbox
```

---

## 🔧 方案二：手动部署

### 1. 构建前端

```bash
cd frontend
npm install
npm run build     # 输出到 frontend/dist/
```

### 2. 启动后端（生产模式）

```bash
cd bridge
npm install
NODE_ENV=production node index.js
```

后端会自动托管 `frontend/dist/` 静态文件，监听端口 3001。

### 3. 使用 PM2 实现进程守护（推荐）

```bash
npm install -g pm2
pm2 start bridge/index.js --name smartbox
pm2 save
pm2 startup    # 开机自启
```

### 4. 使用 Systemd（Linux）

创建 `/etc/systemd/system/smartbox.service`：

```ini
[Unit]
Description=SmartBox Web IDE
After=network.target

[Service]
Type=simple
User=smartbox
WorkingDirectory=/opt/smartbox/bridge
ExecStart=/usr/bin/node /opt/smartbox/bridge/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable smartbox
sudo systemctl start smartbox
sudo systemctl status smartbox
```

---

## 🌐 方案三：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name smartbox.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartbox.example.com;

    ssl_certificate     /etc/letsencrypt/live/smartbox.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartbox.example.com/privkey.pem;

    # 静态资源缓存
    location /assets/ {
        proxy_pass http://127.0.0.1:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket 连接
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 前端页面
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端监听端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `BRIDGE_PORT` | `3001` | Bridge 服务端口 |

---

## 📊 健康检查

```bash
curl http://localhost:3001/api/health
# 返回: {"status":"ok","uptime":123}
```

## 🛡️ 安全建议

1. **生产环境务必使用反向代理**（Nginx / Caddy）
2. **启用 HTTPS**（Let's Encrypt 免费证书）
3. 配置 **IP 白名单**或**基础认证**
4. 定期更新依赖：`npm audit`
5. 使用非 root 用户运行服务
