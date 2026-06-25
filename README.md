# 🧊 智盒 SmartBox

[![Build](https://github.com/shengqiangdd/smartbox/actions/workflows/ci.yml/badge.svg)](https://github.com/shengqiangdd/smartbox/actions)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

> 基于 Web 的一体化开发工具箱 — 集代码编辑器、SSH 终端、AI 助手、文件管理和插件系统于一体。

---

## ✨ 功能特性

| 功能 | 状态 | 说明 |
|------|------|------|
| 🖥️ **SSH 终端** | ✅ | xterm.js + WebSocket，多连接/多Tab/分屏/同步命令/搜索 |
| 📁 **SFTP 文件管理器** | ✅ | 树形浏览/拖拽上传/大文件分块/递归搜索/右键菜单 |
| 📝 **CodeMirror 编辑器** | ✅ | 20+ 语言语法高亮，内容嗅探智能识别，IndexedDB 自动保存 |
| 🤖 **AI 侧边栏** | ✅ | OpenRouter API 集成，65+ 模型，选中代码→6 种 AI 操作（解释/重构/修复/优化/注释/翻译） |
| 🔌 **插件系统** | ✅ | iframe 沙箱隔离，14 个内置插件（46 条命令），在线市场安装，热加载 |
| 🎨 **主题切换** | ✅ | 亮色/暗色/跟随系统，CSS 变量体系全局生效 |
| ⌨️ **命令面板** | ✅ | Ctrl+P 模糊搜索，快捷键列表（Shift+?） |
| 📡 **WebSocket 实时通信** | ✅ | 心跳保活/指数退避重连/单一通道复用 |
| 🐳 **Docker 部署** | ✅ | 一键容器化，CI 自动构建推送 |
| 📦 **PWA 支持** | ✅ | vite-plugin-pwa + Workbox 预缓存，离线体验优化 + 网络状态指示条 |
| 🖱️ **终端分屏** | ✅ | SplitContainer 递归分屏，拖拽合并（4 方向插入），多主机同步命令 |
| 🔒 **安全加固** | ✅ | SSH 凭据 AES-GCM 加密存储，CSP 头，路径穿越防护，插件 iframe 沙箱 |

## 🛠️ 技术栈

```
前端: React 18 + TypeScript + Vite 6 + CodeMirror 6 + xterm.js + Tailwind CSS 3 + Zustand + lucide-react
后端: Node.js 22 + Express 5 + express-ws + ssh2 (SSH/SFTP)
部署: Docker + Docker Compose (单容器), CI: GitHub Actions
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装和启动

```bash
# 1. 克隆仓库
git clone https://github.com/shengqiangdd/smartbox.git
cd smartbox

# 2. 安装后端依赖
cd bridge && npm install

# 3. 安装前端依赖
cd ../frontend && npm install

# 4. 启动后端（终端 1）
cd ../bridge && node index.js

# 5. 启动前端（终端 2）
cd ../frontend && npm run dev

# 6. 访问
open http://localhost:5173
```

### 生产构建

```bash
cd frontend && npm run build
# 输出到 frontend/dist/
# 后端会自动托管静态文件
```

## 🐳 Docker 一键部署

### 前提条件

- 安装 [Docker](https://docs.docker.com/engine/install/) 和 [Docker Compose](https://docs.docker.com/compose/install/)

### 启动服务

```bash
# 拉取镜像并启动
docker compose pull
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 访问地址

- 前端：http://localhost:3001
- 健康检查：http://localhost:3001/api/health

> 💡 Docker 镜像由 GitHub Actions 自动构建并推送至 **ghcr.io/shengqiangdd/smartbox**，每次推送 `main` 分支都会自动更新 `latest` 标签。

## 🧩 插件开发

### 目录结构

```
plugins/
└── my-plugin/
    ├── manifest.json    # 插件清单
    └── plugin.js         # 插件主文件
```

### manifest.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "我的插件",
  "commands": [
    { "id": "my-plugin.run", "name": "运行插件", "icon": "code" }
  ],
  "panels": [
    { "id": "my-plugin.panel", "title": "我的面板", "icon": "folder" }
  ]
}
```

### plugin.js

```javascript
(function() {
  const api = SmartBox.getPluginAPI();
  api.registerCommand('my-plugin.run', {
    name: '运行插件',
    execute: () => api.showNotification('插件已运行！', 'success')
  });
  api.registerPanel('my-plugin.panel', {
    title: '我的面板',
    render: (container) => { container.innerHTML = '<h1>Hello!</h1>'; }
  });
})();
```

## 📁 项目结构

```
smartbox/
├── bridge/               # 后端服务（HTTP + WebSocket + SSH）
│   ├── index.js          # 主入口
│   └── package.json
├── frontend/             # 前端应用（React SPA）
│   ├── src/              # 源码
│   │   ├── components/   # 通用组件
│   │   ├── modules/      # 功能模块
│   │   ├── services/     # 服务层
│   │   ├── stores/       # 状态管理
│   │   └── types/        # TypeScript 类型
│   └── package.json
├── plugins/              # 示例插件
├── docs/                 # 规划文档
├── tests/                # 测试（TODO）
├── .github/              # GitHub 配置
├── Dockerfile            # Docker 部署
├── docker-compose.yml    # Docker Compose
├── README.md             # 本文件
├── DEPLOY.md             # 部署指南
├── CHANGELOG.md          # 变更日志
├── CONTRIBUTING.md       # 贡献指南
└── LICENSE               # MIT 许可证
```

## 📄 许可证

[MIT](LICENSE) © 2026 SmartBox
