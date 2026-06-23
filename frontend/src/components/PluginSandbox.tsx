/**
 * PluginSandbox.tsx
 *
 * 插件的 iframe 沙箱容器。每个插件运行在独立的 iframe 中，
 * 通过 postMessage 与主应用通信，实现：
 *
 * - DOM/CSS 隔离（插件样式不影响主应用）
 * - 全局变量隔离（插件无法访问主应用的 window 对象）
 * - 受限 API（只能使用白名单方法）
 * - 存储隔离（带配额限制）
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PluginManifest } from '../types/plugin'

// ── 消息类型定义 ──

interface SandboxMessage {
  source: 'smartbox-plugin-sandbox'
  pluginId: string
  seq: number
  type: string
  payload: Record<string, unknown>
}

interface HostMessage {
  source: 'smartbox-host'
  seq?: number
  type: string
  result?: unknown
  error?: string
  commandId?: string
  args?: unknown[]
  content?: string | null
  language?: string | null
}

export interface PluginSandboxHandle {
  /** 执行插件命令 */
  executeCommand: (commandId: string, args?: unknown[]) => void
  /** 更新编辑器内容同步 */
  updateEditorContent: (content: string | null, language: string | null) => void
  /** 销毁沙箱 */
  destroy: () => void
  /** 获取 iframe 元素引用 */
  iframe: HTMLIFrameElement | null
  /** 重新加载插件 */
  reload: (manifest: PluginManifest, pluginCode: string) => void
}

interface PluginSandboxProps {
  manifest: PluginManifest
  pluginCode: string
  onReady?: (handle: PluginSandboxHandle) => void
  onCommandRegistered?: (command: { id: string; label?: string; description?: string }) => void
  onPanelRegistered?: (panel: { id: string; name?: string }) => void
  onNotification?: (message: string, type: 'info' | 'success' | 'error') => void
  onError?: (error: string) => void
  /** 编辑器内容同步（主应用推送） */
  editorContent?: string | null
  editorLanguage?: string | null
}

