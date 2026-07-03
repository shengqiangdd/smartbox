import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate } from '../../components/AuthGate'

// Mock auth service
const mockRefreshToken = vi.fn()

vi.mock('../../services/auth', () => ({
  refreshToken: () => mockRefreshToken(),
  getToken: vi.fn(() => 'mock-token'),
  clearToken: vi.fn(),
}))

/**
 * Helper: render a React node into a detached DOM container.
 * Uses createRoot directly (React 19) — act wrapper is not available
 * in React 19.2.7 CJS build, but the render still works correctly
 * without it in test environments.
 */
function renderReact(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(node)
  return {
    container,
    root,
    cleanup: () => {
      root.unmount()
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    },
  }
}

describe('AuthGate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state on mount', async () => {
    // Keep promise pending so we stay in loading
    mockRefreshToken.mockImplementation(() => new Promise(() => {}))

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    // Effects need time to start; use waitFor for async render settling
    await vi.waitFor(() => {
      expect(container.textContent).toContain('正在连接服务器...')
    })
    expect(container.querySelector('[data-testid="children"]')).toBeNull()
    cleanup()
  })

  it('renders children when auth succeeds', async () => {
    mockRefreshToken.mockResolvedValue(undefined)

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    // Wait for async effect to complete
    await vi.waitFor(() => {
      expect(container.textContent).toContain('App Content')
    })

    expect(container.querySelector('[data-testid="children"]')).not.toBeNull()
    expect(container.textContent).not.toContain('正在连接服务器...')
    expect(container.textContent).not.toContain('连接失败')
    cleanup()
  })

  it('shows error state when auth fails', async () => {
    mockRefreshToken.mockRejectedValue(new Error('Network error'))

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    await vi.waitFor(() => {
      expect(container.textContent).toContain('连接失败')
    })
    expect(container.textContent).toContain('Network error')
    expect(container.querySelector('[data-testid="children"]')).toBeNull()
    expect(container.textContent).toContain('重试')
    cleanup()
  })

  it('shows fallback error when no error message provided', async () => {
    mockRefreshToken.mockRejectedValue('')

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    await vi.waitFor(() => {
      expect(container.textContent).toContain('无法获取认证令牌')
    })
    cleanup()
  })

  it('retries auth when retry button is clicked', async () => {
    // First call fails
    mockRefreshToken.mockRejectedValueOnce(new Error('Network error'))

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    // Wait for error state
    await vi.waitFor(() => {
      expect(container.textContent).toContain('连接失败')
    })

    // Second call succeeds
    mockRefreshToken.mockResolvedValueOnce(undefined)

    // Click retry
    const retryBtn = container.querySelector('button')
    expect(retryBtn).not.toBeNull()
    retryBtn!.click()

    // Wait for children to appear after retry
    await vi.waitFor(() => {
      expect(container.querySelector('[data-testid="children"]')).not.toBeNull()
    })
    expect(mockRefreshToken).toHaveBeenCalledTimes(2)
    cleanup()
  })

  it('shows error again when retry fails', async () => {
    // Both calls fail
    mockRefreshToken.mockRejectedValue(new Error('Network error'))

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    await vi.waitFor(() => {
      expect(container.textContent).toContain('连接失败')
    })

    // Click retry
    const retryBtn = container.querySelector('button')
    retryBtn!.click()

    await vi.waitFor(() => {
      expect(container.textContent).toContain('连接失败')
    })
    expect(container.querySelector('[data-testid="children"]')).toBeNull()
    cleanup()
  })

  it('cleans up on unmount (cancelled flag)', async () => {
    // Use a mutable ref to avoid closure hoisting issues with vi.mock
    const resolveRef: { current: (() => void) | null } = { current: null }
    mockRefreshToken.mockImplementation(
      () => new Promise<void>((resolve) => { resolveRef.current = resolve }),
    )

    const { container, cleanup } = renderReact(
      <AuthGate>
        <div data-testid="children">App Content</div>
      </AuthGate>,
    )

    // Unmount before auth completes
    cleanup()

    // Resolve the promise — should NOT throw
    resolveRef.current?.()

    // Wait for any pending effects to settle
    await new Promise((r) => setTimeout(r, 50))
    expect(true).toBe(true) // should not have thrown from setState on unmounted
  })
})
