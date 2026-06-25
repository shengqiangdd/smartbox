import { useState, useCallback, useRef, useEffect } from 'react'
import { Activity, Cpu, MemoryStick, HardDrive, Network, RefreshCw, Server, Loader2, ShieldAlert, ChevronDown, ChevronRight, Bell } from 'lucide-react'
import { useAppStore } from '../../stores/app-store'
import { useSshStore } from '../../stores/ssh-store'
import { useAlertStore } from '../../stores/alert-store'
import AlertSettings from './AlertSettings'
import AlertHistory from './AlertHistory'

// ─── 类型定义 ───

interface HostStats {
  host: string
  name: string
  cpu: number
  memory: { total: number; used: number; pct: number }
  disk: { total: number; used: number; pct: number }
  uptime: string
  loadAvg: string
  netRx: number
  netTx: number
  timestamp: number
}

interface HistoryPoint {
  time: number
  cpu: number
  mem: number
  disk: number
}

// ─── 解析工具 ───

function parseCpuUsage(stdout: string): number {
  const lines = stdout.trim().split('\n')
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 12 && parts[0] !== 'avg-cpu:') {
      // 从 top -bn1 或 mpstat 解析
      if (parts.length >= 12) {
        const idle = parseFloat(parts[10] || parts[7] || '0')
        return Math.round((100 - idle) * 10) / 10
      }
    }
    // sar -u 1 1 格式
    if (line.includes('all')) {
      const p = line.trim().split(/\s+/)
      if (p.length >= 8) {
        const idle = parseFloat(p[p.length - 1])
        return Math.round((100 - idle) * 10) / 10
      }
    }
  }
  return 0
}

function parseMemory(stdout: string): { total: number; used: number; pct: number } {
  const lines = stdout.trim().split('\n')
  let total = 0, available = 0
  for (const line of lines) {
    if (line.startsWith('MemTotal:')) {
      total = parseInt(line.split(/\s+/)[1]) || 0
    }
    if (line.startsWith('MemAvailable:')) {
      available = parseInt(line.split(/\s+/)[1]) || 0
    }
  }
  if (total === 0) return { total: 0, used: 0, pct: 0 }
  const used = total - available
  return { total, used, pct: Math.round((used / total) * 100) }
}

function parseDisk(stdout: string): { total: number; used: number; pct: number } {
  const lines = stdout.trim().split('\n')
  // 找根分区 /
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 6 && parts[5] === '/') {
      const total = parseInt(parts[1]) || 0
      const used = parseInt(parts[2]) || 0
      if (total === 0) continue
      return { total, used, pct: Math.round((used / total) * 100) }
    }
  }
  return { total: 0, used: 0, pct: 0 }
}

function parseUptime(stdout: string): string {
  const m = stdout.match(/up\s+(.+?)(?:,\s+\d+ users|\s*$)/)
  return m ? m[1].trim() : stdout.trim().slice(0, 40)
}

function parseLoadAvg(stdout: string): string {
  const m = stdout.match(/load average:\s+(.+)/)
  return m ? m[1].trim() : ''
}

