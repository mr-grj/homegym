import { expect, shortcut, test } from './fixtures'

async function tabToRoutine(page: import('@playwright/test').Page) {
  await page.locator('.entry-input').press('Escape')
  for (let i = 0; i < 15 && !(await page.evaluate(() => document.activeElement?.classList.contains('chip-main'))); i++) await page.keyboard.press('Tab')
}

test('enter and space press the focused button on the start screen', async ({ app }) => {
  await tabToRoutine(app)
  await app.keyboard.press('Enter')
  await expect(app.locator('.stage')).toHaveAttribute('data-state', 'armed')
  await shortcut(app, 'Escape')
  await tabToRoutine(app)
  await app.keyboard.press('Space')
  await expect(app.locator('.stage')).toHaveAttribute('data-state', 'armed')
})

test('letters type into the clock, symbols still work from it', async ({ app }) => {
  const input = app.locator('.entry-input')
  await expect(input).toBeFocused()
  await app.keyboard.press('?')
  await expect(app.locator('.help-note')).toHaveText('On the start screen letters type into the clock. Press Esc first to use them as shortcuts.')
  await app.keyboard.press('Escape')
  await input.focus()
  await app.keyboard.press('h')
  await expect(input).toHaveValue('h')
  await input.press('Escape')
  await input.press('Escape')
  await app.keyboard.press('h')
  await expect(app.locator('.history')).toBeVisible()
})

test('one enter does what the hint shows', async ({ app }) => {
  await app.locator('.entry-input').press('Escape')
  await app.keyboard.press('Enter')
  await expect(app.locator('.label')).toHaveText('Stopwatch')
})

test('symbols typed with AltGr or Option still work', async ({ app }) => {
  await app.locator('.entry-input').blur()
  await app.evaluate(() =>
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '?', ctrlKey: true, altKey: true, modifierAltGraph: true, bubbles: true } as KeyboardEventInit)),
  )
  await expect(app.locator('.help')).toBeVisible()
})

test.describe('on Windows and Linux', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' })

  test('shortcuts read Ctrl and Alt', async ({ app }) => {
    await app.locator('.entry-input').blur()
    await app.keyboard.press('?')
    await expect(app.locator('.help')).toContainText('Ctrl+Z')
    await expect(app.locator('.help')).toContainText('Alt+↑')
    await expect(app.locator('.help')).not.toContainText('⌘')
    await app.keyboard.press('Escape')
    await app.locator('.routines .chip', { hasText: 'Core' }).locator('.chip-edit').click()
    await expect(app.locator('.editor .btn.primary kbd')).toHaveText('Ctrl+⏎')
  })
})
