import { useState, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  Plus,
  FileText,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import type { LogSource } from './index'

// 按类别分组的预设日志路径（作为参考标签，实际以扫描结果为准）
const LOG_CATEGORIES = [
  {
    label: '系统日志',
    icon: '🖥',
    keywords: ['syslog', 'messages', 'kern', 'dmesg', 'boot', 'maillog'],
  },
  {
    label: '认证日志',
    icon: '🔐',
    keywords: ['auth', 'secure', 'btmp', 'wtmp', 'lastlog', 'faillog'],
  },
  {
    label: 'Web 服务',
    icon: '🌐',
    keywords: ['nginx', 'apache', 'httpd', 'caddy', 'lighttpd'],
  },
  {
    label: '数据库',
    icon: '🗄',
    keywords: ['mysql', 'mariadb', 'postgres', 'mongo', 'redis', 'sqlite'],
  },
  {
    label: '应用日志',
    icon: '📦',
    keywords: ['docker', 'pm2', 'supervisor', 'cron', 'node', 'java', 'tomcat'],
  },
  {
    label: '包管理',
    icon: '📥',
    keywords: ['apt', 'dpkg', 'yum', 'dnf', 'rpm', 'pacman'],
  },
  {
    label: '安全审计',
    icon: '🛡',
    keywords: ['audit', 'fail2ban', 'ufw', 'firewall', 'selinux', 'apparmor'],
  },
]

interface Props {
  connectionId: string
  onSelectPath: (path: string) => void
}

// 根据文件路径匹配分类
function matchCategory(path: string): string {
  const lower = path.toLowerCase()
  for (const cat of LOG_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat.label
    }
  }
  return '其他日志'
}

// 根据路径生成友好标签
function makeLabel(path: string): string {
  const parts = path.split('/')
  const name = parts[parts.length - 1] || path
  // 去掉常见后缀
  const base = name
    .replace(/\.log$/, '')
    .replace(/\.log\.\d+$/, '')
    .replace(/\.log\.gz$/, '')
  const parent = parts.length > 3 ? parts[parts.length - 2] : ''
  if (parent && parent !== 'log') return `${parent}/${base}`
  return base
}

