import { test, expect } from '@playwright/test'

test.describe('SmartBox 基础功能', () => {
  test('首页正常加载', async ({ page }) => {
    await page.goto('/')
    // 页面应该加载并显示标题
    await expect(page).toHaveTitle(/智盒 SmartBox/)
    // SSH Placeholder 应该默认显示
    await expect(page.locator('text=SSH 远程连接')).toBeVisible()
  })

  test('导航切换正常', async ({ page }) => {
    await page.goto('/')
    // 点击 Docker 导航
    await page.click('text=Docker')
    await expect(page).toHaveURL(/\/docker/)
    // 点击 命令 导航
    await page.click('text=命令管理')
    await expect(page).toHaveURL(/\/commands/)
  })

  test('命令面板可通过快捷键打开', async ({ page }) => {
    await page.goto('/')
    // Ctrl+K 打开命令面板
    await page.keyboard.press('Control+k')
    await expect(page.locator('text=搜索命令或操作…')).toBeVisible()
    // 关闭
    await page.keyboard.press('Escape')
  })
})
