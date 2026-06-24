export interface AiConfig {
  apiKey: string
  model: string
  baseUrl: string
  enabled: boolean
  /** 服务商标识，用于切换预设 */
  provider?: string
  /** 自定义 baseUrl 开关 */
  customBaseUrl?: boolean
}

/** AI 服务商预定义配置 */
export interface AiProvider {
  id: string
  name: string
  baseUrl: string
  models: AiProviderModel[]
  defaultModel: string
  icon?: string
  description?: string
}

export interface AiProviderModel {
  value: string
  label: string
  free?: boolean
  description?: string
}

/** 预设服务商列表 */
export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: '聚合多个模型，有免费额度',
    defaultModel: 'google/gemma-4-27b-it:free',
    models: [
      { value: 'google/gemma-4-27b-it:free', label: 'Gemma 4 27B (免费)', free: true },
      { value: 'meta-llama/llama-4-maverick:free', label: 'Llama 4 Maverick (免费)', free: true },
      { value: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1 24B (免费)', free: true },
      { value: 'qwen/qwen2.5-72b-instruct:free', label: 'Qwen 2.5 72B (免费)', free: true },
      { value: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 (免费)', free: true },
      { value: 'openai/gpt-4o', label: 'GPT-4o' },
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'openai/o3-mini', label: 'O3 Mini' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    description: '官方 OpenAI API',
    defaultModel: 'gpt-4o',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'o3-mini', label: 'O3 Mini' },
      { value: 'o1-mini', label: 'O1 Mini' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    description: 'Claude 系列模型',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    description: 'Gemini 系列模型',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek 系列模型',
    defaultModel: 'deepseek-chat',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek V3' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1' },
    ],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    description: '国内高速访问，多种开源模型',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    models: [
      { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B', description: '通义千问' },
      { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen 2.5 32B', description: '通义千问' },
      { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', description: 'DeepSeek' },
      { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', description: 'Meta' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    description: '自定义 API 端点',
    defaultModel: '',
    models: [],
  },
]

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AiActionType = 'explain' | 'refactor' | 'fix' | 'optimize' | 'translate' | 'comment'

export interface AiActionRequest {
  type: AiActionType
  code: string
  language: string
  instruction?: string
}

export interface AiActionResponse {
  original: string
  modified: string
  explanation?: string
  diff?: string
}

export interface AiSuggestion {
  id: string
  title: string
  description: string
  code: string
  language: string
  timestamp: number
  applied: boolean
}
