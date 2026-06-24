import { useState, useCallback } from 'react'
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Key,
  Globe,
  Brain,
  MessageSquare,
  ExternalLink,
  Check,
  ChevronDown,
  Server,
  Pencil,
} from 'lucide-react'
import { useAppStore } from '../../stores/app-store'
import { useAiStore } from '../../stores/ai-store'
import { AI_PROVIDERS } from '../../types/ai'
import type { AiProvider } from '../../types/ai'

export default function SettingsPanel() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  const aiConfig = useAiStore((s) => s.config)
  const setAiConfig = useAiStore((s) => s.setConfig)

  const [showApiKey, setShowApiKey] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showProviderSelector, setShowProviderSelector] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customBaseUrl, setCustomBaseUrl] = useState('')

  const themeOptions = [
    { value: 'dark' as const, label: '深色', icon: Moon },
    { value: 'light' as const, label: '浅色', icon: Sun },
    { value: 'system' as const, label: '跟随系统', icon: Monitor },
  ]

  // ── Provider 切换 ──
  const currentProvider = AI_PROVIDERS.find((p) => p.id === aiConfig.provider) || AI_PROVIDERS[0]

  const handleSelectProvider = useCallback((provider: AiProvider) => {
    if (provider.id === 'custom') {
      setAiConfig({
        provider: 'custom',
        model: '',
        baseUrl: customBaseUrl || '',
        customBaseUrl: true,
      })
      setShowProviderSelector(false)
      return
    }
    setAiConfig({
      provider: provider.id as any,
      baseUrl: provider.baseUrl,
      model: provider.defaultModel,
      customBaseUrl: false,
    })
    setShowProviderSelector(false)
    setShowCustomInput(false)
  }, [setAiConfig, customBaseUrl])

  // ── 模型切换 ──
  const allModels = currentProvider.models
  const selectedModelLabel = allModels.find((m) => m.value === aiConfig.model)?.label || aiConfig.model

  const handleSelectModel = useCallback((modelValue: string) => {
    if (modelValue === '__custom__') {
      setShowCustomInput(true)
      setShowModelSelector(false)
      return
    }
    setAiConfig({ model: modelValue })
    setShowModelSelector(false)
    setShowCustomInput(false)
  }, [setAiConfig])

  const handleSetCustomModel = useCallback(() => {
    if (customModel.trim()) {
      setAiConfig({ model: customModel.trim() })
      setShowCustomInput(false)
      setCustomModel('')
    }
  }, [customModel, setAiConfig])

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6 flex items-center gap-2">
        <Settings size={20} className="text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-200">设置</h2>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* ─── 外观 ─── */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Monitor size={14} />
            外观
          </h3>
          <div className="flex gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    theme === opt.value
                      ? 'border-smartbox-500 bg-smartbox-500/10 text-smartbox-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            当前为纯深色主题，切换浅色模式会调整主要背景色
          </p>
        </section>

        {/* ─── AI 配置 ─── */}
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Brain size={14} />
            AI Agent 配置
          </h3>

          {/* Provider 选择 */}
          <div className="mb-3">
            <label className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
              <Globe size={12} />
              AI 服务商
            </label>
            <div className="relative">
              <button
                onClick={() => setShowProviderSelector(!showProviderSelector)}
                className="input flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-200">{currentProvider.name}</span>
                  {currentProvider.description && (
                    <span className="text-[10px] text-slate-500">{currentProvider.description}</span>
                  )}
                </div>
                <ChevronDown size={14} className="text-slate-500 shrink-0" />
              </button>

              {showProviderSelector && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProviderSelector(false)} />
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
                    {AI_PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleSelectProvider(provider)}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-slate-700 ${
                          aiConfig.provider === provider.id ? 'bg-slate-700/50 text-smartbox-400' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex-1 text-left">
                          <div className="font-medium">{provider.name}</div>
                          {provider.description && (
                            <div className="mt-0.5 text-[10px] text-slate-500">{provider.description}</div>
                          )}
                        </div>
                        {aiConfig.provider === provider.id && <Check size={12} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* API Endpoint - 可编辑版本 */}
          <div className="mb-3">
            <label className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
              <Globe size={12} />
              API Base URL
              <button
                onClick={() => setAiConfig({ customBaseUrl: !aiConfig.customBaseUrl })}
                className={`ml-2 inline-flex items-center gap-1 text-[10px] transition-colors ${
                  aiConfig.customBaseUrl ? 'text-smartbox-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <Pencil size={10} />
                {aiConfig.customBaseUrl ? '自定义模式' : '预设模式'}
              </button>
            </label>
            {aiConfig.customBaseUrl ? (
              <input
                value={aiConfig.baseUrl}
                onChange={(e) => setAiConfig({ baseUrl: e.target.value })}
                className="input"
                placeholder="https://api.example.com/v1"
              />
            ) : (
              <div className="input flex items-center justify-between text-sm text-slate-400 cursor-not-allowed bg-slate-800/30">
                <span>{currentProvider.baseUrl || aiConfig.baseUrl}</span>
                <span className="text-[10px] text-slate-600">预设</span>
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="mb-3">
            <label className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
              <Key size={12} />
              API Key
              <a
                href={currentProvider.id === 'openrouter' ? 'https://openrouter.ai/keys' :
                      currentProvider.id === 'openai' ? 'https://platform.openai.com/api-keys' :
                      currentProvider.id === 'anthropic' ? 'https://console.anthropic.com/' :
                      currentProvider.id === 'google' ? 'https://aistudio.google.com/apikey' :
                      currentProvider.id === 'deepseek' ? 'https://platform.deepseek.com/api_keys' :
                      currentProvider.id === 'siliconflow' ? 'https://cloud.siliconflow.cn/account/ak' :
                      '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-0.5 text-smartbox-400 hover:text-smartbox-300"
              >
                获取 <ExternalLink size={10} />
              </a>
            </label>
            <div className="relative">
              <form onSubmit={(e) => e.preventDefault()}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ apiKey: e.target.value })}
                className="input pr-20"
                placeholder={currentProvider.id === 'openrouter' ? 'sk-or-v1-...' :
                            currentProvider.id === 'openai' ? 'sk-...' :
                            currentProvider.id === 'anthropic' ? 'sk-ant-...' : '输入 API Key'}
                autoComplete="off"
              />
              </form>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {/* 模型选择 */}
          <div className="mb-3">
            <label className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
              <MessageSquare size={12} />
              模型
              {currentProvider.models.some((m) => m.free) && (
                <span className="ml-1 text-[10px] text-emerald-500/70">
                  {currentProvider.models.filter((m) => m.free).length} 个免费模型
                </span>
              )}
            </label>

            {showCustomInput ? (
              <div className="flex items-center gap-2">
                <input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetCustomModel() }}
                  className="input flex-1"
                  placeholder="输入模型名称"
                  autoFocus
                />
                <button onClick={handleSetCustomModel} className="btn-primary text-xs whitespace-nowrap">
                  <Check size={14} /> 确认
                </button>
                <button onClick={() => setShowCustomInput(false)} className="btn-ghost text-xs">
                  取消
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="input flex items-center justify-between text-left"
                >
                  <span className="text-slate-200">{selectedModelLabel || aiConfig.model}</span>
                  <ChevronDown size={14} className="text-slate-500 shrink-0" />
                </button>

                {showModelSelector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                      {currentProvider.models.length === 0 && currentProvider.id === 'custom' ? (
                        <button
                          onClick={() => handleSelectModel('__custom__')}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-slate-400 hover:bg-slate-700"
                        >
                          ✏️ 输入自定义模型名称...
                        </button>
                      ) : (
                        <>
                          {/* 免费模型组 */}
                          {currentProvider.models.some((m) => m.free) && (
                            <>
                              <div className="border-b border-slate-700/50 px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-400/70">
                                🆓 免费模型
                              </div>
                              {currentProvider.models.filter((m) => m.free).map((model) => (
                                <button
                                  key={model.value}
                                  onClick={() => handleSelectModel(model.value)}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-700 ${
                                    aiConfig.model === model.value ? 'bg-slate-700/50 text-smartbox-400' : 'text-slate-300'
                                  }`}
                                >
                                  <span className="flex-1">{model.label}</span>
                                  {model.description && (
                                    <span className="text-[10px] text-slate-500">{model.description}</span>
                                  )}
                                  {aiConfig.model === model.value && <Check size={12} className="shrink-0" />}
                                </button>
                              ))}
                            </>
                          )}

                          {/* 付费/其他模型 */}

                          {currentProvider.models.filter((m) => !m.free).length > 0 && (
                            <>
                              <div className="border-b border-t border-slate-700/50 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                                💰 其他模型
                              </div>
                              {currentProvider.models.filter((m) => !m.free).map((model) => (
                                <button
                                  key={model.value}
                                  onClick={() => handleSelectModel(model.value)}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-700 ${
                                    aiConfig.model === model.value ? 'bg-slate-700/50 text-smartbox-400' : 'text-slate-300'
                                  }`}
                                >
                                  <span className="flex-1">{model.label}</span>
                                  {model.description && (
                                    <span className="text-[10px] text-slate-500">{model.description}</span>
                                  )}
                                  {aiConfig.model === model.value && <Check size={12} className="shrink-0" />}
                                </button>
                              ))}
                            </>
                          )}

                          {/* 自定义模型入口 */}
                          <button
                            onClick={() => handleSelectModel('__custom__')}
                            className="flex w-full items-center gap-2 border-t border-slate-700/50 px-3 py-2 text-xs text-slate-400 hover:bg-slate-700"
                          >
                            ✏️ 输入自定义模型...
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 启用 Agent */}
          <div className="mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiConfig.enabled}
                onChange={(e) => setAiConfig({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-smartbox-500 focus:ring-smartbox-500"
              />
              <span className="text-xs text-slate-400">启用 AI Agent 功能</span>
            </label>
            <p className="mt-1 text-[11px] text-slate-600 pl-6">
              开启后可在 SSH 终端界面使用 AI 助手，通过自然语言控制服务器
            </p>
          </div>
        </section>

        {/* ─── SSH 连接 ─── */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Server size={14} />
            SSH 连接
          </h3>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-3">
            <p className="text-xs text-slate-400">
              连接配置管理在 <span className="text-smartbox-400">SSH 连接</span> 页面中
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              支持密码和密钥认证，连接后可使用终端、文件管理和 AI Agent
            </p>
          </div>
        </section>

        {/* ─── 关于 ─── */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Globe size={14} />
            关于
          </h3>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-3 text-xs text-slate-500">
            <p className="font-medium text-slate-400">智盒 SmartBox v0.3.0</p>
            <p className="mt-1">可插拔 AI 增强的网页版工具箱</p>
            <p className="mt-1">技术栈: React 18 + Vite 6 + CodeMirror 6 + xterm.js + Express 5 + SSH2</p>
            <p className="mt-1">内置 AI Agent 技能生成器 + 提示词模板库插件</p>
            <p className="mt-2 text-[10px] text-slate-600">
              AI 功能由 OpenRouter / OpenAI / Claude / Gemini 等 API 提供支持 · 所有数据加密传输
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
