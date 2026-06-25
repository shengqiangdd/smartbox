/**
 * 告警历史面板
 *
 * 展示最近的告警事件记录，支持清空和折叠。
 */

import { useState } from 'react'
import {
  History,
  ChevronDown,
  ChevronRight,
  Trash2,
  ShieldAlert,
  Shield,
  Clock,
} from 'lucide-react'
import { useAlertStore } from '../../stores/alert-store'
import type { AlertEvent } from '../../stores/alert-store'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts

  // 1 分钟内
  if (diff < 60_000) return '刚刚'
  // 1 小时内
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  // 24 小时内
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  // 更久
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MetricBadge({ metric }: { metric: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    cpu: { text: 'CPU', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/30' },
    memory: { text: '内存', color: 'bg-violet-900/40 text-violet-400 border-violet-500/30' },
    disk: { text: '磁盘', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' },
  }
  const info = labels[metric] || { text: metric, color: 'bg-slate-800 text-slate-400 border-slate-700' }
  return (
    <span className={`rounded border px-1 py-0.5 text-[9px] font-medium ${info.color}`}>
      {info.text}
    </span>
  )
}

function EventRow({ event }: { event: AlertEvent }) {
  const isCritical = event.severity === 'critical'

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] transition-colors ${
        isCritical
          ? 'bg-red-900/10 border border-red-500/10 hover:bg-red-900/20'
          : 'bg-amber-900/10 border border-amber-500/10 hover:bg-amber-900/20'
      }`}
    >
      {/* 严重级别图标 */}
      {isCritical ? (
        <ShieldAlert size={13} className="shrink-0 text-red-400" />
      ) : (
        <Shield size={13} className="shrink-0 text-amber-400" />
      )}

      {/* 主机名 */}
      <span className="shrink-0 font-medium text-slate-300 max-w-[100px] truncate">
        {event.hostName}
      </span>

      {/* 指标 */}
      <MetricBadge metric={event.metric} />

      {/* 数值 */}
      <span className={`font-mono ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
        {event.value}%
      </span>
      <span className="text-slate-600">/</span>
      <span className="text-slate-500">{event.threshold}%</span>

      {/* 时间 */}
      <span className="ml-auto shrink-0 text-[10px] text-slate-600 flex items-center gap-1">
        <Clock size={10} />
        {formatTime(event.timestamp)}
      </span>
    </div>
  )
}

export default function AlertHistory() {
  const { history, clearHistory } = useAlertStore()
  const [expanded, setExpanded] = useState(false)

  const recentCount = history.filter(
    (e) => Date.now() - e.timestamp < 3_600_000,
  ).length

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/60">
      {/* 标题栏 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-700/20"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-slate-500" />
        ) : (
          <ChevronRight size={14} className="text-slate-500" />
        )}
        <History size={14} className="text-smartbox-400" />
        <span className="text-xs font-medium text-slate-300">告警历史</span>
        <span className="ml-1 text-[10px] text-slate-600">
          {history.length} 条记录
        </span>
        {recentCount > 0 && (
          <span className="ml-1 rounded-full bg-red-900/30 px-1.5 py-0.5 text-[9px] font-medium text-red-400 border border-red-500/20">
            最近 1 小时 {recentCount} 条
          </span>
        )}

        {/* 清空按钮 */}
        {history.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearHistory()
            }}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-600 transition-colors hover:bg-red-900/20 hover:text-red-400"
          >
            <Trash2 size={10} />
            清空
          </button>
        )}
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="border-t border-slate-700/30 px-3 py-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <History size={24} className="mb-2 text-slate-700" />
              <p className="text-[11px] text-slate-600">暂无告警记录</p>
              <p className="text-[10px] text-slate-700 mt-0.5">当指标超过阈值时，告警会记录在这里</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-auto">
              {history.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
