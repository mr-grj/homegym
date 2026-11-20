import { enter, expect, shortcut, test } from './fixtures'
import type { Page } from '@playwright/test'

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)

test('the demo stays in the browser', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (request) => request.url().includes('/api/') && calls.push(request.url()))
  await page.goto('./')
  await expect(page.locator('.routines .chip-main')).toHaveCount(8)
  await expect(page.locator('.routines .chip-main').first()).toContainText('Full body (20 min)')
  await expect(page.locator('.demo-badge')).toHaveAttribute('href', 'https://github.com/mr-grj/homegym')
  await enter(page, '1s')
  await expect(page.locator('.toast')).toContainText('Logged Timer · 1s')
  expect(calls).toEqual([])
})

test('the demo works with storage blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
  })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.locator('.routines .chip-main')).toHaveCount(8)
  expect(errors).toEqual([])
})

for (const [width, height] of [
  [320, 640],
  [390, 844],
  [1280, 800],
]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 })

    test('no screen scrolls sideways', async ({ app }) => {
      expect(await overflow(app)).toBeLessThanOrEqual(0)
      await app.locator('.chip-main', { hasText: 'Full body' }).click()
      await app.locator('.stage').click()
      await app.clock.runFor(1000)
      expect(await overflow(app)).toBeLessThanOrEqual(0)
      await shortcut(app, 'Escape')
      await expect(app.locator('.finish')).toBeVisible()
      expect(await overflow(app)).toBeLessThanOrEqual(0)
      await app.locator('.finish .btn.ghost').click()
      await app.locator('.chip-edit').first().click()
      await expect(app.locator('.builder')).toBeVisible()
      expect(await overflow(app)).toBeLessThanOrEqual(0)
    })
  })
}

test.describe('touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('tapping the stage starts and pauses', async ({ app }) => {
    await app.locator('.chip-main', { hasText: 'Core' }).tap()
    const stage = app.locator('.stage')
    await stage.locator('.face').tap()
    await expect(stage).toHaveAttribute('data-state', 'running')
    await app.clock.runFor(3000)
    await stage.locator('.face').tap()
    await expect(stage).toHaveAttribute('data-state', 'paused')
    await expect(app.locator('.time')).toHaveText('0:27')
    await stage.locator('.controls [data-tip^="Skip"]').tap()
    await expect(app.locator('.label')).toHaveText('Glute bridge')
  })
})

test('typing anywhere goes to the clock', async ({ app }) => {
  await app.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await app.keyboard.type('5m')
  await expect(app.locator('.entry-input')).toBeFocused()
  await expect(app.locator('.entry-input')).toHaveValue('5m')
})
