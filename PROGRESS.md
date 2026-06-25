# 智盒 (SmartBox) — 开发进度日志

## 2026-06-25 — 🎉 项目完全完工！64/64 (100%) ✅

### 最终归档

一路走来，项目从 0 开始构建，经历了 3 个阶段：

**M3 — SSH + SFTP 核心功能 (27 项)**
- SSH 连接管理 CRUD/分组/快速连接/连接测试
- xterm.js 终端 + 多 Tab/分屏/拖拽合并/同步命令/搜索
- SFTP 文件管理 + 大文件分块 + 递归搜索 + 拖拽上传
- WebSocket 自动重连/心跳保活

**M4 — AI + 插件系统 (20 项)**
- CodeMirror 6 编辑器 + 内容嗅探智能语言识别
- iframe 沙箱插件系统 + 14 个内置插件 + 市场 + 热加载
- AI 侧边栏 + 6 种代码操作 + 流式取消

**M5 — 打磨与发布 (17 项)**
- PWA + 离线优化 + 网络状态指示
- 性能优化（路由分割/Bundle 拆分/虚拟列表）
- 用户体验（主题/命令面板/快捷键/导出导入）
- 全部文档 + CI/CD + Docker 部署

### 代码库指标
- 总计 15+ 个前端模块，7 个 service 层文件，5 个 store
- 后端单文件约 1525 行，覆盖 REST + WebSocket + SSH/SFTP + Docker + 日志
- 14 个内置插件，46 条命令
- 最后 push: `8efd5f1` (日志聚合面板)

## 2026-06-25 — 新功能阶段

### 🐳 Docker 管理面板 ✅
- 后端新增 11 个 API（ps/images/stats/inspect/logs/start/stop/restart/rm/rmi/compose）
- 前端 6 个组件（主页面/容器列表/镜像列表/日志弹窗/详情/类型定义）
- 复用 SSH 连接，零额外依赖，~22kB 总大小（按需懒加载）
- commit: `3246939`

### 📋 日志聚合面板 ✅
- 后端新增 3 个 API（list-sources/tail/grep）
- 前端 4 个组件（主页面/LogViewer/SourceConfig/类型定义）
- 自动发现 20+ 常见系统日志（syslog/auth/nginx/mysql/redis 等）
- 自定义日志源管理（localStorage 持久化）
- 支持 tail 行数切换（50~5000行）、grep 搜索（上下文+大小写控制）、下载
- 双栏布局：左侧日志源树 + 右侧日志查看器
- 构建 9.31s，TypeScript 零错误，13.8kB chunk
- commit: `8efd5f1`

## 2026-06-24 — 搜索功能 + 快捷键列表完成，48/61 (79%) ✅

### 本日完成
- ✅ **SFTP 文件搜索**：本地过滤（输入即过滤）+ 递归搜索（遍历所有子目录匹配文件名），搜索按钮 + Ctrl+F / Ctrl+Enter 快捷键
- ✅ **终端搜索内容**：SearchAddon 搜索面板底部悬浮，Ctrl+Shift+F 打开，Enter/Shift+Enter 上下跳转
- ✅ **快捷键列表展示**：命令面板中「快捷键列表」命令 + Shift+? 快捷键打开模态框，6 组快捷键分类展示
- ✅ **大文件分块上传**：>50MB 自动分块（每块 5MB），后端 SFTP open/write/close + sudo mv，前端分块进度条
- ✅ **分屏窗口拖拽合并**：SplitPane 原生 HTML5 拖拽，25% 边缘检测高亮(cyan)，ref 避免 state 过期，左/右/上/下 4 方向插入
