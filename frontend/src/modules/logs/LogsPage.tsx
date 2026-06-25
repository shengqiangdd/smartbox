import { useState, useCallback } from 'react'
import { ScrollText, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { useAppStore } from '../../stores/app-store'
import LogViewer from './LogViewer'
import SourceConfig from './SourceConfig'

export default function LogsPage() {
  const sessions = useAppStore((s) => s.sshSessions)

  // 取第一个连接作为当前连接
  const currentConnId = sessions.length > 0 ? sessions[0] : null

  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [sourcePanelOpen, setSourcePanelOpen] = useState(true)

  const handleSelectPath = useCallback((path: string) => {
    setCurrentPath(path)
  }, [])

  // 未连接
  if (!currentConnId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500">
        <ScrollText size={48} className="text-slate-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">未连接到任何 SSH</p>
          <p className="mt-1 text-xs">请先在 SSH 页面建立连接，再使用日志聚合</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/50 bg-slate-900/80 px-4 py-2">
        <ScrollText size={18} className="text-sky-400" />
        <h1 className="text-sm font-semibold text-slate-200">日志聚合</h1>
        <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
          {sessions.length > 1 ? `${sessions.length} 个连接可用` : '1 个连接'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSourcePanelOpen(!sourcePanelOpen)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            title={sourcePanelOpen ? '收起日志源' : '展开日志源'}
          >
            {sourcePanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            {sourcePanelOpen ? '' : '日志源'}
          </button>
        </div>
      </div>

      {/* 主体：双栏布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：日志源列表 */}
        {sourcePanelOpen && (
          <div className="w-72 shrink-0 border-r border-slate-700/30 bg-slate-900/40">
            <SourceConfig
              connectionId={currentConnId}
              currentPath={currentPath}
              onSelectPath={handleSelectPath}
            />
          </div>
        )}

        {/* 右侧：日志查看器 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {currentPath ? (
            <LogViewer
              key={`${currentConnId}-${currentPath}`}
              connectionId={currentConnId}
              logPath={currentPath}
              onClose={() => setCurrentPath(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
              <ScrollText size={36} className="text-slate-600" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">选择日志源开始查看</p>
                <p className="mt-1 text-xs text-slate-600">
                  从左侧选择一个日志路径，或点击「自动发现」扫描服务器
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