function parseNetRxTx(stdout: string): { rx: number; tx: number } {
  const lines = stdout.trim().split('\n')
  let rxTotal = 0, txTotal = 0
  let ifaceCount = 0
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 10 && parts[0] !== 'Inter-|' && parts[0] !== 'face') {
      const name = parts[0]
      if (name === 'lo') continue
      rxTotal += parseInt(parts[1]) || 0
      txTotal += parseInt(parts[9]) || 0
      ifaceCount++
    }
  }
  return ifaceCount > 0 ? { rx: rxTotal, tx: txTotal } : { rx: 0, tx: 0 }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatSpeed(bps: number): string {
  if (bps === 0) return '0 b/s'
  const k = 1000
  const sizes = ['b/s', 'Kb/s', 'Mb/s', 'Gb/s']
  const i = Math.floor(Math.log(bps) / Math.log(k))
  return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// ─── 渐变色进度条 ───

function ProgressBar({ value, label, sub, color }: { value: number; label: string; sub?: string; color: string }) {
  const getColor = () => {
    if (value > 90) return 'from-red-500 to-red-400'
    if (value > 70) return 'from-amber-500 to-amber-400'
    return color
  }
  return (
    <div className="relative">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{value}%{sub && <span className="text-slate-500 ml-1 font-normal">{sub}</span>}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getColor()} transition-all duration-500`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Sparkline 迷你折线图 ───

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} className="flex items-center justify-center text-[10px] text-slate-600">等待数据...</div>

  const w = 120
  const h = height
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = w / (data.length - 1)

  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ')

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

// ─── 主组件 ───

/** Mock 主机名 */
const MOCK_HOSTS = [
  { id: 'mock-prod-01', name: 'prod-web-01', host: '192.168.1.100' },
  { id: 'mock-prod-02', name: 'prod-db-01', host: '192.168.1.101' },
]

// ─── Mock 数据状态（随机漫步，更真实） ───
const mockState = new Map<string, {
  cpu: number; memPct: number; diskPct: number
  netRx: number; netTx: number
  uptime: number; load1: number; load5: number; load15: number
}>()

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function walk(value: number, step: number, min: number, max: number): number {
  return clamp(value + (Math.random() - 0.5) * step * 2, min, max)
}

function initOrGetMock(id: string) {
  if (!mockState.has(id)) {
    mockState.set(id, {
      cpu: Math.round(Math.random() * 25 + 10),
      memPct: Math.round(Math.random() * 25 + 35),
      diskPct: Math.round(Math.random() * 15 + 25),
      netRx: Math.round(Math.random() * 3e6 + 1e6),
      netTx: Math.round(Math.random() * 1.5e6 + 5e5),
      uptime: Date.now() - Math.random() * 20 * 86400000,
      load1: Math.random() * 2 + 0.3,
      load5: Math.random() * 1.5 + 0.2,
      load15: Math.random() * 1 + 0.1,
    })
  }
  return mockState.get(id)!
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  return `${days} days, ${hours} hours`
}

/** 生成模拟统计数据（随机漫步） */
function mockStats(id: string, name: string, host: string): HostStats {
  const s = initOrGetMock(id)
  s.cpu = walk(s.cpu, 5, 2, 85)
  s.memPct = walk(s.memPct, 3, 20, 75)
  s.diskPct = walk(s.diskPct, 0.5, 15, 65)
  s.netRx = walk(s.netRx, 500000, 100000, 8000000)
  s.netTx = walk(s.netTx, 300000, 50000, 4000000)
  // 负载跟随 CPU 波动
  s.load1 = walk(s.load1, 0.4, 0.1, 4)
  s.load5 = walk(s.load5, 0.2, 0.1, 3)
  s.load15 = walk(s.load15, 0.1, 0.05, 2)

  const totalMem = 16777216
  const usedMem = Math.round(totalMem * (s.memPct / 100))
  const totalDisk = 524288000
  const usedDisk = Math.round(totalDisk * (s.diskPct / 100))

  return {
    host,
    name,
    cpu: Math.round(s.cpu * 10) / 10,
    memory: { total: totalMem, used: usedMem, pct: s.memPct },
    disk: { total: totalDisk, used: usedDisk, pct: s.diskPct },
    uptime: formatDuration(Date.now() - s.uptime),
    loadAvg: `${s.load1.toFixed(2)}, ${s.load5.toFixed(2)}, ${s.load15.toFixed(2)}`,
    netRx: Math.round(s.netRx),
    netTx: Math.round(s.netTx),
    timestamp: Date.now(),
  }
}

/** 生成模拟历史数据（最近 60 个采样点） */
function mockHistory(): HistoryPoint[] {
  const now = Date.now()
  return Array.from({ length: 60 }, (_, i) => ({
    time: now - (60 - i) * 5000,
    cpu: Math.round((Math.random() * 40 + 10) * 10) / 10,
    mem: Math.round(Math.random() * 35 + 25),
    disk: Math.round(Math.random() * 25 + 15),
  }))
}

export default function MonitorPage() {
  const sessions = useAppStore((s) => s.sshSessions)
  const connections = useSshStore((s) => s.connections)
  const isMock = sessions.length === 0
  const [hosts, setHosts] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [stats, setStats] = useState<Record<string, HostStats>>({})
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interval, setIntervalDuration] = useState(5)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevNetRef = useRef<Record<string, { rx: number; tx: number; time: number }>>({})

  // 扫描已连接的主机
  const scanHosts = useCallback(() => {
    if (isMock) {
      const list = MOCK_HOSTS.map((h) => ({ id: h.id, name: h.name }))
      setHosts(list)
      setSelected(list.map((h) => h.id))
      // 直接注入 mock 数据
      const mockStatsMap: Record<string, HostStats> = {}
      const mockHistoryMap: Record<string, HistoryPoint[]> = {}
      MOCK_HOSTS.forEach((h) => {
        mockStatsMap[h.id] = mockStats(h.id, h.name, h.host)
        mockHistoryMap[h.id] = mockHistory()
      })
      setStats(mockStatsMap)
      setHistory(mockHistoryMap)
      return
    }
    const list = sessions.map((id) => {
      const conn = connections.find((c) => c.id === id)
      return { id, name: conn?.name || id.slice(0, 8) }
    })
    setHosts(list)
    if (selected.length === 0 && list.length > 0) {
      setSelected(list.map((h) => h.id))
    }
  }, [sessions, connections, selected.length, isMock])

  // 采集单台主机数据
  const collectHostStats = useCallback(async (hostId: string): Promise<HostStats | null> => {
    const conn = connections.find((c) => c.id === hostId)
    if (!conn) return null

    try {
      // 并发执行多个命令
      const [cpuRes, memRes, diskRes, uptimeRes, netRes] = await Promise.all([
        fetch('/api/ssh/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: hostId, command: "top -bn1 | head -5 | grep '%Cpu' || mpstat 2>/dev/null | tail -1 || sar -u 1 1 2>/dev/null | tail -1" }),
        }).then((r) => r.json()),
        fetch('/api/ssh/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: hostId, command: 'cat /proc/meminfo | grep -E "MemTotal|MemAvailable"' }),
        }).then((r) => r.json()),
        fetch('/api/ssh/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: hostId, command: 'df -k /' }),
        }).then((r) => r.json()),
        fetch('/api/ssh/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: hostId, command: 'uptime' }),
        }).then((r) => r.json()),
        fetch('/api/ssh/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: hostId, command: "cat /proc/net/dev" }),
        }).then((r) => r.json()),
      ])

      if (cpuRes.exitCode !== 0 || memRes.exitCode !== 0 || diskRes.exitCode !== 0) {
        return null
      }

      const cpu = parseCpuUsage(cpuRes.stdout || '')
      const memory = parseMemory(memRes.stdout || '')
      const disk = parseDisk(diskRes.stdout || '')
      const uptime = parseUptime(uptimeRes.stdout || '')
      const loadAvg = parseLoadAvg(uptimeRes.stdout || '')

      const net = parseNetRxTx(netRes.stdout || '')
      const now = Date.now()

      // 计算网速（差值 / 时间间隔）
      const prev = prevNetRef.current[hostId]
      let netRxSpeed = 0
      let netTxSpeed = 0
      if (prev && prev.rx > 0) {
        const dt = (now - prev.time) / 1000
        if (dt > 0) {
          netRxSpeed = Math.max(0, (net.rx - prev.rx) / dt)
          netTxSpeed = Math.max(0, (net.tx - prev.tx) / dt)
        }
      }
      prevNetRef.current[hostId] = { rx: net.rx, tx: net.tx, time: now }

      return {
        host: conn.host,
        name: conn.name || hostId.slice(0, 8),
        cpu,
        memory,
        disk,
        uptime,
        loadAvg,
        netRx: netRxSpeed,
        netTx: netTxSpeed,
        timestamp: Date.now(),
      }
    } catch {
      return null
    }
  }, [connections])

  // 采集所有选中的主机
  const collectAll = useCallback(async () => {
    if (selected.length === 0) return
    setLoading(true)
    setError('')

    if (isMock) {
      // Mock 模式：刷新随机数据
      const mockStatsMap: Record<string, HostStats> = {}
      const now = Date.now()
      selected.forEach((id) => {
        const host = MOCK_HOSTS.find((h) => h.id === id)
        if (host) {
          mockStatsMap[id] = mockStats(id, host.name, host.host)
          setHistory((prev) => {
            const h = prev[id] || []
            h.push({ time: now, cpu: mockStatsMap[id].cpu, mem: mockStatsMap[id].memory.pct, disk: mockStatsMap[id].disk.pct })
            return { ...prev, [id]: h.slice(-60) }
          })
        }
      })
      setStats((prev) => ({ ...prev, ...mockStatsMap }))
      // 告警评估
      const evaluate = useAlertStore.getState().evaluate
      for (const id of selected) {
        const s = mockStatsMap[id]
        if (s) evaluate(id, s.name, { cpu: s.cpu, memory: s.memory.pct, disk: s.disk.pct })
      }
      setLoading(false)
      return
    }

    const results = await Promise.all(selected.map((id) => collectHostStats(id)))

    const newStats: Record<string, HostStats> = {}
    const now = Date.now()

    for (let i = 0; i < selected.length; i++) {
      const s = results[i]
      if (s) {
        newStats[selected[i]] = s

        // 更新历史
        setHistory((prev) => {
          const h = prev[selected[i]] || []
          h.push({ time: now, cpu: s.cpu, mem: s.memory.pct, disk: s.disk.pct })
          // 保留最近 60 个点
          const trimmed = h.slice(-60)
          return { ...prev, [selected[i]]: trimmed }
        })
      }
    }

    setStats((prev) => ({ ...prev, ...newStats }))
    // 告警评估
    const evaluate = useAlertStore.getState().evaluate
    for (const id of selected) {
      const s = newStats[id]
      if (s) evaluate(id, s.name, { cpu: s.cpu, memory: s.memory.pct, disk: s.disk.pct })
    }
    setLoading(false)
  }, [selected, collectHostStats])

  // 自动刷新
  const startAutoRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(collectAll, interval * 1000)
  }, [collectAll, interval])

  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 初始化
  useEffect(() => {
    scanHosts()
  }, [scanHosts])

  useEffect(() => {
    return () => stopAutoRefresh()
  }, [stopAutoRefresh])

  const toggleHost = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id],
    )
  }

  // 手动刷新
  const handleRefresh = async () => {
    stopAutoRefresh()
    await collectAll()
    startAutoRefresh()
  }

  return (
    <div className="flex h-full flex-col">
      {/* 头部 */}
      <div className="flex shrink-0 items-center border-b border-slate-700/50 px-4 py-3">
        <Activity size={18} className="mr-2 text-smartbox-400" />
        <h2 className="text-sm font-semibold text-slate-200">主机性能看板</h2>
        {isMock && (
          <span className="ml-2 flex items-center gap-1 rounded bg-amber-900/20 px-1.5 py-0.5 text-[10px] text-amber-400">
            <Activity size={10} />
            演示模式
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* 刷新间隔选择 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500">刷新</span>
            <select
              value={interval}
              onChange={(e) => setIntervalDuration(Number(e.target.value))}
              className="rounded border border-slate-700/50 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 outline-none"
            >
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={loading || selected.length === 0}
            className="flex items-center gap-1 rounded-md border border-slate-600/50 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>

          {/* 扫描主机 */}
          <button
            onClick={scanHosts}
            className="flex items-center gap-1 rounded-md border border-slate-600/50 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <Server size={13} />
            扫描
          </button>
        </div>
      </div>

      {/* 主机选择 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/30 px-4 py-2 overflow-x-auto">
        <span className="text-[11px] text-slate-500 shrink-0">选择主机:</span>
        {hosts.length === 0 ? (
          <span className="text-[11px] text-slate-600">暂无已连接的 SSH 主机</span>
        ) : (
          hosts.map((h) => (
            <button
              key={h.id}
              onClick={() => toggleHost(h.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] transition-colors ${
                selected.includes(h.id)
                  ? 'bg-smartbox-600/30 text-smartbox-300 border border-smartbox-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/30 hover:text-slate-300'
              }`}
            >
              {h.name}
            </button>
          ))
        )}
      </div>

      {error && (
        <div className="shrink-0 px-4 py-2 text-[11px] text-red-400 bg-red-900/20 border-b border-red-800/30">{error}</div>
      )}

      {/* 主机看板 */}
      <div className="flex-1 overflow-auto p-4">
        {selected.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Activity size={48} className="mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-500">请选择要监控的主机</p>
              <p className="mt-1 text-[11px] text-slate-600">先点击「扫描」加载已连接的 SSH 主机</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {selected.map((id) => {
              const s = stats[id]
              const h = history[id] || []

              return (
                <div key={id} className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4">
                  {/* 主机头部 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Server size={14} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">{hosts.find((h) => h.id === id)?.name || id.slice(0, 8)}</span>
                      <span className="text-[11px] text-slate-500">{s?.host || ''}</span>
                      {s && <span className="text-[10px] text-slate-600">{new Date(s.timestamp).toLocaleTimeString()}</span>}
                    </div>
                    {s && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>运行 {s.uptime}</span>
                        {s.loadAvg && <span className="ml-1">| 负载 {s.loadAvg}</span>}
                      </div>
                    )}
                  </div>

                  {!s ? (
                    <div className="flex items-center justify-center py-8 text-[12px] text-slate-600">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      正在采集数据...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* CPU */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Cpu size={12} className="text-cyan-500" />
                          <ProgressBar value={s.cpu} label="CPU" color="from-cyan-500 to-cyan-400" />
                        </div>
                        <Sparkline data={h.map((p) => p.cpu)} color="#06b6d4" />
                      </div>

                      {/* 内存 */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MemoryStick size={12} className="text-violet-500" />
                          <ProgressBar
                            value={s.memory.pct}
                            label="内存"
                            sub={`${formatBytes(s.memory.used * 1024)} / ${formatBytes(s.memory.total * 1024)}`}
                            color="from-violet-500 to-violet-400"
                          />
                        </div>
                        <Sparkline data={h.map((p) => p.mem)} color="#8b5cf6" />
                      </div>

                      {/* 磁盘 */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <HardDrive size={12} className="text-emerald-500" />
                          <ProgressBar
                            value={s.disk.pct}
                            label="磁盘 /"
                            sub={`${formatBytes(s.disk.used * 1024)} / ${formatBytes(s.disk.total * 1024)}`}
                            color="from-emerald-500 to-emerald-400"
                          />
                        </div>
                        <Sparkline data={h.map((p) => p.disk)} color="#10b981" />
                      </div>

                      {/* 网络 */}
                      <div className="flex items-center gap-4 pt-1 border-t border-slate-700/30">
                        <Network size={12} className="text-amber-500" />
                        <div className="flex gap-4 text-[11px]">
                          <span className="text-slate-400">
                            ↓ <span className="text-slate-300 font-mono">{formatSpeed(s.netRx)}</span>
                          </span>
                          <span className="text-slate-400">
                            ↑ <span className="text-slate-300 font-mono">{formatSpeed(s.netTx)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── 告警面板 ─── */}
        <div className="mt-4 space-y-3">
          <AlertSettings />
          <AlertHistory />
        </div>
      </div>
    </div>
  )
}
