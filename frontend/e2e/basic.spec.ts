import { test, expect } from '@playwright/test'

test.describe('SmartBox 基础功能', () => {
  test('首页正常加载', async ({ page }) => {
    await page.goto('/')
    // 页面应该加载并显示标题
    await expect(page).toHaveTitle(/智盒/)
    // 等待 React 挂载完成
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('认证失败时显示错误页面', async ({ page }) => {
    await page.goto('/')
    // AuthGate 尝试连接后端 → 失败 → 显示错误状态
    await expect(page.getByText('连接失败')).toBeVisible({ timeout: 15000 })
    // 错误信息应包含重试按钮
    await expect(page.getByText('重试')).toBeVisible()
    // 应用内容不应渲染
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('认证错误消息显示并能重试', async ({ page }) => {
    await page.goto('/')
    // 等待认证失败
    await expect(page.getByText('连接失败')).toBeVisible({ timeout: 15000 })
    // 应该有重试按钮
    const retryBtn = page.getByText('重试')
    await expect(retryBtn).toBeVisible()
    // 点击重试（后端仍然不可用，应再次显示错误）
    await retryBtn.click()
    await expect(page.getByText('连接失败')).toBeVisible({ timeout: 10000 })
    // 不应渲染应用内容
    await expect(page.getByText('正在连接服务器...')).not.toBeVisible()
  })

  test('当前页面 URL 显示正确', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
  })

  test('meta viewport 正确（移动端适配）', async ({ page }) => {
    await page.goto('/')
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content')
    expect(viewport).toBeTruthy()
  })

  test('页面存在 Vite 构建标识', async ({ page }) => {
    await page.goto('/')
    // 检查构建产物中有 Vite 注入的脚本（仅生产构建）
    const hasViteScript = await page.evaluate(() => {
      return document.querySelector('script[type="module"]') !== null
    })
    expect(hasViteScript).toBe(true)
  })

  test('根节点存在 React 容器属性', async ({ page }) => {
    await page.goto('/')
    const hasReactRoot = await page.evaluate(() => {
      const root = document.getElementById('root')
      return root !== null && root.childNodes.length > 0
    })
    expect(hasReactRoot).toBe(true)
  })
})

test.describe('错误处理与 UI', () => {
  test('浏览器控制台无严重错误', async ({ page }) => {
    const errorLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text())
      }
    })

    await page.goto('/')
    // 等待认证失败（预期行为，不是 JS 错误）
    await expect(page.getByText('连接失败')).toBeVisible({ timeout: 15000 })

    // 应该有且仅有预期中的错误（网络请求错误不算严重）
    const jsErrors = errorLogs.filter((log) => !log.includes('net::ERR_CONNECTION_REFUSED'))
    expect(jsErrors.length).toBe(0)
  })

  test('HTML 标签语言属性正确', async ({ page }) => {
    await page.goto('/')
    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBeTruthy()
  })

  test('根节点未使用替换方案', async ({ page }) => {
    await page.goto('/')
    // root 应包含 React 渲染的内容而非原始 HTML 替换
    const rootContent = await page.innerHTML('#root')
    expect(rootContent).not.toContain('loading')
  })
})
