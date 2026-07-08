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

/** 预设服务商列表 — 所有平台均标注免费模型 */
export const AI_PROVIDERS: AiProvider[] = [
  // ─── OpenRouter（聚合平台，免费模型最多）───
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: '聚合多个模型，31+ 免费模型可用',
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    models: [
      {
        value: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        label: 'Nemotron 3 Ultra 550B',
        free: true,
      },
      {
        value: 'nvidia/nemotron-3-super-120b-a12b:free',
        label: 'Nemotron 3 Super 120B',
        free: true,
      },
      { value: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B', free: true },
      { value: 'nvidia/nemotron-nano-9b-v2:free', label: 'Nemotron Nano 9B V2', free: true },
      { value: 'nvidia/nemotron-nano-12b-v2-vl:free', label: 'Nemotron Nano 12B VL', free: true },
      { value: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder 480B', free: true },
      { value: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B', free: true },
      { value: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B A4B', free: true },
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', free: true },
      { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B', free: true },
      { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B', free: true },
      { value: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 3 405B', free: true },
      { value: 'poolside/laguna-m.1:free', label: 'Poolside Laguna M.1', free: true },
      { value: 'poolside/laguna-xs-2.1:free', label: 'Poolside Laguna XS 2.1', free: true },
      { value: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code', free: true },
      { value: 'openrouter/free', label: 'Free Router (自动选免费模型)', free: true },
    ],
  },
  // ─── SiliconFlow（国内免费额度）───
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    description: '国内高速访问，注册送免费额度',
    defaultModel: 'Qwen/Qwen3-235B-A22B',
    models: [
      {
        value: 'Qwen/Qwen3-235B-A22B',
        label: 'Qwen3 235B',
        free: true,
        description: '通义千问旗舰',
      },
      {
        value: 'Qwen/Qwen2.5-72B-Instruct',
        label: 'Qwen2.5 72B',
        free: true,
        description: '通义千问',
      },
      {
        value: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        label: 'Qwen2.5 Coder 32B',
        free: true,
        description: '代码专用',
      },
      { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', free: true },
      {
        value: 'deepseek-ai/DeepSeek-R1',
        label: 'DeepSeek R1',
        free: true,
        description: '推理模型',
      },
      { value: 'meta-llama/Llama-4-Scout-17B-16E', label: 'Llama 4 Scout 17B', free: true },
      { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', free: true },
      { value: 'THUDM/glm-4-9b-chat', label: 'GLM-4 9B', free: true, description: '智谱' },
    ],
  },
  // ─── Groq（极速推理，免费额度）───
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    description: '超快推理速度，免费额度充足',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', free: true, description: '通用' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', free: true, description: '极速' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B', free: true, description: 'Google' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', free: true, description: 'Mistral' },
    ],
  },
  // ─── Cerebras（极速推理）───
  {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: '极速推理，免费试用',
    defaultModel: 'llama-3.3-70b',
    models: [
      { value: 'llama-3.3-70b', label: 'Llama 3.3 70B', free: true },
      { value: 'llama-3.1-8b', label: 'Llama 3.1 8B', free: true },
    ],
  },
  // ─── Google Gemini（官方 API）───
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    description: 'Gemini 系列模型，有免费额度',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', free: true, description: '快速' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: true, description: '最强' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true },
      { value: 'gemma-4-27b-it', label: 'Gemma 4 27B', free: true, description: '开源' },
    ],
  },
  // ─── DeepSeek（付费）───
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek 系列模型',
    defaultModel: 'deepseek-chat',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek V3' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1', description: '推理增强' },
    ],
  },
  // ─── OpenAI（付费）───
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    description: 'GPT 系列模型',
    defaultModel: 'gpt-4.1-mini',
    models: [
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'o4-mini', label: 'o4-mini' },
      { value: 'o3', label: 'o3' },
      { value: 'o3-mini', label: 'o3-mini' },
    ],
  },
  // ─── Anthropic（付费）───
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    description: 'Claude 系列模型',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
  },
  // ─── 自定义 ──
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    description: '自定义 API 端点，支持任意 OpenAI 兼容模型',
    defaultModel: '',
    models: [],
  },
]

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Internal: unique ID for execution placeholder messages */
  _execId?: string
  /** Internal: whether this message represents an executing command */
  _executing?: boolean
  /** Internal: cached exec result for analysis button */
  _execResult?: { command: string; stdout?: string; stderr?: string }
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
