/**
 * pluginSandboxManager.ts
 *
 * 轻量级插件沙箱管理器 — 管理插件的沙箱实例和命令分发。
 */

import type { PluginSandboxHandle } from '../components/PluginSandbox'

export interface PluginMeta {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  icon?: string
  entry?: string
  commands?: {
    id: string
    name: string
    label?: string
    description?: string
    icon?: string
  }[]
  panels?: {
    id: string
    name: string
    icon?: string
    position: 'header' | 'sidebar' | 'main' | 'statusbar' | 'modal'
  }[]
}

interface SandboxInstance {
  meta: PluginMeta
  handle: PluginSandboxHandle
  registeredAt: number
}

class PluginSandboxManager {
  private instances = new Map<string, SandboxInstance>()

  register(meta: PluginMeta, handle: PluginSandboxHandle) {
    this.instances.set(meta.id, { meta, handle, registeredAt: Date.now() })
  }

  unregister(pluginId: string) {
    const inst = this.instances.get(pluginId)
    if (inst) {
      try {
        inst.handle.destroy()
      } catch {
        /* */
      }
      this.instances.delete(pluginId)
    }
  }

  getHandle(pluginId: string): PluginSandboxHandle | undefined {
    return this.instances.get(pluginId)?.handle
  }

  executeCommand(pluginId: string, commandId: string, args?: unknown[]) {
    const inst = this.instances.get(pluginId)
    if (inst) {
      inst.handle.executeCommand(commandId, args)
    } else {
      console.warn(`[PluginManager] No sandbox for plugin "${pluginId}"`)
    }
  }

  isRegistered(pluginId: string) {
    return this.instances.has(pluginId)
  }

  syncEditorContent(content: string, language: string | null) {
    for (const inst of this.instances.values()) {
      try {
        inst.handle.updateEditorContent(content, language)
      } catch {
        /* */
      }
    }
  }
}

export const pluginSandboxManager = new PluginSandboxManager()
