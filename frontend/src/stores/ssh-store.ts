import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { encryptSshConnection, decryptSshConnection } from '../services/secure-store'
import type { SshConnection, SshSession, SftpEntry } from '../types/ssh'

interface SshState {
  // 连接配置
  connections: SshConnection[]
  selectedConnectionId: string | null

  // 活跃会话
  sessions: SshSession[]

  // 当前 SFTP 目录
  currentSftpPath: string
  currentSftpEntries: SftpEntry[]

  // 连接配置操作
  addConnection: (conn: SshConnection) => void
  updateConnection: (id: string, data: Partial<SshConnection>) => void
  deleteConnection: (id: string) => void
  selectConnection: (id: string | null) => void

  // 会话操作
  addSession: (session: SshSession) => void
  updateSession: (id: string, data: Partial<SshSession>) => void
  removeSession: (id: string) => void

  // SFTP 操作
  setCurrentSftpPath: (path: string) => void
  setCurrentSftpEntries: (entries: SftpEntry[]) => void
}

export const useSshStore = create<SshState>()(
  persist(
    (set) => ({
      connections: [],
      selectedConnectionId: null,
      sessions: [],
      currentSftpPath: '/',
      currentSftpEntries: [],

      addConnection: (conn) =>
        set((s) => ({ connections: [...s.connections, conn] })),

      updateConnection: (id, data) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),

      deleteConnection: (id) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
          selectedConnectionId:
            s.selectedConnectionId === id ? null : s.selectedConnectionId,
        })),

      selectConnection: (id) => set({ selectedConnectionId: id }),

      addSession: (session) =>
        set((s) => ({ sessions: [...s.sessions, session] })),

      updateSession: (id, data) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, ...data } : sess,
          ),
        })),

      removeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
        })),

      setCurrentSftpPath: (path) => set({ currentSftpPath: path }),
      setCurrentSftpEntries: (entries) => set({ currentSftpEntries: entries }),
    }),
    {
      name: 'smartbox-ssh',
      partialize: (state) => ({
        connections: state.connections,
        selectedConnectionId: state.selectedConnectionId,
      }),
      merge: (persisted: unknown, current: SshState) => {
        const raw = persisted as {
          connections?: SshConnection[]
          selectedConnectionId?: string | null
          state?: {
            connections?: SshConnection[]
            selectedConnectionId?: string | null
          }
        }
        const state = raw.state || raw
        const connections = (state.connections || []) as SshConnection[]
        return {
          ...current,
          connections,
          selectedConnectionId: state.selectedConnectionId ?? null,
        }
      },
    },
  ),
)

/** 触发 store 重新从 localStorage 读取 */
export const refreshSshStore = () => {
  const raw = localStorage.getItem('smartbox-ssh')
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    const state = parsed.state || parsed
    const connections = (state.connections || []) as SshConnection[]
    useSshStore.setState({
      connections,
      selectedConnectionId: state.selectedConnectionId ?? null,
    })
  } catch { /* ignore */ }
}

/**
 * 初始化时解密所有连接的敏感字段
 * 由于 decrypt 是异步的，而 zustand persist 的 merge 是同步的，
 * 我们采用「存加密值，用时才解密」的策略：
 * - 在 ConnectionForm 提交加密值到 store
 * - 在真正需要连接时（wsClient.connect）才解密
 *
 * 因此需要添加一个工具函数来解密单个连接
 */
export async function decryptConnection(
  conn: SshConnection,
): Promise<SshConnection> {
  const decrypted = await decryptSshConnection(conn as unknown as Record<string, unknown>)
  return decrypted as unknown as SshConnection
}
