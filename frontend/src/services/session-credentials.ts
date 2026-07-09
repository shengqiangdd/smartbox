/**
 * session-credentials.ts — 模块级凭据存储
 *
 * 用于在 SshPlaceholder 和 FileManager 之间共享 SSH 凭据。
 * 使用模块级 Map 而非 useRef，避免 React refs-during-render 限制。
 */

import type { SshCredentials } from '../modules/ssh/Terminal'

/** 每个 session 的解密凭据（供 Terminal 组件建立独立 WS 连接使用） */
export const sessionCredentials = new Map<string, SshCredentials>()

/** 设置 session 凭据 */
export function setSessionCredentials(sessionId: string, credentials: SshCredentials): void {
  sessionCredentials.set(sessionId, credentials)
}

/** 删除 session 凭据 */
export function deleteSessionCredentials(sessionId: string): void {
  sessionCredentials.delete(sessionId)
}

/** 获取 session 凭据 */
export function getSessionCredentials(sessionId: string): SshCredentials | undefined {
  return sessionCredentials.get(sessionId)
}
