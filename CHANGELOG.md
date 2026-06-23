# 📋 变更日志

## [0.1.2] - 2026-06-23

### 🚀 新增
- **CodeMirror 6 编辑器组件** — 支持 8 种语言语法高亮、IndexedDB 自动保存、文件树集成
- **AI 侧边栏** — OpenRouter API 集成（默认 `google/gemma-4-27b-it:free`），选中代码一键 AI 优化
- **完善的插件系统** — 5 个示例插件（JSON 格式化、Base64 编解码、时间戳转换、正则测试器、二维码生成）
- **全局 SmartBox API** — `SmartBox.getPluginAPI()` 供插件调用

### 🐛 修复
- **插件页面** — 替换静态占位组件为真实 PluginsPage，从后端加载插件清单
- **WebSocket 升级冲突** — 使用 noServer 模式，只对 `/ws` 路径升级
- **终端快捷键冲突** — CommandPalette 增加 isTerminalFocused 检测

### 📚 文档
- 完善 README.md、DEPLOY.md、CHANGELOG.md
- 添加 CONTRIBUTING.md 贡献指南
- 添加 MIT LICENSE

### 🏗️ 工程化
- 添加 GitHub Actions CI（自动构建）
- Docker + Docker Compose 一键部署
- Dockerfile 优化（多阶段构建）
- .gitignore 完善

---

## [0.1.1] - 2026-06-23

### 🚀 新增
- **后端 HTTP API** — `/api/plugins`、`/api/health` 路由
- **全局 API** — `SmartBox.getPluginAPI()` 实现
- **插件管理器** — `pluginManager.ts` 加载器
- **插件页面** — 真实组件替换

### 🐛 修复
- 插件系统从后端加载插件清单

---

## [0.1.0] - 2026-06-23

### 🚀 初始发布

#### 核心功能
- 🖥️ **SSH 终端** — xterm.js + node-pty，多连接管理
- 📁 **文件管理器** — 文件树浏览、操作
- 🎨 **主题切换** — 亮色 / 暗色双主题
- ⌨️ **命令面板** — Ctrl+P 搜索和执行
- 📡 **WebSocket 实时通信** — 实时消息
- 🔌 **插件系统框架** — 插件目录扫描、manifest 定义

#### 示例插件
- JSON 格式化
- Base64 编解码
- 时间戳转换
- 正则测试器
- 二维码生成

#### 工程化
- 前端：React 18 + TypeScript + Vite 6 + Tailwind CSS 3
- 后端：Node.js + WebSocket + ssh2
- 状态管理：Zustand
