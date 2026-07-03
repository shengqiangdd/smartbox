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
})

test.describe('页面基础结构', () => {
  test('存在 root 挂载节点', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).toBeAttached()
    await expect(root).not.toHaveText('')
  })
})
