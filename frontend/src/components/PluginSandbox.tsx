/**
 * PluginSandbox.tsx
 *
 * 插件沙箱容器 — 直接在主线程执行插件代码，通过受限 API 对象隔离。
 * 比 iframe 方案更可靠（无 postMessage 通信丢失问题）。
 */

import { useEffect, useRef } from 'react'
import type { PluginManifest } from '../types/plugin'

export interface PluginSandboxHandle {
  executeCommand: (commandId: string, args?: unknown[]) => void
  updateEditorContent: (content: string | null, language: string | null) => void
  destroy: () => void
  iframe: null
  reload: (manifest: PluginManifest, pluginCode: string) => void
}

interface PluginSandboxProps {
  manifest: PluginManifest
  pluginCode: string
  onReady?: (handle: PluginSandboxHandle) => void
  onError?: (error: string) => void
}

export default function PluginSandbox({
  manifest,
  pluginCode,
  onReady,
  onError,
}: PluginSandboxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<PluginSandboxHandle | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !pluginCode) return

    // 清理旧实例
    cleanupRef.current?.()

    const commandHandlers: Record<string, (args: unknown[]) => void> = {}
    let destroyed = false

    // 构建受限 API
    const rootEl = document.createElement('div')
    rootEl.id = 'plugin-root'
    rootEl.className = 'plugin-root'
    rootEl.style.cssText = 'width:100%;height:100%;overflow:auto;'
    container.appendChild(rootEl)

    const pluginAPI = {
      registerCommand: (idOrDef: string | { id: string; label?: string; description?: string }, secondArg?: unknown) => {
        let id: string, handler: (args: unknown[]) => void
        if (typeof idOrDef === 'string') {
          id = idOrDef
          const def = secondArg as Record<string, unknown> | undefined
          handler = ((def?.execute as (args: unknown[]) => void) || (def as unknown as (args: unknown[]) => void)) || (() => {})
        } else {
          id = idOrDef.id
          handler = (secondArg as (args: unknown[]) => void) || (() => {})
        }
        commandHandlers[id] = handler
      },
      getEditorContent: () => null,
      setEditorContent: () => {},
      getCurrentFileLanguage: () => null,
      showNotification: (message: string, type?: string) => {
        window.dispatchEvent(
          new CustomEvent('wrench-notification', {
            detail: { message: String(message), type: type || 'info', duration: 4000 },
          }),
        )
      },
      storage: (() => {
        const PREFIX = `wrench_plugin_${manifest.id}_`
        return {
          get: (key: string) => {
            try { return localStorage.getItem(PREFIX + key) } catch { return null }
          },
          set: (key: string, value: string) => {
            try { localStorage.setItem(PREFIX + key, value) } catch { /* */ }
          },
          remove: (key: string) => {
            try { localStorage.removeItem(PREFIX + key) } catch { /* */ }
          },
          clear: () => {
            try {
              const keys: string[] = []
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i)
                if (k?.startsWith(PREFIX)) keys.push(k)
              }
              keys.forEach((k) => localStorage.removeItem(k))
            } catch { /* */ }
          },
        }
      })(),
      getRootElement: () => rootEl,
      getPluginId: () => manifest.id,
      getPluginInfo: () => Object.freeze({ ...manifest }),
    }

    // 暴露到全局
    const Wrench = { getPluginAPI: () => pluginAPI }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    w.Wrench = Wrench
    w.SmartBox = Wrench

    // 执行插件代码
    try {
      const fn = new Function('Wrench', 'SmartBox', 'pluginAPI', 'rootEl', pluginCode)
      fn(Wrench, Wrench, pluginAPI, rootEl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[PluginSandbox] ${manifest.name} error:`, msg)
      onError?.(msg)
      return
    }

    // 构建 handle
    const handle: PluginSandboxHandle = {
      executeCommand: (commandId, args) => {
        const handler = commandHandlers[commandId]
        if (handler) {
          try { handler(args || []) } catch (err) {
            console.error(`[PluginSandbox] Command ${commandId} error:`, err)
          }
        }
      },
      updateEditorContent: () => {},
      destroy: () => {
        destroyed = true
        container.removeChild(rootEl)
      },
      iframe: null,
      reload: () => {},
    }
    handleRef.current = handle

    // 通知 ready
    onReady?.(handle)

    cleanupRef.current = () => {
      if (!destroyed) {
        destroyed = true
        try { container.removeChild(rootEl) } catch { /* */ }
      }
    }

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [manifest, pluginCode, onReady, onError])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
    />
  )
}