export default function SourceConfig({ connectionId, onSelectPath }: Props) {
  const [activePath, setActivePath] = useState<string | null>(null)
  const [allFiles, setAllFiles] = useState<LogSource[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [customPath, setCustomPath] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [customSources, setCustomSources] = useState<LogSource[]>(() => {
    try {
      const saved = localStorage.getItem('wrench_log_custom')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const saveCustom = useCallback((list: LogSource[]) => {
    setCustomSources(list)
    try {
      localStorage.setItem('wrench_log_custom', JSON.stringify(list))
    } catch {
      /* ignore */
    }
  }, [])

  // 远程扫描
  const doScan = useCallback(async () => {
    setDiscovering(true)
    try {
      const allPaths = LOG_CATEGORIES.flatMap((cat) => cat.keywords.map((kw) => `/var/log/${kw}`))
      const exactPaths = [
        '/var/log/syslog',
        '/var/log/messages',
        '/var/log/auth.log',
        '/var/log/secure',
        '/var/log/kern.log',
        '/var/log/dmesg',
        '/var/log/nginx/access.log',
        '/var/log/nginx/error.log',
        '/var/log/apache2/access.log',
        '/var/log/apache2/error.log',
        '/var/log/httpd/access_log',
        '/var/log/httpd/error_log',
        '/var/log/mysql/error.log',
        '/var/log/postgresql/postgresql.log',
        '/var/log/docker.log',
        '/var/log/cron.log',
        '/var/log/cron',
        '/var/log/boot.log',
        '/var/log/audit/audit.log',
        '/var/log/fail2ban.log',
        '/var/log/ufw.log',
        '/var/log/dpkg.log',
        '/var/log/apt/history.log',
        '/var/log/yum.log',
        '/var/log/tomcat/',
        '/var/log/cassandra/',
      ]
      const all = [...new Set([...allPaths, ...exactPaths])]

      const res = await fetch('/api/logs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, paths: all }),
      })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const files: LogSource[] = json.data
          .filter((item: { exists: boolean }) => item.exists)
          .map((item: { path: string; size: string }) => ({
            path: item.path,
            label: makeLabel(item.path),
            size: item.size || '',
          }))
        const seen = new Set<string>()
        const unique = files.filter((f) => {
          if (seen.has(f.path)) return false
          seen.add(f.path)
          return true
        })
        setAllFiles(unique)
        const cats = new Set(unique.map((f) => matchCategory(f.path)))
        const expanded: Record<string, boolean> = {}
        cats.forEach((c) => (expanded[c] = true))
        setExpandedCategories(expanded)
      }
    } catch {
      /* ignore */
    } finally {
      setDiscovering(false)
    }
  }, [connectionId])

  const handleRemoteScan = doScan

  const handleClick = (path: string) => {
    setActivePath(path)
    onSelectPath(path)
  }

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const handleAddCustom = () => {
    if (!customPath.trim()) return
    const label = customLabel.trim() || makeLabel(customPath.trim())
    const newSource = { path: customPath.trim(), label, size: '' }
    const updated = [...customSources.filter((s) => s.path !== newSource.path), newSource]
    saveCustom(updated)
    setCustomPath('')
    setCustomLabel('')
    handleClick(newSource.path)
  }

  // 按分类分组
  const grouped: Record<string, LogSource[]> = {}
  for (const file of allFiles) {
    const cat = matchCategory(file.path)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat]!.push(file)
  }

  const categoryOrder = [...LOG_CATEGORIES.map((c) => c.label), '其他日志']
  const sortedCategories = categoryOrder.filter((c) => grouped[c] && grouped[c]!.length > 0)

  return (
    <div className="flex h-full flex-col text-xs">
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <span className="font-medium text-slate-300">日志源</span>
        <button
          onClick={handleRemoteScan}
          disabled={discovering}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-slate-500 hover:text-sky-400 disabled:opacity-50"
          title="扫描远程主机"
        >
          {discovering ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          扫描
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {/* 按类别显示 */}
        {sortedCategories.map((cat) => {
          const files = grouped[cat]!
          const isExpanded = expandedCategories[cat] ?? false
          const catInfo = LOG_CATEGORIES.find((c) => c.label === cat)
          const icon = catInfo?.icon || '📄'

          return (
            <div key={cat} className="mb-1">
              <button
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-left hover:bg-slate-800"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="mr-1">{icon}</span>
                <span className="text-slate-300">{cat}</span>
                <span className="ml-auto rounded-full bg-emerald-900/50 px-1.5 py-0 text-[10px] text-emerald-400">
                  {files.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4">
                  {files.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => handleClick(f.path)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-slate-800 ${
                        activePath === f.path ? 'bg-sky-900/30 text-sky-300' : 'text-slate-400'
                      }`}
                      title={f.path}
                    >
                      <FileText size={12} className="shrink-0 text-emerald-500" />
                      <span className="truncate">{f.label}</span>
                      {f.size && (
                        <span className="ml-auto shrink-0 text-[10px] text-slate-600">
                          {f.size}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* 扫描中提示 */}
        {discovering && allFiles.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">正在扫描远程主机...</span>
          </div>
        )}

        {/* 空状态 */}
        {!discovering && allFiles.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <p className="text-xs">未发现日志文件</p>
            <button onClick={handleRemoteScan} className="mt-2 text-sky-400 hover:text-sky-300">
              重新扫描
            </button>
          </div>
        )}

        {/* 自定义日志源 */}
        {customSources.length > 0 && (
          <div className="mt-2 mb-1 border-t border-slate-700/30 pt-2">
            <div className="flex items-center gap-1 px-2 py-1 text-slate-300">
              <FolderOpen size={12} />
              <span>自定义日志</span>
            </div>
            <div className="ml-4">
              {customSources.map((s) => (
                <button
                  key={s.path}
                  onClick={() => handleClick(s.path)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-slate-800 ${
                    activePath === s.path ? 'bg-sky-900/30 text-sky-300' : 'text-slate-400'
                  }`}
                >
                  <FolderOpen size={12} className="shrink-0 text-amber-500" />
                  <span className="truncate">{s.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      saveCustom(customSources.filter((cs) => cs.path !== s.path))
                    }}
                    className="ml-auto shrink-0 text-slate-600 hover:text-red-400"
                  >
                    ×
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 添加自定义日志 */}
      <div className="border-t border-slate-700/50 px-3 py-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="/path/to/log"
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          />
          <button
            onClick={handleAddCustom}
            className="flex shrink-0 items-center gap-0.5 rounded bg-slate-700 px-2 py-1 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
          >
            <Plus size={12} />
          </button>
        </div>
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="标签（可选）"
          className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
        />
      </div>

      {/* 搜索 */}
      <div className="border-t border-slate-700/50 px-3 py-2">
        <div className="relative">
          <Search size={12} className="absolute top-1/2 left-2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="搜索日志路径..."
            className="w-full rounded border border-slate-700 bg-slate-800 py-1 pr-2 pl-6 text-[11px] text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            onChange={(e) => {
              const q = e.target.value.toLowerCase()
              if (q) {
                const match = allFiles.find(
                  (f) => f.path.toLowerCase().includes(q) || f.label.toLowerCase().includes(q),
                )
                if (match) handleClick(match.path)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
