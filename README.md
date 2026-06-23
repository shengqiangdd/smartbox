# 🧊 智盒 SmartBox

[![Build](https://github.com/shengqiangdd/smartbox/actions/workflows/ci.yml/badge.svg)](https://github.com/shengqiangdd/smartbox/actions)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

> 基于 Web 的一体化开发工具箱 — 集代码编辑器、SSH 终端、AI 助手、文件管理和插件系统于一体。

---

## ✨ 功能特性

| 功能 | 状态 | 说明 |
|------|------|------|
| 🖥️ **SSH 终端** | ✅ | xterm.js + node-pty，支持多连接管理、实时交互 |
| 📁 **文件管理器** | ✅ | 文件树浏览、创建、删除、重命名 |
| 📝 **CodeMirror 编辑器** | ✅ | 8 种语言语法高亮，IndexedDB 自动保存 |
| 🤖 **AI 侧边栏** | ✅ | OpenRouter API 集成，选中代码一键 AI 优化 |
| 🔌 **插件系统** | ✅ | 5 个示例插件，可热加载，开放 API |
| 🎨 **主题切换** | ✅ | 亮色 / 暗色主题，全局生效 |
| ⌨️ **命令面板** | ✅ | Ctrl+P 快速搜索和执行命令 |
| 📡 **WebSocket 实时通信** | ✅ | 实时消息推送 |
| 🐳 **Docker 部署** | ✅ | 一键容器化部署 |
| 📦 **PWA 支持** | 🚧 | 下一阶段 |
| 🖱️ **终端分屏** | 🚧 | 下一阶段 |

## 🛠️ 技术栈

```
前端: React 18 + TypeScript + Vite 6 + CodeMirror 6 + xterm.js + Tailwind CSS 3 + Zustand
后端: Node.js 18+ (原生 http 模块) + WebSocket (ws) + SSH2 (node-pty)
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
