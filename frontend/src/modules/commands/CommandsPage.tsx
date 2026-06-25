import { useState, useCallback } from 'react'
import { Zap, PanelLeftOpen, PanelLeftClose, Terminal } from 'lucide-react'
import { useAppStore } from '../../stores/app-store'
import { useCommands } from './useCommands'
import CommandsList from './CommandsList'
import CommandOutput from './CommandOutput'
import CommandFormModal from './CommandFormModal'
import type { QuickCommand } from './index'

export default function CommandsPage() {
  const sessions = useAppStore((s) => s.sshSessions)
  const connectionId = sessions.length > 0 ? sessions[0] : null

  const {
    commandsByGroup,
    results,
    executingId,
    addCommand,
    updateCommand,
    removeCommand,
    executeCommand,
    clearResults,
    removeResult,
  } = useCommands()

  const [outputPanelOpen, setOutputPanelOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCmd, setEditCmd] = useState<QuickCommand | null>(null)

  /** 执行命令 */
  const handleExecute = useCallback(
    async (cmd: QuickCommand) => {
      if (!connectionId) return
      await executeCommand(cmd, connectionId)
    },
    [connectionId, executeCommand],
  )

  /** 复制命令到剪贴板 */
  const handleCopyToClipboard = useCallback(async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd)
    } catch {}
  }, [])

  /** 新建命令弹窗 */
  const handleOpenAdd = useCallback(() => {
    setEditCmd(null)
    setShowForm(true)
  }, [])

  /** 编辑命令 */
  const handleEdit = useCallback((cmd: QuickCommand) => {
    setEditCmd(cmd)
    setShowForm(true)
  }, [])

  /** 保存命令 */
  const handleSave = useCallback(
    (data: { name: string; command: string; description?: string; groupId: string }) => {
      if (editCmd) {
        updateCommand(editCmd.id, data)
      } else {
        addCommand(data)
      }
      setShowForm(false)
      setEditCmd(null)
    },
    [editCmd, addCommand, updateCommand],
  )

  /** 发送命令文字到终端（通过全局事件） */
  const handleSendToTerminal = useCallback((cmd: string) => {
    window.dispatchEvent(new CustomEvent('smartbox:send-to-terminal', { detail: { command: cmd } }))
  }, [])

  // 未连接
  if (!connectionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500">
        <Zap size={48} className="text-slate-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">未连接到任何 SSH</p>
          <p className="mt-1 text-xs">请先在 SSH 页面建立连接，再使用常用命令</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/50 bg-slate-900/80 px-4 py-2">
        <Zap size={18} className="text-amber-400" />
        <h1 className="text-sm font-semibold text-slate-200">常用命令</h1>
        <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
          {sessions.length > 1 ? `${sessions.length} 个连接可用` : '1 个连接'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOutputPanelOpen(!outputPanelOpen)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            title={outputPanelOpen ? '收起执行结果' : '展开执行结果'}
          >
            <Terminal size={14} />
            {outputPanelOpen ? '' : '结果'}
          </button>
        </div>
      </div>

      {/* 主体：双栏布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：命令列表 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <CommandsList
            commandsByGroup={commandsByGroup()}
            executingId={executingId}
            connectionId={connectionId}
            onExecute={handleExecute}
            onCopyToClipboard={handleCopyToClipboard}
            onAdd={handleOpenAdd}
            onEdit={handleEdit}
            onRemove={removeCommand}
            onSendToTerminal={handleSendToTerminal}
          />
        </div>

        {/* 右侧：执行结果 */}
        {outputPanelOpen && (
          <div className="w-96 shrink-0 border-l border-slate-700/30 bg-slate-900/40">
            <CommandOutput
              results={results}
              onClose={removeResult}
              onClear={clearResults}
              onSendToTerminal={handleSendToTerminal}
            />
          </div>
        )}
      </div>

      {/* 新建/编辑弹窗 */}
      {showForm && (
        <CommandFormModal
          editCmd={editCmd}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditCmd(null) }}
        />
      )}
    </div>
  )
}
