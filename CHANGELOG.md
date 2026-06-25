# 📋 变更日志

## [Unreleased] - M17 扩展功能

### 🚀 新增
- 📤 **告警规则导出/导入** — 告警配置（规则+开关）集成到配置导入导出系统，`.smartbox` 文件自动携带
- 📊 **告警历史导出** — CSV（Excel 友好 UTF-8 BOM）和 JSON 两种格式，一键下载
- 📈 **监控增强 — 磁盘 IO 读写速率** — 实时采集 `/proc/diskstats`，展示 R/W 速率
- 📋 **监控增强 — Top 5 进程** — 采集 `ps aux --sort=-%cpu`，展示 PID/USER/CPU%/MEM%/COMMAND
- 🔧 **告警配置** — 全局开关、规则行内编辑、添加/删除/恢复默认
- 📜 **告警历史** — 时间线展示、严重级别图标、最近 1 小时统计、清空

---

## [0.3.0] - 2026-06-25

### ⚡ 依赖大升级
- **Vite 6 → 8** — 构建时间从 10.30s 降至 0.60s（**17x 提速**），esbuild minify 替代 terser
- **React 18 → 19** — 全家桶升级至 19.2.7
- **Tailwind CSS 3 → 4** — JS 配置迁移至 CSS `@theme` + `@utility`，移除 tailwind.config.js / postcss.config.js / autoprefixer
- **lucide-react 0.460 → 1.21** — 图标库全面更新
- **14 个存量 TypeScript 类型错误全部修复**，tsc 零错误零警告

### 🚀 新增
- 🐳 **Docker 管理面板** — 容器/镜像/Compose 全生命周期管理，11 个 REST API
- 🐳 **Docker 容器终端** — `docker exec -it` WebSocket 流式终端
- 🐳 **Docker 实时资源监控** — CPU/内存 SVG 折线图，多容器选择，2s 轮询/120 点历史窗口
- 📋 **日志聚合面板** — 多服务器日志源配置，tail 实时跟踪 + grep 搜索，WebSocket 流式传输
- ⚡ **跨服务器批量执行** — 选中多台主机并发执行命令，结果汇总展示
- 📤 **批量文件分发** — 文件上传/下载到多台主机，大文件分块传输 + 进度追踪
- 📚 **脚本模板库** — 28 条内置命令 + 自定义 CRUD，变量占位符替换，收藏 + 分组管理
- 📊 **主机性能看板** — 多主机 CPU/内存/磁盘/网络/负载实时监控，SVG Sparkline，Mock 演示模式
- 📝 **Markdown 实时预览** — 零外部依赖 MD→HTML 渲染器，CodeMirror 集成 👁️ 切换按钮
- 🔍 **内容嗅探** — shebang + magic bytes + 已知文件名，自动识别 40+ 种文件类型
- 🔒 **安全加固** — SSH 凭据 AES-GCM/PBKDF2 加密存储，CSP 头，路径穿越防护
- 🎨 **Docker Toast 交互反馈** — 浮动通知系统（成功/错误/信息三层样式）
- 📦 **Dependabot** — 自动监控前端/后端/npm 及 GitHub Actions 依赖更新
- 🏗️ **CI/CD 增强** — Docker 多架构构建，每周镜像清理，workflow_dispatch 手动触发

### 🏗️ 工程化
- `.dockerignore` 新增，构建上下文从 ~200MB 降至 ~3MB
- Dockerfile 多阶段构建优化：依赖缓存层分离 + `npm ci` + npm 官方源
- CodeMirror chunk 三分割：core / langs / langs-extra，首屏按需加载
- 分块上传远程临时文件兜底清理（断连/失败自动 `rm -f`）

---

## [0.2.0] - 2026-06-24

### 🚀 新增
- ✂️ **终端分屏** — SplitContainer 递归分屏，水平/垂直混合，拖拽合并（4 方向插入）
- 🔄 **多主机同步命令** — syncGroup 广播机制
- 🔍 **SFTP 文件搜索** — 本地过滤 + 递归搜索（深度限制 5 层），Ctrl+F / Ctrl+Enter 快捷键
- 🔍 **终端内容搜索** — SearchAddon + 底部搜索面板，Ctrl+Shift+F 快捷键
- ⌨️ **快捷键列表展示** — Shift+? 打开模态框，6 组快捷键分类
- 📤 **拖拽上传** — 系统文件拖入 + 进度条 + 完成弹窗
- 📦 **大文件分块上传** — >50MB 自动分 5MB 块，SFTP open/write/close + sudo mv
- 🎯 **命令面板增强** — 自定义命令 CRUD，变量占位符替换弹窗，导入导出
- 📐 **面板拖拽调整宽度** — 左右面板拖动调节 + 双击重置
- 💾 **配置导入/导出** — SSH 连接 / AI 配置 / 插件列表 / UI 偏好，AES-GCM 加密/明文导出
- 🔌 **插件热加载** — fs.watch 监听 + WebSocket 广播 plugins-changed + 前端自动重载
- 🛒 **插件市场** — 在线安装/更新/卸载插件
- 🤖 **AI 流式取消** — AbortController 中止，保留已生成内容
- 🔒 **上传重名确认** — 拖拽/点击上传前检查目标目录同名文件

### 🏗️ 工程化
- **路由级代码分割** — React.lazy + Suspense，所有页面模块独立 chunk
- **Bundle 优化** — manualChunks 拆分 xterm / CodeMirror / router / zustand / lucide / idb
- **虚拟列表** — VirtualList 组件，100 项阈值自动切换
- **离线体验优化** — 网络状态指示条（在线/离线实时监测 + 提示）

---

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
