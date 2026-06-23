import { useState, useEffect, useCallback } from 'react'
import {
  Server,
  PanelRightClose,
  PanelRightOpen,
  Columns2,
  Layout,
  Plus,
} from 'lucide-react'
import { useSshStore } from '../../stores/ssh-store'
import { useAppStore } from '../../stores/app-store'
import { getWsClient, type WsStatus } from '../../services/websocket'
import ConnectionList from './ConnectionList'
import TerminalView from './Terminal'
import { SplitContainer, type SplitDef } from './Terminal'
import SftpSidebar from './SftpSidebar'
import type { SshSession } from '../../types/ssh'

export default function SshPlaceholder() {
  const connections = useSshStore((s) => s.connections)
  const selectedConnectionId = useSshStore((s) => s.selectedConnectionId)
  const selectConnection = useSshStore((s) => s.selectConnection)
  const sessions = useSshStore((s) => s.sessions)
  const addSession = useSshStore((s) => s.addSession)
  const removeSession = useSshStore((s) => s.removeSession)
  const addSshSession = useAppStore((s) => s.addSshSession)
  const removeSshSession = useAppStore((s) => s.removeSshSession)

  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected')
  const [connecting, setConnecting] = useState(false)
  const [sftpOpen, setSftpOpen] = useState(true)

  // 分屏状态: 分屏定义列表
  const [splits, setSplits] = useState<SplitDef[]>([])
  // 当前激活的分屏 ID
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null)

  const wsClient = getWsClient()

  // 监听 WebSocket 状态
  useEffect(() => {
    const unsub = wsClient.onStatus((status) => {
      setWsStatus(status)
    })
    wsClient.connect()
    return () => {
      unsub()
    }
  }, [])

  // ─── 建立 SSH 连接（统一入口） ───

  const handleConnect = useCallback(async (connectionId: string) => {
    const conn = connections.find((c) => c.id === connectionId)
    if (!conn || connecting) return

    setConnecting(true)
    const sessionId = `sess_${connectionId}_${Date.now()}`

    try {
      await wsClient.request({
        type: 'connect',
        connectionId: sessionId,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        privateKey: conn.privateKey,
      })

      const session: SshSession = {
        id: sessionId,
        connectionId,
        connectionName: conn.name,
        host: conn.host,
        status: 'connected',
        terminalCols: 80,
        terminalRows: 24,
      }
      addSession(session)
      addSshSession(sessionId)
      selectConnection(sessionId)
      return sessionId
    } catch (err) {
      console.error('SSH 连接失败:', err)
      return null
    } finally {
      setConnecting(false)
    }
  }, [connections, connecting, wsClient, addSession, addSshSession, selectConnection])

  // ─── 在分屏中打开连接 ───

  const openInSplit = useCallback(async (connectionId: string) => {
    const sessionId = await handleConnect(connectionId)
    if (!sessionId) return

    const newSplit: SplitDef = {
      id: `split_${Date.now()}`,
      connectionId: sessionId,
      sessionId,
      direction: 'horizontal',
    }

    setSplits((prev) => [...prev, newSplit])
    setActiveSplitId(newSplit.id)
  }, [handleConnect])

  // ─── 分屏操作 ───

  const handleSplit = useCallback((id: string, direction: 'vertical' | 'horizontal') => {
    setSplits((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev

      const target = prev[idx]
      const existingConnId = sessions[0]?.connectionId || ''
      const newSessionId = `sess_${existingConnId || 'new'}_${Date.now()}`

      // 复用同一个 SSH 连接但不同 session（分屏连接到同一个服务器）
      const newSplit: SplitDef = {
        id: `split_${Date.now()}`,
        connectionId: target.connectionId,
        sessionId: newSessionId,
        direction,
      }

      const result = [...prev]
      result.splice(idx + 1, 0, newSplit)
      return result
    })
  }, [sessions])

  const handleRemoveSplit = useCallback((id: string) => {
    setSplits((prev) => {
      const result = prev.filter((s) => s.id !== id)
      if (result.length === 0 && activeSplitId === id) {
        setActiveSplitId(null)
      }
      return result
    })
  }, [activeSplitId])

  const handleSplitConnectionChange = useCallback((splitId: string, newConnectionId: string) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.id === splitId ? { ...s, connectionId: newConnectionId, sessionId: `sess_${newConnectionId}_${Date.now()}` } : s,
      ),
    )
  }, [])

  // ─── 断开连接 ───

  const handleDisconnect = useCallback((sessionId: string) => {
    wsClient.send({
      type: 'disconnect',
      connectionId: sessionId,
    })
    removeSession(sessionId)
    removeSshSession(sessionId)
    selectConnection(null)

    // 同时清理相关的分屏
    setSplits((prev) => prev.filter((s) => s.sessionId !== sessionId && s.connectionId !== sessionId))
  }, [wsClient, removeSession, removeSshSession, selectConnection])

  // ─── 从连接列表直接连接（传统方式） ───

  const handleDirectConnect = useCallback(async (connectionId: string) => {
    const sessionId = await handleConnect(connectionId)
    if (sessionId) {
      // 使用单终端模式（不分屏）
      setSplits([])
    }
  }, [handleConnect])

  // ─── 渲染 ───

  const activeSession = sessions.find(
    (s) => s.id === selectedConnectionId && s.status === 'connected',
  )
  const allSessions = sessions.filter((s) => s.status === 'connected')

  // 分屏连接选项列表
  const connectionOptions = allSessions.length > 0
    ? allSessions.map((s) => ({ id: s.id, name: s.connectionName }))
    : connections.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="flex h-full">
      {/* 左侧连接列表 */}
      <div className="flex w-64 shrink-0 flex-col border-r border-slate-700/50 md:w-72">
        <div className="flex items-center gap-2 border-b border-slate-700/50 px-3 py-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              wsStatus === 'connected'
                ? 'bg-emerald-500'
                : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-[11px] text-slate-500">
            {wsStatus === 'connected'
              ? '已连接'
              : wsStatus === 'connecting'
                ? '连接中...'
                : wsStatus === 'reconnecting'
                  ? '重连中...'
                  : '未连接'}
          </span>
          <button
            onClick={() => wsClient.connect()}
            className="ml-auto text-[10px] text-slate-600 hover:text-slate-400"
          >
            {wsStatus === 'disconnected' ? '重连' : ''}
          </button>
        </div>
        <ConnectionList onConnect={handleDirectConnect} />
      </div>

      {/* 中间终端区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {allSessions.length > 0 ? (
          <>
            {/* 标签栏 */}
            <div className="flex items-center border-b border-slate-700/50 bg-slate-900/50">
              {allSessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => selectConnection(sess.id)}
                  className={`flex items-center gap-1.5 border-r border-slate-700/50 px-3 py-2 text-xs transition-colors ${
                    sess.id === selectedConnectionId
                      ? 'bg-slate-800 text-slate-200'
                      : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {sess.connectionName}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDisconnect(sess.id)
                    }}
                    className="ml-1 text-slate-600 hover:text-red-400"
                  >
                    ✕
                  </button>
                </button>
              ))}

              {/* 操作按钮组 */}
              <div className="ml-auto flex items-center">
                {/* 分屏按钮 */}
                {splits.length === 0 && (
                  <>
                    <button
                      onClick={() => openInSplit(activeSession?.connectionId || connections[0]?.id || '')}
                      className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-300"
                      title="分屏打开"
                    >
                      <Columns2 size={14} />
                      <span className="hidden md:inline">分屏</span>
                    </button>
                    <div className="mx-1 h-4 w-px bg-slate-700/50" />
                  </>
                )}

                {/* SFTP 切换按钮 */}
                <button
                  onClick={() => setSftpOpen(!sftpOpen)}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-300"
                  title={sftpOpen ? '关闭文件面板' : '打开文件面板'}
                >
                  {sftpOpen ? (
                    <PanelRightClose size={14} />
                  ) : (
                    <PanelRightOpen size={14} />
                  )}
                  <span className="hidden md:inline">文件</span>
                </button>
              </div>
            </div>

            {/* 终端区域 */}
            <div className="flex flex-1 overflow-hidden">
              {splits.length > 0 ? (
                /* 分屏模式 */
                <SplitContainer
                  splits={splits}
                  onSplit={handleSplit}
                  onRemove={handleRemoveSplit}
                  onConnectionChange={handleSplitConnectionChange}
                  connections={connectionOptions}
                />
              ) : activeSession ? (
                /* 单终端模式 */
                <TerminalView
                  connectionId={activeSession.id}
                  sessionId={activeSession.id}
                  className="flex-1"
                />
              ) : null}

              {/* SFTP 侧边栏 */}
              {sftpOpen && activeSession && (
                <div className="w-64 shrink-0 border-l border-slate-700/50 md:w-72">
                  <SftpSidebar sessionId={activeSession.id} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Server size={48} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-500">
                {wsStatus === 'connected'
                  ? '选择一个连接或新建连接'
                  : 'WebSocket 未连接，请稍候...'}
              </p>
              {connections.length > 0 && (
                <div className="mt-4 space-y-1">
                  {connections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => handleDirectConnect(conn.id)}
                      disabled={connecting}
                      className="btn-ghost mx-auto block w-64 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{conn.name}</span>
                        <span className="ml-auto text-xs text-slate-600">
                          {conn.username}@{conn.host}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {connecting && (
                <p className="mt-3 text-xs text-slate-600">连接中...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
