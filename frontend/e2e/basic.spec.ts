import { test, expect } from '@playwright/test'

test.describe('SmartBox 基础功能', () => {
  test('首页正常加载', async ({ page }) => {
    await page.goto('/')
    // 页面应该加载并显示标题
    await expect(page).toHaveTitle(/智盒/)
    // 等待 React 挂载完成
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('导航切换正常', async ({ page }) => {
    await page.goto('/')
    // 等待页面渲染
    await expect(page.locator('#root')).not.toBeEmpty()
    // 点击 Docker 导航项（sidebar 中的按钮）
    await page.getByRole('button', { name: /Docker/ }).first().click()
    await expect(page).toHaveURL(/\/docker/)
    // 点击 命令 导航项
    await page.getByRole('button', { name: /命令/ }).first().click()
    await expect(page).toHaveURL(/\/commands/)
  })

  test('命令面板可通过快捷键打开', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#root')).not.toBeEmpty()
    // Ctrl+K 打开命令面板
    await page.keyboard.press('Control+k')
    // 命令面板应包含搜索输入框
    const searchInput = page.locator('input[placeholder]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    // 按 Escape 关闭
    await page.keyboard.press('Escape')
  })
})
