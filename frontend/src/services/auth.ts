/**
 * SmartBox 认证服务
 *
 * 管理与后端通信的访问令牌（WS 和 REST API）。
 *
 * 流程:
 *   1. 应用启动时调用 initAuth() → POST /api/ws-token 获取一次性令牌
 *   2. WebSocket 连接使用 ?token=<token> 进行认证
 *   3. REST API 通过 Authorization: Bearer <token> 头部认证
 *   4. 令牌一次有效，每次 WS 重连或关键 API 调用前刷新
 */

let _currentToken: string | null = null
let _tokenPromise: Promise<string> | null = null

/** 获取当前令牌（如果没有则自动获取） */
export async function getToken(): Promise<string> {
  if (_currentToken) return _currentToken
  return refreshToken()
}

/** 从后端请求新的一次性令牌 */
export async function refreshToken(): Promise<string> {
  // 防止并发重复请求
  if (_tokenPromise) return _tokenPromise

  _tokenPromise = (async () => {
    const protocol = window.location.protocol
    const host = window.location.host
    const resp = await fetch(`${protocol}//${host}/api/ws-token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error')
      throw new Error(`Failed to get auth token (${resp.status}): ${errText}`)
    }

    const data = await resp.json()
    const token = (data as { token?: string }).token ?? data.data?.token

    if (!token) {
      throw new Error('Auth token endpoint returned no token')
    }

    _currentToken = token
    return token
  })()

  try {
    return await _tokenPromise
  } finally {
    _tokenPromise = null
  }
}

/** 清除缓存的令牌（连接断开或认证失败时调用） */
export function clearToken() {
  _currentToken = null
  _tokenPromise = null
}

/**
 * 包装 fetch 自动添加 Authorization 头部
 */
export async function authedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getToken()
  const headers = new Headers(options.headers ?? {})
  headers.set('Authorization', `Bearer ${token}`)

  const resp = await fetch(url, { ...options, headers })

  // 401 Unauthorized → 令牌过期，清除缓存
  if (resp.status === 401) {
    clearToken()
  }

  return resp
}

/**
 * 构建带 WebSocket 认证的 URL
 */
export async function buildWsUrl(path: string): Promise<string> {
  const token = await getToken()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const basePath = path.startsWith('/') ? path : `/${path}`
  return `${protocol}//${host}${basePath}?token=${token}`
}
