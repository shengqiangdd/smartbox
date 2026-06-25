/** 常用命令分组 */
export interface CommandGroup {
  id: string
  name: string
  icon?: string
}

/** 一条常用命令 */
export interface QuickCommand {
  id: string
  groupId: string
  name: string
  command: string
  description?: string
  isBuiltin: boolean
}

/** 持久化存储结构 */
export const COMMAND_GROUPS: CommandGroup[] = [
  { id: 'system', name: '系统管理', icon: '🖥️' },
  { id: 'docker', name: 'Docker', icon: '🐳' },
  { id: 'network', name: '网络', icon: '🌐' },
  { id: 'disk', name: '磁盘', icon: '💾' },
  { id: 'log', name: '日志', icon: '📋' },
  { id: 'custom', name: '自定义', icon: '⭐' },
]

/** 内置预设命令 */
export const BUILTIN_COMMANDS: QuickCommand[] = [
  // 系统管理
  { id: 'builtin-sys-uptime', groupId: 'system', name: '查看运行时间', command: 'uptime', description: '系统运行时间、负载', isBuiltin: true },
  { id: 'builtin-sys-df', groupId: 'system', name: '磁盘使用情况', command: 'df -h', description: '所有挂载点磁盘容量', isBuiltin: true },
  { id: 'builtin-sys-free', groupId: 'system', name: '内存使用情况', command: 'free -h', description: '物理内存和交换分区', isBuiltin: true },
  { id: 'builtin-sys-top', groupId: 'system', name: '进程实时监控', command: 'top -b -n 1 | head -30', description: 'CPU/内存占用 Top 进程', isBuiltin: true },
  { id: 'builtin-sys-ps', groupId: 'system', name: '进程列表', command: 'ps aux --sort=-%mem | head -20', description: '按内存排序的进程列表', isBuiltin: true },
  { id: 'builtin-sys-kernel', groupId: 'system', name: '内核版本', command: 'uname -a', description: '系统内核与架构信息', isBuiltin: true },
  { id: 'builtin-sys-dmesg', groupId: 'system', name: '内核日志（最近）', command: 'dmesg | tail -30', description: '最近 30 条内核消息', isBuiltin: true },
  { id: 'builtin-sys-sysctl', groupId: 'system', name: '系统参数', command: 'sysctl -a 2>/dev/null | grep -E "vm.swappiness|net.core.somaxconn|fs.file-max"', description: '关键内核参数', isBuiltin: true },

  // Docker
  { id: 'builtin-dk-ps', groupId: 'docker', name: '运行中的容器', command: 'docker ps', description: '当前运行的 Docker 容器', isBuiltin: true },
  { id: 'builtin-dk-psa', groupId: 'docker', name: '全部容器', command: 'docker ps -a', description: '所有容器（含已停止）', isBuiltin: true },
  { id: 'builtin-dk-images', groupId: 'docker', name: '镜像列表', command: 'docker images', description: '本地所有 Docker 镜像', isBuiltin: true },
  { id: 'builtin-dk-stats', groupId: 'docker', name: '容器资源统计', command: 'docker stats --no-stream', description: '各容器 CPU/内存/网络', isBuiltin: true },
  { id: 'builtin-dk-compose-ps', groupId: 'docker', name: 'Compose 状态', command: 'docker compose ps', description: 'Compose 项目运行状态', isBuiltin: true },
  { id: 'builtin-dk-prune', groupId: 'docker', name: '清理未使用资源', command: 'docker system prune -f', description: '清理停止容器、悬空镜像等', isBuiltin: true },

  // 网络
  { id: 'builtin-net-ss', groupId: 'network', name: '网络连接', command: 'ss -tlnp', description: 'TCP 监听端口及进程', isBuiltin: true },
  { id: 'builtin-net-ifconfig', groupId: 'network', name: '网络接口', command: 'ip addr', description: '所有网络接口信息', isBuiltin: true },
  { id: 'builtin-net-curl', groupId: 'network', name: 'HTTP 状态检查', command: 'curl -sI -o /dev/null -w "%{http_code} %{time_total}s" http://localhost/ 2>&1; echo', description: '本机 Web 服务健康检查', isBuiltin: true },
  { id: 'builtin-net-dns', groupId: 'network', name: 'DNS 解析', command: 'nslookup google.com 2>&1 | head -10; echo "---"; dig +short google.com 2>&1', description: 'DNS 解析验证', isBuiltin: true },

  // 磁盘
  { id: 'builtin-disk-iostat', groupId: 'disk', name: '磁盘 I/O', command: 'iostat -x 1 2 2>/dev/null || echo "需安装 sysstat"', description: '磁盘 I/O 性能统计', isBuiltin: true },
  { id: 'builtin-disk-lsblk', groupId: 'disk', name: '块设备列表', command: 'lsblk', description: '所有磁盘和分区信息', isBuiltin: true },
  { id: 'builtin-disk-du', groupId: 'disk', name: '目录大小排行', command: 'du -sh /* 2>/dev/null | sort -rh | head -10', description: '根目录下各目录占用', isBuiltin: true },

  // 日志
  { id: 'builtin-log-journal', groupId: 'log', name: '系统日志（最近）', command: 'journalctl -n 50 --no-pager 2>&1', description: '最近 50 条系统日志', isBuiltin: true },
  { id: 'builtin-log-auth', groupId: 'log', name: '认证日志（最近）', command: 'tail -30 /var/log/auth.log 2>/dev/null || tail -30 /var/log/secure 2>/dev/null || echo "未找到认证日志"', description: '最近的 SSH 登录/认证记录', isBuiltin: true },
  { id: 'builtin-log-nginx', groupId: 'log', name: 'Nginx 访问（最近）', command: 'tail -20 /var/log/nginx/access.log 2>/dev/null || echo "未找到 Nginx 访问日志"', description: '最近 Nginx 访问请求', isBuiltin: true },
  { id: 'builtin-log-fail', groupId: 'log', name: '登录失败记录', command: 'lastb 2>/dev/null | head -15 || echo "无失败登录记录"', description: '失败 SSH 登录尝试', isBuiltin: true },
]

export const STORAGE_KEY = 'smartbox-quick-commands'

/** 默认的自定义命令展示 */
export const DEFAULT_CUSTOM: QuickCommand[] = []