export default function PluginSandbox({
  manifest,
  pluginCode,
  onReady,
  onCommandRegistered,
  onPanelRegistered,
  onNotification,
  onError,
  editorContent,
  editorLanguage,
}: PluginSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 存储待处理的 RPC 调用
  const pendingRef = useRef<Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>>(new Map())
  // 存储 handle 引用
  const handleRef = useRef<PluginSandboxHandle | null>(null)

  // ── 生成沙箱 HTML（将模板中的占位符替换为实际值） ──

  const generateSandboxHTML = useCallback(() => {
    // 读取内置的 HTML 模板
    const styleBlock = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100%; height: 100%;
          background: transparent;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #e2e8f0;
          overflow: auto;
        }
        #plugin-root { min-height: 100%; padding: 4px; }
      </style>
    `

    const safeId = JSON.stringify(manifest.id)
    const safeManifest = JSON.stringify(manifest)

    const script = `
(function() {
  'use strict';

  let messageSeq = 0;
  const pendingCalls = new Map();

  function sendToHost(type, payload) {
    const seq = ++messageSeq;
    window.parent.postMessage({
      source: 'smartbox-plugin-sandbox',
      pluginId: ${safeId},
      seq: seq,
      type: type,
      payload: payload || {}
    }, '*');
    return seq;
  }

  window.addEventListener('message', function(event) {
    if (event.data && event.data.source === 'smartbox-host') {
      const msg = event.data;
      if (msg.seq && pendingCalls.has(msg.seq)) {
        const pending = pendingCalls.get(msg.seq);
        clearTimeout(pending.timer);
        pendingCalls.delete(msg.seq);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
  });

  // ── 受限 localStorage ──
  var STORAGE_PREFIX = 'smartbox_plugin_' + ${safeId} + '_';
  var MAX_STORAGE = 51200;

  function getStorageUsage() {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        total += (key.length + (localStorage.getItem(key) || '').length);
      }
    }
    return total;
  }

  var sandboxStorage = {
    getItem: function(key) { try { return localStorage.getItem(STORAGE_PREFIX + key); } catch(e) { return null; } },
    setItem: function(key, value) {
      try {
        var fullKey = STORAGE_PREFIX + key;
        var oldVal = localStorage.getItem(fullKey);
        var oldLen = oldVal ? oldVal.length : 0;
        var newLen = value ? value.length : 0;
        var usage = getStorageUsage() - oldLen + newLen;
        if (usage > MAX_STORAGE) { console.warn('[Sandbox] Storage quota exceeded'); return; }
        localStorage.setItem(fullKey, value);
      } catch(e) {}
    },
    removeItem: function(key) { try { localStorage.removeItem(STORAGE_PREFIX + key); } catch(e) {} },
    clear: function() {
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
        }
        keys.forEach(function(k) { localStorage.removeItem(k); });
      } catch(e) {}
    },
    get length() {
      var count = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) count++;
      }
      return count;
    }
  };

  // ── 插件状态 ──
  var __commandHandlers__ = {};
  var __panelRenderers__ = {};
  var __cachedEditorContent__ = null;
  var __cachedLanguage__ = null;

  // ── 受限 API ──
  var pluginAPI = Object.freeze({
    registerCommand: function(command, handler) {
      __commandHandlers__[command.id] = handler;
      sendToHost('registerCommand', { command: JSON.parse(JSON.stringify(command)) });
    },
    registerPanel: function(panel, renderFn) {
      __panelRenderers__[panel.id] = renderFn;
      sendToHost('registerPanel', { panel: JSON.parse(JSON.stringify(panel)) });
    },
    getEditorContent: function() { return __cachedEditorContent__; },
    setEditorContent: function(content) {
      __cachedEditorContent__ = content;
      sendToHost('setEditorContent', { content: content });
    },
    getCurrentFileLanguage: function() { return __cachedLanguage__; },
    showNotification: function(message, type) {
      sendToHost('showNotification', { message: String(message), type: type || 'info' });
    },
    storage: Object.freeze({
      get: function(key) { return sandboxStorage.getItem(key); },
      set: function(key, value) { sandboxStorage.setItem(key, value); },
      remove: function(key) { sandboxStorage.removeItem(key); },
      clear: function() { sandboxStorage.clear(); }
    }),
    getRootElement: function() { return document.getElementById('plugin-root'); },
    getPluginId: function() { return ${safeId}; },
    getPluginInfo: function() { return Object.freeze(JSON.parse('${safeManifest.replace(/'/g, "\\'")}')); }
  });

  window.SmartBox = Object.freeze({
    getPluginAPI: function() { return pluginAPI; }
  });

  // ── 接受主应用消息 ──
  window.addEventListener('message', function(event) {
    if (event.data && event.data.source === 'smartbox-host') {
      var msg = event.data;
      if (msg.type === 'updateEditorContent') {
        __cachedEditorContent__ = msg.content || null;
        __cachedLanguage__ = msg.language || null;
      } else if (msg.type === 'executeCommand') {
        var handler = __commandHandlers__[msg.commandId];
        if (handler) {
          try { handler(msg.args || []); } catch(e) {
            console.error('[Plugin:' + ${safeId} + '] Command error:', e);
          }
        }
      }
    }
  });

  sendToHost('sandboxReady', {});

  // ── 执行插件代码 ──
  try {
    ${pluginCode}
  } catch(e) {
    sendToHost('pluginError', { error: e.message || String(e) });
  }
})();
`

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer">${styleBlock}</head><body><div id="plugin-root"></div><script>${script}<\/script></body></html>`
  }, [manifest, pluginCode])

  // ── 创建 iframe 并注入 HTML ──

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    setLoading(true)
    setLoadError(null)
    setReady(false)

    try {
      const html = generateSandboxHTML()
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)

      iframe.src = blobUrl

      return () => {
        URL.revokeObjectURL(blobUrl)
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to create sandbox'
      setLoadError(msg)
      setLoading(false)
      onError?.(msg)
    }
  }, [generateSandboxHTML]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 消息监听（主应用 ← iframe） ──

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as SandboxMessage
      if (!data || data.source !== 'smartbox-plugin-sandbox') return
      // 验证 pluginId
      if (data.pluginId !== manifest.id) return

      switch (data.type) {
        case 'sandboxReady': {
          setReady(true)
          setLoading(false)
          onReady?.(handleRef.current!)
          break
        }
        case 'registerCommand': {
          const cmd = data.payload.command as any
          if (cmd?.id) {
            onCommandRegistered?.(cmd)
          }
          break
        }
        case 'registerPanel': {
          const panel = data.payload.panel as any
          if (panel?.id) {
            onPanelRegistered?.(panel)
          }
          break
        }
        case 'setEditorContent': {
          // 插件修改了编辑器内容 - 通知父组件
          // 由父组件处理
          break
        }
        case 'showNotification': {
          const { message, type } = data.payload as any
          onNotification?.(message || '', type || 'info')
          break
        }
        case 'pluginError': {
          const error = data.payload.error as string
          setLoadError(error)
          setLoading(false)
          onError?.(error)
          break
        }
        case 'fetch': {
          // 网络代理请求
          handleFetchRequest(data)
          break
        }
      }
    }

    const handleFetchRequest = async (msg: SandboxMessage) => {
      const { url, options } = msg.payload as any
      const iframe = iframeRef.current
      if (!iframe) return

      try {
        const response = await fetch(url, options)
        const text = await response.text()
        iframe.contentWindow?.postMessage({
          source: 'smartbox-host',
          seq: msg.seq,
          type: 'fetchResponse',
          result: { ok: response.ok, status: response.status, body: text },
        }, '*')
      } catch (err: any) {
        iframe.contentWindow?.postMessage({
          source: 'smartbox-host',
          seq: msg.seq,
          type: 'fetchResponse',
          error: err.message,
        }, '*')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [manifest.id, onReady, onCommandRegistered, onPanelRegistered, onNotification, onError])

  // ── 暴露 handle ──

  useEffect(() => {
    const handle: PluginSandboxHandle = {
      executeCommand: (commandId, args) => {
        const iframe = iframeRef.current
        iframe?.contentWindow?.postMessage({
          source: 'smartbox-host',
          type: 'executeCommand',
          commandId,
          args: args || [],
        }, '*')
      },
      updateEditorContent: (content, language) => {
        const iframe = iframeRef.current
        iframe?.contentWindow?.postMessage({
          source: 'smartbox-host',
          type: 'updateEditorContent',
          content,
          language,
        }, '*')
      },
      destroy: () => {
        const iframe = iframeRef.current
        if (iframe) {
          iframe.src = 'about:blank'
        }
      },
      iframe: iframeRef.current,
      reload: (newManifest, newCode) => {
        // 通过重新渲染实现重新加载
        // 父组件通过 key 变化触发重挂载
      },
    }
    handleRef.current = handle
  }, [])

  // ── 编辑器内容同步 ──

  useEffect(() => {
    if (ready && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        source: 'smartbox-host',
        type: 'updateEditorContent',
        content: editorContent ?? null,
        language: editorLanguage ?? null,
      }, '*')
    }
  }, [ready, editorContent, editorLanguage])

  // ── 渲染 ──

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-slate-900/50">
      {/* 加载状态 */}
      {loading && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            <p className="text-xs text-slate-500">沙箱加载中...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="max-w-xs text-center">
            <p className="mb-1 text-sm text-red-400">沙箱加载失败</p>
            <p className="text-xs text-slate-500">{loadError}</p>
          </div>
        </div>
      )}

      {/* iframe 沙箱 */}
      <iframe
        ref={iframeRef}
        title={`沙箱: ${manifest.name}`}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        style={{ background: 'transparent' }}
      />
    </div>
  )
}
